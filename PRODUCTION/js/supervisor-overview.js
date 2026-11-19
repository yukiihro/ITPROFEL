var ProductionPage={init:function(){
 var A=ProductionApp,rows=[];
 function render(){
  var q=document.getElementById("tableSearch").value.toLowerCase(),t=document.getElementById("typeFilter").value;
  var data=rows.filter(function(r){return (!t||r.type===t)&&JSON.stringify(r).toLowerCase().indexOf(q)>=0});
  document.getElementById("txTable").innerHTML=data.length?data.map(function(r){
   return '<tr><td>'+A.longDate(r.at)+'</td><td>'+A.esc(r.type_label)+'</td><td>'+A.esc(r.reference)+'</td><td>'+A.orderLink(r.order_id)+'</td><td>'+A.esc(r.details)+'</td><td>'+A.badge(r.status_label,r.tone)+'</td></tr>'}).join(""):'<tr><td colspan="6" class="empty">No transactions to show.</td></tr>';
  document.getElementById("txCount").textContent="Showing "+data.length+" of "+rows.length;
 }
 function load(){A.request("php/supervisor.php",{},"GET",function(r){
  if(!r.success){A.toast(r.message);if(r.message&&/supervisor/i.test(r.message))setTimeout(function(){location.href="dashboard.html"},1200);return}
  rows=r.transactions;render();
  document.getElementById("supActivity").innerHTML=r.recent_activity.length?r.recent_activity.map(function(a){return '<div class="activity-item"><span><b>'+A.esc(a.full_name||a.username||"Someone")+'</b> '+A.esc(a.action)+'</span><small>'+A.relTime(a.created_at)+'</small></div>'}).join(""):'<div class="empty">No activity recorded yet.</div>'})}
 document.getElementById("tableSearch").oninput=render;document.getElementById("typeFilter").onchange=render;
 ProductionPage.reload=load;load();
}};
