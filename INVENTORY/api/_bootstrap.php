<?php
require_once __DIR__ . "/config.php";

require_once __DIR__ . "/../php/database.php";


if (!function_exists("create_incoming_request_notifications")) {
    function create_incoming_request_notifications(...$args) {
        if (!function_exists("notify_request_participants")) {
            return;
        }

        $notificationPdo = $args[0] ?? ($GLOBALS["pdo"] ?? null);
        $requestInfo = $args[1] ?? [];
        $title = $args[2] ?? "New Request";
        $message = $args[3] ?? "";
        $type = $args[4] ?? "request";
        $actorUserId = $args[5] ?? null;

        if ($notificationPdo instanceof PDO && is_array($requestInfo)) {
            notify_request_participants(
                $notificationPdo,
                $requestInfo,
                (string)$title,
                (string)$message,
                (string)$type,
                $actorUserId
            );
        }
    }
}


header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-API-Key, X-API-Team");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

function api_response($success, $message, $data = null, $status = 200) {
    http_response_code($status);
    header("Content-Type: application/json; charset=utf-8");

    $response = [
        "success" => $success,
        "message" => $message
    ];

    if ($data !== null) {
        $response["data"] = $data;
    }

    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function api_method($allowed) {
    $method = $_SERVER["REQUEST_METHOD"] ?? "GET";

    if (!in_array($method, $allowed, true)) {
        header("Allow: " . implode(", ", $allowed));
        api_response(false, "Method not allowed.", null, 405);
    }
}

function api_input() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);

    if (!is_array($data)) {
        return [];
    }

    return $data;
}

function api_auth() {
    global $IMS_API_KEY;

    $providedKey = $_SERVER["HTTP_X_API_KEY"] ?? "";
    $providedTeam = trim($_SERVER["HTTP_X_API_TEAM"] ?? "");

    if (!empty($_SESSION["user_id"])) {
        return infer_user_team($GLOBALS["pdo"], $_SESSION["user_id"]);
    }

    if (
        empty($IMS_API_KEY) ||
        $providedKey === "" ||
        !hash_equals($IMS_API_KEY, $providedKey)
    ) {
        api_response(false, "Unauthorized. Invalid Inventory API Key.", null, 401);
    }

    if (!api_valid_team($providedTeam)) {
        api_response(false, "Invalid or missing requesting team.", null, 403);
    }

    return $providedTeam;
}

function api_valid_team($team) {
    return in_array(trim((string)$team), ["Production", "Procurement", "Sales"], true);
}

function api_find_request($pdo, $requestNumber) {
    $query = $pdo->prepare(
        "SELECT r.*, d.id delivery_id, d.status delivery_status,
                d.expected_days, d.expected_date
         FROM requests r
         LEFT JOIN deliveries d ON d.request_id = r.id
         WHERE r.request_number = ?
         LIMIT 1"
    );
    $query->execute([$requestNumber]);
    return $query->fetch();
}

function api_target_quantity($item) {
    $approved = (int)($item["approved_quantity"] ?? 0);
    return $approved > 0 ? $approved : (int)$item["quantity"];
}

function api_delivery_status($pdo, $request) {
    $query = $pdo->prepare(
        "SELECT quantity, approved_quantity, delivered_quantity, accepted_quantity, inspection_accepted_quantity
         FROM request_items WHERE request_id = ?"
    );
    $query->execute([$request["id"]]);
    $items = $query->fetchAll();
    if (!$items) return "To Ship";

    $team = strtolower(trim((string)($request["requester_team"] ?? "")));
    $inventoryRequest = $team === "inventory";

    if ($inventoryRequest) {
        if (!empty($request["receipt_confirmed_at"]) || !empty($request["received_date"])) {
            return "Delivered";
        }
        $anyShipped = false;
        $allShipped = true;
        foreach ($items as $item) {
            $target = (int)$item["quantity"];
            $shipped = (int)($item["delivered_quantity"] ?? 0);
            if ($shipped > 0) $anyShipped = true;
            if ($shipped < $target) $allShipped = false;
        }
        if ($allShipped && $anyShipped) return "Out for Delivery";
        if ($anyShipped) return "Partially Delivered";
        return "To Ship";
    }

    if (!empty($request["received_date"])) return "Delivered";
    if (!empty($request["out_for_delivery_date"])) return "Out for Delivery";
    return "To Ship";
}

function api_save_delivery_status($pdo, $requestId) {
    $requestQuery = $pdo->prepare(
        "SELECT r.*, d.id delivery_id, d.status delivery_status,
                d.received_date, d.out_for_delivery_date, d.delivered_date, d.receipt_confirmed_at
         FROM requests r
         LEFT JOIN deliveries d ON d.request_id = r.id
         WHERE r.id = ?"
    );
    $requestQuery->execute([$requestId]);
    $request = $requestQuery->fetch();

    if (!$request) {
        if (!$request) {
    throw new Exception("Request not found.");
}
    }

    if (empty($request["delivery_id"])) {
        $pdo->prepare(
            "INSERT INTO deliveries(request_id, status, expected_days, expected_date)
             VALUES(?, 'To Ship', '2-3 days', ?)"
        )->execute([$requestId, $request["expected_receive_date"] ?? null]);
        $request["delivery_id"] = $pdo->lastInsertId();
        $request["delivery_status"] = "To Ship";
    }

    $status = api_delivery_status($pdo, $request);
    $pdo->prepare(
        "UPDATE deliveries SET status = ?,
            shipped_date = CASE WHEN ? IN ('Out for Delivery','Partially Delivered','Accepted')
                THEN COALESCE(shipped_date, CURDATE()) ELSE NULL END,
            out_for_delivery_date = CASE WHEN ? IN ('Out for Delivery','Partially Delivered','Accepted')
                THEN COALESCE(out_for_delivery_date, CURDATE()) ELSE NULL END,
            delivered_date = CASE WHEN ? IN ('Delivered','Accepted')
                THEN COALESCE(delivered_date, CURDATE()) ELSE delivered_date END,
            received_date = CASE WHEN ? = 'Accepted'
                THEN COALESCE(received_date, CURDATE()) ELSE received_date END
         WHERE id = ?"
    )->execute([$status, $status, $status, $status, $status, $request["delivery_id"]]);

    return $status;
}
?>
