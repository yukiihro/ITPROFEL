<?php
require_once "database.php"; require_once "helpers.php"; require_login();
if(($_SESSION["role"]??"")==="production_supervisor")fail("The materials checklist is for production staff, not supervisors.",403);
$action=$_REQUEST["action"]??"list";

function checklist_for($pdo,$orderId){
 $s=$pdo->prepare("SELECT ci.material_id,i.item_name material,ci.ready,bm.qty_per_unit*po.quantity qty,bm.unit FROM checklist_items ci JOIN items i ON i.id=ci.material_id JOIN production_orders po ON po.order_id=ci.order_id JOIN bill_of_materials bm ON bm.product_id=po.product_id AND bm.material_id=ci.material_id WHERE ci.order_id=? ORDER BY i.item_name");
 $s->execute([$orderId]);$items=$s->fetchAll();$ready=0;$chk=order_material_check($pdo,$orderId);$short=0;
 foreach($items as &$i){
  $i["ready"]=(bool)$i["ready"];$i["qty_label"]=format_qty($i["qty"])." ".$i["unit"];if($i["ready"])$ready++;
  $c=$chk[(int)$i["material_id"]]??null;
  $i["on_hand_label"]=format_qty($c?$c["available"]:0)." ".$i["unit"];
  $i["enough"]=$c?$c["enough"]:false;$i["short_label"]=$c&&!$c["enough"]?format_qty($c["short_by"])." ".$i["unit"]:"";
  if(!$i["enough"])$short++;
 }
 return ["order_id"=>$orderId,"ready_count"=>$ready,"total_count"=>count($items),"all_ready"=>count($items)>0&&$ready===count($items),"short_count"=>$short,"all_enough"=>count($items)>0&&$short===0,"items"=>$items];
}

if($action==="list"){
 $orders=$pdo->query("SELECT po.order_id,p.product_name product,po.shoe_size_cm,po.status FROM production_orders po JOIN products p ON p.product_id=po.product_id WHERE po.status!='completed' ORDER BY po.created_at DESC,po.order_id DESC")->fetchAll();
 foreach($orders as &$o){$o["status_label"]=STAGE_LABEL[$o["status"]];$o["size_label"]=size_label($o["shoe_size_cm"]);$o["checklist"]=checklist_for($pdo,$o["order_id"]);}
 json_response(["success"=>true,"orders"=>$orders]);
}
if($action==="get"){
 $id=$_GET["order_id"]??"";$c=checklist_for($pdo,$id);if(!$c["total_count"])fail("No checklist for this order.",404);
 json_response(array_merge(["success"=>true],$c));
}
if($action==="toggle"){
 $orderId=post_value("order_id");$materialId=(int)post_value("material_id");$rv=post_value("ready");
 if($rv!=="0"&&$rv!=="1"&&$rv!=="true"&&$rv!=="false")fail("ready must be true or false.");
 $ready=($rv==="1"||$rv==="true")?1:0;
 if($ready){
  $chk=order_material_check($pdo,$orderId);$c=$chk[$materialId]??null;
  if($c&&!$c["enough"])fail("Not enough {$c['material']} in the Materials inventory — need ".format_qty($c["needed"])." {$c['unit']}, available ".format_qty($c["available"]).". Request it from Inventory first.",409);
 }
 $s=$pdo->prepare("SELECT 1 FROM checklist_items WHERE order_id=? AND material_id=?");$s->execute([$orderId,$materialId]);
 if(!$s->fetch())fail("Checklist row not found.",404);
 $pdo->prepare("UPDATE checklist_items SET ready=? WHERE order_id=? AND material_id=?")->execute([$ready,$orderId,$materialId]);
 $n=$pdo->prepare("SELECT item_name FROM items WHERE id=?");$n->execute([$materialId]);$name=$n->fetchColumn()?:"material";
 log_activity($pdo,"marked $name ".($ready?"ready":"not ready")." for $orderId",$orderId);
 $sync=sync_order_stage_from_checklist($pdo,$orderId);
 $c=checklist_for($pdo,$orderId);
 json_response(["success"=>true,"order_id"=>$orderId,"material_id"=>$materialId,"ready"=>(bool)$ready,"ready_count"=>$c["ready_count"],"total_count"=>$c["total_count"],"all_ready"=>$c["all_ready"],"order_status"=>$sync["status"],"status_label"=>STAGE_LABEL[$sync["status"]]??null,"stage_changed"=>$sync["changed"],"progress_percent"=>$sync["progress_percent"]]);
}
json_response(["success"=>false,"message"=>"Invalid checklist action."],400);
?>
