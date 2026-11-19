<?php
require_once "database.php"; require_once "helpers.php"; require_supervisor();
sync_requests_from_inventory($pdo);

const TX_REQ_TONE=["pending"=>"neutral","approved"=>"info","issued"=>"success","rejected"=>"reject"];
$tx=[];
foreach($pdo->query("SELECT mr.request_id,mr.order_id,mr.quantity,mr.status,mr.requested_at,mr.issued_at,i.item_name material FROM material_requests mr JOIN items i ON i.id=mr.material_id")->fetchAll() as $r)
 $tx[]=["type"=>"material_request","type_label"=>"Material request","reference"=>"MR-".$r["request_id"],"order_id"=>$r["order_id"],"details"=>$r["quantity"]." of ".$r["material"],"status_label"=>REQUEST_STATUS_LABEL[$r["status"]],"tone"=>TX_REQ_TONE[$r["status"]],"at"=>$r["issued_at"]?:$r["requested_at"]];
foreach($pdo->query("SELECT qc.qc_id,qc.order_id,qc.produced_qty,qc.accepted_qty,qc.rejected_qty,qc.reviewed_at,p.product_name product FROM quality_checks qc JOIN production_orders po ON po.order_id=qc.order_id JOIN products p ON p.product_id=po.product_id WHERE qc.status='reviewed'")->fetchAll() as $r)
 $tx[]=["type"=>"quality_check","type_label"=>"Quality check","reference"=>"QC-".$r["qc_id"],"order_id"=>$r["order_id"],"details"=>$r["product"].": ".$r["accepted_qty"]." accepted / ".$r["rejected_qty"]." rejected of ".$r["produced_qty"],"status_label"=>"Reviewed","tone"=>"done","at"=>$r["reviewed_at"]];
foreach($pdo->query("SELECT fg.fg_id,fg.order_id,fg.accepted_qty,fg.sent_at,p.product_name product FROM finished_goods fg JOIN products p ON p.product_id=fg.product_id WHERE fg.status='sent_to_inventory'")->fetchAll() as $r)
 $tx[]=["type"=>"finished_goods","type_label"=>"Finished goods","reference"=>"FG-".$r["fg_id"],"order_id"=>$r["order_id"],"details"=>$r["accepted_qty"]." units of ".$r["product"]." to Inventory","status_label"=>"Delivered","tone"=>"success","at"=>$r["sent_at"]];
foreach($pdo->query("SELECT costing_id,order_id,total_cost,sent_at FROM production_costing WHERE sent_to_finance=1")->fetchAll() as $r)
 $tx[]=["type"=>"costing","type_label"=>"Costing","reference"=>"CST-".$r["costing_id"],"order_id"=>$r["order_id"],"details"=>"Total cost ₱".number_format((float)$r["total_cost"])." sent to Finance","status_label"=>"Sent","tone"=>"info","at"=>$r["sent_at"]];
usort($tx,function($a,$b){return strcmp((string)$b["at"],(string)$a["at"]);});
$tx=array_slice($tx,0,100);

$activity=$pdo->query("SELECT al.action,al.order_id,al.created_at,u.full_name,u.username FROM activity_log al LEFT JOIN production_users u ON u.id=al.user_id ORDER BY al.created_at DESC,al.id DESC LIMIT 50")->fetchAll();
json_response(["success"=>true,"transactions"=>$tx,"recent_activity"=>$activity]);
?>
