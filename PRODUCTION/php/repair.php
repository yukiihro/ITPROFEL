<?php
require_once "database.php"; require_once "helpers.php";
header("Content-Type: text/html; charset=utf-8");
$local=in_array($_SERVER["REMOTE_ADDR"]??"",["127.0.0.1","::1"],true);
if(!$local&&(!current_user()||($_SESSION["role"]??"")!=="production_supervisor")){http_response_code(403);echo "<!doctype html><meta charset=utf-8><p style='font-family:Arial;margin:30px'>Sign in to the Production system as a <b>supervisor</b> first, then open this page again (or open it on the host computer itself).</p>";exit;}
$bad=[];$html="";
function q1($pdo,$sql){try{return $pdo->query($sql)->fetchAll();}catch(Throwable $e){return "ERROR: ".$e->getMessage();}}
function row($c,$t,$d=""){return "<tr><td>$c</td><td><b>$t</b></td><td>$d</td></tr>";}
global $config;
unset($_SESSION["schema_v"]);ensure_schema($pdo);
$html.=row("Inventory API address",safe($config["inventory_api_url"]??""));
try{$d=inv_api_items();$html.=row("Inventory API","<span class=g>OK</span>",count($d["items"])." item(s), ".count($d["warehouses"])." warehouse(s)");}
catch(Throwable $e){$bad[]="Inventory API: ".$e->getMessage();$html.=row("Inventory API","<span class=b>PROBLEM</span>",safe($e->getMessage()));}
foreach(["products","bill_of_materials","production_orders","production_users","material_costs","items","warehouses","requests","request_items"] as $t){
 $r=q1($pdo,"SELECT COUNT(*) n FROM `$t`");
 if(is_array($r))$html.=row("Table <code>$t</code>","OK",$r[0]["n"]." rows");
 else{$bad[]="`$t` is missing or broken: ".$r;$html.=row("Table <code>$t</code>","<span class=b>PROBLEM</span>",safe($r));}
}
$err=null;try{sync_products_inner($pdo);}catch(Throwable $e){$err=$e->getMessage();}
$html.=row("Repair / sync from Inventory","".($err?"<span class=b>FAILED</span>":"<span class=g>DONE</span>"),safe($err??""));
if($err)$bad[]="Sync failed: $err";
$prods=q1($pdo,"SELECT p.product_id,p.product_name,(SELECT COUNT(*) FROM bill_of_materials b WHERE b.product_id=p.product_id) bom FROM products p ORDER BY p.product_id");
if(is_array($prods)){foreach($prods as $p)$html.=row("Product #$p[product_id]",safe($p["product_name"]),$p["bom"]." BOM line(s)");if(!$prods)$bad[]="No products: Inventory's API returned no active Finished Good items.";}
echo "<!doctype html><meta charset=utf-8><title>Production repair</title><style>body{font-family:Arial;margin:30px;max-width:900px}table{border-collapse:collapse;width:100%}td{border:1px solid #ddd;padding:7px 10px;font-size:14px}.b{color:#B3261E}.g{color:#2E7D32}.box{padding:14px;border-radius:8px;margin:14px 0}</style>";
echo "<h2>Production module - repair report (build 40)</h2>";
echo $bad?"<div class=box style='background:#FDE7E9'><b>Problems found:</b><ul><li>".implode("</li><li>",array_map('safe',$bad))."</li></ul></div>":"<div class=box style='background:#E6F4EA'><b>All good.</b> Products and the Bill of materials are built from Inventory's API. Go back to the system and press Ctrl+F5.</div>";
echo "<table>$html</table>";
?>
