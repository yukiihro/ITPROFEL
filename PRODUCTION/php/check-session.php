<?php
require_once "database.php";
$u=current_user();
if(!$u)json_response(["logged_in"=>false]);
json_response(["logged_in"=>true,"user"=>["id"=>(int)$u["id"],"full_name"=>$u["full_name"],"username"=>$u["username"],"email"=>$u["email"],"role"=>$u["role"]]]);
?>
