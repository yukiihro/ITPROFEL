<?php
require_once "database.php"; require_once "helpers.php"; require_login();
$action=$_REQUEST["action"]??"list";

if($action==="list"){
 $rows=$pdo->query("SELECT pc.*,p.product_name product,po.quantity FROM production_costing pc JOIN production_orders po ON po.order_id=pc.order_id JOIN products p ON p.product_id=po.product_id ORDER BY pc.costing_id DESC")->fetchAll();
 foreach($rows as &$r)$r["cost_per_unit"]=(int)round($r["total_cost"]/$r["quantity"]);
 json_response(["success"=>true,"rows"=>$rows]);
}
if($action==="calculate"){
 $s=$pdo->prepare("SELECT * FROM production_orders WHERE order_id=?");$s->execute([post_value("order_id")]);$order=$s->fetch();
 if(!$order)fail("Order not found.",404);
 $labor=need_decimal(post_value("labor_cost","0")===""?"0":post_value("labor_cost","0"),"Labor cost",0.0);
 $overhead=need_decimal(post_value("overhead_cost","0")===""?"0":post_value("overhead_cost","0"),"Overhead cost",0.0);
 $m=$pdo->prepare("SELECT SUM(bm.qty_per_unit*?*COALESCE(mc.cost_price,0)) cost FROM bill_of_materials bm LEFT JOIN material_costs mc ON mc.item_id=bm.material_id WHERE bm.product_id=?");
 $m->execute([$order["quantity"],$order["product_id"]]);
 $materials=(int)round($m->fetchColumn()?:0);
 $total=$materials+$labor+$overhead;
 $ex=$pdo->prepare("SELECT costing_id,sent_to_finance FROM production_costing WHERE order_id=? ORDER BY costing_id DESC LIMIT 1");$ex->execute([$order["order_id"]]);$prev=$ex->fetch();
 if($prev&&(int)$prev["sent_to_finance"]===1)fail("The costing for {$order['order_id']} was already sent to Finance and can't be recalculated.",409);
 if($prev)$pdo->prepare("UPDATE production_costing SET materials_cost=?,labor_cost=?,overhead_cost=?,total_cost=?,calculated_at=NOW() WHERE costing_id=?")->execute([$materials,$labor,$overhead,$total,$prev["costing_id"]]);
 else $pdo->prepare("INSERT INTO production_costing(order_id,materials_cost,labor_cost,overhead_cost,total_cost) VALUES(?,?,?,?,?)")->execute([$order["order_id"],$materials,$labor,$overhead,$total]);
 log_activity($pdo,"calculated costing for {$order['order_id']}",$order["order_id"]);
 json_response(["success"=>true,"message"=>"Costing calculated for {$order['order_id']}."]);
}
if($action==="send_to_finance"){
 $s=$pdo->prepare("SELECT * FROM production_costing WHERE costing_id=?");$s->execute([(int)post_value("id")]);$row=$s->fetch();
 if(!$row)fail("Costing record not found.",404);
 if((int)$row["sent_to_finance"]===1)fail("This costing was already sent to Finance.",409);
 $pdo->prepare("UPDATE production_costing SET sent_to_finance=1,sent_at=NOW() WHERE costing_id=? AND sent_to_finance=0")->execute([$row["costing_id"]]);
 notify($pdo,"info","Costing for {$row['order_id']} sent to Team 5 — Finance",$row["order_id"]);
 log_activity($pdo,"sent costing for {$row['order_id']} to Team 5 — Finance",$row["order_id"]);
 json_response(["success"=>true,"message"=>"Costing for {$row['order_id']} sent to Team 5 — Finance."]);
}
json_response(["success"=>false,"message"=>"Invalid costing action."],400);
?>
