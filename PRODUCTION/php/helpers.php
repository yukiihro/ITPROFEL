<?php
require_once __DIR__."/inventory-api.php";


function sync_products_from_inventory($pdo){
 try{sync_products_inner($pdo);}catch(Throwable $e){error_log("sync_products: ".$e->getMessage());}
}

const SCHEMA_VERSION=21;
function ensure_schema($pdo){
 static $done=false;if($done)return;$done=true;
 if(($_SESSION["schema_v"]??0)===SCHEMA_VERSION)return;
 $ok=true;
 try{
  if(!$pdo->query("SHOW COLUMNS FROM production_orders LIKE 'shoe_size_cm'")->fetch())
   $pdo->exec("ALTER TABLE production_orders ADD COLUMN shoe_size_cm DECIMAL(3,1) NULL DEFAULT NULL AFTER quantity");
 }catch(Throwable $e){$ok=false;error_log("ensure_schema size: ".$e->getMessage());}
 try{
  if(!$pdo->query("SHOW COLUMNS FROM material_requests LIKE 'issued_at'")->fetch())
   $pdo->exec("ALTER TABLE material_requests ADD COLUMN issued_at DATETIME NULL DEFAULT NULL AFTER requested_at");
 }catch(Throwable $e){$ok=false;error_log("ensure_schema issued_at: ".$e->getMessage());}
 try{
  if(!$pdo->query("SHOW TABLES LIKE 'production_material_stock'")->fetch()){
   $pdo->exec("CREATE TABLE production_material_stock (item_id INT NOT NULL PRIMARY KEY, quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB");
   $pdo->exec("INSERT INTO production_material_stock(item_id,quantity) SELECT material_id,SUM(qty_value) FROM material_requests WHERE status='issued' GROUP BY material_id");
  }
 }catch(Throwable $e){$ok=false;error_log("ensure_schema stock: ".$e->getMessage());}
 try{
  $pdo->exec("CREATE TABLE IF NOT EXISTS production_login_attempts (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) NOT NULL, ip VARCHAR(64) NOT NULL, attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP, KEY ix_login_user (username,attempted_at), KEY ix_login_ip (ip,attempted_at)) ENGINE=InnoDB");
 }catch(Throwable $e){$ok=false;error_log("ensure_schema attempts: ".$e->getMessage());}
 try{
  if(!$pdo->query("SHOW INDEX FROM bill_of_materials WHERE Key_name='uq_bom_product_material'")->fetch()){
   $pdo->exec("DELETE b1 FROM bill_of_materials b1 JOIN bill_of_materials b2 ON b1.product_id=b2.product_id AND b1.material_id=b2.material_id AND b1.bom_id>b2.bom_id");
   $pdo->exec("ALTER TABLE bill_of_materials ADD UNIQUE KEY uq_bom_product_material (product_id,material_id)");
  }
 }catch(Throwable $e){$ok=false;error_log("ensure_schema bom: ".$e->getMessage());}
 try{
  foreach(["inventory_request_number"=>"VARCHAR(50) NULL DEFAULT NULL","approved_qty"=>"DECIMAL(12,2) NULL DEFAULT NULL","accepted_qty"=>"DECIMAL(12,2) NULL DEFAULT NULL","issued_at"=>"DATETIME NULL DEFAULT NULL"] as $col=>$def)
   if(!$pdo->query("SHOW COLUMNS FROM material_requests LIKE '$col'")->fetch())
    $pdo->exec("ALTER TABLE material_requests ADD COLUMN $col $def");
  migrate_inventory_links($pdo);
 }catch(Throwable $e){$ok=false;error_log("ensure_schema inventory links: ".$e->getMessage());}
 try{
  merge_duplicate_raw_materials($pdo);
 }catch(Throwable $e){$ok=false;error_log("ensure_schema merge raw materials: ".$e->getMessage());}
 try{
  if(!$pdo->query("SHOW INDEX FROM finished_goods WHERE Key_name='uq_fg_order'")->fetch()){
   $dup=(int)$pdo->query("SELECT COUNT(*) FROM (SELECT order_id FROM finished_goods GROUP BY order_id HAVING COUNT(*)>1) d")->fetchColumn();
   if($dup===0)$pdo->exec("ALTER TABLE finished_goods ADD UNIQUE KEY uq_fg_order (order_id)");
   else error_log("ensure_schema: finished_goods has duplicate rows for an order; unique key not added (clean them by hand).");
  }
 }catch(Throwable $e){$ok=false;error_log("ensure_schema fg: ".$e->getMessage());}
 try{
  foreach(["request_qty","excess_qty","request_id"] as $col)
   if(!$pdo->query("SHOW COLUMNS FROM finished_goods LIKE '$col'")->fetch())
    $pdo->exec("ALTER TABLE finished_goods ADD COLUMN $col INT NULL DEFAULT NULL");
 }catch(Throwable $e){$ok=false;error_log("ensure_schema fg split: ".$e->getMessage());}
 if($ok)$_SESSION["schema_v"]=SCHEMA_VERSION;
}
function add_material_stock($pdo,$itemId,$qty){
 $pdo->prepare("INSERT INTO production_material_stock(item_id,quantity) VALUES(?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)")->execute([$itemId,$qty]);
}
function raw_material_canonical_map($pdo){
 $rows=$pdo->query("SELECT id,item_name,status FROM items WHERE LOWER(item_type) LIKE '%raw%' ORDER BY id")->fetchAll();
 $act=function($r){$st=strtolower(trim((string)$r["status"]));return $st===""||$st==="active";};
 $best=[];
 foreach($rows as $r){$k=strtolower(trim($r["item_name"]));if(!isset($best[$k])||(!$act($best[$k])&&$act($r)))$best[$k]=$r;}
 $map=[];foreach($rows as $r)$map[(int)$r["id"]]=(int)$best[strtolower(trim($r["item_name"]))]["id"];
 return $map;
}
function merge_duplicate_raw_materials($pdo){
 foreach(raw_material_canonical_map($pdo) as $id=>$can){
  if($id===$can)continue;
  $st=$pdo->prepare("SELECT quantity FROM production_material_stock WHERE item_id=?");$st->execute([$id]);$q=$st->fetchColumn();
  if($q!==false){if((float)$q>0)add_material_stock($pdo,$can,$q);$pdo->prepare("DELETE FROM production_material_stock WHERE item_id=?")->execute([$id]);}
  $pdo->prepare("UPDATE IGNORE bill_of_materials SET material_id=? WHERE material_id=?")->execute([$can,$id]);
  $pdo->prepare("DELETE FROM bill_of_materials WHERE material_id=?")->execute([$id]);
  $pdo->prepare("UPDATE IGNORE checklist_items SET material_id=? WHERE material_id=?")->execute([$can,$id]);
  $pdo->prepare("DELETE FROM checklist_items WHERE material_id=?")->execute([$id]);
  $pdo->prepare("UPDATE material_requests SET material_id=? WHERE material_id=?")->execute([$can,$id]);
 }
}
function order_material_check($pdo,$orderId){
 $s=$pdo->prepare("SELECT bm.material_id,i.item_name material,bm.unit,bm.qty_per_unit*po.quantity needed,COALESCE(st.quantity,0) on_hand FROM production_orders po JOIN bill_of_materials bm ON bm.product_id=po.product_id JOIN items i ON i.id=bm.material_id LEFT JOIN production_material_stock st ON st.item_id=bm.material_id WHERE po.order_id=?");
 $s->execute([$orderId]);$rows=$s->fetchAll();
 $r=$pdo->prepare("SELECT bm.material_id,SUM(bm.qty_per_unit*po.quantity) q FROM production_orders po JOIN bill_of_materials bm ON bm.product_id=po.product_id WHERE po.status='production' AND po.order_id<>? GROUP BY bm.material_id");
 $r->execute([$orderId]);$res=[];foreach($r->fetchAll() as $x)$res[(int)$x["material_id"]]=(float)$x["q"];
 $out=[];
 foreach($rows as $x){
  $id=(int)$x["material_id"];$avail=max(0,(float)$x["on_hand"]-($res[$id]??0));$need=(float)$x["needed"];
  $out[$id]=["material_id"=>$id,"material"=>$x["material"],"unit"=>$x["unit"],"needed"=>$need,"on_hand"=>(float)$x["on_hand"],"available"=>$avail,"enough"=>$avail+0.0001>=$need,"short_by"=>max(0,$need-$avail)];
 }
 return $out;
}
function consume_materials_for_order($pdo,$orderId,$producedQty){
 $s=$pdo->prepare("SELECT bm.material_id,bm.qty_per_unit,bm.unit,i.item_name FROM bill_of_materials bm JOIN items i ON i.id=bm.material_id WHERE bm.product_id=(SELECT product_id FROM production_orders WHERE order_id=?)");
 $s->execute([$orderId]);$short=[];$use=[];
 $lock=$pdo->prepare("SELECT quantity FROM production_material_stock WHERE item_id=? FOR UPDATE");
 foreach($s->fetchAll() as $l){
  $need=round((float)$l["qty_per_unit"]*$producedQty,2);$lock->execute([$l["material_id"]]);$have=(float)($lock->fetchColumn()?:0);
  if($have+0.0001<$need)$short[]=$l["item_name"]." (need ".format_qty($need)." ".$l["unit"].", have ".format_qty($have).")";
  else $use[]=[$l["material_id"],$need];
 }
 if($short)return $short;
 $u=$pdo->prepare("UPDATE production_material_stock SET quantity=quantity-? WHERE item_id=?");
 foreach($use as $x)$u->execute([$x[1],$x[0]]);
 return [];
}

function fail_in_tx($pdo,$message,$code=422){if($pdo->inTransaction())$pdo->rollBack();fail($message,$code);}

function size_label($v){if($v===null||$v==="")return "";return rtrim(rtrim(number_format((float)$v,1,".",""),"0"),".")." cm";}

function sync_products_inner($pdo){
 ensure_schema($pdo);
 try{sync_items_from_inventory($pdo);unset($_SESSION["inv_api_error"]);}
 catch(Throwable $e){$_SESSION["inv_api_error"]=$e->getMessage();error_log("sync_items_from_inventory: ".$e->getMessage());}
 $got=(int)$pdo->query("SELECT GET_LOCK('team3_prod_sync',15)")->fetchColumn()===1;
 if(!$got)return;
 try{sync_products_body($pdo);}
 finally{if($got){try{$pdo->query("SELECT RELEASE_LOCK('team3_prod_sync')")->fetchColumn();}catch(Throwable $e){}}}
}
function active_products_sql(){
 return "SELECT p.* FROM products p JOIN items i ON i.id=p.item_id WHERE LOWER(i.item_type) LIKE '%finish%' AND (i.status IS NULL OR i.status='' OR LOWER(i.status)='active') ORDER BY p.product_id";
}
function fg_name_key($name){return preg_replace('/\s+/',' ',strtolower(trim((string)$name)));}

function product_inventory_sizes($pdo,$productName){
 $out=[];$k=fg_name_key($productName);
 foreach($pdo->query("SELECT id,item_name,size FROM items WHERE LOWER(item_type) LIKE '%finish%' AND (status IS NULL OR status='' OR LOWER(status)='active') ORDER BY id")->fetchAll() as $r){
  if(fg_name_key($r["item_name"])===$k&&trim((string)$r["size"])!=="")$out[]=trim((string)$r["size"]);
 }
 return array_values(array_unique($out));
}

function inventory_item_for_size($pdo,$productName,$sizeCm){
 if($sizeCm===null||$sizeCm==="")return null;
 $want=rtrim(rtrim(number_format((float)$sizeCm,1,".",""),"0"),".");$k=fg_name_key($productName);
 foreach($pdo->query("SELECT id,item_code,item_name,size FROM items WHERE LOWER(item_type) LIKE '%finish%' AND (status IS NULL OR status='' OR LOWER(status)='active') ORDER BY id")->fetchAll() as $r){
  if(fg_name_key($r["item_name"])===$k&&trim((string)$r["size"])===$want)return $r;
 }
 return null;
}

function fg_group_products($pdo,$FG){
 $canon=[];
 foreach($pdo->query("SELECT i.id,i.item_name FROM items i WHERE $FG ORDER BY i.id")->fetchAll() as $r){$k=fg_name_key($r["item_name"]);if(!isset($canon[$k]))$canon[$k]=(int)$r["id"];}
 $byName=[];
 foreach($pdo->query("SELECT p.product_id,p.item_id,p.product_name,i.item_name FROM products p LEFT JOIN items i ON i.id=p.item_id ORDER BY p.product_id")->fetchAll() as $p){
  $byName[fg_name_key($p["item_name"]!==null?$p["item_name"]:$p["product_name"])][]=$p;
 }
 foreach($byName as $k=>$list){
  $keep=(int)$list[0]["product_id"];
  for($n=1;$n<count($list);$n++){
   $dup=(int)$list[$n]["product_id"];
   $pdo->prepare("UPDATE production_orders SET product_id=? WHERE product_id=?")->execute([$keep,$dup]);
   $pdo->prepare("UPDATE finished_goods SET product_id=? WHERE product_id=?")->execute([$keep,$dup]);
   $pdo->prepare("UPDATE IGNORE bill_of_materials SET product_id=? WHERE product_id=?")->execute([$keep,$dup]);
   $pdo->prepare("DELETE FROM bill_of_materials WHERE product_id=?")->execute([$dup]);
   $pdo->prepare("DELETE FROM products WHERE product_id=?")->execute([$dup]);
  }
  if(isset($canon[$k])&&(int)$list[0]["item_id"]!==$canon[$k]){
   try{$pdo->prepare("UPDATE products SET item_id=? WHERE product_id=?")->execute([$canon[$k],$keep]);}
   catch(PDOException $e){if((int)($e->errorInfo[1]??0)!==1062)throw $e;}
  }
 }
}

function sync_products_body($pdo){
 $FG="LOWER(i.item_type) LIKE '%finish%' AND (i.status IS NULL OR i.status='' OR LOWER(i.status)='active')";
 fg_group_products($pdo,$FG);
 $gone=$pdo->query("SELECT p.product_id FROM products p LEFT JOIN items i ON i.id=p.item_id WHERE (i.id IS NULL OR NOT (LOWER(i.item_type) LIKE '%finish%' AND (i.status IS NULL OR i.status='' OR LOWER(i.status)='active'))) AND NOT EXISTS (SELECT 1 FROM production_orders po WHERE po.product_id=p.product_id) AND NOT EXISTS (SELECT 1 FROM finished_goods fg WHERE fg.product_id=p.product_id)")->fetchAll(PDO::FETCH_COLUMN);
 foreach($gone as $pid){$pdo->prepare("DELETE FROM bill_of_materials WHERE product_id=?")->execute([$pid]);$pdo->prepare("DELETE FROM products WHERE product_id=?")->execute([$pid]);}
 $RM="LOWER(i.item_type) LIKE '%raw%' AND (i.status IS NULL OR i.status='' OR LOWER(i.status)='active')";
 $have=[];foreach($pdo->query("SELECT product_name FROM products")->fetchAll(PDO::FETCH_COLUMN) as $pn)$have[fg_name_key($pn)]=1;
 $addP=$pdo->prepare("INSERT INTO products(item_id,product_name,unit_of_measure) VALUES(?,?,?)");
 foreach($pdo->query("SELECT i.id,i.item_name,i.unit FROM items i WHERE $FG ORDER BY i.id")->fetchAll() as $fgi){
  $k=fg_name_key($fgi["item_name"]);if(isset($have[$k]))continue;$have[$k]=1;
  $addP->execute([$fgi["id"],$fgi["item_name"],($fgi["unit"]!==""&&$fgi["unit"]!==null)?$fgi["unit"]:"pairs"]);
 }
 $pdo->exec("UPDATE products p JOIN items i ON i.id=p.item_id SET p.product_name=i.item_name");
 $mats=$pdo->query("SELECT i.id,i.item_name,i.unit FROM items i WHERE $RM ORDER BY i.id")->fetchAll();
 if(!$mats)return;
 $kind=function($name){
  $n=strtolower($name);
  if(preg_match('/lace/',$n))return "lace";
  if(preg_match('/insole|foam|sock\s*liner|cushion/',$n))return "insole";
  if(preg_match('/sole/',$n))return "sole";
  if(preg_match('/adhesive|glue|cement/',$n))return "glue";
  if(preg_match('/leather|upper|canvas|fabric|mesh|suede|textile|cloth|material/',$n))return "upper";
  return "other";
 };
 $defaultCost=["upper"=>450,"sole"=>180,"lace"=>12,"insole"=>40,"glue"=>85,"other"=>50];
 $hasCost=$pdo->prepare("SELECT 1 FROM material_costs WHERE item_id=?");$addCost=$pdo->prepare("INSERT INTO material_costs(item_id,cost_price) VALUES(?,?)");
 foreach($mats as $m){$hasCost->execute([$m["id"]]);if(!$hasCost->fetch())$addCost->execute([$m["id"],$defaultCost[$kind($m["item_name"])]]);}
 $uniq=[];foreach($mats as $m){$k=strtolower(trim($m["item_name"]));if(!isset($uniq[$k]))$uniq[$k]=$m;}$mats=array_values($uniq);
 $qtyPer=["upper"=>0.5,"sole"=>1,"lace"=>1,"insole"=>1,"glue"=>0.05];
 $lines=[];$seen=[];
 foreach($mats as $m){$k=$kind($m["item_name"]);if($k==="other"||isset($seen[$k]))continue;$seen[$k]=1;$lines[]=[$m,$qtyPer[$k]];}
 if(!$lines)foreach($mats as $m)$lines[]=[$m,1];
 $has=$pdo->prepare("SELECT COUNT(*) FROM bill_of_materials WHERE product_id=?");
 $add=$pdo->prepare("INSERT IGNORE INTO bill_of_materials(product_id,material_id,qty_per_unit,unit) VALUES(?,?,?,?)");
 foreach($pdo->query("SELECT product_id FROM products ORDER BY product_id")->fetchAll(PDO::FETCH_COLUMN) as $pid){
  $has->execute([$pid]);if((int)$has->fetchColumn()>0)continue;
  foreach($lines as $l)$add->execute([$pid,$l[0]["id"],$l[1],$l[0]["unit"]?:"pcs"]);
 }
}

function sync_order_stage_from_checklist($pdo,$orderId){
 $o=$pdo->prepare("SELECT status FROM production_orders WHERE order_id=?");$o->execute([$orderId]);$order=$o->fetch();
 if(!$order)return ["status"=>null,"changed"=>false,"progress_percent"=>null];
 $c=$pdo->prepare("SELECT COUNT(*) total,COALESCE(SUM(ready),0) ready FROM checklist_items WHERE order_id=?");$c->execute([$orderId]);$row=$c->fetch();
 $total=(int)$row["total"];$ready=(int)$row["ready"];$old=$order["status"];$new=$old;
 if($total>0&&in_array($old,["planning","materials"],true)){
  if($ready===$total)$new="production";elseif($ready>0)$new="materials";else $new="planning";
 }
 $progress=null;
 if($new!==$old){
  $progress=STAGE_PROGRESS[$new];
  $pdo->prepare("UPDATE production_orders SET status=? WHERE order_id=?")->execute([$new,$orderId]);
  $pdo->prepare("UPDATE production_monitoring SET progress_percent=?,updated_at=NOW() WHERE order_id=?")->execute([$progress,$orderId]);
  if($new==="production")notify($pdo,"success","All materials ready for $orderId — moved to Production",$orderId);
 }
 return ["status"=>$new,"changed"=>$new!==$old,"progress_percent"=>$progress];
}

function bom_for_product($pdo,$productId){
 $stmt=$pdo->prepare("SELECT bm.bom_id,bm.qty_per_unit,bm.unit,i.id material_id,i.item_name material,COALESCE((SELECT st.quantity FROM production_material_stock st WHERE st.item_id=i.id),0) available_stock FROM bill_of_materials bm JOIN items i ON i.id=bm.material_id WHERE bm.product_id=?");
 $stmt->execute([$productId]);$lines=$stmt->fetchAll();
 $limiting=null;$producibleUnits=null;$rows=[];$seenNames=[];
 foreach($lines as $l){
  $nk=strtolower(trim($l["material"]));if(isset($seenNames[$nk]))continue;$seenNames[$nk]=1;
  $producible=$l["qty_per_unit"]>0?(int)floor($l["available_stock"]/$l["qty_per_unit"]):PHP_INT_MAX;
  if($producibleUnits===null||$producible<$producibleUnits){$producibleUnits=$producible;$limiting=$l["material"];}
  $rows[]=["material_id"=>(int)$l["material_id"],"material"=>$l["material"],"qty_per_unit"=>(float)$l["qty_per_unit"],"unit"=>$l["unit"],"available_stock"=>(float)$l["available_stock"],"producible_units"=>$producible];
 }
 return ["lines"=>$rows,"producible_units"=>$producibleUnits??0,"limiting_material"=>$limiting];
}

function order_detail($pdo,$orderId){
 $stmt=$pdo->prepare("SELECT po.*,p.product_name,p.unit_of_measure FROM production_orders po JOIN products p ON p.product_id=po.product_id WHERE po.order_id=?");
 $stmt->execute([$orderId]);$order=$stmt->fetch();if(!$order)return null;
 $m=$pdo->prepare("SELECT * FROM production_monitoring WHERE order_id=?");$m->execute([$orderId]);$monitoring=$m->fetch()?:null;
 $mat=$pdo->prepare("SELECT bm.qty_per_unit,bm.unit,i.id material_id,i.item_name material,bm.qty_per_unit*po.quantity qty_needed FROM bill_of_materials bm JOIN items i ON i.id=bm.material_id JOIN production_orders po ON po.product_id=bm.product_id WHERE po.order_id=?");
 $mat->execute([$orderId]);$materials=[];$seenM=[];
 foreach($mat->fetchAll() as $x){
  $mk=strtolower(trim($x["material"]));if(isset($seenM[$mk]))continue;$seenM[$mk]=1;
  $r=$pdo->prepare("SELECT status FROM material_requests WHERE order_id=? AND material_id=? ORDER BY request_id DESC LIMIT 1");$r->execute([$orderId,$x["material_id"]]);$req=$r->fetch();
  $materials[]=["material_id"=>(int)$x["material_id"],"material"=>$x["material"],"qty_needed"=>format_qty($x["qty_needed"])." ".$x["unit"],"status"=>$req?$req["status"]:"not_requested","status_label"=>$req?REQUEST_STATUS_LABEL[$req["status"]]:"Not yet requested"];
 }
 $c=$pdo->prepare("SELECT * FROM production_costing WHERE order_id=? ORDER BY costing_id DESC LIMIT 1");$c->execute([$orderId]);$costing=$c->fetch()?:null;
 $q=$pdo->prepare("SELECT * FROM quality_checks WHERE order_id=?");$q->execute([$orderId]);$qc=$q->fetch()?:null;
 $f=$pdo->prepare("SELECT * FROM finished_goods WHERE order_id=?");$f->execute([$orderId]);$fg=$f->fetch()?:null;
 return ["order_id"=>$order["order_id"],"product_id"=>(int)$order["product_id"],"product"=>$order["product_name"],"quantity"=>(int)$order["quantity"],"shoe_size_cm"=>$order["shoe_size_cm"]!==null?(float)$order["shoe_size_cm"]:null,"size_label"=>size_label($order["shoe_size_cm"]),"unit_of_measure"=>$order["unit_of_measure"],"start_date"=>$order["start_date"],"priority"=>$order["priority"],"status"=>$order["status"],"status_label"=>STAGE_LABEL[$order["status"]],"eta_label"=>$order["eta_label"],"created_at"=>$order["created_at"],"progress_percent"=>$monitoring?(int)$monitoring["progress_percent"]:0,"materials"=>$materials,"costing"=>$costing,"quality_check"=>$qc,"finished_goods"=>$fg];
}


function inventory_mirror_ddl(){
 return [
  "items"=>"CREATE TABLE IF NOT EXISTS `items` (`id` INT NOT NULL, `item_code` VARCHAR(50) NOT NULL, `item_name` VARCHAR(150) NOT NULL, `item_type` VARCHAR(30) NOT NULL DEFAULT '', `size` VARCHAR(30) NOT NULL DEFAULT '', `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs', `reorder_level` INT NOT NULL DEFAULT 0, `status` VARCHAR(20) NOT NULL DEFAULT 'Active', PRIMARY KEY (`id`), UNIQUE KEY `uq_items_code` (`item_code`)) ENGINE=InnoDB",
  "warehouses"=>"CREATE TABLE IF NOT EXISTS `warehouses` (`id` INT NOT NULL, `warehouse_name` VARCHAR(100) NOT NULL DEFAULT '', `location` VARCHAR(150) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB",
  "requests"=>"CREATE TABLE IF NOT EXISTS `requests` (`id` INT NOT NULL, `request_number` VARCHAR(50) NOT NULL, `requester_team` VARCHAR(50) NOT NULL DEFAULT '', `destination` VARCHAR(50) NOT NULL DEFAULT '', `status` VARCHAR(30) NOT NULL DEFAULT 'Pending', `delivery_status` VARCHAR(30) NULL DEFAULT NULL, `expected_days` VARCHAR(50) NULL DEFAULT NULL, `expected_date` DATE NULL DEFAULT NULL, `recipient_name` VARCHAR(255) NULL DEFAULT NULL, `recipient_gmail` VARCHAR(150) NULL DEFAULT NULL, `remarks` TEXT NULL, `po_number` VARCHAR(100) NULL DEFAULT NULL, `request_date` DATE NULL DEFAULT NULL, `expected_receive_date` DATE NULL DEFAULT NULL, `approved_at` DATETIME NULL DEFAULT NULL, `created_at` DATETIME NULL DEFAULT NULL, `synced_at` DATETIME NULL DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `uq_requests_number` (`request_number`), KEY `ix_requests_status` (`status`)) ENGINE=InnoDB",
  "request_items"=>"CREATE TABLE IF NOT EXISTS `request_items` (`id` INT NOT NULL, `request_id` INT NOT NULL, `item_id` INT NULL DEFAULT NULL, `item_name` VARCHAR(150) NOT NULL DEFAULT '', `size` VARCHAR(30) NOT NULL DEFAULT '', `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs', `quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `approved_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `delivered_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `accepted_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, PRIMARY KEY (`id`), KEY `ix_ri_request` (`request_id`), KEY `ix_ri_item` (`item_id`)) ENGINE=InnoDB",
 ];
}

function migrate_inventory_links($pdo){
 $got=(int)$pdo->query("SELECT GET_LOCK('team3_prod_migrate',10)")->fetchColumn()===1;
 try{
  $kind=$pdo->prepare("SELECT TABLE_TYPE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?");
  $type=function($t)use($kind){$kind->execute([$t]);return $kind->fetchColumn();};
  $legacy=false;
  if($type("requests")==="VIEW"){
   $legacy=true;
   try{$pdo->exec("UPDATE material_requests mr JOIN requests r ON r.id=mr.inventory_request_id SET mr.inventory_request_number=r.request_number WHERE mr.inventory_request_number IS NULL");}
   catch(Throwable $e){error_log("migrate_inventory_links numbers: ".$e->getMessage());}
  }
  if($type("items")==="VIEW")$legacy=true;
  $snap=[];
  foreach(["items","warehouses"] as $t){
   if($type($t)==="VIEW"){
    try{$pdo->exec("DROP TABLE IF EXISTS `{$t}_snapshot`");$pdo->exec("CREATE TABLE `{$t}_snapshot` AS SELECT * FROM `$t`");$snap[]=$t;}
    catch(Throwable $e){error_log("migrate_inventory_links snapshot $t: ".$e->getMessage());}
   }
  }
  foreach(["items","warehouses","requests","request_items","inventory","stock_in","stock_out","stock_movements","deliveries","delivery_receipts"] as $t)
   if($type($t)==="VIEW")$pdo->exec("DROP VIEW `$t`");
  foreach(inventory_mirror_ddl() as $ddl)$pdo->exec($ddl);
  if(in_array("items",$snap,true)){
   try{$pdo->exec("INSERT IGNORE INTO items(id,item_code,item_name,item_type,size,unit,reorder_level,status) SELECT id,item_code,item_name,item_type,COALESCE(size,''),COALESCE(NULLIF(unit,''),'pcs'),COALESCE(reorder_level,0),CASE WHEN status IS NULL OR status='' THEN 'Active' ELSE status END FROM items_snapshot");}
   catch(Throwable $e){error_log("migrate_inventory_links items: ".$e->getMessage());}
   $pdo->exec("DROP TABLE IF EXISTS `items_snapshot`");
  }
  if(in_array("warehouses",$snap,true)){
   try{$pdo->exec("INSERT IGNORE INTO warehouses(id,warehouse_name,location) SELECT id,warehouse_name,COALESCE(location,'') FROM warehouses_snapshot");}
   catch(Throwable $e){error_log("migrate_inventory_links warehouses: ".$e->getMessage());}
   $pdo->exec("DROP TABLE IF EXISTS `warehouses_snapshot`");
  }
  if($legacy)remove_legacy_inventory_hooks($pdo);
 }finally{if($got){try{$pdo->query("SELECT RELEASE_LOCK('team3_prod_migrate')")->fetchColumn();}catch(Throwable $e){}}}
}

function remove_legacy_inventory_hooks($pdo){
 try{
  $rows=$pdo->query("SELECT TRIGGER_SCHEMA s,TRIGGER_NAME n FROM information_schema.TRIGGERS WHERE TRIGGER_NAME IN ('trg_block_product_request_approval','trg_dr_production_email')")->fetchAll();
  foreach($rows as $r){
   try{$pdo->exec("DROP TRIGGER IF EXISTS `".str_replace("`","``",$r["s"])."`.`".str_replace("`","``",$r["n"])."`");error_log("production: removed old trigger {$r['s']}.{$r['n']}");}
   catch(Throwable $e){error_log("remove_legacy_inventory_hooks {$r['s']}.{$r['n']}: ".$e->getMessage()." - run database/REMOVE_OLD_PRODUCTION_TRIGGERS.sql");}
  }
 }catch(Throwable $e){error_log("remove_legacy_inventory_hooks: ".$e->getMessage());}
}

function sync_items_from_inventory($pdo){
 $d=inv_api_items();$items=$d["items"];$wh=$d["warehouses"];
 if($items){
  $up=$pdo->prepare("INSERT INTO items(id,item_code,item_name,item_type,size,unit,status) VALUES(?,?,?,?,?,?,'Active') ON DUPLICATE KEY UPDATE item_code=VALUES(item_code),item_name=VALUES(item_name),item_type=VALUES(item_type),size=VALUES(size),unit=VALUES(unit),status='Active'");
  $free=$pdo->prepare("UPDATE items SET item_code=CONCAT(item_code,'~',id),status='Inactive' WHERE item_code=? AND id<>?");
  $ids=[];
  foreach($items as $it){
   $id=(int)($it["item_id"]??0);if($id<=0)continue;$ids[]=$id;
   $args=[$id,(string)($it["item_code"]??""),(string)($it["item_name"]??""),(string)($it["item_type"]??""),(string)($it["size"]??""),(string)((($it["unit"]??"")!=="")?$it["unit"]:"pcs")];
   try{$up->execute($args);}
   catch(PDOException $e){if((int)($e->errorInfo[1]??0)!==1062)throw $e;$free->execute([$args[1],$id]);$up->execute($args);}
  }
  if($ids)$pdo->exec("UPDATE items SET status='Inactive' WHERE id NOT IN (".implode(",",$ids).")");
 }
 if($wh){
  $w=$pdo->prepare("INSERT INTO warehouses(id,warehouse_name,location) VALUES(?,?,?) ON DUPLICATE KEY UPDATE warehouse_name=VALUES(warehouse_name),location=VALUES(location)");
  $ids=[];foreach($wh as $x){$id=(int)($x["warehouse_id"]??0);if($id<=0)continue;$ids[]=$id;$w->execute([$id,(string)($x["warehouse_name"]??""),(string)($x["location"]??"")]);}
  if($ids)$pdo->exec("DELETE FROM warehouses WHERE id NOT IN (".implode(",",$ids).")");
 }
}

function inventory_warehouse_id($pdo){
 global $config;$cfg=(int)($config["inventory_warehouse_id"]??0);if($cfg>0)return $cfg;
 $id=$pdo->query("SELECT id FROM warehouses ORDER BY (LOWER(warehouse_name) LIKE '%main%') DESC,id LIMIT 1")->fetchColumn();
 if(!$id)throw new RuntimeException("Production does not know any Inventory warehouse yet (Inventory's API has not answered). Check the Inventory API settings in php/config.local.php and try again.");
 return (int)$id;
}

function store_inventory_request($pdo,array $r){
 $id=(int)($r["id"]??0);$num=trim((string)($r["request_number"]??""));if($id<=0||$num==="")return false;
 $d=function($v){$v=(string)$v;return(preg_match('/^(\d{4})-(\d{2})-(\d{2})/',$v,$m)&&$m[1]!=="0000")?"$m[1]-$m[2]-$m[3]":null;};
 $t=function($v){$v=(string)$v;return(preg_match('/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/',$v)&&substr($v,0,4)!=="0000")?str_replace("T"," ",substr($v,0,19)):null;};
 $pdo->prepare("DELETE FROM requests WHERE request_number=? AND id<>?")->execute([$num,$id]);
 $pdo->prepare("INSERT INTO requests(id,request_number,requester_team,destination,status,delivery_status,expected_days,expected_date,recipient_name,recipient_gmail,remarks,po_number,request_date,expected_receive_date,approved_at,created_at,synced_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())
  ON DUPLICATE KEY UPDATE request_number=VALUES(request_number),requester_team=VALUES(requester_team),destination=VALUES(destination),status=VALUES(status),delivery_status=VALUES(delivery_status),expected_days=VALUES(expected_days),expected_date=VALUES(expected_date),recipient_name=VALUES(recipient_name),recipient_gmail=VALUES(recipient_gmail),remarks=VALUES(remarks),po_number=VALUES(po_number),request_date=VALUES(request_date),expected_receive_date=VALUES(expected_receive_date),approved_at=VALUES(approved_at),created_at=VALUES(created_at),synced_at=NOW()")
  ->execute([$id,$num,(string)($r["requester_team"]??""),(string)($r["destination"]??""),(string)($r["status"]??"Pending"),isset($r["delivery_status"])?(string)$r["delivery_status"]:null,isset($r["expected_days"])?(string)$r["expected_days"]:null,$d($r["expected_date"]??""),isset($r["recipient_name"])?(string)$r["recipient_name"]:null,isset($r["recipient_gmail"])?(string)$r["recipient_gmail"]:null,isset($r["remarks"])?(string)$r["remarks"]:null,isset($r["po_number"])?(string)$r["po_number"]:null,$d($r["request_date"]??""),$d($r["expected_receive_date"]??""),$t($r["approved_at"]??""),$t($r["created_at"]??"")]);
 $ins=$pdo->prepare("INSERT INTO request_items(id,request_id,item_id,item_name,size,unit,quantity,approved_quantity,delivered_quantity,accepted_quantity) VALUES(?,?,?,?,?,?,?,?,?,?)
  ON DUPLICATE KEY UPDATE request_id=VALUES(request_id),item_id=VALUES(item_id),item_name=VALUES(item_name),size=VALUES(size),unit=VALUES(unit),quantity=VALUES(quantity),approved_quantity=VALUES(approved_quantity),delivered_quantity=VALUES(delivered_quantity),accepted_quantity=VALUES(accepted_quantity)");
 $seen=[];
 foreach(($r["items"]??[]) as $it){
  $rid=(int)($it["request_item_id"]??0);if($rid<=0)continue;$seen[]=$rid;
  $ins->execute([$rid,$id,isset($it["item_id"])&&(int)$it["item_id"]>0?(int)$it["item_id"]:null,(string)($it["item_name"]??""),(string)($it["size"]??""),(string)((($it["unit"]??"")!=="")?$it["unit"]:"pcs"),(float)($it["requested_quantity"]??$it["quantity"]??0),(float)($it["approved_quantity"]??0),(float)($it["delivered_quantity"]??0),(float)($it["accepted_quantity"]??0)]);
 }
 if($seen)$pdo->exec("DELETE FROM request_items WHERE request_id=$id AND id NOT IN (".implode(",",$seen).")");
 else $pdo->exec("DELETE FROM request_items WHERE request_id=$id");
 return true;
}

function refresh_inventory_request($pdo,$requestNumber){
 try{foreach(inv_api_requests($requestNumber) as $r){if(($r["request_number"]??"")===$requestNumber){store_inventory_request($pdo,$r);return $r;}}}
 catch(Throwable $e){error_log("refresh_inventory_request $requestNumber: ".$e->getMessage());}
 return null;
}

function sync_requests_from_inventory($pdo,$force=false){
 static $ran=false;
 if(!$force&&($ran||(time()-($_SESSION["req_sync_at"]??0))<5))return empty($_SESSION["inv_api_error"]);
 $_SESSION["req_sync_at"]=time();$ran=true;
 try{$rows=inv_api_requests();}
 catch(Throwable $e){$_SESSION["inv_api_error"]=$e->getMessage();error_log("sync_requests_from_inventory: ".$e->getMessage());return false;}
 unset($_SESSION["inv_api_error"]);
 $ids=[];
 foreach($rows as $r){if(is_array($r)&&store_inventory_request($pdo,$r))$ids[]=(int)$r["id"];}
 if($ids){$in=implode(",",$ids);$pdo->exec("DELETE FROM requests WHERE id NOT IN ($in)");$pdo->exec("DELETE FROM request_items WHERE request_id NOT IN ($in)");}
 else{$pdo->exec("DELETE FROM requests");$pdo->exec("DELETE FROM request_items");}
 reconcile_material_requests($pdo);
 return true;
}

function reconcile_material_requests($pdo){
 $rows=$pdo->query("SELECT mr.request_id,mr.order_id,mr.material_id,mr.qty_value,mr.inventory_request_number num,TIMESTAMPDIFF(SECOND,mr.requested_at,NOW()) age,i.item_name material,r.id inv_id,r.status inv_status
  FROM material_requests mr LEFT JOIN items i ON i.id=mr.material_id LEFT JOIN requests r ON r.request_number=mr.inventory_request_number
  WHERE mr.status='pending' AND mr.inventory_request_number IS NOT NULL AND mr.inventory_request_number<>''")->fetchAll();
 $upd=$pdo->prepare("UPDATE material_requests SET status=?,approved_qty=?,inventory_request_id=COALESCE(?,inventory_request_id) WHERE request_id=? AND status='pending'");
 $link=$pdo->prepare("UPDATE material_requests SET inventory_request_id=? WHERE request_id=? AND inventory_request_id IS NULL");
 $aq=$pdo->prepare("SELECT COALESCE(SUM(approved_quantity),0) FROM request_items WHERE request_id=? AND item_id=?");
 foreach($rows as $row){
  $st=strtolower(trim((string)$row["inv_status"]));
  if($row["inv_id"]!==null&&($st===""||$st==="pending")){$link->execute([$row["inv_id"],$row["request_id"]]);continue;}
  $gone=$row["inv_id"]===null;
  if($gone&&(int)$row["age"]<120)continue;
  $new=($gone||preg_match('/disapprov|reject|declin|cancel/',$st))?"rejected":"approved";
  $approved=null;
  if($new==="approved"){$aq->execute([$row["inv_id"],$row["material_id"]]);$approved=(float)$aq->fetchColumn();if($approved<=0)$approved=(float)$row["qty_value"];}
  $upd->execute([$new,$approved,$row["inv_id"],$row["request_id"]]);
  if($upd->rowCount()!==1)continue;
  if($new==="rejected")notify($pdo,"warning","Material request #{$row['request_id']} for {$row['order_id']} was ".($gone?"removed":"disapproved")." by Inventory",$row["order_id"]);
  else notify($pdo,"info","Inventory approved ".format_qty($approved)." of {$row['material']} for {$row['order_id']} — you can accept it in Material issuance once Inventory marks it Out for Delivery",$row["order_id"]);
 }
}

function submit_material_request_to_inventory($pdo,$orderId,$materialId,$qty,$needBy,$priority){
 $szq=$pdo->prepare("SELECT shoe_size_cm FROM production_orders WHERE order_id=?");$szq->execute([$orderId]);$szv=$szq->fetchColumn();
 $remarks="Production $orderId — material request".(($szv!==false&&$szv!==null&&$szv!=="")?" | Size: ".size_label($szv):"").($priority==="urgent"?" (URGENT)":"").actor_note();
 if($needBy<date("Y-m-d"))$needBy=date("Y-m-d");
 $d=inv_api_create_request(inventory_warehouse_id($pdo),[["item_id"=>(int)$materialId,"quantity"=>(int)$qty]],$needBy,$remarks,(string)($_SESSION["full_name"]??"Production"),(string)$orderId);
 $num=trim((string)($d["request_number"]??""));
 if($num==="")throw new InventoryApiError("Inventory accepted the request but did not return its request number.");
 return $num;
}

function material_delivery_state($pdo,$req){
 $out=["can_accept"=>false,"num"=>(string)($req["inventory_request_number"]??""),"inv_status"=>null,"delivery_status"=>null,"note"=>""];
 if($out["num"]==="")return $out;
 $q=$pdo->prepare("SELECT id,status,delivery_status FROM requests WHERE request_number=?");$q->execute([$out["num"]]);$r=$q->fetch();
 if(!$r)return $out;
 $out["inv_status"]=$r["status"];$out["delivery_status"]=$r["delivery_status"];
 $ds=strtolower(trim((string)$r["delivery_status"]));
 if($ds==="partially delivered"){
  $t=$pdo->prepare("SELECT COALESCE(SUM(CASE WHEN approved_quantity>0 THEN approved_quantity ELSE quantity END),0) target,COALESCE(SUM(delivered_quantity),0) delivered,COALESCE(SUM(accepted_quantity),0) accepted FROM request_items WHERE request_id=? AND item_id=?");
  $t->execute([$r["id"],(int)($req["material_id"]??0)]);$x=$t->fetch();
  $out["note"]="Inventory marked this delivery Partially Delivered".($x?(": delivered ".format_qty($x["delivered"])." of ".format_qty($x["target"]).", accepted ".format_qty($x["accepted"])):"").". Accept unlocks when Inventory completes it and marks it Out for Delivery.";
 }elseif($ds==="to ship"||$ds==="")$out["note"]="Inventory has approved this but has not shipped it yet.";
 $out["can_accept"]=in_array($ds,["out for delivery","delivered","accepted"],true)&&!preg_match('/disapprov|reject|declin|cancel|pending/',strtolower(trim((string)$r["status"])));
 return $out;
}

function receive_materials_from_inventory($pdo,$req){
 $num=trim((string)($req["inventory_request_number"]??""));
 if($num==="")return "This request was never filed with Inventory, so it cannot be accepted.";
 try{
  $row=null;foreach(inv_api_requests($num) as $r){if(($r["request_number"]??"")===$num){$row=$r;break;}}
  if(!$row)return "Inventory no longer has this request.";
  store_inventory_request($pdo,$row);
  $st=strtolower(trim((string)($row["status"]??"")));
  if(preg_match('/disapprov|reject|declin|cancel/',$st))return "Inventory did not approve this request (it is ".$row["status"].").";
  if($st==="pending")return "Inventory has not approved this request yet.";
  $ds=strtolower(trim((string)($row["delivery_status"]??"")));
  if($ds==="out for delivery"){inv_api_accept_delivery($num);$row=null;foreach(inv_api_requests($num) as $r){if(($r["request_number"]??"")===$num){$row=$r;store_inventory_request($pdo,$r);break;}}}
  elseif($ds==="partially delivered"){$m=material_delivery_state($pdo,$req);return $m["note"]!==""?$m["note"]:"Inventory marked this delivery Partially Delivered — wait until it is complete (Out for Delivery), then accept.";}
  elseif(!in_array($ds,["delivered","accepted"],true))return "Inventory approved this request but has not sent it out for delivery yet — wait until Inventory marks it Out for Delivery, then accept.";
  $acc=0.0;$app=0.0;
  foreach(($row["items"]??[]) as $it){if((int)($it["item_id"]??0)===(int)$req["material_id"]){$acc+=(float)($it["accepted_quantity"]??0);$app+=(float)($it["approved_quantity"]??0);}}
  if($acc<=0)$acc=$app>0?$app:(float)$req["qty_value"];
  return $acc;
 }catch(InventoryApiError $e){return "Inventory: ".$e->getMessage();}
}

function product_request_where(){
 return "r.destination='Production' AND r.requester_team='Inventory'
  AND NOT EXISTS (SELECT 1 FROM material_requests mr WHERE mr.inventory_request_number=r.request_number)
  AND EXISTS (SELECT 1 FROM request_items a WHERE a.request_id=r.id)
  AND NOT EXISTS (SELECT 1 FROM request_items x LEFT JOIN items xi ON xi.id=x.item_id WHERE x.request_id=r.id AND (xi.id IS NULL OR xi.item_type<>'Finished Good'))";
}

function notify_new_product_requests($pdo){
 try{
  $rows=$pdo->query("SELECT r.id,r.request_number,ri.item_name,ri.quantity,ri.unit FROM requests r JOIN request_items ri ON ri.request_id=r.id WHERE r.status='Pending' AND ".product_request_where()." ORDER BY r.id")->fetchAll();
  $seen=$pdo->prepare("SELECT 1 FROM notifications WHERE message LIKE ? LIMIT 1");
  foreach($rows as $r){
   $tag="Inventory product request ".$r["request_number"];
   $seen->execute([$tag."%"]);if($seen->fetchColumn())continue;
   notify($pdo,"info",$tag." — ".format_qty($r["quantity"])." ".$r["unit"]." of ".$r["item_name"]." is waiting for your approval (Material issuance)");
  }
 }catch(Throwable $e){error_log("notify_new_product_requests: ".$e->getMessage());}
}

function request_item_line($pdo,$requestId,$productName=null){
 $q=$pdo->prepare("SELECT id,item_id,item_name,quantity,approved_quantity FROM request_items WHERE request_id=? ORDER BY id");$q->execute([$requestId]);$rows=$q->fetchAll();
 if(!$rows)return null;
 if($productName!==null&&$productName!=="")foreach($rows as $r)if(fg_name_key($r["item_name"])===fg_name_key($productName))return $r;
 return $rows[0];
}

function fg_send_plan($pdo,$fg){
 $rid=order_request_id($pdo,$fg["order_id"]);if(!$rid)return null;
 $q=$pdo->prepare("SELECT request_number,status FROM requests WHERE id=?");$q->execute([$rid]);$r=$q->fetch();if(!$r)return null;
 $pi=$pdo->prepare("SELECT product_name FROM products WHERE product_id=?");$pi->execute([$fg["product_id"]]);$pname=$pi->fetchColumn();
 $line=request_item_line($pdo,$rid,$pname?:null);if(!$line)return null;
 $open=in_array($r["status"],["Pending","Approved","Partially Approved"],true);
 $qty=($r["status"]==="Pending"||(float)$line["approved_quantity"]<=0)?(float)$line["quantity"]:(float)$line["approved_quantity"];
 $target=$open?(int)ceil($qty):0;
 $d=$pdo->prepare("SELECT COALESCE(SUM(request_qty),0) FROM finished_goods WHERE request_id=? AND status='sent_to_inventory'");$d->execute([$rid]);$already=(int)$d->fetchColumn();
 $ad=$pdo->prepare("SELECT COUNT(*) FROM production_orders WHERE request_id=? AND delivered_on_approval=1");$ad->execute([$rid]);$auto=(int)$ad->fetchColumn()>0;
 if($auto)$already=max($already,$target);
 $need=max(0,$target-$already);
 $cand=[$fg];
 if($need>(int)$fg["accepted_qty"]){
  $o=$pdo->prepare("SELECT fg.*,po.shoe_size_cm FROM finished_goods fg JOIN production_orders po ON po.order_id=fg.order_id WHERE fg.status='ready' AND fg.fg_id<>? AND fg.product_id=? AND po.shoe_size_cm <=> ? AND po.status IN ('quality_check','completed') AND (po.request_id IS NULL OR po.request_id=?) AND fg.accepted_qty>0 ORDER BY fg.fg_id");
  $o->execute([$fg["fg_id"],$fg["product_id"],($fg["shoe_size_cm"]===""?null:$fg["shoe_size_cm"]),$rid]);
  foreach($o->fetchAll() as $x)$cand[]=$x;
 }
 $avail=0;foreach($cand as $c)$avail+=(int)$c["accepted_qty"];
 $remaining=$need;$parts=[];
 foreach($cand as $i=>$c){
  if($i>0&&$remaining<=0)break;
  $a=(int)$c["accepted_qty"];$use=min($remaining,$a);$remaining-=$use;
  $parts[]=["fg"=>$c,"use"=>$use,"excess"=>$a-$use];
 }
 return ["request_id"=>(int)$rid,"request_number"=>$r["request_number"],"request_status"=>$r["status"],"request_item_id"=>(int)$line["id"],"target"=>$target,"already"=>$already,"auto"=>$auto,"need"=>$need,"avail"=>$avail,"short"=>max(0,$need-$avail),"parts"=>$parts];
}

function fg_resolve_plan($pdo,$fg){
 if(order_request_id($pdo,$fg["order_id"]))return fg_send_plan($pdo,$fg);
 try{
  ensure_order_request_link($pdo);
  $q=$pdo->prepare("SELECT fg.*,po.shoe_size_cm FROM finished_goods fg JOIN production_orders po ON po.order_id=fg.order_id JOIN requests r ON r.id=po.request_id WHERE fg.status='ready' AND fg.fg_id<>? AND fg.product_id=? AND po.shoe_size_cm <=> ? AND po.request_id IS NOT NULL AND r.status IN ('Pending','Approved','Partially Approved') ORDER BY fg.fg_id");
  $q->execute([$fg["fg_id"],$fg["product_id"],($fg["shoe_size_cm"]===""?null:$fg["shoe_size_cm"])]);
  foreach($q->fetchAll() as $primary){
   $plan=fg_send_plan($pdo,$primary);
   if(!$plan||$plan["need"]<=0)continue;
   foreach($plan["parts"] as $p)if((int)$p["fg"]["fg_id"]===(int)$fg["fg_id"])return $plan;
  }
 }catch(Throwable $e){error_log("fg_resolve_plan: ".$e->getMessage());}
 return null;
}

function report_finished_goods_to_inventory($pdo,$plan){
 $num=$plan["request_number"];
 if($plan["request_status"]==="Pending"){
  $ap=[];$l=$pdo->prepare("SELECT id,quantity FROM request_items WHERE request_id=?");$l->execute([$plan["request_id"]]);
  foreach($l->fetchAll() as $x)$ap[(int)$x["id"]]=(int)ceil((float)$x["quantity"]);
  $pos=[];foreach(($plan["parts"]??[]) as $p){$oid=trim((string)($p["fg"]["order_id"]??""));if($oid!==""&&!in_array($oid,$pos,true))$pos[]=$oid;}
  inv_api_approve($num,"Approved",$ap,implode(", ",$pos));
 }
 $t=$pdo->prepare("SELECT COALESCE(SUM(request_qty),0) FROM finished_goods WHERE request_id=? AND status='sent_to_inventory'");$t->execute([$plan["request_id"]]);
 $total=min((int)$t->fetchColumn(),$plan["target"]);
 inv_api_report_delivery($num,[$plan["request_item_id"]=>$total]);
}


function ensure_order_request_link($pdo){
 static $done=false;if($done)return;$done=true;
 try{
  if(!$pdo->query("SHOW COLUMNS FROM production_orders LIKE 'request_id'")->fetch())
   $pdo->exec("ALTER TABLE production_orders ADD COLUMN request_id INT NULL DEFAULT NULL");
  if(!$pdo->query("SHOW COLUMNS FROM production_orders LIKE 'delivered_on_approval'")->fetch())
   $pdo->exec("ALTER TABLE production_orders ADD COLUMN delivered_on_approval TINYINT(1) NOT NULL DEFAULT 0");
 }catch(Throwable $e){error_log("ensure_order_request_link: ".$e->getMessage());}
}

function order_request_id($pdo,$orderId){
 try{ensure_order_request_link($pdo);
  $q=$pdo->prepare("SELECT request_id FROM production_orders WHERE order_id=?");$q->execute([$orderId]);
  $v=$q->fetchColumn();return $v?(int)$v:null;
 }catch(Throwable $e){return null;}
}

function create_order_for_request($pdo,$productId,$qty,$size,$requestId){
 $b=$pdo->prepare("SELECT DISTINCT bm.material_id FROM bill_of_materials bm JOIN items i ON i.id=bm.material_id WHERE bm.product_id=?");$b->execute([$productId]);$mats=$b->fetchAll();
 $orderId=null;
 for($attempt=0;$attempt<5;$attempt++){
  $max=(int)$pdo->query("SELECT COALESCE(MAX(CAST(SUBSTRING(order_id,4) AS UNSIGNED)),1041) FROM production_orders WHERE order_id REGEXP '^PO-[0-9]+$'")->fetchColumn();
  $candidate="PO-".($max+1+$attempt);
  try{
   $pdo->prepare("INSERT INTO production_orders(order_id,product_id,quantity,shoe_size_cm,start_date,priority,status,eta_label,request_id) VALUES(?,?,?,?,CURDATE(),'normal','planning',NULL,?)")->execute([$candidate,$productId,$qty,$size,$requestId]);
   $orderId=$candidate;break;
  }catch(PDOException $e){if($e->getCode()!=="23000")throw $e;}
 }
 if($orderId===null)throw new RuntimeException("Could not allocate an order number — please try again.");
 $pdo->prepare("INSERT INTO production_monitoring(order_id,progress_percent) VALUES(?,10)")->execute([$orderId]);
 foreach($mats as $l)$pdo->prepare("INSERT IGNORE INTO checklist_items(order_id,material_id,ready) VALUES(?,?,0)")->execute([$orderId,$l["material_id"]]);
 return $orderId;
}

function ensure_request_flow($pdo){
 static $done=false;if($done)return;$done=true;
 ensure_schema($pdo);
 ensure_order_request_link($pdo);
}

if(isset($pdo)&&current_user()){
 ensure_schema($pdo);
 if((time()-($_SESSION["inv_sync_at"]??0))>20){
  $_SESSION["inv_sync_at"]=time();
  sync_products_from_inventory($pdo);
 }
}

/* Approve = deliver: right after production approves an Inventory product request, the full approved quantity is
   reported to Inventory as delivered, without waiting for the goods to be produced. Returns null on success or the error text. */
function deliver_request_on_approval($pdo,$requestNumber,array $approved,$orderId){
 try{
  inv_api_report_delivery($requestNumber,$approved);
  $pdo->prepare("UPDATE production_orders SET delivered_on_approval=1 WHERE order_id=?")->execute([$orderId]);
  return null;
 }catch(Throwable $e){error_log("deliver_request_on_approval $requestNumber: ".$e->getMessage());return $e->getMessage();}
}
?>
