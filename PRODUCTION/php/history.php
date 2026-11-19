<?php
require_once "database.php"; require_login();
$rows=$pdo->query("SELECT po.order_id,p.product_name product,po.quantity qty_produced,qc.reviewed_at completed,pc.total_cost,qc.accepted_qty,qc.rejected_qty FROM production_orders po JOIN products p ON p.product_id=po.product_id LEFT JOIN quality_checks qc ON qc.order_id=po.order_id LEFT JOIN production_costing pc ON pc.costing_id=(SELECT MAX(c2.costing_id) FROM production_costing c2 WHERE c2.order_id=po.order_id) WHERE po.status='completed' ORDER BY qc.reviewed_at DESC,po.order_id DESC")->fetchAll();
$out=array_map(function($r){return ["order_id"=>$r["order_id"],"product"=>$r["product"],"qty_produced"=>(int)$r["qty_produced"],"completed"=>$r["completed"],"cost_per_unit"=>$r["total_cost"]?(int)round($r["total_cost"]/$r["qty_produced"]):null,"accepted"=>$r["accepted_qty"],"rejected"=>$r["rejected_qty"]];},$rows);
json_response(["success"=>true,"rows"=>$out]);
?>
