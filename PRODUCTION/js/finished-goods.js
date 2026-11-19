var ProductionPage={init:function(){
 var A=ProductionApp,rows=[];
 function render(){var q=document.getElementById("tableSearch").value.toLowerCase();
  var data=rows.filter(function(r){return JSON.stringify(r).toLowerCase().indexOf(q)>=0});
  document.getElementById("fgTable").innerHTML=data.length?data.map(function(r){return '<tr><td>'+A.orderLink(r.order_id)+'</td><td>'+A.esc(r.item_code)+'</td><td>'+A.esc(r.product)+'</td><td>'+A.esc(r.size_label||"—")+'</td><td>'+r.produced_qty+'</td><td>'+r.accepted_qty+'</td><td>'+r.rejected_qty+'</td><td>'+(r.status==="ready"?(r.short>0||!r.can_send?'<button class="action-btn" disabled title="Cannot be sent to Inventory yet">Cannot send yet</button>':'<button class="action-btn" data-id="'+r.fg_id+'" data-order="'+A.esc(r.order_id)+'" data-qty="'+r.accepted_qty+'" data-confirm="'+A.esc(r.confirm||"")+'">Send to Inventory</button>')+(r.note?'<div style="font-size:11px;margin-top:4px;max-width:260px;color:'+(r.short>0?'#8E0F1B':'#666')+'">'+A.esc(r.note)+'</div>':''):A.badge("Sent to Inventory","success")+(r.inventory_note?'<div style="font-size:11px;margin-top:4px;color:#666">'+A.esc(r.inventory_note)+'</div>':"")+(r.request_qty!==null&&r.request_qty!==undefined?'<div style="font-size:11px;margin-top:4px;color:#666">'+r.request_qty+' to request'+(r.excess_qty>0?', '+r.excess_qty+' excess (kept in production)':'')+'</div>':''))+'</td></tr>'}).join(""):'<tr><td colspan="8" class="empty">No finished goods yet.</td></tr>'}
 function load(){A.request("php/finished-goods.php",{action:"list"},"GET",function(r){if(r.success){rows=r.rows;render()}})}
 document.getElementById("tableSearch").oninput=render;
 document.getElementById("fgTable").onclick=function(e){var b=e.target.closest("[data-id]");if(!b||b.disabled)return;
  A.confirm(b.dataset.confirm||("Send "+b.dataset.qty+" accepted units of "+b.dataset.order+" to Inventory?"),function(){b.disabled=true;
  A.request("php/finished-goods.php",{action:"send",id:b.dataset.id},"POST",function(r){A.toast(r.message);load()})})};
 ProductionPage.reload=load;load();
}};
