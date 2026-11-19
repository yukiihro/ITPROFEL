<?php
/* Build 44 - one-click repair for an Inventory problem that Production can safely fix from its own side.
   Inventory's php/deliveries.php reads deliveries.receipt_confirmed_at, but no Inventory script or SQL file creates it,
   so Inventory's Delivery Progress page loads empty. This page checks for that column and, only when you press the button,
   adds it (nullable, no data changed). Nothing in Inventory's files is touched. Supervisor only. */
require_once "database.php"; require_once "helpers.php";
header("Content-Type: text/html; charset=utf-8");
$local=in_array($_SERVER["REMOTE_ADDR"]??"",["127.0.0.1","::1"],true);
if(!$local&&(!current_user()||($_SESSION["role"]??"")!=="production_supervisor")){
 http_response_code(403);
 echo "<!doctype html><meta charset=utf-8><p style='font-family:Arial;margin:30px'>Sign in to the Production system as a <b>supervisor</b> first, then open this page again (or open it on the host computer itself).</p>";exit;
}
global $config;
$invDb=(string)($config["inventory_db_name"]??"inventory_system");
$invUser=(string)($config["inventory_db_user"]??$config["user"]);
$invPass=(string)($config["inventory_db_pass"]??$config["pass"]);
$invHost=(string)($config["inventory_db_host"]??$config["host"]);
$invPort=(int)($config["inventory_db_port"]??$config["port"]);
$msg="";$ok=null;$has=null;$tableOk=false;
try{
 $ipdo=new PDO("mysql:host=$invHost;port=$invPort;dbname=$invDb;charset=utf8mb4",$invUser,$invPass,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_TIMEOUT=>6]);
 $t=$ipdo->prepare("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME='deliveries'");$t->execute([$invDb]);$tableOk=(int)$t->fetchColumn()>0;
 if(!$tableOk){$msg="Database `$invDb` has no `deliveries` table, so this is not the Inventory database. Set inventory_db_name in php/config.local.php.";}
 else{
  $c=$ipdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='deliveries' AND COLUMN_NAME='receipt_confirmed_at'");$c->execute([$invDb]);$has=(int)$c->fetchColumn()>0;
  if($_SERVER["REQUEST_METHOD"]==="POST"&&!$has){
   $ipdo->exec("ALTER TABLE `deliveries` ADD COLUMN `receipt_confirmed_at` DATETIME NULL DEFAULT NULL");
   $c->execute([$invDb]);$has=(int)$c->fetchColumn()>0;
   $ok=$has;$msg=$has?"Column added. Refresh Inventory's Delivery Progress page.":"The ALTER ran but the column is still not there.";
   if($has)error_log("production build44: added deliveries.receipt_confirmed_at to $invDb");
  }
 }
}catch(Throwable $e){$msg="Could not use the Inventory database `$invDb`: ".$e->getMessage()." (set inventory_db_name / inventory_db_user / inventory_db_pass in php/config.local.php if they differ).";$ok=false;}
function e($s){return htmlspecialchars((string)$s,ENT_QUOTES,"UTF-8");}
echo "<!doctype html><meta charset=utf-8><title>Inventory delivery fix</title><style>body{font-family:Arial;margin:30px;max-width:760px}.box{padding:14px;border-radius:8px;margin:14px 0}button{padding:10px 18px;border:0;border-radius:6px;background:#8B1A1A;color:#fff;font-size:15px;cursor:pointer}</style>";
echo "<h2>Inventory Delivery Progress fix (build 44)</h2>";
echo "<p>Checks <code>".e($invDb).".deliveries.receipt_confirmed_at</code>, the column Inventory's Delivery Progress page needs.</p>";
if($msg!=="")echo "<div class=box style='background:".($ok===false||!$tableOk?"#FDE7E9":"#E6F4EA")."'>".e($msg)."</div>";
if($tableOk&&$has===true&&$msg==="")echo "<div class=box style='background:#E6F4EA'>The column already exists, so it is not what is emptying Delivery Progress. Check Inventory's Apache error log for the real error.</div>";
if($tableOk&&$has===false)echo "<div class=box style='background:#FFF4E5'>The column is <b>missing</b>. This is why Delivery Progress is empty.<form method=post style='margin-top:12px'><button type=submit>Add the missing column</button></form><p style='font-size:13px'>It adds one nullable column and changes no existing data.</p></div>";
?>
