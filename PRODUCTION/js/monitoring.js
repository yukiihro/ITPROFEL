var ProductionPage={init:function(){
 var A=ProductionApp;
 function load(){A.request("php/monitoring.php",{},"GET",function(r){
  var host=document.getElementById("monitorList");
  if(!r.success)return;
  if(!r.rows.length){host.innerHTML='<div class="empty">Nothing in progress.</div>';return}
  host.innerHTML=r.rows.map(function(o){
   var sub;
   if(o.status==="planning")sub="Just created — BOM and schedule confirmed";
   else if(o.status==="materials")sub=o.ready_count+" of "+o.total_count+" materials ready"+(o.ready_count===o.total_count?"":" — "+(o.total_count-o.ready_count)+" still needed");
   else if(o.status==="quality_check")sub="Waiting for quality review";
   else sub=o.progress_percent+"% through "+A.STAGE_LABEL[o.status];
   return '<div class="monitor-card"><h3>'+A.orderLink(o.order_id)+' — '+A.esc(o.product)+'</h3><p>Qty '+o.quantity+' · Started '+A.shortDate(o.start_date)+(o.eta_label?' · Est. '+A.esc(o.eta_label):"")+'</p>'+A.stageTrack(o.status)+'<div class="bar-big" style="margin-top:14px"><i style="width:'+o.progress_percent+'%"></i></div><div class="stage-sub">'+A.esc(sub)+'</div>'+(o.status==="production"?'<div style="margin-top:10px"><a class="btn primary" href="order-details.html?id='+encodeURIComponent(o.order_id)+'&finish=1">Finish production</a></div>':"")+'</div>'}).join("")})}
 ProductionPage.reload=load;load();
}};
