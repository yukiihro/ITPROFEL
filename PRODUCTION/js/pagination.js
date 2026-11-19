(function(){
var perPage=20,syncs=[];
function setup(tbody){
 if(!tbody||tbody.dataset.paginationReady)return;
 tbody.dataset.paginationReady="1";
 var wrap=tbody.closest(".table-wrap"); if(!wrap)return;
 var nav=document.createElement("div");nav.className="pagination";wrap.parentNode.insertBefore(nav,wrap.nextSibling);
 var page=1,lastCount=-1;
 syncs.push(function(){nav.style.display=wrap.offsetParent===null?"none":""});
 function draw(){
  var rows=Array.prototype.slice.call(tbody.children);var total=rows.length;var pages=Math.max(1,Math.ceil(total/perPage));if(page>pages)page=pages;
  rows.forEach(function(r,i){r.style.display=(i>=(page-1)*perPage&&i<page*perPage)?"":"none"});
  nav.innerHTML='<button class="page-btn" data-p="prev" '+(page<=1?'disabled':'')+'>Previous</button><span>Page '+page+' of '+pages+'</span><button class="page-btn" data-p="next" '+(page>=pages?'disabled':'')+'>Next</button>';
  nav.querySelectorAll("button").forEach(function(b){b.onclick=function(){if(b.dataset.p==="prev"&&page>1)page--;if(b.dataset.p==="next"&&page<pages)page++;draw()}});
 }
 var observer=new MutationObserver(function(){if(tbody.children.length!==lastCount)page=1;lastCount=tbody.children.length;draw()});observer.observe(tbody,{childList:true});lastCount=tbody.children.length;draw();
}
function scan(){document.querySelectorAll("tbody[id]").forEach(setup);syncs.forEach(function(f){f()})}
document.addEventListener("DOMContentLoaded",function(){scan();setInterval(scan,1000)});
})();