var ProductionPage={init:function(){
 var A=ProductionApp,rows=[];
 function render(){var q=document.getElementById("tableSearch").value.toLowerCase();
  var data=rows.filter(function(r){return JSON.stringify(r).toLowerCase().indexOf(q)>=0});
  document.getElementById("scheduleTable").innerHTML=data.length?data.map(function(r){return '<tr><td>'+A.shortDate(r.date_needed)+'</td><td>'+A.orderLink(r.order_id)+'</td><td>'+A.esc(r.product)+'</td><td>'+A.esc(r.material)+'</td><td>'+A.esc(r.qty_needed)+'</td><td>'+A.reqBadge(r.status)+'</td></tr>'}).join(""):'<tr><td colspan="6" class="empty">Nothing scheduled.</td></tr>'}
 A.request("php/schedule.php",{},"GET",function(r){if(r.success){rows=r.rows;render()}});
 document.getElementById("tableSearch").oninput=render;
}};
