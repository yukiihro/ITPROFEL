<?php
require_once __DIR__."/_bootstrap.php";
$sql="SELECT po.order_id,p.product_name,po.quantity,po.shoe_size_cm,po.status,po.start_date,po.eta_label,po.priority,r.request_number AS inventory_request_number
 FROM production_orders po JOIN products p ON p.product_id=po.product_id LEFT JOIN requests r ON r.id=po.request_id WHERE 1=1";$a=[];
if(!empty($_GET["status"])){$sql.=" AND po.status=?";$a[]=$_GET["status"];}
if(!empty($_GET["order_id"])){$sql.=" AND po.order_id=?";$a[]=$_GET["order_id"];}
try{$s=$pdo->prepare($sql." ORDER BY po.order_id DESC LIMIT 500");$s->execute($a);api_out(true,"Production orders.",$s->fetchAll());}
catch(Throwable $e){error_log("production api orders: ".$e->getMessage());api_out(false,"Could not read production orders.",null,500);}
?>
