<?php

class InventoryApiError extends RuntimeException{
 public $httpStatus=0;
 public function __construct($message,$httpStatus=0){parent::__construct($message);$this->httpStatus=(int)$httpStatus;}
}

const INV_API_KEY_BUILTIN="3410cdbf6b0b15b95af3a5da0f7451d36def8460cd0fb8cca87d5d18096decfd";
/* Every key production may send, best first, no duplicates:
   1) the IMS_API_KEY server variable (this is what Inventory itself reads, so it is the one that must match),
   2) inventory_api_key from php/config.local.php, 3) inventory_api_key_alternates (optional list in config.local.php),
   4) the old built-in default. A 401 moves on to the next one; the first one Inventory accepts is remembered. */
function inv_api_keys(){
 global $config;
 $c=[getenv("IMS_API_KEY"),$_SERVER["IMS_API_KEY"]??"",$_SERVER["REDIRECT_IMS_API_KEY"]??"",$config["inventory_api_key"]??""];
 foreach((array)($config["inventory_api_key_alternates"]??[]) as $a)$c[]=$a;
 $c[]=INV_API_KEY_BUILTIN;
 $out=[];foreach($c as $k){$k=trim((string)$k);if($k!==""&&!in_array($k,$out,true))$out[]=$k;}
 return $out;
}
function inv_api_key(){
 global $inv_api_key_ok;
 if(!empty($inv_api_key_ok))return $inv_api_key_ok;
 $k=inv_api_keys();return $k?$k[0]:"";
}
function inv_api_call($method,$endpoint,array $query=[],$body=null){
 global $inv_api_key_ok;
 $keys=inv_api_keys();
 if(!empty($inv_api_key_ok))array_unshift($keys,$inv_api_key_ok);
 $keys=array_values(array_unique($keys));
 if(!$keys)return inv_api_call_with_key("",$method,$endpoint,$query,$body);
 $last=null;
 foreach($keys as $i=>$k){
  try{
   $r=inv_api_call_with_key($k,$method,$endpoint,$query,$body);
   $inv_api_key_ok=$k;
   return $r;
  }catch(InventoryApiError $e){
   if($e->httpStatus!==401)throw $e;
   $last=$e;
   error_log("inventory api $method $endpoint: key #".($i+1)." (".substr($k,0,6)."...) refused with 401".($i+1<count($keys)?", trying the next key":""));
  }
 }
 throw $last;
}
function inv_api_call_with_key($key,$method,$endpoint,array $query=[],$body=null){
 global $config;
 $base=rtrim((string)($config["inventory_api_url"]??""),"/");
 if($base===""||$key==="")throw new InventoryApiError("The Inventory API is not configured (inventory_api_url / inventory_api_key in php/config.local.php).");
 $url=$base."/".ltrim($endpoint,"/").($query?"?".http_build_query($query):"");
 $headers=["Accept: application/json","X-API-Key: ".$key,"X-API-Team: Production"];
 $payload=null;
 if($body!==null){$payload=json_encode($body,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$headers[]="Content-Type: application/json";}
 $timeout=max(3,(int)($config["inventory_api_timeout"]??10));
 $raw=false;$code=0;$err="";
 if(function_exists("curl_init")){
  $ch=curl_init($url);
  curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_CUSTOMREQUEST=>$method,CURLOPT_HTTPHEADER=>$headers,CURLOPT_CONNECTTIMEOUT=>min(5,$timeout),CURLOPT_TIMEOUT=>$timeout,CURLOPT_FOLLOWLOCATION=>false]);
  if($payload!==null)curl_setopt($ch,CURLOPT_POSTFIELDS,$payload);
  $raw=curl_exec($ch);$code=(int)curl_getinfo($ch,CURLINFO_RESPONSE_CODE);if($raw===false)$err=curl_error($ch);
  curl_close($ch);
 }else{
  $ctx=stream_context_create(["http"=>["method"=>$method,"header"=>implode("\r\n",$headers),"content"=>$payload??"","timeout"=>$timeout,"ignore_errors"=>true]]);
  $raw=@file_get_contents($url,false,$ctx);
  if(isset($http_response_header[0])&&preg_match('#\s(\d{3})\s#',$http_response_header[0],$m))$code=(int)$m[1];
  if($raw===false)$err="connection failed";
 }
 $crash=function($raw,$code,$method,$endpoint){
  if(preg_match('/Call to undefined (?:function|method)\s+([A-Za-z0-9_\\\\:>-]+)\(/i',(string)$raw,$m))
   return " Inventory's own code is missing ".$m[1]."() - this has to be fixed in Inventory (see INVENTORY_SIDE_NOTES.txt); production cannot work around it.".($method==="POST"&&$endpoint==="requests.php"?" Nothing was filed.":"");
  if($method==="POST"&&$endpoint==="requests.php")
   return " Known cause: Inventory's api/requests.php calls create_incoming_request_notifications(), which is not defined in Inventory's php/database.php - Inventory must add it (see INVENTORY_SIDE_NOTES.txt). Nothing was filed.";
  return " Look in Inventory's Apache/PHP error log for the line that stopped it.";
 };
 if($raw===false||($raw===""&&$code===0)){
  error_log("inventory api $method $endpoint: no answer ($err)");
  throw new InventoryApiError("Cannot reach the Inventory API at $base ($err). Check that Inventory is running (Apache + MySQL on the host) and that inventory_api_url in php/config.local.php is correct.",0);
 }
 if($raw===""){
  error_log("inventory api $method $endpoint: empty answer (HTTP $code)");
  throw new InventoryApiError("Inventory answered HTTP $code with an empty body, which means its PHP script stopped with an error.".$crash($raw,$code,$method,$endpoint),$code);
 }
 $json=json_decode($raw,true);
 if(!is_array($json)){
  error_log("inventory api $method $endpoint: unreadable answer (HTTP $code): ".substr($raw,0,200));
  $snip=trim(preg_replace('/\s+/',' ',strip_tags((string)$raw)));$snip=function_exists("mb_substr")?mb_substr($snip,0,220):substr($snip,0,220);
  if($code>=500)throw new InventoryApiError("Inventory's API crashed (HTTP $code).".$crash($raw,$code,$method,$endpoint).($snip!==""?" What Inventory sent back: \"".$snip."\"":""),$code);
  throw new InventoryApiError("The Inventory API gave an unreadable answer (HTTP $code). Check inventory_api_url in php/config.local.php - it must end in /INVENTORY/api. What Inventory sent back: \"".($snip!==""?$snip:"(empty)")."\"",$code);
 }
 if($code>=400||empty($json["success"])){
  $msg=(string)($json["message"]??("Inventory API error (HTTP $code)."));
  if($code===401)$msg="Inventory refused every API key production has (HTTP 401). Inventory reads its key ONLY from the IMS_API_KEY server variable on the Inventory host. Fix: open httpd.conf (or httpd-vhosts.conf) and add  SetEnv IMS_API_KEY \"<the key>\"  using the same key as inventory_api_key in php/config.local.php, then restart Apache from XAMPP. If IMS_API_KEY is not set on the host at all, Inventory refuses every call, and production cannot change that.";
  elseif($code===403&&stripos($msg,"team")!==false)$msg="Inventory does not accept the team name Production sends (X-API-Team: Production). ".$msg;
  elseif($code>=500)$msg=$msg.$crash($raw,$code,$method,$endpoint);
  throw new InventoryApiError($msg,$code);
 }
 return $json;
}
function inv_api_data($method,$endpoint,array $query=[],$body=null){$j=inv_api_call($method,$endpoint,$query,$body);return $j["data"]??null;}

function inv_api_items(){$d=inv_api_data("GET","items.php");return ["items"=>$d["items"]??[],"warehouses"=>$d["warehouses"]??[]];}
function inv_api_requests($requestNumber=""){$d=inv_api_data("GET","requests.php",$requestNumber!==""?["request_number"=>$requestNumber]:[]);return is_array($d)?$d:[];}
function inv_api_deliveries($requestNumber=""){$d=inv_api_data("GET","deliveries.php",$requestNumber!==""?["request_number"=>$requestNumber]:[]);return is_array($d)?$d:[];}
function inv_api_delivery_receipt($requestNumber){return inv_api_data("GET","delivery-receipts.php",["request_number"=>$requestNumber]);}
/* Inventory stores po_number on the request and shows it as "P.O. Number" in Delivery Progress and Delivery Receipt.
   Production's PO is its production order number (PO-xxxx). Inventory accepts at most 100 characters. */
function inv_po_number($po){$po=trim((string)$po);return function_exists("mb_substr")?mb_substr($po,0,100):substr($po,0,100);}
function inv_api_create_request($warehouseId,array $items,$expectedDate,$remarks,$requesterName,$poNumber=""){
 $body=["destination"=>"Production","recipient_name"=>PRODUCTION_TEAM_NAME,"recipient_email"=>PRODUCTION_TEAM_EMAIL,"warehouse_id"=>(int)$warehouseId,"items"=>$items,"remarks"=>$remarks,"requester_name"=>$requesterName];
 if($expectedDate)$body["expected_delivery_date"]=$expectedDate;
 $po=inv_po_number($poNumber);if($po!=="")$body["po_number"]=$po;
 return inv_api_data("POST","requests.php",[],$body);
}

function inv_api_approve($requestNumber,$status,array $approved=[],$poNumber=""){
 $items=[];foreach($approved as $rid=>$q)$items[]=["request_item_id"=>(int)$rid,"approved_quantity"=>(int)$q];
 $body=["request_number"=>$requestNumber,"status"=>$status];if($items)$body["items"]=$items;
 $po=inv_po_number($poNumber);if($po!==""&&$status!=="Disapproved")$body["po_number"]=$po;
 return inv_api_data("POST","approvals.php",[],$body);
}
function inv_api_report_delivery($requestNumber,array $delivered){
 $items=[];foreach($delivered as $rid=>$q)$items[]=["request_item_id"=>(int)$rid,"delivered_quantity"=>(int)$q];
 return inv_api_data("POST","deliveries.php",[],["request_number"=>$requestNumber,"items"=>$items]);
}
function inv_api_accept_delivery($requestNumber){return inv_api_data("POST","accept-delivery.php",[],["request_number"=>$requestNumber]);}
?>
