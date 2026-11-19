<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$action=$_REQUEST["action"]??"list";
if($action==="add"){
 $materialId=need_whole(post_value("material_id"),"Material",1);
 $mode=need_choice(post_value("mode","add"),"Mode",["add","set"]);
 if($mode==="set")require_supervisor();
 $qty=need_decimal(post_value("quantity"),"Quantity",$mode==="set"?0.0:0.01);
 $s=$pdo->prepare("SELECT item_name,unit FROM items WHERE id=? AND LOWER(item_type) LIKE '%raw%' AND (status IS NULL OR status='' OR LOWER(status)='active')");$s->execute([$materialId]);$m=$s->fetch();
 if(!$m)fail("Raw material not found.",404);
 if($mode==="set")$pdo->prepare("INSERT INTO production_material_stock(item_id,quantity) VALUES(?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity)")->execute([$materialId,$qty]);
 else add_material_stock($pdo,$materialId,$qty);
 $now=$pdo->prepare("SELECT quantity FROM production_material_stock WHERE item_id=?");$now->execute([$materialId]);$total=(float)$now->fetchColumn();
 log_activity($pdo,($mode==="set"?"set":"added starting stock of")." ".format_qty($qty)." ".$m["unit"]." ".($mode==="set"?"for":"-")." {$m['item_name']} (Materials inventory now ".format_qty($total).")");
 json_response(["success"=>true,"message"=>"Materials inventory updated: {$m['item_name']} is now ".format_qty($total)." {$m['unit']}."]);
}
sync_requests_from_inventory($pdo);
$items=$pdo->query("SELECT i.id item_id,i.item_code,i.item_name,i.unit,COALESCE(st.quantity,0) on_hand,i.reorder_level,
 COALESCE((SELECT SUM(bm.qty_per_unit*po.quantity) FROM production_orders po JOIN bill_of_materials bm ON bm.product_id=po.product_id WHERE po.status='production' AND bm.material_id=i.id),0) in_production,
 COALESCE((SELECT SUM(bm.qty_per_unit*po.quantity) FROM production_orders po JOIN bill_of_materials bm ON bm.product_id=po.product_id WHERE po.status IN ('planning','materials') AND bm.material_id=i.id),0) planned,
 (SELECT MAX(mr.issued_at) FROM material_requests mr WHERE mr.material_id=i.id AND mr.status='issued') last_received
 FROM items i LEFT JOIN production_material_stock st ON st.item_id=i.id
 WHERE LOWER(i.item_type) LIKE '%raw%' AND (i.status IS NULL OR i.status='' OR LOWER(i.status)='active') ORDER BY i.item_name,i.id")->fetchAll();
$seen=[];$out=[];
foreach($items as $r){$k=strtolower(trim($r["item_name"]));if(isset($seen[$k]))continue;$seen[$k]=1;
 $oh=(float)$r["on_hand"];$avail=max(0,$oh-(float)$r["in_production"]);
 $r["on_hand"]=$oh;$r["in_production"]=(float)$r["in_production"];$r["planned"]=(float)$r["planned"];$r["available"]=$avail;
 $r["state"]=$oh<=0?"out":($avail<$r["planned"]?"short":"ok");
 $out[]=$r;}
$rec=$pdo->query("SELECT mr.request_id,mr.order_id,mr.quantity,mr.issued_at,i.item_name material FROM material_requests mr JOIN items i ON i.id=mr.material_id WHERE mr.status='issued' ORDER BY mr.issued_at DESC,mr.request_id DESC LIMIT 15")->fetchAll();
json_response(["success"=>true,"items"=>$out,"received"=>$rec]);
?>
