<?php
require_once "database.php"; require_once "helpers.php"; require_login();
ensure_request_flow($pdo);
$action=$_REQUEST["action"]??"list";

function api_fail_code($e){return($e instanceof InventoryApiError&&$e->httpStatus>=400&&$e->httpStatus<500&&$e->httpStatus!==401)?422:502;}

if($action==="list"){
 sync_requests_from_inventory($pdo);
 $sql="SELECT mr.*,i.item_name material FROM material_requests mr JOIN items i ON i.id=mr.material_id WHERE 1=1";$a=[];
 if(!empty($_GET["order"])){$sql.=" AND mr.order_id=?";$a[]=$_GET["order"];}
 if(!empty($_GET["status"])){$sql.=" AND mr.status=?";$a[]=$_GET["status"];}
 $sql.=" ORDER BY mr.requested_at DESC,mr.request_id DESC";
 $s=$pdo->prepare($sql);$s->execute($a);
 $rows=$s->fetchAll();
 foreach($rows as &$r){
  $r["inventory_ref"]=$r["inventory_request_number"];
  if($r["status"]==="approved"){$st=material_delivery_state($pdo,$r);$r["can_accept"]=$st["can_accept"];$r["delivery_status"]=$st["delivery_status"];$r["delivery_note"]=$st["note"];}
 }unset($r);
 json_response(["success"=>true,"rows"=>$rows,"api_error"=>$_SESSION["inv_api_error"]??null]);
}
if($action==="incoming"){
 sync_requests_from_inventory($pdo);
 $s=$pdo->query("SELECT mr.request_id,mr.order_id,mr.material_id,mr.quantity,mr.qty_value,mr.approved_qty,mr.inventory_request_number,mr.priority,mr.requested_at,i.item_name material,r.request_number inv_ref,r.status inv_status,r.delivery_status FROM material_requests mr JOIN items i ON i.id=mr.material_id LEFT JOIN requests r ON r.request_number=mr.inventory_request_number WHERE mr.status='approved' ORDER BY mr.requested_at,mr.request_id");
 $rows=$s->fetchAll();
 foreach($rows as &$r){$st=material_delivery_state($pdo,$r);$r["can_accept"]=$st["can_accept"];$r["delivery_note"]=$st["note"];unset($r["material_id"],$r["qty_value"],$r["inventory_request_number"]);}
 unset($r);
 json_response(["success"=>true,"rows"=>$rows,"api_error"=>$_SESSION["inv_api_error"]??null]);
}
if($action==="debug"){
 require_supervisor();
 $q=$pdo->prepare("SELECT * FROM material_requests WHERE request_id=?");$q->execute([(int)($_GET["id"]??0)]);$req=$q->fetch();
 if(!$req)fail("Request not found.",404);
 $o=["production_request"=>$req,"delivery_state"=>material_delivery_state($pdo,$req)];
 try{$o["inventory_api_request"]=inv_api_requests((string)$req["inventory_request_number"]);}catch(Throwable $e){$o["inventory_api_request"]="ERROR: ".$e->getMessage();}
 try{$o["inventory_api_delivery"]=inv_api_deliveries((string)$req["inventory_request_number"]);}catch(Throwable $e){$o["inventory_api_delivery"]="ERROR: ".$e->getMessage();}
 header("Content-Type: application/json; charset=utf-8");echo json_encode($o,JSON_PRETTY_PRINT|JSON_INVALID_UTF8_SUBSTITUTE);exit;
}

function prepare_material_line($pdo,$map,$materialId,$qty){
 $materialId=$map[$materialId]??$materialId;
 $s=$pdo->prepare("SELECT item_name,unit FROM items WHERE id=? AND item_type='Raw Material' AND status='Active'");$s->execute([$materialId]);$material=$s->fetch();
 if(!$material)fail("Material not found.",404);
 return [$materialId,$material,(int)ceil($qty-0.00001)];
}
function save_material_request($pdo,$orderId,$materialId,$material,$qtyWhole,$priority,$num){
 $label=format_qty($qtyWhole)." ".$material["unit"];
 try{$pdo->prepare("INSERT INTO material_requests(order_id,material_id,quantity,qty_value,priority,status,inventory_request_number) VALUES(?,?,?,?,?,'pending',?)")->execute([$orderId,$materialId,$label,$qtyWhole,$priority,$num]);}
 catch(Throwable $e){error_log("material request $num filed with Inventory but not saved locally: ".$e->getMessage());fail("The request was filed with Inventory as $num, but production could not save it here. Tell the supervisor and quote $num.",500);}
 return $label;
}

if($action==="create"){
 $orderId=post_value("order_id");
 if($orderId==="")fail("Choose a production order.");
 $materialId=need_whole(post_value("material_id"),"Material",1);
 $qty=need_decimal(post_value("quantity"),"Quantity",0.01);
 $priority=need_choice(post_value("priority","normal"),"Priority",["normal","urgent"]);
 $s=$pdo->prepare("SELECT * FROM production_orders WHERE order_id=?");$s->execute([$orderId]);$order=$s->fetch();
 if(!$order)fail("Order not found.",404);
 if($order["status"]==="completed")fail("This order is already completed — materials can't be requested for it.",409);
 [$materialId,$material,$whole]=prepare_material_line($pdo,raw_material_canonical_map($pdo),$materialId,$qty);
 try{$num=submit_material_request_to_inventory($pdo,$orderId,$materialId,$whole,$order["start_date"],$priority);}
 catch(Throwable $e){fail("Inventory did not accept the request: ".$e->getMessage(),api_fail_code($e));}
 $label=save_material_request($pdo,$orderId,$materialId,$material,$whole,$priority,$num);
 log_activity($pdo,"requested $label of {$material['item_name']} for $orderId (Inventory $num)",$orderId);
 json_response(["success"=>true,"message"=>"Material request submitted to Inventory ($num).".(abs($whole-$qty)>0.0001?" Inventory takes whole numbers only, so ".format_qty($qty)." was sent as ".format_qty($whole).".":"")]);
}
if($action==="create_multi"){
 $orderId=post_value("order_id");
 if($orderId==="")fail("Choose a production order.");
 $priority=need_choice(post_value("priority","normal"),"Priority",["normal","urgent"]);
 $items=json_decode(post_value("items"),true);
 if(!is_array($items)||!$items)fail("Add at least one material.");
 if(count($items)>20)fail("You can request at most 20 materials at a time.");
 $s=$pdo->prepare("SELECT * FROM production_orders WHERE order_id=?");$s->execute([$orderId]);$order=$s->fetch();
 if(!$order)fail("Order not found.",404);
 if($order["status"]==="completed")fail("This order is already completed — materials can't be requested for it.",409);
 $map=raw_material_canonical_map($pdo);$lines=[];$seen=[];
 foreach($items as $it){
  if(!is_array($it))fail("The material list is not valid.");
  $mid=need_whole((string)($it["material_id"]??""),"Material",1);
  $mid=$map[$mid]??$mid;
  $find=$pdo->prepare("SELECT item_name FROM items WHERE id=?");$find->execute([$mid]);$nm=$find->fetchColumn();
  if(isset($seen[$mid]))fail(($nm?:"A material")." is listed more than once — use one line per material.");
  $seen[$mid]=1;
  $qty=need_decimal((string)($it["quantity"]??""),($nm?:"Material")." quantity",0.01);
  $lines[]=prepare_material_line($pdo,$map,$mid,$qty);
 }
 $filed=[];
 foreach($lines as $l){
  try{$num=submit_material_request_to_inventory($pdo,$orderId,$l[0],$l[2],$order["start_date"],$priority);}
  catch(Throwable $e){
   $msg="Inventory did not accept the request for {$l[1]['item_name']}: ".$e->getMessage();
   if($filed)$msg.=" — ".count($filed)." earlier request(s) WERE filed (".implode(", ",$filed)."); do not file those again.";
   fail($msg,api_fail_code($e));
  }
  $label=save_material_request($pdo,$orderId,$l[0],$l[1],$l[2],$priority,$num);
  $filed[]=$num;
  log_activity($pdo,"requested $label of {$l[1]['item_name']} for $orderId (Inventory $num)",$orderId);
 }
 json_response(["success"=>true,"message"=>count($lines)." material requests submitted to Inventory (".implode(", ",$filed).")."]);
}
if($action==="set_status"){
 $status=post_value("status");
 if(!in_array($status,["approved","issued","rejected"],true))fail("Status must be issued or rejected. Approval comes from Inventory.",400);
 $pdo->beginTransaction();
 try{
  $l=$pdo->prepare("SELECT * FROM material_requests WHERE request_id=? FOR UPDATE");$l->execute([(int)post_value("id")]);$req=$l->fetch();
  if(!$req){$pdo->rollBack();fail("Request not found.",404);}
  $from=$req["status"];
  if($from===$status||($from==="issued"))fail_in_tx($pdo,$from==="issued"?"This request was already received and can't be changed.":"This request is already $status.",409);
  $ok=($from==="pending"&&$status==="rejected")||($from==="approved"&&in_array($status,["issued","rejected"],true));
  if(!$ok)fail_in_tx($pdo,$status==="approved"?"Only Inventory can approve a request — it will show here as soon as Inventory approves it.":"A $from request can't be moved to $status.",409);
  $accepted=null;
  if($status==="issued"){
   $accepted=receive_materials_from_inventory($pdo,$req);
   if(!is_float($accepted))fail_in_tx($pdo,(string)$accepted,409);
   $pdo->prepare("UPDATE material_requests SET status='issued',issued_at=NOW(),accepted_qty=? WHERE request_id=?")->execute([$accepted,$req["request_id"]]);
   add_material_stock($pdo,$req["material_id"],$accepted);
  }else{
   if($from==="pending"&&!empty($req["inventory_request_number"])){
    try{inv_api_approve($req["inventory_request_number"],"Disapproved");}
    catch(Throwable $e){fail_in_tx($pdo,"Inventory could not cancel the request: ".$e->getMessage(),409);}
   }
   $pdo->prepare("UPDATE material_requests SET status='rejected' WHERE request_id=?")->execute([$req["request_id"]]);
  }
  $pdo->commit();
 }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
 if($status==="issued"){
  $nm=$pdo->prepare("SELECT item_name FROM items WHERE id=?");$nm->execute([$req["material_id"]]);
  notify($pdo,"success","Received ".format_qty($accepted)." of ".($nm->fetchColumn()?:"material")." from Inventory for {$req['order_id']} — added to Materials inventory",$req["order_id"]);
 }
 if($status==="rejected")notify($pdo,"warning","Material request #{$req['request_id']} for {$req['order_id']} was ".($from==="pending"?"cancelled":"marked not received"),$req["order_id"]);
 log_activity($pdo,"$status material request #{$req['request_id']} for {$req['order_id']}",$req["order_id"]);
 $msgs=["issued"=>"Materials accepted — Inventory was told the delivery was received and ".format_qty($accepted)." were added to the Materials inventory.","rejected"=>$from==="pending"?"Request cancelled (Inventory disapproved it).":"Marked as not received."];
 json_response(["success"=>true,"message"=>$msgs[$status],"status"=>$status]);
}
json_response(["success"=>false,"message"=>"Invalid request action."],400);
?>
