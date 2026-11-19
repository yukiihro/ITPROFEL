<?php
require_once __DIR__."/config.php";
require_once __DIR__."/../php/database.php";
function api_ensure_columns($pdo){
 $need=["production_orders"=>["request_id"=>"INT NULL DEFAULT NULL"],
  "material_requests"=>["inventory_request_number"=>"VARCHAR(50) NULL DEFAULT NULL","approved_qty"=>"DECIMAL(12,2) NULL DEFAULT NULL","accepted_qty"=>"DECIMAL(12,2) NULL DEFAULT NULL","issued_at"=>"DATETIME NULL DEFAULT NULL"],
  "finished_goods"=>["request_qty"=>"INT NULL DEFAULT NULL","excess_qty"=>"INT NULL DEFAULT NULL","request_id"=>"INT NULL DEFAULT NULL"]];
 foreach($need as $t=>$cols)foreach($cols as $c=>$def){
  try{if(!$pdo->query("SHOW COLUMNS FROM `$t` LIKE '$c'")->fetch())$pdo->exec("ALTER TABLE `$t` ADD COLUMN `$c` $def");}
  catch(Throwable $e){error_log("production api ensure column $t.$c: ".$e->getMessage());}
 }
}
function api_out($ok,$message,$data=null,$code=200){http_response_code($code);header("Content-Type: application/json; charset=utf-8");echo json_encode(["success"=>$ok,"message"=>$message,"data"=>$data],JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
$sent=$_SERVER["HTTP_X_API_KEY"]??"";
if(!isset($PRODUCTION_API_KEY)||$PRODUCTION_API_KEY===""||!hash_equals($PRODUCTION_API_KEY,$sent))api_out(false,"Invalid or missing API key.",null,401);
if(($_SERVER["REQUEST_METHOD"]??"GET")!=="GET")api_out(false,"This API is read-only (GET).",null,405);
api_ensure_columns($pdo);
?>
