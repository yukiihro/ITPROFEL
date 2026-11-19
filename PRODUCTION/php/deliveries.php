<?php
require_once "database.php"; require_once "helpers.php"; require_login();
sync_requests_from_inventory($pdo);

const RM_DELIVERY=["pending"=>["Awaiting approval","neutral"],"approved"=>["Ready for delivery","info"],"issued"=>["Delivered","success"],"rejected"=>["Rejected","reject"]];

$rm=$pdo->query("SELECT * FROM delivery_raw_materials ORDER BY requested_at DESC,request_id DESC")->fetchAll();
$stats=["rm_awaiting"=>0,"rm_ready"=>0,"rm_delivered"=>0,"rm_rejected"=>0,"fg_in_qc"=>0,"fg_awaiting"=>0,"fg_delivered"=>0];
foreach($rm as &$r){
 [$label,$tone]=RM_DELIVERY[$r["delivery_status"]];$r["delivery_label"]=$label;$r["tone"]=$tone;
 $stats[["pending"=>"rm_awaiting","approved"=>"rm_ready","issued"=>"rm_delivered","rejected"=>"rm_rejected"][$r["delivery_status"]]]++;
}
unset($r);

const FG_DELIVERY=["in_qc"=>["In quality check","qc","fg_in_qc"],"awaiting"=>["Awaiting delivery","warning","fg_awaiting"],"delivered"=>["Delivered to Inventory","success","fg_delivered"]];
$fg=$pdo->query("SELECT order_id,item_code,product,produced_qty,accepted_qty,rejected_qty,delivery_status,delivered_at FROM delivery_finished_goods ORDER BY sort_group,record_id DESC")->fetchAll();
foreach($fg as &$f){
 [$label,$tone,$key]=FG_DELIVERY[$f["delivery_status"]];$f["delivery_label"]=$label;$f["tone"]=$tone;$stats[$key]++;
 $f["produced_qty"]=(int)$f["produced_qty"];
 $f["accepted_qty"]=$f["accepted_qty"]===null?null:(int)$f["accepted_qty"];$f["rejected_qty"]=$f["rejected_qty"]===null?null:(int)$f["rejected_qty"];
}
unset($f);
json_response(["success"=>true,"stats"=>$stats,"raw_materials"=>$rm,"finished_goods"=>$fg]);
?>
