<?php
require_once "database.php"; require_once "helpers.php"; require_login();
ensure_request_flow($pdo);
$action=$_REQUEST["action"]??"list";

function load_fg($pdo,$id){
 $s=$pdo->prepare("SELECT fg.*,po.shoe_size_cm,po.status order_status FROM finished_goods fg LEFT JOIN production_orders po ON po.order_id=fg.order_id WHERE fg.fg_id=?");$s->execute([$id]);
 return $s->fetch();
}

if($action==="list"){
 sync_requests_from_inventory($pdo);
 $rows=$pdo->query("SELECT fg.*,p.product_name product,po.shoe_size_cm FROM finished_goods fg JOIN products p ON p.product_id=fg.product_id LEFT JOIN production_orders po ON po.order_id=fg.order_id ORDER BY fg.fg_id DESC")->fetchAll();
 $inv=$pdo->prepare("SELECT r.request_number,r.delivery_status,ri.delivered_quantity,ri.accepted_quantity FROM requests r JOIN request_items ri ON ri.request_id=r.id JOIN items ii ON ii.id=ri.item_id JOIN products p ON LOWER(TRIM(p.product_name))=LOWER(TRIM(ii.item_name)) WHERE r.id=? AND p.product_id=? LIMIT 1");
 foreach($rows as &$r){
  $r["size_label"]=size_label($r["shoe_size_cm"]);
  $sz=($r["status"]==="ready")?inventory_item_for_size($pdo,$r["product"],$r["shoe_size_cm"]):null;if($sz)$r["item_code"]=$sz["item_code"];
  $r["request_number"]=null;$r["need"]=null;$r["short"]=0;$r["note"]="";$r["confirm"]="";$r["can_send"]=false;$r["inventory_note"]="";
  if($r["status"]==="ready"){
   $plan=fg_resolve_plan($pdo,$r);
   if(!$plan||$plan["need"]<=0){
    $r["note"]=($plan&&!empty($plan["auto"]))?("Inventory request ".$plan["request_number"]." was already delivered when production approved it, so these units are not sent again and stay in production stock."):($plan?("Inventory request ".$plan["request_number"]." needs no more units (".$plan["already"]." of ".$plan["target"]." already delivered or the request is closed). These units stay in production."):"Not linked to an open Inventory product request. Inventory's API has no stock-in, so these goods cannot be sent and stay in production.");
   }else{
    $r["can_send"]=$plan["short"]<=0;
    $r["request_number"]=$plan["request_number"];$r["need"]=$plan["need"];$r["short"]=$plan["short"];
    $exTotal=0;$orders=[];foreach($plan["parts"] as $p){$exTotal+=$p["excess"];$orders[]=$p["fg"]["order_id"];}
    if($plan["short"]>0){
     $r["note"]="Request ".$plan["request_number"]." needs ".$plan["need"]." but only ".$plan["avail"]." accepted (same product and size) - short by ".$plan["short"].". Make a new production order of this product and size, then send.";
    }else{
     $r["note"]="For request ".$plan["request_number"]." (needs ".$plan["need"].")".(count($orders)>1?" - combined with ".implode(", ",array_slice($orders,1)):"").($exTotal>0?" - $exTotal excess stays in production":"");
     $r["confirm"]="Report ".$plan["need"]." unit(s) as delivered to Inventory request ".$plan["request_number"].(count($orders)>1?" (combining ".implode(", ",$orders).")":"").($exTotal>0?"? The excess $exTotal unit(s) stay in production (Inventory's API cannot take plain stock).":"?");
    }
   }
  }elseif($r["status"]==="sent_to_inventory"&&$r["request_id"]){
   $inv->execute([$r["request_id"],$r["product_id"]]);$x=$inv->fetch();
   if($x)$r["inventory_note"]="Inventory ".$x["request_number"].": delivered ".format_qty($x["delivered_quantity"]).", accepted ".format_qty($x["accepted_quantity"]).($x["delivery_status"]?" (".$x["delivery_status"].")":"");
  }
 }unset($r);
 json_response(["success"=>true,"rows"=>$rows,"api_error"=>$_SESSION["inv_api_error"]??null]);
}
if($action==="send"){
 $fg=load_fg($pdo,(int)post_value("id"));
 if(!$fg)fail("Finished goods record not found.",404);
 if($fg["status"]==="sent_to_inventory")fail("Already sent.",409);
 if(!sync_requests_from_inventory($pdo,true))fail("Production cannot reach Inventory's API right now, so nothing was sent: ".($_SESSION["inv_api_error"]??"no answer").". Try again in a moment.",503);
 $plan=fg_resolve_plan($pdo,$fg);
 if(!$plan)fail("These goods are not linked to an open Inventory product request. Inventory's API has no stock-in function, so finished goods can only be delivered against a product request from Inventory (Material issuance -> Product requests). They stay here until then.",409);
 if($plan["need"]<=0&&!empty($plan["auto"]))fail("Inventory request {$plan['request_number']} was already delivered when production approved it, so these goods are not sent again. They stay in production.",409);
 if($plan["need"]<=0)fail("Inventory request {$plan['request_number']} needs no more units ({$plan['already']} of {$plan['target']} already delivered, or the request is closed). These goods stay in production.",409);
 if($plan["short"]>0)fail("Not enough finished goods for Inventory request {$plan['request_number']}: it needs {$plan['need']} but only {$plan['avail']} accepted pair(s) of this product and size are ready (short by {$plan['short']}). It cannot be sent. Create a new production order of the same product and size, finish it, then send again.",409);
 $parts=$plan["parts"];
 $pdo->beginTransaction();
 try{
  foreach($parts as $p){
   $f=$p["fg"];
   $l=$pdo->prepare("SELECT status FROM finished_goods WHERE fg_id=? FOR UPDATE");$l->execute([$f["fg_id"]]);
   if($l->fetchColumn()==="sent_to_inventory"){$pdo->rollBack();fail("Already sent.",409);}
   $o=$pdo->prepare("SELECT status FROM production_orders WHERE order_id=? FOR UPDATE");$o->execute([$f["order_id"]]);
   if(!in_array($o->fetchColumn(),["quality_check","completed"],true)){$pdo->rollBack();fail("Order {$f['order_id']} is not waiting to be sent to Inventory.",409);}
  }
  foreach($parts as $p){
   $f=$p["fg"];
   $pdo->prepare("UPDATE finished_goods SET status='sent_to_inventory',sent_at=NOW(),request_qty=?,excess_qty=?,request_id=? WHERE fg_id=?")->execute([(int)$p["use"],(int)$p["excess"],$plan["request_id"],$f["fg_id"]]);
   $pdo->prepare("UPDATE production_orders SET status='completed' WHERE order_id=?")->execute([$f["order_id"]]);
  }
  try{report_finished_goods_to_inventory($pdo,$plan);}
  catch(Throwable $e){fail_in_tx($pdo,"Inventory did not accept the delivery, so nothing was sent: ".$e->getMessage(),($e instanceof InventoryApiError&&$e->httpStatus>=400&&$e->httpStatus<500&&$e->httpStatus!==401)?409:502);}
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 refresh_inventory_request($pdo,$plan["request_number"]);
 $exTotal=0;$sentTotal=0;$orders=[];
 foreach($parts as $p){$sentTotal+=$p["use"];$exTotal+=$p["excess"];$orders[]=$p["fg"]["order_id"];}
 $orderTxt=implode(", ",$orders);
 notify($pdo,"success","$sentTotal units of $orderTxt delivered to Inventory request {$plan['request_number']}".($exTotal>0?" ($exTotal excess stay in production)":""),$fg["order_id"]);
 log_activity($pdo,"delivered $sentTotal units of $orderTxt to Inventory request {$plan['request_number']}".($exTotal>0?" (excess $exTotal kept)":""),$fg["order_id"]);
 json_response(["success"=>true,"message"=>"Reported $sentTotal unit(s) as delivered to Inventory request {$plan['request_number']}. Inventory now records how many it accepted (Delivery Progress).".($exTotal>0?" The excess $exTotal unit(s) stay in production — Inventory's API cannot take plain stock.":"")]);
}
json_response(["success"=>false,"message"=>"Invalid finished goods action."],400);
?>
