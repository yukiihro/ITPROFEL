var ProductionPage={init:function(){
 var A=ProductionApp,rows=[];
 function render(){var q=document.getElementById("tableSearch").value.toLowerCase();
  var data=rows.filter(function(r){return JSON.stringify(r).toLowerCase().indexOf(q)>=0});
  document.getElementById("historyTable").innerHTML=data.length?data.map(function(r){return '<tr><td>'+A.esc(r.order_id)+'</td><td>'+A.esc(r.product)+'</td><td>'+r.qty_produced+'</td><td>'+A.longDate(r.completed)+'</td><td>'+A.money(r.cost_per_unit)+'</td><td>'+(r.accepted==null?"—":r.accepted)+' / '+(r.rejected==null?"—":r.rejected)+'</td><td><a class="action-btn" href="order-details.html?id='+encodeURIComponent(r.order_id)+'">View details</a></td></tr>'}).join(""):'<tr><td colspan="7" class="empty">Nothing has completed yet.</td></tr>'}
 A.request("php/history.php",{},"GET",function(r){if(r.success){rows=r.rows;render()}});
 document.getElementById("tableSearch").oninput=render;
}};
