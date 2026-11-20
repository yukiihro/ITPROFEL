<?php
require_once "database.php"; require_once "helpers.php"; require_login();
sync_requests_from_inventory($pdo);
$rows=$pdo->query("SELECT po.order_id,po.start_date date_needed,p.product_name product,i.id material_id,i.item_name material,bm.qty_per_unit*po.quantity qty_needed,bm.unit FROM production_orders po JOIN products p ON p.product_id=po.product_id JOIN bill_of_materials bm ON bm.product_id=po.product_id JOIN items i ON i.id=bm.material_id WHERE po.status!='completed' ORDER BY po.start_date,po.order_id")->fetchAll();
$s=$pdo->prepare("SELECT status FROM material_requests WHERE order_id=? AND material_id=? ORDER BY request_id DESC LIMIT 1");
foreach($rows as &$r){
 $s->execute([$r["order_id"],$r["material_id"]]);$req=$s->fetch();
 $r["qty_needed"]=format_qty($r["qty_needed"])." ".$r["unit"];
 $r["status"]=$req?$req["status"]:"not_requested";
 $r["status_label"]=$req?REQUEST_STATUS_LABEL[$req["status"]]:"Not yet requested";
}
json_response(["success"=>true,"rows"=>$rows]);
?>
