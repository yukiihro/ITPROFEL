var ProductionPage={init:function(){
 var A=ProductionApp,tab="rm",data={rm:[],fg:[]},STATUS={
  rm:[["","All statuses"],["pending","Awaiting approval"],["approved","Ready for delivery"],["issued","Delivered"],["rejected","Rejected"]],
  fg:[["","All statuses"],["in_qc","In quality check"],["awaiting","Awaiting delivery"],["delivered","Delivered to Inventory"]]};
 function card(label,value){return '<div class="stat-card"><span>'+label+'</span><strong>'+value+'</strong></div>'}
 function setFilter(){var f=document.getElementById("statusFilter");f.innerHTML=STATUS[tab].map(function(o){return '<option value="'+o[0]+'">'+o[1]+'</option>'}).join("")}
 function render(){
  var q=document.getElementById("tableSearch").value.toLowerCase(),st=document.getElementById("statusFilter").value;
  var rows=data[tab].filter(function(r){return (!st||r.delivery_status===st)&&JSON.stringify(r).toLowerCase().indexOf(q)>=0});
  document.getElementById("rmWrap").style.display=tab==="rm"?"":"none";document.getElementById("fgWrap").style.display=tab==="fg"?"":"none";
  if(tab==="rm")document.getElementById("rmTable").innerHTML=rows.length?rows.map(function(r){return '<tr><td>#'+r.request_id+(r.priority==="urgent"?' '+A.badge("Urgent","urgent"):"")+'</td><td>'+A.orderLink(r.order_id)+'</td><td>'+A.esc(r.material)+'</td><td>'+A.esc(r.quantity)+'</td><td>'+A.longDate(r.requested_at)+'</td><td>'+A.longDate(r.issued_at)+'</td><td>'+A.badge(r.delivery_label,r.tone)+'</td></tr>'}).join(""):'<tr><td colspan="7" class="empty">No raw material deliveries to show.</td></tr>';
  else document.getElementById("fgTable").innerHTML=rows.length?rows.map(function(r){var n=function(v){return v==null?"—":v};return '<tr><td>'+A.orderLink(r.order_id)+'</td><td>'+A.esc(r.item_code)+'</td><td>'+A.esc(r.product)+'</td><td>'+r.produced_qty+'</td><td>'+n(r.accepted_qty)+'</td><td>'+n(r.rejected_qty)+'</td><td>'+A.longDate(r.delivered_at)+'</td><td>'+A.badge(r.delivery_label,r.tone)+'</td></tr>'}).join(""):'<tr><td colspan="8" class="empty">No finished goods deliveries to show.</td></tr>';
  document.getElementById("dmCount").textContent="Showing "+rows.length+" of "+data[tab].length;
 }
 function load(){A.request("php/deliveries.php",{},"GET",function(r){
  if(!r.success)return;var s=r.stats;data.rm=r.raw_materials;data.fg=r.finished_goods;
  document.getElementById("dmStats").innerHTML=card("Materials awaiting delivery",s.rm_awaiting+s.rm_ready)+card("Materials delivered",s.rm_delivered)+card("Finished goods in QC",s.fg_in_qc)+card("Finished goods awaiting delivery",s.fg_awaiting)+card("Finished goods delivered",s.fg_delivered);
  render()})}
 document.querySelectorAll(".tab").forEach(function(t){t.onclick=function(){document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("active")});t.classList.add("active");tab=t.dataset.tab;setFilter();render()}});
 document.getElementById("tableSearch").oninput=render;document.getElementById("statusFilter").onchange=render;
 setFilter();ProductionPage.reload=load;load();
}};
