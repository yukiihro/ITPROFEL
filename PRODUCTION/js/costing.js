var ProductionPage={init:function(){
 var A=ProductionApp;
 function load(){
  A.request("php/orders.php",{action:"list"},"GET",function(r){if(r.success){A.fillSelect(document.getElementById("cOrder"),r.orders,"order_id",function(o){return o.order_id+" — "+o.product});if(!r.orders.length)document.getElementById("cOrder").innerHTML='<option value="">No active orders</option>'}});
  A.request("php/costing.php",{action:"list"},"GET",function(r){if(!r.success)return;
   document.getElementById("costTable").innerHTML=r.rows.length?r.rows.map(function(c){return '<tr><td>'+A.orderLink(c.order_id)+'</td><td>'+A.esc(c.product)+'</td><td>'+A.money(c.materials_cost)+'</td><td>'+A.money(c.labor_cost)+'</td><td>'+A.money(c.overhead_cost)+'</td><td><b>'+A.money(c.total_cost)+'</b></td><td>'+c.quantity+'</td><td>'+A.money(c.cost_per_unit)+'</td><td>'+(Number(c.sent_to_finance)?A.badge("Sent to finance","success"):'<button class="action-btn" data-id="'+c.costing_id+'" data-order="'+A.esc(c.order_id)+'">Send to finance</button>')+'</td></tr>'}).join(""):'<tr><td colspan="9" class="empty">No costing records yet — calculate one above.</td></tr>'})}
 document.getElementById("calcBtn").onclick=function(){
  var ok=A.fieldError("cLabor",cLabor.value.trim()===""?"":A.checkDecimal(cLabor.value,"Labor cost",0,10000000));
  ok=A.fieldError("cOverhead",cOverhead.value.trim()===""?"":A.checkDecimal(cOverhead.value,"Overhead cost",0,10000000))&&ok;
  if(!cOrder.value){A.toast("No order selected");return}if(!ok)return;
  A.request("php/costing.php",{action:"calculate",order_id:cOrder.value,labor_cost:cLabor.value.trim()||"0",overhead_cost:cOverhead.value.trim()||"0"},"POST",function(r){A.toast(r.message);if(r.success){cLabor.value="";cOverhead.value="";load()}})};
 document.getElementById("costTable").onclick=function(e){var b=e.target.closest("[data-id]");if(!b||b.disabled)return;
  A.confirm("Send the costing for "+b.dataset.order+" to Team 5 — Finance?",function(){b.disabled=true;
  A.request("php/costing.php",{action:"send_to_finance",id:b.dataset.id},"POST",function(r){A.toast(r.message);load()})})};
 document.getElementById("printBtn").onclick=function(){window.print()};
 load();
}};
