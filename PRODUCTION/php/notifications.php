<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$action=$_REQUEST["action"]??"list";
if($action==="list"){sync_requests_from_inventory($pdo);}
if($action==="list")json_response(["success"=>true,"rows"=>$pdo->query("SELECT * FROM notifications ORDER BY created_at DESC,id DESC LIMIT 50")->fetchAll()]);
if($action==="read_all"){$pdo->exec("UPDATE notifications SET is_read=1 WHERE is_read=0");json_response(["success"=>true]);}
json_response(["success"=>false,"message"=>"Invalid notification action."],400);
?>
