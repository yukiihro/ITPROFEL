var ProductionApp=(function(){
var STAGES=["planning","materials","production","quality_check","completed"];
var STAGE_LABEL={planning:"Planning",materials:"Materials",production:"Production",quality_check:"Quality check",completed:"Completed"};
var STAGE_SHORT=["Planning","Materials","Production","Quality check","Finished goods"];
var STAGE_BADGE={planning:"neutral",materials:"warning",production:"info",quality_check:"qc",completed:"done"};
var REQ_LABEL={not_requested:"Not yet requested",pending:"Requested",approved:"Approved · to accept",issued:"Received",rejected:"Rejected"};
var REQ_BADGE={not_requested:"neutral",pending:"neutral",approved:"info",issued:"success",rejected:"reject"};

function encode(data){var a=[];for(var k in data){if(data[k]!==undefined&&data[k]!==null)a.push(encodeURIComponent(k)+"="+encodeURIComponent(data[k]))}return a.join("&")}
function request(url,data,method,callback){
  method=method||"GET";
  if(method==="GET"){var qs=encode(data||{});if(qs)url+=(url.indexOf("?")>=0?"&":"?")+qs}
  var x=new XMLHttpRequest();x.open(method,url,true);
  if(method==="POST")x.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
  x.onreadystatechange=function(){if(x.readyState===4){var r={success:false,message:"Server error"};try{r=JSON.parse(x.responseText)}catch(e){}
    if(x.status===401){location.href="../root/index.php";return}
    callback(r,x.status,x.responseText)}};
  x.send(method==="POST"?encode(data||{}):null);
}
function toast(msg){var t=document.getElementById("toast");if(!t)return;t.textContent=msg;t.className="toast show";clearTimeout(toast.t);toast.t=setTimeout(function(){t.className="toast"},2600)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
function money(n){if(n===null||n===undefined||n==="")return "—";return "₱"+Number(n).toLocaleString("en-PH",{maximumFractionDigits:0})}
function qty(n){return Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2})}
function parseDate(s){return new Date(String(s).replace(" ","T"))}
function shortDate(s){if(!s)return "—";var d=parseDate(s);return isNaN(d)?s:d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function longDate(s){if(!s)return "—";var d=parseDate(s);return isNaN(d)?s:d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}
function relTime(s){if(!s)return "";var d=parseDate(s);if(isNaN(d))return "";var m=Math.floor((Date.now()-d.getTime())/60000);if(m<1)return "Just now";if(m<60)return m+" min ago";var h=Math.floor(m/60);if(h<24)return h+" hr"+(h===1?"":"s")+" ago";var dd=Math.floor(h/24);if(dd===1)return "Yesterday";if(dd<7)return dd+" days ago";return shortDate(s)}
function cap(s){s=String(s||"");return s.charAt(0).toUpperCase()+s.slice(1)}
function badge(text,cls){return '<span class="status '+cls+'">'+esc(text)+'</span>'}
function stageBadge(status){return badge(STAGE_LABEL[status]||status,STAGE_BADGE[status]||"neutral")}
function reqBadge(status){return badge(REQ_LABEL[status]||status,REQ_BADGE[status]||"neutral")}
function orderLink(id){return '<a class="link-btn" href="order-details.html?id='+encodeURIComponent(id)+'">'+esc(id)+'</a>'}
function fillSelect(el,rows,valueField,textField,placeholder){if(!el)return;el.innerHTML=placeholder?'<option value="">'+placeholder+'</option>':"";rows.forEach(function(r){var o=document.createElement("option");o.value=r[valueField];o.textContent=typeof textField==="function"?textField(r):r[textField];el.appendChild(o)})}
function openModal(id){var m=document.getElementById(id);if(m)m.classList.add("show")}
function closeModal(m){m.classList.remove("show")}
function modalSetup(){document.querySelectorAll(".modal").forEach(function(m){m.querySelectorAll(".modal-close").forEach(function(b){b.addEventListener("click",function(){closeModal(m)})});m.addEventListener("click",function(e){if(e.target===m)closeModal(m)})})}
function query(name){var m=new RegExp("[?&]"+name+"=([^&]*)").exec(location.search);return m?decodeURIComponent(m[1].replace(/\+/g," ")):""}

/* ---- PAGE ACCESS (set in HR → User Permission) ---- */
var PAGE_ACCESS_KEYS={
  dashboard:"prodDashboard",
  "bill-of-materials":"prodBom",
  "materials-schedule":"prodMaterialsSchedule",
  "materials-checklist":"prodMaterialsChecklist",
  "production-orders":"prodOrders",
  "order-details":"prodOrderDetails",
  "material-issuance":"prodMaterialIssuance",
  "materials-inventory":"prodInvAddStock",
  monitoring:"prodMonitoring",
  "delivery-monitoring":"prodDeliveryMonitoring",
  "quality-control":"prodQcView",
  "production-history":"prodHistory",
  costing:"prodCosting",
  "finished-goods":"prodFinishedGoods",
  "supervisor-overview":"prodSupervisorDashboard",
  accounts:"prodAccounts"
};
var pageAccess=null;
function canAccessPage(key){
  if(!key)return true;
  if(!pageAccess)return true;               /* fail open if HR access is unavailable */
  if(!(key in pageAccess))return true;
  return pageAccess[key]===true;
}
function pageAllowed(page){
  if(!page)return true;
  if(page==="materials-inventory")return canAccessPage("prodInvAddStock")||canAccessPage("prodInvSetStock");
  if(page==="quality-control")return canAccessPage("prodQcView")||canAccessPage("prodQcApprove");
  return canAccessPage(PAGE_ACCESS_KEYS[page]);
}
function loadPageAccess(callback){
  request("php/page-access.php",{},"GET",function(r){
    pageAccess=(r&&r.success&&r.access&&typeof r.access==="object")?r.access:null;
    callback();
  });
}
function applyPageAccess(){
  document.querySelectorAll(".navbtn[data-page]").forEach(function(a){
    var allowed=pageAllowed(a.dataset.page);
    a.style.display=allowed?"":"none";
    if(!allowed)a.classList.remove("active");
  });
  /* Action-level permissions from the same HR screen */
  var noQc=!canAccessPage("prodQcApprove");
  document.body.classList.toggle("no-qc-approve",noQc);
  if(noQc&&!document.getElementById("paQcStyle")){
    var s=document.createElement("style");s.id="paQcStyle";
    s.textContent="body.no-qc-approve .action-btn[data-order]{display:none}";
    document.head.appendChild(s);
  }
  if(!canAccessPage("prodInvSetStock")){
    var mode=document.getElementById("sMode");
    if(mode){var opt=mode.querySelector('option[value="set"]');if(opt)opt.remove()}
  }
}
function showNoAccess(){
  var main=document.querySelector("main.content");
  if(!main)return;
  main.innerHTML='<div class="page-heading"><h1>Access restricted</h1></div>'+
    '<div class="panel" style="padding:24px;max-width:640px">'+
    '<h3>This page is hidden for your account</h3>'+
    '<p style="color:#666;line-height:1.6">Your HR Administrator has turned off access to this page. '+
    'If you need it, ask HR to enable it in <b>User Permission</b>.</p>'+
    '<p><a class="btn primary" href="dashboard.html">Back to dashboard</a></p></div>';
}

function checkWhole(raw,label,min,max){var v=String(raw==null?"":raw).trim();if(v==="")return label+" is required.";if(!/^\d+$/.test(v))return label+" must be a whole number (digits only).";var n=parseInt(v,10);if(n<min)return label+" must be at least "+min+".";if(max!=null&&n>max)return label+" must be at most "+max+".";return ""}
function checkDecimal(raw,label,min,max){var v=String(raw==null?"":raw).trim();if(v==="")return label+" is required.";if(!/^\d+(\.\d{1,2})?$/.test(v))return label+" must be a number (digits and an optional decimal, max 2 places).";var n=parseFloat(v);if(n<min)return label+" must be at least "+min+".";if(max!=null&&n>max)return label+" must be at most "+max+".";return ""}
function checkDate(raw,label){var v=String(raw==null?"":raw).trim();if(v==="")return label+" is required.";if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return label+" must be a valid date.";var p=v.split("-").map(Number),d=new Date(p[0],p[1]-1,p[2]);if(d.getFullYear()!==p[0]||d.getMonth()!==p[1]-1||d.getDate()!==p[2])return label+" is not a real calendar date.";return ""}
function fieldError(id,msg){var i=document.getElementById(id),e=document.getElementById(id+"Err");if(i)i.classList.toggle("invalid",!!msg);if(e)e.textContent=msg||"";return !msg}
function numericInputs(){
  document.addEventListener("keydown",function(e){var t=e.target,m=t&&t.getAttribute?t.getAttribute("data-numeric"):null;if(!m||!e.key||e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1)return;if(!(m==="int"?/\d/:/[\d.]/).test(e.key)){e.preventDefault();if(t.id)fieldError(t.id,"Numbers only.")}});
  document.addEventListener("input",function(e){var t=e.target,m=t&&t.getAttribute?t.getAttribute("data-numeric"):null;if(!m)return;var c=String(t.value).replace(m==="int"?/\D/g:/[^\d.]/g,"");if(m==="dec"||m==="decimal"){var i=c.indexOf(".");if(i!==-1)c=c.slice(0,i+1)+c.slice(i+1).replace(/\./g,"").slice(0,2)}if(c!==t.value){t.value=c;if(t.id)fieldError(t.id,"Numbers only.")}else if(t.id)fieldError(t.id,"")});
}

function stageTrack(status,clickOrder,mini){
  var idx=STAGES.indexOf(status),h='<div class="lace'+(mini?" mini":"")+'">';
  for(var i=0;i<5;i++){
    var cls=i<idx?"done":(i===idx?"active":"");
    var click=clickOrder&&i>idx&&(i<=2||(i===3&&idx===2));
    h+='<div class="eyelet '+cls+(click?" clickable":"")+'"><div class="ring"'+(click?' data-order="'+esc(clickOrder)+'" data-stage="'+STAGES[i]+'" title="Move to '+STAGE_SHORT[i]+'"':"")+'>'+(i<idx?"✓":(i+1))+'</div>'+STAGE_SHORT[i]+'</div>';
    if(i<4)h+='<div class="lace-line'+(i<idx?" done":"")+'"></div>';
  }
  return h+'</div>';
}

function initials(name){var p=String(name||"").trim().split(/\s+/);return ((p[0]||"?").charAt(0)+(p[1]?p[1].charAt(0):"")).toUpperCase()}
function session(callback){request("php/check-session.php",{},"GET",function(r){
  if(!r.logged_in){location.href="../root/index.php";return}
  var u=r.user||{},sup=u.role==="production_supervisor",name=u.full_name||u.username||"Employee";
  var el=document.getElementById("userName");if(el)el.textContent=name;
  var ro=document.getElementById("userRole");if(ro)ro.textContent=sup?"Production supervisor":"Production staff";
  ["avatar","avatarSm"].forEach(function(i){var a=document.getElementById(i);if(a)a.textContent=initials(name)});
  document.body.dataset.role=sup?"SUPERVISOR":"STAFF";
  request("php/quality-checks.php",{action:"list"},"GET",function(q){var b=document.getElementById("qcBadge");if(!b||!q.success)return;var n=q.rows.filter(function(x){return x.status==="pending_review"}).length;b.textContent=n;b.style.display=n?"":"none"});
  request("php/material-requests.php",{action:"incoming"},"GET",function(q){if(q.success)setIncomingBadge("materials",q.rows.length)});
  request("php/product-requests.php",{action:"list"},"GET",function(q){if(q.success)setIncomingBadge("products",q.rows.filter(function(x){return x.status==="Pending"&&!x.order_id}).length)});
  callback(r)})}
var incomingCounts={materials:0,products:0};
function setIncomingBadge(kind,n){incomingCounts[kind]=n;var b=document.getElementById("incomingBadge");if(!b)return;var t=incomingCounts.materials+incomingCounts.products;b.textContent=t;b.style.display=t?"":"none"}
function autoRefresh(){
  var busy=false;
  function tick(){if(busy||document.hidden||document.querySelector(".modal.show"))return;var P=window.ProductionPage;if(!P||!P.reload)return;busy=true;try{P.reload()}finally{setTimeout(function(){busy=false},1500)}}
  setInterval(tick,30000);document.addEventListener("visibilitychange",function(){if(!document.hidden)tick()});
}
function setupNav(){
  var page=document.body.dataset.page;
  document.querySelectorAll(".navbtn").forEach(function(a){if(a.dataset.page===page)a.classList.add("active")});
  var lo=document.getElementById("logoutBtn");if(lo)lo.onclick=function(e){e.preventDefault();confirmBox("Sign out of Production Module 3?",function(){request("php/logout.php",{},"POST",function(){location.href="../root/index.php"})})};
  var g=document.getElementById("globalSearch");if(g)g.addEventListener("keydown",function(e){if(e.key==="Enter"){var q=g.value.trim();if(q)location.href="production-orders.html?q="+encodeURIComponent(q)}});
}
function confirmBox(message,onYes){
  var m=document.getElementById("confirmModal");document.getElementById("confirmMessage").textContent=message;
  var yes=document.getElementById("confirmYes"),no=document.getElementById("confirmNo");
  function close(){m.classList.remove("show");yes.onclick=null;no.onclick=null}
  yes.onclick=function(){close();onYes()};no.onclick=close;
  m.onclick=function(e){if(e.target===m)close()};
  m.classList.add("show");yes.focus();
}
var NOTIF={warning:"!",success:"✓",done:"✓",info:"i",qc:"Q"};
function setupNotifications(){
  var btn=document.getElementById("notifBtn"),panel=document.getElementById("notifPanel"),dot=document.getElementById("notifDot");if(!btn)return;
  function refreshDot(){request("php/notifications.php",{action:"list"},"GET",function(r){if(r.success)dot.style.display=r.rows.some(function(n){return Number(n.is_read)===0})?"block":"none"})}
  btn.addEventListener("click",function(e){e.stopPropagation();var open=!panel.classList.contains("open");panel.classList.toggle("open",open);if(!open)return;
    request("php/notifications.php",{action:"list"},"GET",function(r){if(!r.success)return;
      document.getElementById("notifItems").innerHTML=r.rows.length?r.rows.map(function(n){return '<div class="notif-item'+(Number(n.is_read)?"":" unread")+'"><div class="notif-icon '+esc(n.type)+'">'+(NOTIF[n.type]||"i")+'</div><div>'+esc(n.message)+'<small>'+relTime(n.created_at)+'</small></div></div>'}).join(""):'<div class="notif-item">No notifications.</div>';
      dot.style.display="none";request("php/notifications.php",{action:"read_all"},"POST",function(){})})});
  document.addEventListener("click",function(e){if(!e.target.closest(".notif-wrap"))panel.classList.remove("open")});
  refreshDot();setInterval(function(){if(!document.hidden)refreshDot()},30000);
}


function requestActions(r){
  var b=function(st,t){return '<button class="action-btn" data-req="'+r.request_id+'" data-status="'+st+'">'+t+'</button>'};
  if(r.status==="pending")return b("rejected","Cancel request");
  if(r.status==="approved")return (r.can_accept?b("issued","Accept"):'<span style="color:#888;font-size:12px;margin-right:6px">Waiting for Inventory to send it out</span>')+b("rejected","Not received");
  return "";
}
function bindRequestActions(container,reload){
  container.addEventListener("click",function(e){var b=e.target.closest("[data-req]");if(!b||b.disabled)return;
    var st=b.dataset.status,pend=b.textContent==="Cancel request",msg={rejected:pend?"Cancel this material request? Inventory will see it as cancelled.":"Mark this material as NOT received?",issued:"Accept this material as received from Inventory? It will be added to the Materials inventory."}[st];
    confirmBox(msg,function(){b.disabled=true;
    request("php/material-requests.php",{action:"set_status",id:b.dataset.req,status:st},"POST",function(r){toast(r.message);b.disabled=false;if(r.success)reload()})})});
}

document.addEventListener("DOMContentLoaded",function(){
  var st=document.createElement("div");st.textContent="build 43";st.style.cssText="position:fixed;right:8px;bottom:4px;font:10px Arial;color:#999;z-index:9999;pointer-events:none";document.body.appendChild(st);
  if(document.body.classList.contains("app")){
    setupNav();modalSetup();numericInputs();setupNotifications();
    session(function(){
      loadPageAccess(function(){
        applyPageAccess();
        if(!pageAllowed(document.body.dataset.page)){
          if(document.body.dataset.page!=="dashboard"&&pageAllowed("dashboard")){location.href="dashboard.html";return}
          showNoAccess();return;
        }
        if(window.ProductionPage&&ProductionPage.init)ProductionPage.init();
        autoRefresh();
      });
    });
  }
});
return {setIncomingBadge:setIncomingBadge,confirm:confirmBox,requestActions:requestActions,bindRequestActions:bindRequestActions,request:request,toast:toast,esc:esc,money:money,qty:qty,shortDate:shortDate,longDate:longDate,relTime:relTime,cap:cap,badge:badge,stageBadge:stageBadge,reqBadge:reqBadge,orderLink:orderLink,fillSelect:fillSelect,openModal:openModal,closeModal:closeModal,query:query,checkWhole:checkWhole,checkDecimal:checkDecimal,checkDate:checkDate,fieldError:fieldError,stageTrack:stageTrack,STAGES:STAGES,STAGE_LABEL:STAGE_LABEL,session:session};
})();
