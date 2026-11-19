var ProductionPage={init:function(){
 var A=ProductionApp,items=[],received=[];
 function state(x){return x==="out"?A.badge("Out of stock","reject"):(x==="short"?A.badge("Short for upcoming orders","warning"):A.badge("In stock","success"))}
 function render(){
  var q=document.getElementById("tableSearch").value.toLowerCase();
  var data=items.filter(function(r){return (r.item_name+" "+r.item_code).toLowerCase().indexOf(q)>=0});
  document.getElementById("stockTable").innerHTML=data.length?data.map(function(r){return "<tr><td>"+A.esc(r.item_code)+"</td><td>"+A.esc(r.item_name)+"</td><td><b>"+A.qty(r.on_hand)+"</b> "+A.esc(r.unit)+"</td><td>"+A.qty(r.in_production)+" "+A.esc(r.unit)+"</td><td>"+A.qty(r.planned)+" "+A.esc(r.unit)+"</td><td>"+(r.last_received?A.longDate(r.last_received):"—")+"</td><td>"+state(r.state)+'</td><td><button class="action-btn" data-add="'+r.item_id+'">Add stock</button></td></tr>'}).join(""):'<tr><td colspan="8" class="empty">No raw materials found.</td></tr>';
  document.getElementById("stockCount").textContent="Showing "+data.length+" of "+items.length+" raw materials";
  document.getElementById("receivedTable").innerHTML=received.length?received.map(function(r){return "<tr><td>"+A.longDate(r.issued_at)+"</td><td>"+A.esc(r.material)+"</td><td>"+A.esc(r.quantity)+"</td><td>"+A.orderLink(r.order_id)+"</td></tr>"}).join(""):'<tr><td colspan="4" class="empty">Nothing received yet. Accept an incoming delivery on Material issuance.</td></tr>';
 }
 function load(){A.request("php/material-stock.php",{},"GET",function(r){if(!r.success){A.toast(r.message||"Could not load the materials inventory");return}items=r.items;received=r.received;render()})}
 var form=document.getElementById("stockForm"),sel=document.getElementById("sMaterial");
 function unitOf(){var it=items.filter(function(x){return String(x.item_id)===sel.value})[0];document.getElementById("sQtyLabel").textContent=it?"Quantity ("+it.unit+")":"Quantity"}
 function openStock(id){
  form.reset();A.fieldError("sQty","");form.querySelector(".form-message").textContent="";
  sel.innerHTML=items.map(function(x){return '<option value="'+x.item_id+'">'+A.esc(x.item_name)+" (now "+A.qty(x.on_hand)+" "+A.esc(x.unit)+")</option>"}).join("");
  if(id)sel.value=String(id);unitOf();A.openModal("stockModal")}
 sel.onchange=unitOf;
 document.getElementById("addStockBtn").onclick=function(){openStock()};
 document.getElementById("stockTable").onclick=function(e){var b=e.target.closest("[data-add]");if(b)openStock(b.dataset.add)};
 form.addEventListener("submit",function(e){e.preventDefault();
  var mode=document.getElementById("sMode").value,ok=A.fieldError("sQty",A.checkDecimal(sQty.value,"Quantity",mode==="set"?0:0.01,10000000));if(!ok)return;
  var m=form.querySelector(".form-message");
  A.confirm(mode==="set"?"Set this material's stock to exactly "+sQty.value.trim()+"?":"Add "+sQty.value.trim()+" to this material's stock?",function(){
   A.request("php/material-stock.php",{action:"add",material_id:sel.value,mode:mode,quantity:sQty.value.trim()},"POST",function(r){
    m.className="form-message "+(r.success?"success":"error");m.textContent=r.message;
    if(r.success){A.toast(r.message);setTimeout(function(){A.closeModal(document.getElementById("stockModal"));load()},300)}})})});
 document.getElementById("tableSearch").oninput=render;
 ProductionPage.reload=load;load();
}};
