<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$rows=$pdo->query("SELECT po.order_id,p.product_name product,po.quantity,po.start_date,po.eta_label,po.status,COALESCE(pm.progress_percent,0) progress_percent FROM production_orders po JOIN products p ON p.product_id=po.product_id LEFT JOIN production_monitoring pm ON pm.order_id=po.order_id WHERE po.status!='completed' ORDER BY po.created_at DESC,po.order_id DESC")->fetchAll();
$c=$pdo->prepare("SELECT COUNT(*) total,COALESCE(SUM(ready),0) ready FROM checklist_items WHERE order_id=?");
foreach($rows as &$r){
 $r["status_label"]=STAGE_LABEL[$r["status"]];
 $c->execute([$r["order_id"]]);$x=$c->fetch();$r["ready_count"]=(int)$x["ready"];$r["total_count"]=(int)$x["total"];
}
json_response(["success"=>true,"rows"=>$rows]);
?>
