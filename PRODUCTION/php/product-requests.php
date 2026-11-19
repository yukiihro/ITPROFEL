<?php
require_once "database.php"; require_once "helpers.php"; require_login();
ensure_request_flow($pdo);
$action=$_REQUEST["action"]??"list";

if($action==="list"){
 sync_requests_from_inventory($pdo);
 notify_new_product_requests($pdo);
 $sql="SELECT r.id,r.request_number,r.status,r.delivery_status,r.remarks,r.recipient_name,r.expected_receive_date,r.request_date,r.created_at,r.approved_at,
   ri.item_name,ri.quantity,ri.approved_quantity,ri.delivered_quantity,ri.accepted_quantity,ri.unit,COALESCE(NULLIF(ri.size,''),i.size,'') size,i.item_code,p.product_id,po.order_id,po.status order_status,po.delivered_on_approval auto_delivered,fg.status fg_status,fg.accepted_qty,
   (SELECT COALESCE(SUM(f.request_qty),0) FROM finished_goods f WHERE f.request_id=r.id AND f.status='sent_to_inventory') sent_qty
  FROM requests r JOIN request_items ri ON ri.request_id=r.id
  LEFT JOIN production_orders po ON po.request_id=r.id
  LEFT JOIN finished_goods fg ON fg.order_id=po.order_id
  LEFT JOIN items i ON i.id=ri.item_id
  LEFT JOIN products p ON LOWER(TRIM(p.product_name))=LOWER(TRIM(i.item_name))
  WHERE ".product_request_where()." ORDER BY (r.status='Pending') DESC,r.created_at DESC,r.id DESC LIMIT 200";
 $rows=$pdo->query($sql)->fetchAll();
 foreach($rows as &$r){
  $target=(float)$r["approved_quantity"]>0?(float)$r["approved_quantity"]:(float)$r["quantity"];$sent=(float)$r["sent_qty"];$acc=(float)$r["accepted_quantity"];$dl=(float)$r["delivered_quantity"];
  if($r["status"]==="Disapproved"){$r["stage"]="Declined";$r["tone"]="urgent";}
  elseif(!empty($r["auto_delivered"])&&$r["order_id"]){
   $r["stage"]=($acc+0.0001>=$target&&$target>0)?"Delivered — Inventory accepted ".format_qty($acc):"Approved & delivered ".format_qty($dl>0?$dl:$target)." — waiting for Inventory to record receipt (production ".$r["order_id"]." still in progress)";
   $r["tone"]=($acc+0.0001>=$target&&$target>0)?"success":"info";
  }
  elseif($r["status"]==="Pending"&&!$r["order_id"]){$r["stage"]="Waiting for your approval";$r["tone"]="neutral";}
  elseif($r["status"]==="Pending"){$r["stage"]="In production — ".$r["order_id"];$r["tone"]="neutral";}
  elseif($sent+0.0001>=$target&&$target>0){
   if($acc+0.0001>=$target){$r["stage"]="Delivered — Inventory accepted ".format_qty($acc);$r["tone"]="success";}
   else{$r["stage"]="Delivered ".format_qty($dl)." — waiting for Inventory to record receipt".($acc>0?" (accepted so far: ".format_qty($acc).")":"");$r["tone"]="info";}
  }
  elseif($r["order_id"]){
   if($r["fg_status"]==="ready")$r["stage"]="Finished — send it in Finished goods";
   elseif($r["fg_status"]==="sent_to_inventory")$r["stage"]="Short: ".format_qty($sent)." of ".format_qty($target)." delivered — ".$r["order_id"];
   else $r["stage"]="In production — ".$r["order_id"];
   $r["tone"]=($r["fg_status"]==="sent_to_inventory")?"urgent":"neutral";
  }
  else{$r["stage"]="Approved — no production order";$r["tone"]="neutral";}
  $r["can_decide"]=($r["status"]==="Pending"&&!$r["order_id"]);
 }unset($r);
 json_response(["success"=>true,"rows"=>$rows,"api_error"=>$_SESSION["inv_api_error"]??null]);
}

if($action==="approve"){
 $id=need_whole(post_value("id"),"Request",1);
 sync_products_from_inventory($pdo);
 if(!sync_requests_from_inventory($pdo,true))fail("Production cannot reach Inventory's API right now, so the request cannot be approved: ".($_SESSION["inv_api_error"]??"no answer").". Try again in a moment.",503);
 $c=$pdo->prepare("SELECT r.id,r.request_number,r.status,ri.item_name,ri.quantity,ri.unit,COALESCE(NULLIF(ri.size,''),i.size,'') size,p.product_id,i.status item_status
  FROM requests r JOIN request_items ri ON ri.request_id=r.id
  LEFT JOIN items i ON i.id=ri.item_id
  LEFT JOIN products p ON LOWER(TRIM(p.product_name))=LOWER(TRIM(i.item_name))
  WHERE r.id=? AND ".product_request_where()." ORDER BY ri.id LIMIT 1");
 $c->execute([$id]);$req=$c->fetch();
 if(!$req)fail("This is not a product request for production (or it no longer exists).",404);
 if($req["status"]!=="Pending")fail("This request was already ".strtolower($req["status"])." — it can't be changed.",409);
 $o=$pdo->prepare("SELECT order_id FROM production_orders WHERE request_id=?");$o->execute([$id]);$have=$o->fetchColumn();
 if($have)fail("Already in production as $have.",409);
 if(!$req["product_id"])fail("No production product is linked to \"".$req["item_name"]."\" yet. Add it in Products (Inventory finished good + bill of materials) first.",409);
 if($req["item_status"]===null||strtolower((string)$req["item_status"])!=="active")fail("This product's finished-good item is not active in Inventory, so it can't be produced.",409);
 $m=$pdo->prepare("SELECT COUNT(*) FROM bill_of_materials bm JOIN items i ON i.id=bm.material_id WHERE bm.product_id=?");$m->execute([$req["product_id"]]);
 if(!(int)$m->fetchColumn())fail("This product has no bill of materials, so an order can't be created. Add raw materials in Inventory first.",409);
 $qty=(int)round((float)$req["quantity"]);if($qty<1||$qty>100000)fail("The requested quantity ({$req['quantity']}) can't be turned into a production order.",409);
 if(!preg_match('/(\d{2}(?:\.\d)?)/',(string)$req["size"],$mm))fail("The request has no shoe size (\"".$req["size"]."\"), which a production order needs. Ask Inventory to include the size.",409);
 $size=round(((float)$mm[1])*2)/2;if($size<SHOE_SIZE_MIN||$size>SHOE_SIZE_MAX)fail("Shoe size $size is outside the ".SHOE_SIZE_MIN."–".SHOE_SIZE_MAX." cm range a production order accepts.",409);
 $ap=[];$li=$pdo->prepare("SELECT id,quantity FROM request_items WHERE request_id=?");$li->execute([$id]);
 foreach($li->fetchAll() as $x)$ap[(int)$x["id"]]=(int)ceil((float)$x["quantity"]);
 $pdo->beginTransaction();
 try{
  $l=$pdo->prepare("SELECT status FROM requests WHERE id=? FOR UPDATE");$l->execute([$id]);
  if($l->fetchColumn()!=="Pending")fail_in_tx($pdo,"This request is no longer pending.",409);
  $o->execute([$id]);if($o->fetchColumn())fail_in_tx($pdo,"This request already has a production order.",409);
  $orderId=create_order_for_request($pdo,(int)$req["product_id"],$qty,$size,$id);
  try{inv_api_approve($req["request_number"],"Approved",$ap,$orderId);}
  catch(Throwable $e){fail_in_tx($pdo,"Inventory did not accept the approval: ".$e->getMessage(),($e instanceof InventoryApiError&&$e->httpStatus>=400&&$e->httpStatus<500&&$e->httpStatus!==401)?409:502);}
  $pdo->prepare("UPDATE requests SET status='Approved',approved_at=NOW() WHERE id=?")->execute([$id]);
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 refresh_inventory_request($pdo,$req["request_number"]);
 $what=format_qty($req["quantity"])." ".$req["unit"]." of ".$req["item_name"];
 notify($pdo,"success","Product request ".$req["request_number"]." ($what) approved — production order $orderId created. Delivery will be reported only after Finished Goods is completed.",$orderId);
 log_activity($pdo,"approved Inventory product request ".$req["request_number"]." ($what), created $orderId; delivery waits for completed Finished Goods",$orderId);
 json_response(["success"=>true,"message"=>"Request approved and production order $orderId was created. Inventory Delivery Progress will remain To Ship until production is completed and the finished goods are sent from Finished Goods.","order_id"=>$orderId,"status"=>"Approved","delivered"=>false]);
}

if($action==="decline"){
 $id=need_whole(post_value("id"),"Request",1);
 if(!sync_requests_from_inventory($pdo,true))fail("Production cannot reach Inventory's API right now, so the request cannot be declined: ".($_SESSION["inv_api_error"]??"no answer").". Try again in a moment.",503);
 $c=$pdo->prepare("SELECT r.id,r.request_number,r.status,ri.item_name,ri.quantity,ri.unit FROM requests r JOIN request_items ri ON ri.request_id=r.id WHERE r.id=? AND ".product_request_where()." ORDER BY ri.id LIMIT 1");
 $c->execute([$id]);$req=$c->fetch();
 if(!$req)fail("This is not a product request for production (or it no longer exists).",404);
 $o=$pdo->prepare("SELECT order_id FROM production_orders WHERE request_id=?");$o->execute([$id]);
 if($o->fetchColumn())fail("A production order was already created for this request, so it can't be declined.",409);
 if($req["status"]!=="Pending")fail("This request was already ".strtolower($req["status"])." — it can't be changed.",409);
 try{inv_api_approve($req["request_number"],"Disapproved");}
 catch(Throwable $e){fail("Inventory did not accept the decline: ".$e->getMessage(),($e instanceof InventoryApiError&&$e->httpStatus>=400&&$e->httpStatus<500&&$e->httpStatus!==401)?409:502);}
 $pdo->prepare("UPDATE requests SET status='Disapproved',approved_at=NOW() WHERE id=? AND status='Pending'")->execute([$id]);
 refresh_inventory_request($pdo,$req["request_number"]);
 $what=format_qty($req["quantity"])." ".$req["unit"]." of ".$req["item_name"];
 notify($pdo,"warning","Product request ".$req["request_number"]." ($what) was declined by production");
 log_activity($pdo,"declined Inventory product request ".$req["request_number"]." ($what)");
 json_response(["success"=>true,"message"=>"Product request declined.","status"=>"Disapproved"]);
}
json_response(["success"=>false,"message"=>"Invalid request action."],400);
?>
