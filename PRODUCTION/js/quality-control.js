var ProductionPage={init:function(){
 var A=ProductionApp,rows=[],sup=document.body.dataset.role==="SUPERVISOR";
 function render(){var q=document.getElementById("tableSearch").value.toLowerCase();
  var data=rows.filter(function(r){return JSON.stringify(r).toLowerCase().indexOf(q)>=0});
  document.getElementById("qcTable").innerHTML=data.length?data.map(function(r){
   var pending=r.status==="pending_review";
   return '<tr><td>'+A.orderLink(r.order_id)+'</td><td>'+A.esc(r.product)+'</td><td>'+r.produced_qty+'</td><td>'+(r.accepted_qty==null?"—":r.accepted_qty)+'</td><td>'+(r.rejected_qty==null?"—":r.rejected_qty)+'</td><td>'+A.badge(pending?"Pending review":"Reviewed",pending?"warning":"done")+'</td><td>'+(pending?(sup?'<button class="action-btn" data-order="'+A.esc(r.order_id)+'" data-produced="'+r.produced_qty+'">Approve / Reject</button>':'<span class="info-text" style="margin:0">Awaiting supervisor</span>'):"")+'</td></tr>'}).join(""):'<tr><td colspan="7" class="empty">No quality checks yet.</td></tr>'}
 function load(){A.request("php/quality-checks.php",{action:"list"},"GET",function(r){if(r.success){rows=r.rows;render()}})}
 document.getElementById("tableSearch").oninput=render;
 document.getElementById("qcTable").onclick=function(e){var b=e.target.closest("[data-order]");if(!sup||!b||b.disabled)return;
  var id=b.dataset.order,produced=Number(b.dataset.produced);
  document.getElementById("qcOrder").value=id;document.getElementById("qcProduced").textContent=produced;document.getElementById("qcProduced").value=produced;
  document.getElementById("qcAccepted").value="";document.getElementById("qcRejected").value="";
  document.getElementById("qcTitle").textContent="Inspect "+id;
  document.getElementById("qcForm").querySelector(".form-message").textContent="";
  A.openModal("qcModal")};
 document.getElementById("qcForm").addEventListener("submit",function(e){e.preventDefault();
  var a=qcAccepted.value.trim(),rj=qcRejected.value.trim(),produced=Number(qcProduced.value),m=this.querySelector(".form-message");
  {var err=A.checkWhole(a,"Accepted quantity",0)||A.checkWhole(rj,"Rejected quantity",0);
   if(!err&&Number(a)+Number(rj)!==produced)err="Accepted + rejected must equal the "+produced+" pairs produced.";
   if(err){m.className="form-message error";m.textContent=err;return}}
  A.confirm("Approve the accepted / rejected result for "+qcOrder.value+"?",function(){A.request("php/quality-checks.php",{action:"complete",order_id:qcOrder.value,accepted_qty:a,rejected_qty:rj},"POST",function(r){
   m.className="form-message "+(r.success?"success":"error");m.textContent=r.message;
   if(r.success){A.toast(r.message);setTimeout(function(){A.closeModal(document.getElementById("qcModal"));load()},300)}})})});
 document.getElementById("qcApproveAll").onclick=function(){qcAccepted.value=qcProduced.value;qcRejected.value="0"};
 document.getElementById("qcRejectAll").onclick=function(){qcAccepted.value="0";qcRejected.value=qcProduced.value};
 ProductionPage.reload=load;load();
}};
