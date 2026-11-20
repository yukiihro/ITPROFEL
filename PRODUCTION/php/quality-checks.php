<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$action=$_REQUEST["action"]??"list";

if($action==="list"){
 json_response(["success"=>true,"rows"=>$pdo->query("SELECT qc.*,p.product_name product FROM quality_checks qc JOIN production_orders po ON po.order_id=qc.order_id JOIN products p ON p.product_id=po.product_id ORDER BY qc.qc_id DESC")->fetchAll()]);
}
if($action==="complete"){
 require_supervisor();
 $accepted=post_value("accepted_qty");$rejected=post_value("rejected_qty");
 if($accepted===""||$rejected==="")fail("Enter both the accepted and the rejected quantity.");
 $accepted=need_whole($accepted,"Accepted quantity",0);$rejected=need_whole($rejected,"Rejected quantity",0);
 $pdo->beginTransaction();
 try{
  $s=$pdo->prepare("SELECT * FROM quality_checks WHERE order_id=? FOR UPDATE");$s->execute([post_value("order_id")]);$qc=$s->fetch();
  if(!$qc)fail_in_tx($pdo,"No quality check for this order.",404);
  if($qc["status"]==="reviewed")fail_in_tx($pdo,"Already reviewed.",409);
  if($accepted+$rejected!==(int)$qc["produced_qty"])fail_in_tx($pdo,"Accepted + rejected must equal the {$qc['produced_qty']} pairs produced.");
  $s=$pdo->prepare("SELECT * FROM production_orders WHERE order_id=?");$s->execute([$qc["order_id"]]);$order=$s->fetch();
  if(!$order||$order["status"]!=="quality_check")fail_in_tx($pdo,"This order is not waiting for quality check.",409);
  $s=$pdo->prepare("SELECT i.item_code FROM products p JOIN items i ON i.id=p.item_id WHERE p.product_id=?");$s->execute([$order["product_id"]]);$itemCode=$s->fetchColumn();
  if(!$itemCode)fail_in_tx($pdo,"This product is not linked to an Inventory finished-good item.",409);
  $pn=$pdo->prepare("SELECT product_name FROM products WHERE product_id=?");$pn->execute([$order["product_id"]]);
  $sz=inventory_item_for_size($pdo,(string)$pn->fetchColumn(),$order["shoe_size_cm"]);if($sz)$itemCode=$sz["item_code"];
  $pdo->prepare("UPDATE quality_checks SET accepted_qty=?,rejected_qty=?,status='reviewed',reviewed_at=NOW() WHERE order_id=?")->execute([$accepted,$rejected,$qc["order_id"]]);
  $pdo->prepare("INSERT INTO finished_goods(order_id,product_id,item_code,produced_qty,accepted_qty,rejected_qty,status) VALUES(?,?,?,?,?,?,'ready')")->execute([$order["order_id"],$order["product_id"],$itemCode,$qc["produced_qty"],$accepted,$rejected]);
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 notify($pdo,"done","Quality check completed for {$order['order_id']}",$order["order_id"]);
 log_activity($pdo,"accepted $accepted / rejected $rejected in quality check for {$order['order_id']}",$order["order_id"]);
 json_response(["success"=>true,"message"=>"Batch {$order['order_id']} approved: $accepted accepted, $rejected rejected. Accepted goods are ready to send to Inventory under Finished goods."]);
}
json_response(["success"=>false,"message"=>"Invalid quality check action."],400);
?>
