<?php
require_once "database.php"; require_once "helpers.php"; require_login();
sync_requests_from_inventory($pdo);
$activeOrders=(int)$pdo->query("SELECT COUNT(*) FROM production_orders WHERE status!='completed'")->fetchColumn();
$pendingRequests=(int)$pdo->query("SELECT COUNT(*) FROM material_requests WHERE status='pending'")->fetchColumn();
$wip=0;
foreach($pdo->query("SELECT po.quantity,bm.qty_per_unit,COALESCE(mc.cost_price,0) cost_price FROM production_orders po JOIN bill_of_materials bm ON bm.product_id=po.product_id LEFT JOIN material_costs mc ON mc.item_id=bm.material_id WHERE po.status!='completed'")->fetchAll() as $r)$wip+=$r["quantity"]*$r["qty_per_unit"]*$r["cost_price"];
$low=$pdo->query("SELECT i.item_name,COALESCE(st.quantity,0) stock,ROUND(SUM(bm.qty_per_unit*po.quantity),2) reorder_level FROM items i JOIN bill_of_materials bm ON bm.material_id=i.id JOIN production_orders po ON po.product_id=bm.product_id AND po.status!='completed' LEFT JOIN production_material_stock st ON st.item_id=i.id WHERE i.item_type='Raw Material' AND i.status='Active' GROUP BY i.id,i.item_name,st.quantity HAVING stock<reorder_level")->fetchAll();
$attention=[];
$isSup=($_SESSION["role"]??"")==="production_supervisor";
foreach($isSup?[]:$pdo->query("SELECT ci.order_id,COUNT(*) n FROM checklist_items ci JOIN production_orders po ON po.order_id=ci.order_id WHERE ci.ready=0 AND po.status IN ('planning','materials') GROUP BY ci.order_id")->fetchAll() as $m){
 $n=(int)$m["n"];$attention[]=["text"=>"{$m['order_id']} is missing $n material".($n===1?"":"s")." before production can start","page"=>"materials-checklist.html?order=".$m["order_id"],"link"=>"Review"];
}
foreach($pdo->query("SELECT order_id FROM quality_checks WHERE status='pending_review'")->fetchAll() as $q)$attention[]=["text"=>"{$q['order_id']} has been waiting for quality review","page"=>"quality-control.html","link"=>"Inspect"];
if(count($low)){$n=count($low);$attention[]=["text"=>"$n material".($n===1?" is":"s are")." short for the open orders","page"=>"bill-of-materials.html","link"=>"View"];}
$recent=$pdo->query("SELECT po.order_id,po.product_id,p.product_name product,po.quantity,po.start_date,po.eta_label,po.priority,po.status,COALESCE(pm.progress_percent,0) progress_percent FROM production_orders po JOIN products p ON p.product_id=po.product_id LEFT JOIN production_monitoring pm ON pm.order_id=po.order_id WHERE po.status!='completed' ORDER BY (po.priority='urgent') DESC,po.created_at DESC,po.order_id DESC LIMIT 6")->fetchAll();
foreach($recent as &$r)$r["status_label"]=STAGE_LABEL[$r["status"]];
json_response(["success"=>true,"stats"=>["active_orders"=>$activeOrders,"pending_requests"=>$pendingRequests,"wip_value"=>(int)round($wip),"low_stock_alerts"=>count($low)],"attention"=>$attention,"recent_orders"=>$recent,"low_stock_items"=>$low]);
?>
