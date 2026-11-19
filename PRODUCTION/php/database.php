<?php
define("SESSION_HOURS",12);
define("PRODUCTION_WAREHOUSE_CODE","WH-MAIN");
define("PRODUCTION_TEAM_NAME","TEAM 3");
define("SHOE_SIZE_MIN",20);
define("SHOE_SIZE_MAX",50);
define("PRODUCTION_TEAM_EMAIL","team3production@gmail.com");

$config=["host"=>"localhost","port"=>3306,"name"=>"team3production","user"=>"root","pass"=>"","timezone"=>"Asia/Manila","connect_timeout"=>8,
 "inventory_api_url"=>"http://localhost/ITPROFEL/INVENTORY/api",
 "inventory_api_key"=>(getenv("IMS_API_KEY")?:($_SERVER["IMS_API_KEY"]??($_SERVER["REDIRECT_IMS_API_KEY"]??"3410cdbf6b0b15b95af3a5da0f7451d36def8460cd0fb8cca87d5d18096decfd"))),
 "inventory_api_timeout"=>10,
 "inventory_warehouse_id"=>0];
if(is_file(__DIR__."/config.local.php")){$local=include __DIR__."/config.local.php";if(is_array($local))$config=array_merge($config,$local);}
$host=$config["host"];$dbname=$config["name"];$dbuser=$config["user"];$dbpass=$config["pass"];

ini_set("display_errors","0");
@date_default_timezone_set($config["timezone"]);

header("Content-Type: application/json; charset=utf-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("Referrer-Policy: same-origin");

ini_set("session.use_strict_mode","1");
ini_set("session.gc_maxlifetime",(string)(SESSION_HOURS*3600));
session_name("team3_production");
$https=(!empty($_SERVER["HTTPS"])&&$_SERVER["HTTPS"]!=="off");
session_set_cookie_params(["lifetime"=>SESSION_HOURS*3600,"path"=>"/","samesite"=>"Lax","httponly"=>true,"secure"=>$https]);
session_start();

function json_response($data,$code=200){http_response_code($code);echo json_encode($data,JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
function fail($message,$code=422){json_response(["success"=>false,"message"=>$message],$code);}

try{
 $dsn="mysql:host=$host;port=".(int)$config["port"].";dbname=$dbname;charset=utf8mb4";
 $pdo=new PDO($dsn,$dbuser,$dbpass,[
  PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
  PDO::ATTR_EMULATE_PREPARES=>false,
  PDO::ATTR_TIMEOUT=>(int)$config["connect_timeout"],
 ]);
 $pdo->exec("SET time_zone='".date("P")."'");
 $pdo->exec("SET SESSION innodb_lock_wait_timeout=15");
}catch(PDOException $e){
 error_log("production: database connection failed: ".$e->getMessage());
 fail("Cannot reach the database. Check that MySQL is running on the host computer (and that Radmin VPN is connected), that the Inventory database was imported first, and then the production database file. Settings are in php/config.local.php.",503);
}

set_exception_handler(function($e){
 $ref=strtoupper(substr(md5(uniqid("",true)),0,6));
 error_log("production error [$ref]: ".$e->getMessage()." @ ".$e->getFile().":".$e->getLine());
 if(!headers_sent())http_response_code(500);
 $host_pc=in_array($_SERVER["REMOTE_ADDR"]??"",["127.0.0.1","::1"],true);
 $detail=($host_pc||($_SESSION["role"]??"")==="production_supervisor")?" [Technical detail: ".mb_substr($e->getMessage(),0,300)."]":"";
 echo json_encode(["success"=>false,"message"=>"Something went wrong on the server (ref $ref). Nothing was half-saved. Please try again; if it keeps happening, tell the supervisor and quote the ref.".$detail],JSON_UNESCAPED_SLASHES|JSON_INVALID_UTF8_SUBSTITUTE);
 exit;
});

function current_user(){
 global $pdo;static $u=false;
 if($u!==false)return $u;
 $u=null;
 if(isset($_SESSION["user_id"])){
  $s=$pdo->prepare("SELECT id,full_name,username,email,role,status FROM production_users WHERE id=?");$s->execute([$_SESSION["user_id"]]);$row=$s->fetch();
  if($row&&$row["status"]==="Active"){$u=$row;$_SESSION["role"]=$row["role"];$_SESSION["full_name"]=$row["full_name"];}
  else{$_SESSION=[];}
 }
 return $u;
}
function require_login(){
 if(!current_user())json_response(["success"=>false,"message"=>"You are not logged in."],401);
}
function require_supervisor(){require_login();if(($_SESSION["role"]??"production_staff")!=="production_supervisor")fail("Only a production supervisor can do this.",403);}
function post_value($key,$default=""){return isset($_POST[$key])&&is_string($_POST[$key])?trim($_POST[$key]):$default;}
function safe($value){return htmlspecialchars((string)$value,ENT_QUOTES,"UTF-8");}

const READ_ONLY_ACTIONS=["list","detail","get","incoming","debug"];
function require_post(){if(($_SERVER["REQUEST_METHOD"]??"GET")!=="POST")fail("This action must be sent as a form POST.",405);}
$__action=$_POST["action"]??($_GET["action"]??null);
if(is_string($__action)&&!in_array($__action,READ_ONLY_ACTIONS,true))require_post();
unset($__action);

function need_whole($value,$field,$min=1,$max=null){
 $v=trim((string)$value);
 if(!preg_match('/^\d{1,9}$/',$v))fail("$field must be a whole number (digits only).");
 $n=(int)$v;if($n<$min)fail("$field must be at least $min.");if($max!==null&&$n>$max)fail("$field must be at most $max.");return $n;
}
function need_decimal($value,$field,$min=0.0,$max=10000000.0){
 $v=trim((string)$value);
 if(!preg_match('/^\d{1,9}(\.\d{1,2})?$/',$v))fail("$field must be a number (digits and an optional decimal, max 2 places).");
 $n=(float)$v;if($n<$min)fail("$field must be at least $min.");if($n>$max)fail("$field must be at most $max.");return $n;
}
function need_date($value,$field){
 $v=trim((string)$value);$d=DateTime::createFromFormat("Y-m-d",$v);
 if(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$v)||!$d||$d->format("Y-m-d")!==$v)fail("$field must be a real date.");return $v;
}
function need_choice($value,$field,$allowed){
 if(!is_string($value)||!in_array($value,$allowed,true))fail("$field must be one of: ".implode(", ",$allowed).".");return $value;
}
function format_qty($n){return rtrim(rtrim(number_format((float)$n,2,".",","),"0"),".");}

const STAGE_LABEL=["planning"=>"Planning","materials"=>"Materials","production"=>"Production","quality_check"=>"Quality check","completed"=>"Completed"];
const STAGE_PROGRESS=["planning"=>10,"materials"=>33,"production"=>65,"quality_check"=>85,"completed"=>100];
const REQUEST_STATUS_LABEL=["pending"=>"Requested","approved"=>"Approved","issued"=>"Issued","rejected"=>"Rejected"];

function actor_note(){return " (by ".($_SESSION["full_name"]??"production").") | Email: ".PRODUCTION_TEAM_EMAIL;}
function notify($pdo,$type,$message,$orderId=null){$pdo->prepare("INSERT INTO notifications(type,message,order_id) VALUES(?,?,?)")->execute([$type,mb_substr($message,0,250),$orderId]);}
function log_activity($pdo,$action,$orderId=null){$pdo->prepare("INSERT INTO activity_log(user_id,action,order_id) VALUES(?,?,?)")->execute([$_SESSION["user_id"]??null,mb_substr($action,0,250),$orderId]);}
?>
