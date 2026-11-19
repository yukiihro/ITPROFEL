var ProductionPage={init:function(){
 var A=ProductionApp,rows=[],incoming=[],materials=[],form=document.getElementById("requestModalForm");
 var extraBox=document.getElementById("extraLines"),addLineBtn=document.getElementById("addLineBtn"),MAX_LINES=10;
 function matOptions(){return [].slice.call(rMaterial.options).map(function(o){return '<option value="'+A.esc(o.value)+'">'+A.esc(o.textContent)+(o.dataset.unit?' ('+A.esc(o.dataset.unit)+')':'')+'</option>'}).join("")}
 function usedMaterials(){var u={};if(rMaterial.value)u[rMaterial.value]=1;[].forEach.call(extraBox.querySelectorAll(".xMat"),function(x){u[x.value]=1});return u}
 function addLine(){
  if(!rMaterial.options.length){A.toast("Materials are still loading — try again in a moment.");return}
  if(extraBox.querySelectorAll(".extra-line").length+1>=MAX_LINES){A.toast("You can request up to "+MAX_LINES+" materials at a time.");return}
  var row=document.createElement("div");row.className="extra-line";row.style.cssText="display:grid;grid-template-columns:1fr 130px auto;gap:8px;align-items:end;margin-bottom:10px";
  row.innerHTML='<label>Material<select class="xMat">'+matOptions()+'</select></label><label>Quantity<input class="xQty" type="text" data-numeric="dec" inputmode="decimal" maxlength="10" autocomplete="off" placeholder="e.g. 200"></label><button type="button" class="action-btn xRemove" style="margin-bottom:12px">Remove</button><div class="field-error xErr" style="grid-column:1/-1"></div>';
  var used=usedMaterials(),sel=row.querySelector(".xMat");
  for(var i=0;i<sel.options.length;i++){if(!used[sel.options[i].value]){sel.selectedIndex=i;break}}
  extraBox.appendChild(row);
 }
 addLineBtn.onclick=addLine;
 extraBox.addEventListener("click",function(e){var b=e.target.closest(".xRemove");if(b)b.closest(".extra-line").remove()});
 function render(){var q=document.getElementById("tableSearch").value.toLowerCase();
  var data=rows.filter(function(r){return JSON.stringify(r).toLowerCase().indexOf(q)>=0});
  document.getElementById("requestsTable").innerHTML=data.length?data.map(function(r){return '<tr><td>'+A.esc(r.order_id)+'</td><td>'+A.esc(r.material)+'</td><td>'+A.esc(r.quantity)+'</td><td>'+(r.priority==="urgent"?A.badge("Urgent","urgent"):"Normal")+'</td><td>'+A.reqBadge(r.status)+'</td><td>'+A.requestActions(r)+'</td></tr>'}).join(""):'<tr><td colspan="6" class="empty">No requests yet.</td></tr>'}
 function renderIncoming(){
  document.getElementById("incomingTable").innerHTML=incoming.length?incoming.map(function(r){var ok=r.can_accept;return '<tr><td>'+A.esc(r.order_id)+'</td><td>'+A.esc(r.material)+'</td><td>'+A.esc(r.quantity)+'</td><td>'+A.esc(r.inv_ref||"—")+'</td><td>'+A.badge(r.inv_status||"Approved","info")+'</td><td>'+(ok?A.badge(r.delivery_status||"Out for Delivery","success"):A.badge(r.delivery_status||"Waiting for Inventory","neutral"))+'</td><td>'+(ok?'<button class="action-btn" data-req="'+r.request_id+'" data-status="issued">Accept</button>':'<button class="action-btn" disabled title="'+A.esc(r.delivery_note||"Inventory has not sent this out for delivery yet")+'">Accept</button>')+'<button class="action-btn" data-req="'+r.request_id+'" data-status="rejected">Not received</button></td></tr>'}).join(""):'<tr><td colspan="7" class="empty">Nothing incoming right now. Approved requests from Inventory will appear here.</td></tr>'}

 var prodReqs=[];
 function renderProducts(){
  var el=document.getElementById("productReqTable");if(!el)return;
  el.innerHTML=prodReqs.length?prodReqs.map(function(r){
   var st=A.badge(r.stage||r.status,r.tone||"neutral");
   var act=r.can_decide?'<button class="action-btn" data-preq="'+r.id+'" data-act="approve">Approve</button><button class="action-btn" data-preq="'+r.id+'" data-act="decline">Decline</button>':(r.order_id?'<a class="action-btn" href="order-details.html?id='+encodeURIComponent(r.order_id)+'">View Order</a>':'<span class="info-text" style="margin:0">—</span>');
   return '<tr><td>'+A.esc(r.request_number)+'</td><td>'+A.esc(r.item_name)+'</td><td>'+(r.size?A.esc(r.size):"—")+'</td><td>'+A.esc(A.qty?A.qty(r.quantity):r.quantity)+' '+A.esc(r.unit||"")+'</td><td>'+A.esc(r.expected_receive_date||"—")+'</td><td>'+A.esc(r.recipient_name||"—")+'</td><td>'+st+'</td><td>'+act+'</td></tr>'}).join(""):'<tr><td colspan="8" class="empty">No product requests from Inventory yet.</td></tr>';
  A.setIncomingBadge("products",prodReqs.filter(function(x){return x.can_decide}).length);
 }
 function loadProducts(){A.request("php/product-requests.php",{action:"list"},"GET",function(r){if(r.success){prodReqs=r.rows;renderProducts()}})}
 var pt=document.getElementById("productReqTable");
 if(pt)pt.addEventListener("click",function(e){var b=e.target.closest("[data-preq]");if(!b||b.disabled)return;
  var act=b.dataset.act;
  A.confirm(act==="approve"?"Approve this product request? It is approved in Inventory and a production order is created automatically. When the goods are finished, send them from Finished goods to report the delivery to Inventory.":"Decline this product request from Inventory?",function(){b.disabled=true;
   A.request("php/product-requests.php",{action:act,id:b.dataset.preq},"POST",function(r){A.toast(r.message);b.disabled=false;if(r.success)loadProducts()})})});
 function load(){
  A.request("php/material-requests.php",{action:"incoming"},"GET",function(r){if(r.api_error&&!window._invWarn){window._invWarn=1;A.toast("Inventory API: "+r.api_error)}if(r.success){incoming=r.rows;renderIncoming()}
   A.request("php/material-requests.php",{action:"list"},"GET",function(r2){if(r2.success){rows=r2.rows;render()}});
   if(r.success)A.setIncomingBadge("materials",r.rows.length);loadProducts()})}
 function updateUnit(){var o=rMaterial.options[rMaterial.selectedIndex];document.getElementById("qtyLabel").textContent=o&&o.dataset.unit?"Quantity ("+o.dataset.unit+")":"Quantity"}
 document.getElementById("tableSearch").oninput=render;
 A.bindRequestActions(document.getElementById("requestsTable"),load);
 A.bindRequestActions(document.getElementById("incomingTable"),load);
 rMaterial.addEventListener("change",updateUnit);
 document.getElementById("addRequestBtn").onclick=function(){
  form.reset();extraBox.innerHTML="";["rOrder","rQty"].forEach(function(i){A.fieldError(i,"")});form.querySelector(".form-message").textContent="";
  A.request("php/orders.php",{action:"list"},"GET",function(r){if(!r.success){A.toast(r.message||"Could not load orders");return}A.fillSelect(rOrder,r.orders,"order_id",function(o){return o.order_id+" — "+o.product+(o.size_label?" ("+o.size_label+")":"")});if(!r.orders.length)A.fieldError("rOrder","No active orders — create a production order first.")});
  A.request("php/inventory.php",{type:"Raw Material"},"GET",function(r){if(!r.success)return;rMaterial.innerHTML=r.items.map(function(i){return '<option value="'+i.item_id+'" data-unit="'+A.esc(i.unit)+'">'+A.esc(i.item_name)+'</option>'}).join("");updateUnit()});
  A.openModal("requestModal")};
 form.addEventListener("submit",function(e){e.preventDefault();
  var ok=A.fieldError("rOrder",rOrder.value?"":"Choose a production order.");
  if(!rMaterial.value){A.toast("Choose a material");ok=false}
  ok=A.fieldError("rQty",A.checkDecimal(rQty.value,"Quantity",0.01,10000000))&&ok;
  var lines=[],seen={};
  if(rMaterial.value){seen[rMaterial.value]=1;lines.push({material_id:rMaterial.value,quantity:rQty.value.trim()})}
  [].forEach.call(extraBox.querySelectorAll(".extra-line"),function(row){
   var sel=row.querySelector(".xMat"),q=row.querySelector(".xQty"),er=row.querySelector(".xErr");
   var msg=A.checkDecimal(q.value,"Quantity",0.01,10000000);
   if(!msg&&seen[sel.value])msg="This material is already in the list — use one line per material.";
   q.classList.toggle("invalid",!!msg);er.textContent=msg||"";
   if(msg){ok=false}else{seen[sel.value]=1;lines.push({material_id:sel.value,quantity:q.value.trim()})}
  });
  if(!ok)return;
  var m=form.querySelector(".form-message");
  var done=function(r){
   m.className="form-message "+(r.success?"success":"error");m.textContent=r.message;
   if(r.success){A.toast(r.message);setTimeout(function(){A.closeModal(document.getElementById("requestModal"));load()},300)}};
  A.confirm(lines.length>1?"Submit "+lines.length+" material requests to Inventory?":"Submit this material request to Inventory?",function(){
   if(lines.length===1)
    A.request("php/material-requests.php",{action:"create",order_id:rOrder.value,material_id:lines[0].material_id,quantity:lines[0].quantity,priority:rPriority.value},"POST",done);
   else
    A.request("php/material-requests.php",{action:"create_multi",order_id:rOrder.value,priority:rPriority.value,items:JSON.stringify(lines)},"POST",done)})});
 ProductionPage.reload=load;load();
}};
