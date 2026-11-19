<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$sql="SELECT i.id item_id,i.item_code,i.item_name,i.item_type,i.unit,COALESCE(mc.cost_price,0) cost_price,i.reorder_level,COALESCE(st.quantity,0) quantity FROM items i LEFT JOIN production_material_stock st ON st.item_id=i.id LEFT JOIN material_costs mc ON mc.item_id=i.id WHERE i.status='Active'";$p=[];
if(!empty($_GET["type"])){$sql.=" AND i.item_type=?";$p[]=$_GET["type"];}
$sql.=" ORDER BY i.item_name,i.id";
$s=$pdo->prepare($sql);$s->execute($p);
$out=[];$at=[];
foreach($s->fetchAll() as $r){$k=strtolower(trim($r["item_type"]))."|".strtolower(trim($r["item_name"]));
 if(isset($at[$k])){$out[$at[$k]]["quantity"]=(float)$out[$at[$k]]["quantity"]+(float)$r["quantity"];continue;}
 $at[$k]=count($out);$out[]=$r;}
json_response(["success"=>true,"items"=>$out,"api_error"=>$_SESSION["inv_api_error"]??null]);
?>
