var ProductionPage={init:function(){
 var A=ProductionApp,products=[],current=null;
 function render(){
  document.getElementById("productTabs").innerHTML=products.map(function(p){return '<button class="tab'+(p.product_id===current?" active":"")+'" data-id="'+p.product_id+'">'+A.esc(p.product)+'</button>'}).join("");
  var p=products.filter(function(x){return x.product_id===current})[0];if(!p)return;
  var q=document.getElementById("tableSearch").value.toLowerCase();
  var word=(p.producible_units===1&&/s$/.test(p.unit_of_measure))?p.unit_of_measure.slice(0,-1):p.unit_of_measure;
  document.getElementById("yieldBanner").innerHTML='You can produce up to <b>'+p.producible_units+' '+A.esc(word)+'</b> of '+A.esc(p.product)+' right now'+(p.limiting_material?', limited by <b>'+A.esc(p.limiting_material)+'</b>':"")+'.';
  var rows=p.lines.filter(function(l){return l.material.toLowerCase().indexOf(q)>=0});
  document.getElementById("bomTable").innerHTML=rows.length?rows.map(function(l){return '<tr><td>'+A.esc(l.material)+'</td><td>'+A.qty(l.qty_per_unit)+' '+A.esc(l.unit)+'</td><td>'+A.qty(l.available_stock)+' '+A.esc(l.unit)+'</td><td'+(l.material===p.limiting_material?' class="limit-cell"':"")+'>'+l.producible_units+'</td></tr>'}).join(""):'<tr><td colspan="4" class="empty">No materials found.</td></tr>';
 }
 A.request("php/bom.php",{},"GET",function(r,status,raw){var bn=document.getElementById("yieldBanner");if(!r.success){bn.textContent="Could not load the bill of materials - "+(r.message||("HTTP "+status))+" (open php/repair.php for details)";return}if(!r.products.length){bn.textContent="No products yet - Inventory has no active Finished Good items. Open php/repair.php for details.";return}products=r.products;var want=Number(A.query("product"));current=products.some(function(p){return p.product_id===want})?want:(products[0]&&products[0].product_id);render()});
 document.getElementById("productTabs").onclick=function(e){var b=e.target.closest(".tab");if(b){current=Number(b.dataset.id);render()}};
 document.getElementById("tableSearch").oninput=render;
}};
