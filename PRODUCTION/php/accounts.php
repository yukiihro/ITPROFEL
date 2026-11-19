<?php
require_once "database.php"; require_supervisor();
$action=$_REQUEST["action"]??"list";

if($action==="list"){
 json_response(["success"=>true,"rows"=>$pdo->query("SELECT id,full_name,username,email,role,status,created_at FROM production_users ORDER BY role DESC,full_name")->fetchAll()]);
}
if($action==="create"){
 $name=post_value("full_name");$user=post_value("username");$email=post_value("email");$pass=(string)($_POST["password"]??"");$role=post_value("role","production_staff");
 if($name===""||$user===""||$email==="")fail("Enter a name, username and email.");
 if(mb_strlen($name)>100)fail("Full name must be at most 100 characters.");
 if(mb_strlen($email)>100)fail("Email must be at most 100 characters.");
 if(!preg_match('/^[A-Za-z0-9._-]{3,30}$/',$user))fail("Username must be 3–30 letters, numbers, dots, dashes or underscores.");
 if(!filter_var($email,FILTER_VALIDATE_EMAIL))fail("Enter a valid email address.");
 if(strlen($pass)<8)fail("Password must be at least 8 characters.");if(strlen($pass)>72)fail("Password must be at most 72 characters.");
 need_choice($role,"Role",["production_staff","production_supervisor"]);
 try{
  $pdo->prepare("INSERT INTO production_users(full_name,username,email,password,role) VALUES(?,?,?,?,?)")->execute([$name,$user,$email,password_hash($pass,PASSWORD_DEFAULT),$role]);
 }catch(PDOException $e){if($e->getCode()!=="23000")throw $e;fail("That username or email is already used.",409);}
 log_activity($pdo,"added account $user");
 json_response(["success"=>true,"message"=>"Account $user added."]);
}
if($action==="set_status"){
 $id=(int)post_value("id");$status=need_choice(post_value("status"),"Status",["Active","Inactive"]);
 if($id===(int)$_SESSION["user_id"])fail("You can't deactivate your own account.",409);
 $e=$pdo->prepare("SELECT 1 FROM production_users WHERE id=?");$e->execute([$id]);if(!$e->fetch())fail("Account not found.",404);
 $pdo->prepare("UPDATE production_users SET status=? WHERE id=?")->execute([$status,$id]);
 log_activity($pdo,($status==="Active"?"activated":"deactivated")." account #$id");
 json_response(["success"=>true,"message"=>"Account ".strtolower($status=="Active"?"activated":"deactivated")."."]);
}
if($action==="reset_password"){
 $id=(int)post_value("id");$pass=(string)($_POST["password"]??"");
 if(strlen($pass)<8)fail("Password must be at least 8 characters.");if(strlen($pass)>72)fail("Password must be at most 72 characters.");
 $e=$pdo->prepare("SELECT 1 FROM production_users WHERE id=?");$e->execute([$id]);if(!$e->fetch())fail("Account not found.",404);
 $pdo->prepare("UPDATE production_users SET password=? WHERE id=?")->execute([password_hash($pass,PASSWORD_DEFAULT),$id]);
 log_activity($pdo,"changed password of account #$id");
 json_response(["success"=>true,"message"=>"Password changed."]);
}
json_response(["success"=>false,"message"=>"Invalid account action."],400);
?>
