<?php
require_once "database.php"; require_once "helpers.php"; require_supervisor();
$out=[];
function q($pdo,$k,$sql,&$out){try{$out[$k]=$pdo->query($sql)->fetchAll();}catch(Throwable $e){$out[$k]="ERROR: ".$e->getMessage();}}
global $config;
$out["inventory_api_url"]=$config["inventory_api_url"]??null;
try{$d=inv_api_items();$out["api_items"]=count($d["items"])." item(s), ".count($d["warehouses"])." warehouse(s)";}catch(Throwable $e){$out["api_items"]="ERROR: ".$e->getMessage();}
$out["api_keys_production_tries"]=array_map(function($k){return substr($k,0,6)."… (".strlen($k)." chars)";},inv_api_keys());
$out["api_key_note"]="Inventory reads its key ONLY from the IMS_API_KEY server variable (Apache SetEnv). Production tries the IMS_API_KEY variable, then inventory_api_key from php/config.local.php, then its built-in default, and keeps the first one Inventory accepts. If every key is refused, set IMS_API_KEY on the Inventory host (SetEnv + restart Apache).";
foreach(["deliveries.php","delivery-receipts.php?request_number=NONE","approvals.php?request_number=NONE"] as $ep){
 try{inv_api_call("GET",explode("?",$ep)[0],strpos($ep,"?")?["request_number"=>"NONE"]:[]);$out["api_".$ep]="ok";}catch(InventoryApiError $e){$out["api_".$ep]=($e->httpStatus===401?"KEY REFUSED: ":"key accepted (".$e->httpStatus."): ").$e->getMessage();}
}
$out["api_key_accepted_by_inventory"]=(!empty($GLOBALS["inv_api_key_ok"]))?(substr($GLOBALS["inv_api_key_ok"],0,6)."…"):"none yet / none accepted";
try{$out["api_requests_for_production"]=count(inv_api_requests());}catch(Throwable $e){$out["api_requests_for_production"]="ERROR: ".$e->getMessage();}
q($pdo,"inventory_requests_invisible_to_production (destination Production but requester team blank - Inventory must fix; production only shows requests whose requester team is Inventory)","SELECT request_number,requester_team,status FROM requests WHERE destination='Production' AND (requester_team IS NULL OR TRIM(requester_team)='')",$out);
q($pdo,"products","SELECT * FROM products",$out);
q($pdo,"production_orders","SELECT order_id,product_id,status,request_id FROM production_orders",$out);
q($pdo,"local_item_types","SELECT item_type,status,COUNT(*) n FROM items GROUP BY item_type,status",$out);
q($pdo,"bom_count","SELECT product_id,COUNT(*) n FROM bill_of_materials GROUP BY product_id",$out);
q($pdo,"local_requests_copy","SELECT request_number,requester_team,destination,status,delivery_status FROM requests ORDER BY id DESC LIMIT 50",$out);
q($pdo,"material_requests","SELECT request_id,order_id,status,inventory_request_number,approved_qty,accepted_qty FROM material_requests ORDER BY request_id DESC LIMIT 50",$out);
q($pdo,"old_inventory_triggers_still_installed","SELECT TRIGGER_SCHEMA,TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_NAME IN ('trg_block_product_request_approval','trg_dr_production_email')",$out);
header("Content-Type: application/json; charset=utf-8");echo json_encode($out,JSON_PRETTY_PRINT|JSON_INVALID_UTF8_SUBSTITUTE);
?>
