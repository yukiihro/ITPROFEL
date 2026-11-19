<?php
require_once __DIR__."/_bootstrap.php";
$sql="SELECT mr.request_id,mr.order_id,i.item_name AS material,mr.qty_value AS requested_quantity,mr.approved_qty,mr.accepted_qty,mr.status,mr.priority,mr.requested_at,mr.issued_at,mr.inventory_request_number
 FROM material_requests mr JOIN items i ON i.id=mr.material_id WHERE 1=1";$a=[];
if(!empty($_GET["status"])){$sql.=" AND mr.status=?";$a[]=$_GET["status"];}
try{$s=$pdo->prepare($sql." ORDER BY mr.request_id DESC LIMIT 500");$s->execute($a);api_out(true,"Material requests.",$s->fetchAll());}
catch(Throwable $e){error_log("production api material-requests: ".$e->getMessage());api_out(false,"Could not read material requests.",null,500);}
?>
