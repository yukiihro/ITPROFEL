<?php
require_once "_bootstrap.php";
api_method(["POST"]);

// This endpoint accepts workflow events only from the Procurement system.
$providedKey = $_SERVER["HTTP_X_API_KEY"] ?? "";
$expectedKey = getenv("IMS_API_KEY") ?: ($_SERVER["IMS_API_KEY"] ?? "");
$sourceTeam = trim($_SERVER["HTTP_X_API_TEAM"] ?? "");
if ($expectedKey === "" || $providedKey === "" || !hash_equals($expectedKey, $providedKey) || $sourceTeam !== "Procurement") {
    api_response(false, "Unauthorized Procurement integration request.", null, 401);
}

$data = api_input();
$event = trim((string)($data["event"] ?? ""));
$requestNumber = trim((string)($data["request_number"] ?? ""));
$poNumber = trim((string)($data["po_number"] ?? ""));
if (!preg_match('/\\AREQ-[A-Za-z0-9-]{1,64}\\z/', $requestNumber)) {
    api_response(false, "A valid Inventory request number is required.", null, 422);
}
if ($poNumber !== "" && !preg_match('/\\APO-[A-Za-z0-9-]{1,30}\\z/', $poNumber)) {
    api_response(false, "Invalid P.O. Number.", null, 422);
}

$requestQuery = $pdo->prepare("SELECT r.*, d.id delivery_id FROM requests r LEFT JOIN deliveries d ON d.request_id=r.id WHERE r.request_number=? AND LOWER(TRIM(r.requester_team))='inventory' AND LOWER(TRIM(r.destination))='procurement' LIMIT 1");
$requestQuery->execute([$requestNumber]);
$request = $requestQuery->fetch();
if (!$request) api_response(false, "Matching Inventory request was not found.", null, 404);

try {
    $pdo->beginTransaction();
    if ($event === "pr_approved") {
        if (in_array($request["status"], ["Disapproved", "Rejected"], true)) {
            throw new Exception("A rejected Inventory request cannot be approved by this event.");
        }
        $pdo->prepare("UPDATE requests SET status='Approved', approved_at=COALESCE(approved_at,NOW()) WHERE id=?")
            ->execute([$request["id"]]);
        $pdo->prepare("UPDATE request_items SET approved_quantity=quantity, rejected_quantity=0, rejection_reason='' WHERE request_id=?")
            ->execute([$request["id"]]);
        $pdo->prepare("INSERT INTO deliveries(request_id,status,expected_days,expected_date) VALUES(?,'To Ship','2-3 days',?) ON DUPLICATE KEY UPDATE status=IF(status='Delivered',status,'To Ship')")
            ->execute([$request["id"], $request["expected_receive_date"] ?? null]);
        $message = "Procurement approved the linked purchase request.";
    } elseif ($event === "po_approved") {
        if ($poNumber === "") throw new Exception("P.O. Number is required for the shipment event.");
        if (!in_array($request["status"], ["Approved", "Partially Approved"], true)) {
            throw new Exception("The Inventory request must be approved before the P.O. can be dispatched.");
        }
        $pdo->prepare("UPDATE requests SET po_number=? WHERE id=?")
            ->execute([$poNumber, $request["id"]]);
        $pdo->prepare("UPDATE request_items SET delivered_quantity=COALESCE(NULLIF(approved_quantity,0),quantity) WHERE request_id=?")
            ->execute([$request["id"]]);
        $pdo->prepare("INSERT INTO deliveries(request_id,status,expected_days,expected_date,shipped_date,out_for_delivery_date) VALUES(?,'Out for Delivery','2-3 days',?,CURDATE(),CURDATE()) ON DUPLICATE KEY UPDATE status='Out for Delivery',shipped_date=COALESCE(shipped_date,CURDATE()),out_for_delivery_date=COALESCE(out_for_delivery_date,CURDATE()),delivered_date=NULL,received_date=NULL")
            ->execute([$request["id"], $request["expected_receive_date"] ?? null]);
        $message = "Procurement approved the P.O. and marked the shipment Out for Delivery.";
    } else {
        throw new Exception("Unsupported Procurement event.");
    }
    $pdo->commit();
    api_response(true, $message, ["request_number"=>$requestNumber,"po_number"=>$poNumber,"event"=>$event]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    api_response(false, $error->getMessage(), null, 422);
}
?>
