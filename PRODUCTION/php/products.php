<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$syncError=null;
try{sync_products_inner($pdo);}catch(Throwable $e){$syncError="Could not sync from Inventory (see the server log).";error_log("products sync: ".$e->getMessage());}
$products=$pdo->query(active_products_sql())->fetchAll();
$out=["success"=>true,"products"=>$products];
if(!$products){
 try{$out["inventory_item_types"]=$pdo->query("SELECT item_type,status,COUNT(*) n FROM items GROUP BY item_type,status")->fetchAll();}
 catch(Throwable $e){$out["inventory_error"]="Inventory tables could not be read. Import Inventory's SQL file first, then the production database file (or open php/repair.php on the host computer).";error_log("products inv: ".$e->getMessage());}
 if($syncError)$out["sync_error"]=$syncError;
}
json_response($out);
?>
