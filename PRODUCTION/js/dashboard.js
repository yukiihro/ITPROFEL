var ProductionPage={init:function(){
 var A=ProductionApp;
 function load(){A.request("php/dashboard.php",{},"GET",function(r){
  if(!r.success)return;
  var s=r.stats;
  document.getElementById("activeOrders").textContent=A.qty(s.active_orders);
  document.getElementById("pendingRequests").textContent=A.qty(s.pending_requests);
  document.getElementById("wipValue").textContent=A.money(s.wip_value);
  document.getElementById("lowStockAlerts").textContent=A.qty(s.low_stock_alerts);
  document.getElementById("lowCard").classList.toggle("danger",s.low_stock_alerts>0);
  var box=document.getElementById("attentionBox");
  if(r.attention.length){box.style.display="";document.getElementById("attentionList").innerHTML=r.attention.map(function(a){return '<div class="attention-item"><span>'+A.esc(a.text)+'</span><a class="link-btn" href="'+A.esc(a.page)+'">'+A.esc(a.link)+'</a></div>'}).join("")}else box.style.display="none";
  document.getElementById("lineList").innerHTML=r.recent_orders.length?r.recent_orders.map(function(o){
   return '<div class="line-row"><div><h4>'+A.orderLink(o.order_id)+' — '+A.esc(o.product)+(o.priority==="urgent"?' '+A.badge("Urgent","urgent"):"")+'</h4><p>'+o.quantity+' pairs · started '+A.shortDate(o.start_date)+(o.eta_label?' · about '+A.esc(o.eta_label):"")+'</p></div>'+A.stageTrack(o.status,null,true)+'</div>'}).join(""):'<div class="empty">No active orders. Start one from Production Orders.</div>';
  document.getElementById("lowStockList").innerHTML=r.low_stock_items.length?r.low_stock_items.map(function(x){return '<div class="compact-item"><span>'+A.esc(x.item_name)+'<br><small>Open orders need '+A.qty(x.reorder_level)+'</small></span><b>'+A.qty(x.stock)+' left</b></div>'}).join(""):'<div class="empty">The materials in stock cover every open order.</div>';
 });
 A.request("php/deliveries.php",{},"GET",function(r){
  if(!r.success)return;var s=r.stats;
  function row(l,v){return '<div class="compact-item"><span>'+l+'</span><b>'+v+'</b></div>'}
  document.getElementById("dlvRaw").innerHTML='<h4 style="margin:0 0 6px;font-size:12.5px">Raw materials</h4>'+row("Awaiting approval",s.rm_awaiting)+row("Ready for delivery",s.rm_ready)+row("Delivered",s.rm_delivered);
  document.getElementById("dlvFg").innerHTML='<h4 style="margin:0 0 6px;font-size:12.5px">Finished goods</h4>'+row("In quality check",s.fg_in_qc)+row("Awaiting delivery to Inventory",s.fg_awaiting)+row("Delivered to Inventory",s.fg_delivered);
 });
 }
 ProductionPage.reload=load;load();
}};
