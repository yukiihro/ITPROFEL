var ProductionPage={init:function(){
 var A=ProductionApp,form=document.getElementById("accountForm"),resetId=null;
 var rows=[];
 function render(){var q=document.getElementById("tableSearch").value.trim().toLowerCase();
  var data=rows.filter(function(u){return !q||[u.full_name,u.username,u.email].join(" ").toLowerCase().indexOf(q)>=0});
  document.getElementById("accountsTable").innerHTML=data.length?data.map(function(u){
   var active=u.status==="Active";
   return '<tr><td>'+A.esc(u.full_name)+'</td><td>'+A.esc(u.username)+'</td><td>'+A.esc(u.email)+'</td><td>'+(u.role==="production_supervisor"?"Supervisor":"Staff")+'</td><td>'+A.badge(u.status,active?"done":"neutral")+'</td><td><button class="action-btn" data-act="reset" data-id="'+u.id+'" data-name="'+A.esc(u.username)+'">Change password</button><button class="action-btn" data-act="status" data-id="'+u.id+'" data-status="'+(active?"Inactive":"Active")+'">'+(active?"Deactivate":"Activate")+'</button></td></tr>'}).join(""):'<tr><td colspan="6" class="empty">'+(q?"No accounts match your search.":"No accounts yet.")+'</td></tr>'}
 function load(){A.request("php/accounts.php",{action:"list"},"GET",function(r){
  if(!r.success){A.toast(r.message);return}
  rows=r.rows;render()})}
 document.getElementById("tableSearch").oninput=render;
 document.getElementById("addAccountBtn").onclick=function(){form.reset();form.querySelector(".form-message").textContent="";A.openModal("accountModal")};
 form.addEventListener("submit",function(e){e.preventDefault();var m=form.querySelector(".form-message");
  A.request("php/accounts.php",{action:"create",full_name:aName.value.trim(),username:aUser.value.trim(),email:aEmail.value.trim(),password:aPass.value,role:aRole.value},"POST",function(r){
   m.className="form-message "+(r.success?"success":"error");m.textContent=r.message;
   if(r.success){A.toast(r.message);setTimeout(function(){A.closeModal(document.getElementById("accountModal"));load()},300)}})});
 document.getElementById("accountsTable").onclick=function(e){var b=e.target.closest("[data-act]");if(!b)return;
  if(b.dataset.act==="status"){A.confirm((b.dataset.status==="Inactive"?"Deactivate":"Activate")+" this account?",function(){
   A.request("php/accounts.php",{action:"set_status",id:b.dataset.id,status:b.dataset.status},"POST",function(r){A.toast(r.message);load()})})}
  else{resetId=b.dataset.id;document.getElementById("resetTitle").textContent="Change password for "+b.dataset.name;document.getElementById("rNewPass").value="";document.getElementById("resetForm").querySelector(".form-message").textContent="";A.openModal("resetModal")}};
 document.getElementById("resetForm").addEventListener("submit",function(e){e.preventDefault();var m=this.querySelector(".form-message");
  A.request("php/accounts.php",{action:"reset_password",id:resetId,password:rNewPass.value},"POST",function(r){m.className="form-message "+(r.success?"success":"error");m.textContent=r.message;if(r.success){A.toast(r.message);setTimeout(function(){A.closeModal(document.getElementById("resetModal"))},300)}})});
 load();
}};
