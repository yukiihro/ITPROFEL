<?php
require_once "database.php";
require_login();
require_admin();
$action = $_GET["action"] ?? "list";
if ($action === "list") {
    $sql = "SELECT sri.id, sri.item_action, sri.item_name, sri.ordered_quantity, sri.delivered_quantity,
                   sri.accepted_quantity, sri.rejected_quantity, sri.unit, sri.rejection_reason,
                   sr.report_number, sr.po_number, sr.supplier_name, sr.supplier_gmail,
                   sr.received_date, sr.report_status, sr.email_sent_at,
                   r.request_number, r.requester_team, r.destination,
                   dr.dr_number, dr.receipt_date, dr.received_by, dr.received_date AS dr_received_date,
                   d.status AS delivery_status
            FROM supplier_rejection_items sri
            JOIN supplier_rejections sr ON sr.id=sri.rejection_id
            LEFT JOIN requests r ON r.id=sr.request_id
            LEFT JOIN deliveries d ON d.id=sr.delivery_id
            LEFT JOIN delivery_receipts dr ON dr.delivery_id=sr.delivery_id
            WHERE sri.item_action IN ('Inspection Reject','Reject','Return')
              AND sr.email_sent_at IS NOT NULL
              AND COALESCE(r.remarks,'') NOT LIKE '%DEMO SAMPLE%'
              AND COALESCE(d.remarks,'') NOT LIKE '%DEMO SAMPLE%'
            ORDER BY sr.id DESC, sri.id DESC";
    json_response(["success" => true, "rows" => $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC)]);
}
json_response(["success" => false, "message" => "Invalid action."], 400);
?>
