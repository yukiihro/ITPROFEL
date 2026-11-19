<?php
require_once "database.php";
require_post();
$_SESSION=[];if(ini_get("session.use_cookies")){$p=session_get_cookie_params();setcookie(session_name(),"",time()-42000,$p["path"],$p["domain"],$p["secure"],$p["httponly"]);}session_destroy();
json_response(["success"=>true,"message"=>"Logged out."]);
?>
