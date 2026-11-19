function todayIso(){var d=new Date(),p=function(n){return(n<10?"0":"")+n};return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())}
var ProductionPage={init:function(){
 var A=ProductionApp,rows=[],modalId="orderModal",form=document.getElementById("orderModalForm");
 function render(){
  var q=document.getElementById("tableSearch").value.toLowerCase(),st=document.getElementById("stageFilter").value;
  var data=rows.filter(function(o){return (!st||o.status===st)&&(JSON.stringify(o).toLowerCase().indexOf(q)>=0)});
  document.getElementById("ordersTable").innerHTML=data.length?data.map(function(o){return '<tr><td>'+A.orderLink(o.order_id)+(o.priority==="urgent"?' '+A.badge("Urgent","urgent"):"")+'</td><td>'+A.esc(o.product)+'</td><td>'+A.esc(o.size_label||"—")+'</td><td>'+o.quantity+'</td><td>'+A.shortDate(o.start_date)+'</td><td>'+A.esc(o.eta_label||"—")+'</td><td>'+A.stageBadge(o.status)+'</td><td><a class="action-btn" href="bill-of-materials.html?product='+o.product_id+'">View BOM</a>'+(o.status==="production"?'<a class="action-btn" href="order-details.html?id='+encodeURIComponent(o.order_id)+'&finish=1">Finish production</a>':"")+'</td></tr>'}).join(""):'<tr><td colspan="8" class="empty">No active orders. Start one with "+ New Order".</td></tr>';
  document.getElementById("orderCount").textContent="Showing "+data.length+" of "+rows.length+" active orders";
 }
 function load(){A.request("php/orders.php",{action:"list"},"GET",function(r){if(r.success){rows=r.orders;render()}else A.toast(r.message||"Could not load orders")})}
 var q0=A.query("q");if(q0)document.getElementById("tableSearch").value=q0;
 document.getElementById("tableSearch").oninput=render;document.getElementById("stageFilter").onchange=render;
 document.getElementById("printBtn").onclick=function(){window.print()};
 document.getElementById("addOrderBtn").onclick=function(){
  form.reset();["oSize","oQty","oStart"].forEach(function(i){A.fieldError(i,"")});oStart.min=todayIso();form.querySelector(".form-message").textContent="";
  var sel=document.getElementById("oProduct");sel.innerHTML='<option value="">Loading products...</option>';
  A.request("php/products.php",{},"GET",function(r,status,raw){
   var box=form.querySelector(".form-message");
   if(!r.success){var why=r.message&&r.message!=="Server error"?r.message:"HTTP "+status+": "+String(raw||"no response").replace(/<[^>]*>/g," ").slice(0,200);
    sel.innerHTML='<option value="">Could not load products</option>';box.className="form-message error";box.textContent="Products failed to load - "+why;return}
   if(!r.products.length){var why2=r.inventory_error?"Inventory items table error: "+r.inventory_error:r.sync_error?"Sync error: "+r.sync_error:"Inventory has no Finished Good items. Item types found: "+((r.inventory_item_types||[]).map(function(t){return t.item_type+" ("+t.status+") x"+t.n}).join(", ")||"none");
    sel.innerHTML='<option value="">No products available</option>';box.className="form-message error";box.textContent=why2;return}
   A.fillSelect(sel,r.products,"product_id","product_name","Select a product")});
  A.openModal(modalId)};
 form.addEventListener("submit",function(e){e.preventDefault();
  var ok=A.fieldError("oSize",/^\d{2}(\.[05])?$/.test(oSize.value)?"":"Choose a shoe size in cm.");
  ok=A.fieldError("oQty",A.checkWhole(oQty.value,"Quantity",1,100000))&&ok;
  oStart.min=todayIso();
  ok=A.fieldError("oStart",A.checkDate(oStart.value,"Start date")||(oStart.value<todayIso()?"Start date can't be in the past.":""))&&ok;
  ok=A.fieldError("oEta",oEta.value.trim()===""?"":A.checkWhole(oEta.value,"Estimated completion",1,365))&&ok;
  if(!oProduct.value){A.toast("Choose a product");ok=false}
  if(!ok)return;
  var m=form.querySelector(".form-message");
  A.confirm("Create this production order? It will enter the Planning stage.",function(){A.request("php/orders.php",{action:"create",product_id:oProduct.value,shoe_size_cm:oSize.value,quantity:oQty.value.trim(),start_date:oStart.value,eta_label:oEta.value.trim(),priority:oPriority.value},"POST",function(r){
   m.className="form-message "+(r.success?"success":"error");m.textContent=r.message;
   if(r.success){A.toast(r.message);setTimeout(function(){A.closeModal(document.getElementById(modalId));load()},300)}})})});
 ProductionPage.reload=load;load();
}};
