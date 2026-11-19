var ProductionPage={init:function(){
 var currentQty=0,A=ProductionApp,id=A.query("id"),root=document.getElementById("detailRoot");
 function stat(l,v,style){return '<div class="detail-stat"><span>'+l+'</span><b'+(style?' style="'+style+'"':"")+'>'+v+'</b></div>'}
 function costTable(c){return '<table><tbody><tr><td>Materials</td><td>'+A.money(c.materials_cost)+'</td></tr><tr><td>Labor</td><td>'+A.money(c.labor_cost)+'</td></tr><tr><td>Overhead</td><td>'+A.money(c.overhead_cost)+'</td></tr><tr class="cost-total"><td>Total</td><td>'+A.money(c.total_cost)+'</td></tr></tbody></table>'}
 function nextStep(o){
  var sup=document.body.dataset.role==="SUPERVISOR",qc=o.quality_check,t,txt,act="";
  if(o.status==="planning"){t="Next step: request materials";txt="Request the raw materials this order needs from Inventory.";act=sup?"":'<a class="btn primary" href="material-issuance.html">Go to Material issuance</a>'}
  else if(o.status==="materials"){t="Next step: receive all materials";txt="Production starts automatically once every material has been issued.";act=sup?'<a class="btn outline" href="delivery-monitoring.html">Track deliveries</a>':'<a class="btn primary" href="material-issuance.html">Go to Material issuance</a>'}
  else if(o.status==="production"){t="Next step: finish production";txt="When the batch is complete, record the quantity produced and send it to Quality check.";act='<button type="button" class="btn primary" id="finishBtn" data-qty="'+o.quantity+'">Finish production &rarr; Quality check</button>'}
  else if(qc&&qc.status==="reviewed"){t="Next step: send goods to Inventory";txt="Approved: "+qc.accepted_qty+" accepted, "+qc.rejected_qty+" rejected. Send the accepted goods to Inventory to complete the order.";act='<a class="btn primary" href="finished-goods.html">Go to Finished goods</a>'}
  else{t="Waiting for supervisor approval";txt="A supervisor must approve the accepted and rejected quantities before the goods are released.";act=sup?'<a class="btn primary" href="quality-control.html">Review in Quality control</a>':""}
  return '<div class="next-step"><div><b>'+t+'</b><span>'+txt+'</span></div>'+act+'</div>';
 }
 function load(){
  if(!id){root.innerHTML='<div class="empty">No order selected.</div>';return}
  A.request("php/orders.php",{action:"detail",id:id},"GET",function(r){
   if(!r.success){root.innerHTML='<div class="empty">'+A.esc(r.message||"Could not load this order.")+'</div>';return}
   var o=r.order;currentQty=o.quantity;var done=o.status==="completed",qc=o.quality_check,h="";
   document.getElementById("backLink").href=done?"production-history.html":"production-orders.html";
   document.getElementById("backLink").textContent="← Back to "+(done?"production history":"production orders");
   document.getElementById("orderTitle").textContent=o.order_id+" — "+o.product+(o.size_label?" ("+o.size_label+")":"");
   document.getElementById("orderSub").innerHTML="Qty "+o.quantity+(o.size_label?" · Size "+A.esc(o.size_label):"")+(done?" · Completed "+A.longDate(qc?qc.reviewed_at:o.created_at):" · Started "+A.shortDate(o.start_date)+" · Priority "+A.esc(A.cap(o.priority)))+" &nbsp; "+A.stageBadge(o.status);
   if(done){
    h+='<div class="detail-grid">'+stat("Produced",o.quantity)+stat("Accepted",qc?qc.accepted_qty:"—","color:#139d68")+stat("Rejected",qc?qc.rejected_qty:"—","color:#cf3030")+stat("Cost per unit",o.costing?A.money(Math.round(o.costing.total_cost/o.quantity)):"—")+'</div>';
    h+='<section class="panel"><div class="panel-head"><h3>Workflow progress</h3></div>'+A.stageTrack("completed")+'</section>';
    if(o.costing)h+='<section class="panel" style="margin-top:18px"><div class="panel-head"><h3>Costing</h3></div><div class="table-wrap">'+costTable(o.costing)+'</div></section>';
   }else{
    h+=nextStep(o);
    h+='<div class="detail-grid">'+stat("Quantity",o.quantity+" "+A.esc(o.unit_of_measure))+stat("Est. completion",A.esc(o.eta_label||"—"))+stat("Priority",A.esc(A.cap(o.priority)))+stat("Current stage",A.esc(o.status_label))+'</div>';
    h+='<section class="panel"><div class="panel-head"><h3>Workflow progress</h3></div>'+A.stageTrack(o.status,o.order_id)+'<div class="bar-big" style="margin-top:14px"><i style="width:'+o.progress_percent+'%"></i></div><p class="stage-sub">'+o.progress_percent+'% through '+A.esc(o.status_label)+(o.status==="production"?' — finish production to send it to Quality check':(o.status==="quality_check"?' — waiting for the supervisor to accept or reject':' — click an upcoming step above to advance it'))+'</p>'+'</section>';
    h+='<section class="panel" style="margin-top:18px"><div class="panel-head"><h3>Materials required</h3></div><div class="table-wrap"><table><thead><tr><th>Material</th><th>Qty</th><th>Status</th></tr></thead><tbody>'+o.materials.map(function(m){return '<tr><td>'+A.esc(m.material)+'</td><td>'+A.esc(m.qty_needed)+'</td><td>'+A.reqBadge(m.status)+'</td></tr>'}).join("")+'</tbody></table></div></section>';
    if(qc)h+='<section class="panel" style="margin-top:18px"><div class="panel-head"><h3>Quality check</h3></div><p>'+(qc.status==="reviewed"?"Accepted "+qc.accepted_qty+" / Rejected "+qc.rejected_qty:A.badge("Pending review","warning"))+'</p></section>';
   }
   root.innerHTML=h;
   if(o.status==="production"&&A.query("finish")==="1"&&!load.opened){load.opened=true;openFinish(o.quantity)}});
 }
 function openFinish(max){
  document.getElementById("finProduced").value=max;document.getElementById("finMax").textContent=max;
  A.fieldError("finProduced","");document.getElementById("finishForm").querySelector(".form-message").textContent="";
  A.openModal("finishModal");
 }
 root.addEventListener("click",function(e){var b=e.target.closest("#finishBtn");if(b)openFinish(Number(b.dataset.qty))});
 document.getElementById("finishForm").addEventListener("submit",function(e){e.preventDefault();
  var max=Number(document.getElementById("finMax").textContent),v=document.getElementById("finProduced").value.trim(),m=this.querySelector(".form-message");
  if(!A.fieldError("finProduced",A.checkWhole(v,"Quantity produced",1,max)))return;
  A.confirm("Finish production of "+id+" ("+v+" produced) and send it to Quality check?",function(){
   A.request("php/orders.php",{action:"finish_production",order_id:id,produced_qty:v},"POST",function(r){
    m.className="form-message "+(r.success?"success":"error");m.textContent=r.message;
    if(r.success){A.toast(r.message);setTimeout(function(){A.closeModal(document.getElementById("finishModal"));load()},300)}})})});
 root.addEventListener("click",function(e){var c=e.target.closest(".ring[data-stage]");if(!c)return;
  var st=c.dataset.stage;if(st==="quality_check"){openFinish(currentQty);return}A.confirm("Move "+id+" to the "+A.STAGE_LABEL[st]+" stage?",function(){
  A.request("php/orders.php",{action:"set_stage",order_id:id,status:st},"POST",function(r){A.toast(r.message);if(r.success)load()})})});
 load();
}};
