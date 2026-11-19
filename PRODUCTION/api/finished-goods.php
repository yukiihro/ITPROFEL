<?php
require_once __DIR__."/_bootstrap.php";
$sql="SELECT fg.fg_id,fg.order_id,p.product_name,fg.produced_qty,fg.accepted_qty,fg.rejected_qty,fg.status,fg.sent_at,fg.request_qty,fg.excess_qty,r.request_number AS inventory_request_number
 FROM finished_goods fg JOIN products p ON p.product_id=fg.product_id LEFT JOIN requests r ON r.id=fg.request_id WHERE 1=1";$a=[];
if(!empty($_GET["request_number"])){$sql.=" AND r.request_number=?";$a[]=$_GET["request_number"];}
try{$s=$pdo->prepare($sql." ORDER BY fg.fg_id DESC LIMIT 500");$s->execute($a);api_out(true,"Finished goods.",$s->fetchAll());}
catch(Throwable $e){error_log("production api finished-goods: ".$e->getMessage());api_out(false,"Could not read finished goods.",null,500);}
?>
