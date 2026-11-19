var ProductionPage={init:function(){
 if(document.body.dataset.role==="SUPERVISOR"){location.href="supervisor-overview.html";return}
 var A=ProductionApp,orders=[],current=null;
 function progress(c,label){return '<p class="progress-line"><b>'+c.ready_count+' of '+c.total_count+'</b> materials confirmed'+(c.all_ready?" — all set for production":(c.short_count?" · "+c.short_count+" short — request from Inventory":""))+(label?' · Stage: <b>'+A.esc(label)+'</b>':"")+'</p>'}
 function render(){
  var host=document.getElementById("checklistView");
  if(!orders.length){document.getElementById("orderTabs").innerHTML="";host.innerHTML='<div class="empty">No active orders yet.</div>';return}
  document.getElementById("orderTabs").innerHTML=orders.map(function(o){return '<button class="tab'+(o.order_id===current?" active":"")+'" data-id="'+A.esc(o.order_id)+'">'+A.esc(o.order_id)+' — '+A.esc(o.product)+(o.size_label?' ('+A.esc(o.size_label)+')':'')+'</button>'}).join("");
  var o=orders.filter(function(x){return x.order_id===current})[0];if(!o)return;
  var c=o.checklist;
  host.innerHTML=progress(c,o.status_label)+(c.items.length?c.items.map(function(it){return '<div class="check-row'+(it.ready?" checked":"")+'" data-material="'+it.material_id+'" data-enough="'+(it.enough?1:0)+'"><div class="check-box">'+(it.ready?"✓":"")+'</div><div class="check-name">'+A.esc(it.material)+'</div><div class="check-qty">Need '+A.esc(it.qty_label)+' · Have '+A.esc(it.on_hand_label)+'</div>'+(it.enough?A.badge("Enough","success"):A.badge("Short "+it.short_label,"reject"))+'</div>'}).join(""):'<div class="empty">No checklist for this order.</div>');
 }
 function load(){A.request("php/checklist.php",{action:"list"},"GET",function(r){if(!r.success)return;orders=r.orders;if(!current||!orders.some(function(o){return o.order_id===current})){var want=A.query("order");current=orders.some(function(o){return o.order_id===want})?want:(orders[0]&&orders[0].order_id)}render()})}
 document.getElementById("orderTabs").onclick=function(e){var b=e.target.closest(".tab");if(b){current=b.dataset.id;render()}};
 document.getElementById("checklistView").onclick=function(e){
  var row=e.target.closest(".check-row");if(!row||row.classList.contains("busy"))return;
  if(row.dataset.enough==="0"&&!row.classList.contains("checked")){A.toast("Not enough of this material in the Materials inventory — request it from Inventory first.");return}
  row.classList.add("busy");var willReady=!row.classList.contains("checked");
  A.request("php/checklist.php",{action:"toggle",order_id:current,material_id:row.dataset.material,ready:willReady?1:0},"POST",function(r){
   if(!r.success){A.toast(r.message||"Could not update checklist");row.classList.remove("busy");return}
   if(r.stage_changed)A.toast(current+" moved to "+r.status_label+(r.all_ready?" — all materials ready":""));
   load()})};
 load();
}};
