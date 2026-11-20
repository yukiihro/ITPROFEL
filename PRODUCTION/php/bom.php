<?php
require_once "database.php"; require_once "helpers.php"; require_login();
sync_products_from_inventory($pdo);
$out=[];
foreach($pdo->query(active_products_sql())->fetchAll() as $p)
 $out[]=array_merge(["product_id"=>(int)$p["product_id"],"product"=>$p["product_name"],"unit_of_measure"=>$p["unit_of_measure"]],bom_for_product($pdo,(int)$p["product_id"]));
json_response(["success"=>true,"products"=>$out]);
?>
