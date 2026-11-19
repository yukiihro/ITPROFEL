<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$action=$_REQUEST["action"]??"list";

if($action==="list"){
 sync_products_from_inventory($pdo);
 $sql="SELECT po.order_id,po.product_id,COALESCE(p.product_name,CONCAT('Product #',po.product_id)) product,po.quantity,po.shoe_size_cm,po.start_date,po.eta_label,po.priority,po.status FROM production_orders po LEFT JOIN products p ON p.product_id=po.product_id WHERE po.status!='completed'";$a=[];
 if(!empty($_GET["stage"])){$sql.=" AND po.status=?";$a[]=$_GET["stage"];}
 if(!empty($_GET["search"])){$q="%".$_GET["search"]."%";$sql.=" AND (po.order_id LIKE ? OR COALESCE(p.product_name,'') LIKE ?)";$a[]=$q;$a[]=$q;}
 $sql.=" ORDER BY po.created_at DESC,po.order_id DESC";
 $s=$pdo->prepare($sql);$s->execute($a);$rows=$s->fetchAll();
 foreach($rows as &$r){$r["status_label"]=STAGE_LABEL[$r["status"]];$r["size_label"]=size_label($r["shoe_size_cm"]);}
 json_response(["success"=>true,"count"=>count($rows),"orders"=>$rows]);
}
if($action==="detail"){
 $d=order_detail($pdo,$_GET["id"]??"");if(!$d)fail("Order not found.",404);
 json_response(["success"=>true,"order"=>$d]);
}
if($action==="create"){
 sync_products_from_inventory($pdo);
 $productId=need_whole(post_value("product_id"),"Product",1);
 $quantity=need_whole(post_value("quantity"),"Quantity",1,100000);
 $startDate=need_date(post_value("start_date"),"Start date");
 if($startDate<date("Y-m-d"))fail("Start date can't be in the past — pick today or a later day.");
 $sizeRaw=post_value("shoe_size_cm");
 if(!preg_match('/^\d{2}(\.[05])?$/',$sizeRaw))fail("Shoe size must be in cm, in steps of 0.5 (for example 26 or 26.5).");
 $size=(float)$sizeRaw;if($size<SHOE_SIZE_MIN||$size>SHOE_SIZE_MAX)fail("Shoe size must be between ".SHOE_SIZE_MIN." and ".SHOE_SIZE_MAX." cm.");
 $eta=trim(post_value("eta_label"));
 if($eta!==""){
  if(!preg_match('/^\d+$/',$eta))fail("Estimated completion must be a number of days (digits only, e.g. 3).");
  $days=(int)$eta;if($days<1||$days>365)fail("Estimated completion must be between 1 and 365 days.");
  $eta=$days.($days===1?" day":" days");
 }else $eta=null;
 $priority=need_choice(post_value("priority","normal"),"Priority",["normal","urgent"]);
 $s=$pdo->prepare("SELECT p.*,i.status item_status FROM products p LEFT JOIN items i ON i.id=p.item_id WHERE p.product_id=?");$s->execute([$productId]);$product=$s->fetch();
 if(!$product)fail("Product not found.",404);
 if($product["item_status"]===null||strtolower((string)$product["item_status"])!=="active")fail("This product's finished-good item is not active in Inventory, so it can't be produced.",409);
 $b=$pdo->prepare("SELECT DISTINCT bm.material_id FROM bill_of_materials bm JOIN items i ON i.id=bm.material_id WHERE bm.product_id=?");$b->execute([$productId]);$mats=$b->fetchAll();
 if(!$mats)fail("This product has no bill of materials (no raw materials in Inventory to build one from). Add raw materials in Inventory first.",409);
 $orderId=null;
 $pdo->beginTransaction();
 try{
  for($attempt=0;$attempt<5;$attempt++){
   $max=(int)$pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(order_id,4) AS UNSIGNED)),1041) FROM production_orders WHERE order_id REGEXP '^PO-[0-9]+$'")->fetchColumn();
   $candidate="PO-".($max+1+$attempt);
   try{
    $pdo->prepare("INSERT INTO production_orders(order_id,product_id,quantity,shoe_size_cm,start_date,priority,status,eta_label) VALUES(?,?,?,?,?,?,'planning',?)")->execute([$candidate,$productId,$quantity,$size,$startDate,$priority,$eta]);
    $orderId=$candidate;break;
   }catch(PDOException $e){if($e->getCode()!=="23000")throw $e;}
  }
  if($orderId===null){$pdo->rollBack();fail("Could not allocate an order number — please try again.",409);}
  $pdo->prepare("INSERT INTO production_monitoring(order_id,progress_percent) VALUES(?,10)")->execute([$orderId]);
  foreach($mats as $l)$pdo->prepare("INSERT IGNORE INTO checklist_items(order_id,material_id,ready) VALUES(?,?,0)")->execute([$orderId,$l["material_id"]]);
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 log_activity($pdo,"created $orderId — {$product['product_name']} size ".size_label($size)." x$quantity",$orderId);
 json_response(["success"=>true,"message"=>"Production order $orderId created.","order"=>order_detail($pdo,$orderId)]);
}
if($action==="set_stage"||$action==="update"){
 $s=$pdo->prepare("SELECT * FROM production_orders WHERE order_id=?");$s->execute([post_value("order_id")]);$order=$s->fetch();
 if(!$order)fail("Order not found.",404);
 $status=post_value("status");
 if($status!==""){
  need_choice($status,"Stage",array_keys(STAGE_LABEL));
  if($status==="quality_check")fail("Use \"Finish production\" on the order to send it to Quality check.",409);
  if($status==="completed")fail("An order is completed when its accepted finished goods are sent to Inventory.",409);
  if(!in_array($order["status"],["planning","materials","production"],true))fail("This order is already in ".STAGE_LABEL[$order["status"]]." and can't be moved back.",409);
  if($status!==$order["status"]){
   if($status==="production"){
    $short=[];foreach(order_material_check($pdo,$order["order_id"]) as $c)if(!$c["enough"])$short[]=$c["material"]." (need ".format_qty($c["needed"]).", available ".format_qty($c["available"])." ".$c["unit"].")";
    if($short)fail("Not enough materials to start production: ".implode("; ",$short).". Request them from Inventory first.",409);
   }
   $pdo->beginTransaction();
   try{
    $pdo->prepare("UPDATE production_orders SET status=? WHERE order_id=? AND status IN ('planning','materials','production')")->execute([$status,$order["order_id"]]);
    $pdo->prepare("UPDATE production_monitoring SET progress_percent=?,updated_at=NOW() WHERE order_id=?")->execute([STAGE_PROGRESS[$status],$order["order_id"]]);
    if($status==="production")$pdo->prepare("UPDATE checklist_items SET ready=1 WHERE order_id=?")->execute([$order["order_id"]]);
    $pdo->commit();
   }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
   log_activity($pdo,"moved {$order['order_id']} to ".STAGE_LABEL[$status],$order["order_id"]);
  }
 }
 $priority=post_value("priority");
 if($priority!==""){need_choice($priority,"Priority",["normal","urgent"]);$pdo->prepare("UPDATE production_orders SET priority=? WHERE order_id=?")->execute([$priority,$order["order_id"]]);}
 json_response(["success"=>true,"message"=>"Order updated.","order"=>order_detail($pdo,$order["order_id"])]);
}
if($action==="finish_production"){
 $s=$pdo->prepare("SELECT * FROM production_orders WHERE order_id=?");$s->execute([post_value("order_id")]);$order=$s->fetch();
 if(!$order)fail("Order not found.",404);
 if($order["status"]!=="production")fail("Only an order that is in the Production stage can be finished.",409);
 $produced=need_whole(post_value("produced_qty",(string)$order["quantity"]),"Quantity produced",1,(int)$order["quantity"]);
 $pdo->beginTransaction();
 try{
  $lk=$pdo->prepare("SELECT status FROM production_orders WHERE order_id=? FOR UPDATE");$lk->execute([$order["order_id"]]);
  if($lk->fetchColumn()!=="production")fail_in_tx($pdo,"This order was already finished.",409);
  $short=consume_materials_for_order($pdo,$order["order_id"],$produced);
  if($short)fail_in_tx($pdo,"Not enough materials in the Materials inventory to finish this order: ".implode("; ",$short).". Add or request the missing stock first.",409);
  $pdo->prepare("UPDATE production_orders SET status='quality_check' WHERE order_id=?")->execute([$order["order_id"]]);
  $pdo->prepare("UPDATE production_monitoring SET progress_percent=?,updated_at=NOW() WHERE order_id=?")->execute([STAGE_PROGRESS["quality_check"],$order["order_id"]]);
  $q=$pdo->prepare("SELECT status FROM quality_checks WHERE order_id=?");$q->execute([$order["order_id"]]);$qc=$q->fetch();
  if(!$qc)$pdo->prepare("INSERT INTO quality_checks(order_id,produced_qty,status) VALUES(?,?,'pending_review')")->execute([$order["order_id"],$produced]);
  elseif($qc["status"]==="pending_review")$pdo->prepare("UPDATE quality_checks SET produced_qty=? WHERE order_id=?")->execute([$produced,$order["order_id"]]);
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 notify($pdo,"qc","{$order['order_id']} finished production — pending quality review",$order["order_id"]);
 log_activity($pdo,"finished production of {$order['order_id']} — $produced produced, sent to Quality check",$order["order_id"]);
 json_response(["success"=>true,"message"=>"Production finished — {$order['order_id']} sent to Quality check.","order"=>order_detail($pdo,$order["order_id"])]);
}
json_response(["success"=>false,"message"=>"Invalid order action."],400);
?>
