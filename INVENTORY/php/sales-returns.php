<?php
require_once "database.php";
require_login();
$action = $_REQUEST["action"] ?? "list";
if ($action === "list") {
    $s = $pdo->query("SELECT sr.*,COALESCE(u.full_name,'—') received_by_name FROM sales_returns sr LEFT JOIN users u ON u.id=sr.received_by ORDER BY sr.created_at DESC");
    $rows = $s->fetchAll();
    foreach ($rows as &$row) {
        $q = $pdo->prepare("SELECT sri.*,i.item_code,i.unit,w.warehouse_name FROM sales_return_items sri JOIN items i ON i.id=sri.item_id LEFT JOIN warehouses w ON w.id=sri.warehouse_id WHERE sri.sales_return_id=? ORDER BY sri.id");
        $q->execute([$row["id"]]);
        $row["items"] = $q->fetchAll();
        $row["item_count"] = count($row["items"]);
    }
    unset($row);
    $warehouses = $pdo->query("SELECT id,warehouse_name,location FROM warehouses WHERE status='Active' ORDER BY warehouse_name")->fetchAll();
    json_response(["success"=>true,"rows"=>$rows,"warehouses"=>$warehouses]);
}
if ($action === "receive") {
    require_admin();
    $id = (int)post_value("id");
    $decisions = json_decode(post_value("decisions","[]"), true);
    if ($id <= 0 || !is_array($decisions) || !$decisions) json_response(["success"=>false,"message"=>"Invalid Sales Return inspection data."],422);
    try {
        $pdo->beginTransaction();
        $s = $pdo->prepare("SELECT * FROM sales_returns WHERE id=? FOR UPDATE");
        $s->execute([$id]);
        $header = $s->fetch();
        if (!$header || $header["status"] !== "Pending") throw new Exception("This Sales Return has already been processed or was not found.");
        $q = $pdo->prepare("SELECT * FROM sales_return_items WHERE sales_return_id=? ORDER BY id FOR UPDATE");
        $q->execute([$id]);
        $lines = $q->fetchAll();
        if (count($lines) !== count($decisions)) throw new Exception("Inspection details do not match the submitted return items.");
        $totalAccepted = 0; $totalRejected = 0;
        foreach ($lines as $line) {
            $decision = $decisions[(string)$line["id"]] ?? $decisions[$line["id"]] ?? null;
            if (!$decision) throw new Exception("Missing inspection decision for " . $line["item_name"] . ".");
            $accepted = filter_var($decision["accepted_quantity"] ?? null, FILTER_VALIDATE_INT);
            $rejected = filter_var($decision["rejected_quantity"] ?? null, FILTER_VALIDATE_INT);
            $warehouseId = (int)($decision["warehouse_id"] ?? 0);
            $inspection = trim((string)($decision["inspection_remarks"] ?? ""));
            if ($accepted === false || $rejected === false || $accepted < 0 || $rejected < 0 || $accepted + $rejected !== (int)$line["quantity"]) throw new Exception("Accepted and rejected quantities must add up to the returned quantity for " . $line["item_name"] . ".");
if ($accepted > 0) {
    $wh = $pdo->prepare("SELECT id FROM warehouses WHERE id=? AND status='Active'");
    $wh->execute([$warehouseId]);
    if (!$wh->fetch()) throw new Exception("Choose an active warehouse for accepted items.");

    $stock = $pdo->prepare("SELECT quantity FROM inventory WHERE item_id=? AND warehouse_id=? FOR UPDATE");
    $stock->execute([$line["item_id"], $warehouseId]);
    $stockRow = $stock->fetch();

    $currentQuantity = $stockRow ? (int)$stockRow["quantity"] : 0;
    $adjustedQuantity = $currentQuantity + $accepted;

    $up = $pdo->prepare("INSERT INTO inventory(item_id,warehouse_id,quantity) VALUES(?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)");
    $up->execute([$line["item_id"], $warehouseId, $accepted]);

    $ref = $header["return_number"];
    $remarks = "Sales Return accepted. " . $line["damage_description"] . ($inspection !== "" ? " | Inspection: " . $inspection : "");

    $adjustmentNumber = "SR-" . $id . "-" . $line["id"];
    $adjustmentRemarks = "Accepted returned items from " . $ref . ". " . $remarks;

    $adjustment = $pdo->prepare("INSERT INTO stock_adjustments(adjustment_number,item_id,warehouse_id,current_quantity,adjusted_quantity,difference,reason,remarks,date,user_id) VALUES(?,?,?,?,?,?,?,?,?,?)");

    $adjustment->execute([
        $adjustmentNumber,
        $line["item_id"],
        $warehouseId,
        $currentQuantity,
        $adjustedQuantity,
        $accepted,
        "Sales Return",
        $adjustmentRemarks,
        date("Y-m-d"),
        $_SESSION["user_id"]
    ]);

    $mv = $pdo->prepare("INSERT INTO stock_movements(item_id,warehouse_id,movement_type,quantity,unit,reference_number,remarks,date,user_id) SELECT ?,?, 'SALES RETURN', ?, unit, ?, ?, ?, ? FROM items WHERE id=?");

    $mv->execute([
        $line["item_id"],
        $warehouseId,
        $accepted,
        $ref,
        $remarks,
        date('Y-m-d'),
        $_SESSION["user_id"],
        $line["item_id"]
    ]);
}
            $totalAccepted += $accepted; $totalRejected += $rejected;
            $upLine = $pdo->prepare("UPDATE sales_return_items SET accepted_quantity=?,rejected_quantity=?,warehouse_id=?,inspection_remarks=?,inspected_at=NOW() WHERE id=?");
            $upLine->execute([$accepted,$rejected,$accepted > 0 ? $warehouseId : null,$inspection,$line["id"]]);
        }
        $status = $totalAccepted > 0 ? ($totalRejected > 0 ? "Partially Received" : "Received") : "Rejected";
        $pdo->prepare("UPDATE sales_returns SET status=?,received_at=NOW(),received_by=? WHERE id=?")->execute([$status,$_SESSION["user_id"],$id]);
        create_notification_for_admins($pdo,"Sales Return Inspected","Sales Return " . $header["return_number"] . " was inspected. Accepted: " . $totalAccepted . "; rejected: " . $totalRejected . ".","sales-return",$_SESSION["user_id"]);
        $pdo->commit();
        json_response(["success"=>true,"message"=>"Sales Return inspection saved. Accepted quantity was added to warehouse stock; rejected quantity was not added.","status"=>$status]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        json_response(["success"=>false,"message"=>$e->getMessage()],422);
    }
}
json_response(["success"=>false,"message"=>"Invalid action."],400);
