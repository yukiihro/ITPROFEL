/* ITPROFEL Procurement invoice discrepancy workflow: manual Gmail report -> saved hold.
   Existing invoice layout and Finance posting controls are preserved. */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') return;
  const number = params.get('invoice_number') || '';
  const button = document.getElementById('discrepancyButton');
  if (!button || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(number)) return;
  const endpoint = '../database/invoice-discrepancy.php';
  const badge = document.getElementById('statusBadge');
  const summary = document.querySelector('.summary');
  const notice = document.createElement('p');
  notice.className = 'disc-inline-note';
  notice.hidden = true;
  notice.setAttribute('role','status');
  notice.setAttribute('aria-live','polite');
  (summary || button.parentNode).insertAdjacentElement('afterend',notice);

  const dialog = document.createElement('dialog');
  dialog.className = 'disc-modal no-print';
  dialog.setAttribute('aria-labelledby','discTitle');
  dialog.innerHTML = `
    <form id="discForm">
      <header class="disc-head"><div><small>Footwear Procurement</small><h2 id="discTitle">Flag Discrepancy</h2><p id="discInvoiceName"></p></div><button type="button" class="disc-close" aria-label="Close">×</button></header>
      <p class="disc-description">Inventory reports rejected materials to Procurement through Gmail. Record that report here; this does not send an email or post to Finance.</p>
      <div id="discEvidence" class="disc-evidence"></div>
      <div class="disc-columns">
        <fieldset><legend>What is the issue with this invoice?</legend>
          <label><input type="checkbox" value="quantity_mismatch"> Quantity Mismatch</label>
          <label><input type="checkbox" value="price_mismatch"> Price Mismatch</label>
          <label><input type="checkbox" value="damaged_goods"> Damaged / Rejected Goods</label>
          <label><input type="checkbox" value="other"> Other</label>
        </fieldset>
        <div class="disc-fields">
          <label for="discNotes">Explanation / Note <span>*</span></label>
          <textarea id="discNotes" minlength="10" maxlength="1000" rows="5" placeholder="Example: Inventory emailed that 7 of 10 items were rejected due to damage. 3 were accepted." required></textarea>
          <label for="discGmail">Gmail subject or reference (optional)</label>
          <input id="discGmail" maxlength="200" type="text" placeholder="Example: Rejected items - PO-2026-0012">
        </div>
      </div>
      <p class="disc-feedback" id="discFeedback" role="alert"></p>
      <div class="disc-actions"><button type="button" class="disc-cancel">Cancel</button><button type="submit" id="discSubmit">Flag and Hold Invoice</button></div>
    </form>
    <form id="discResolveForm" hidden>
      <h2>Review / Update Discrepancy · On Hold</h2>
      <p>Review and update Accepted / Rejected Quantities from the Inventory Gmail below, then edit the corrected supplier invoice separately. Resolve only when the quantities and documents pass verification. Original Inventory records are not changed.</p>
      <label for="discResolution">Resolution note</label>
      <textarea id="discResolution" minlength="10" maxlength="1000" rows="4" placeholder="Explain the replacement delivery and corrected supplier billing." required></textarea>
      <p class="disc-feedback" id="discResolveFeedback" role="alert"></p>
      <div class="disc-actions"><button type="button" id="discOpenEdit">Edit Supplier Invoice</button><button type="button" class="disc-cancel">Cancel</button><button type="submit" id="discResolve">Verify and Resolve Hold</button></div>
    </form>
    <form id="discEditForm" hidden>
      <h2>Review Automatically Calculated Invoice · On Hold</h2>
      <p class="disc-description">Billed quantities and unit prices are AUTO-FILLED when you save the Inventory Gmail report under Flag / Review Discrepancy (accepted only × approved PO prices). This is an UNVERIFIED draft, not a supplier-issued invoice. Only confirm supplier document review if you actually have the document; the original PO/GR remain unchanged.</p>
      <div class="disc-edit-fields">
        <label>Purchase Order <input id="discEditPo" type="text" readonly></label>
        <label>Supplier invoice reference <input id="discEditRef" type="text" maxlength="80" required></label>
        <label>Invoice date <input id="discEditDate" type="date" required></label>
        <label>Due date <input id="discEditDue" type="date" required></label>
        <label>Supplier invoice notes <input id="discEditNotes" type="text" maxlength="255"></label>
      </div>
      <div class="disc-edit-table-wrap"><table class="disc-edit-table"><thead><tr><th>Item / Unit</th><th>Ordered</th><th>Gmail accepted (reference only)</th><th>Auto billed (accepted)</th><th>Approved PO unit price (₱)</th></tr></thead><tbody id="discEditRows"></tbody></table></div>
      <div class="disc-edit-total">
        <label>Supplier invoice total (pre-VAT) <input id="discEditTotal" type="number" min="0.01" step="0.01" required></label>
        <span id="discEditComputed">Calculated line total: —</span>
        <button id="discUseComputed" type="button">Use Calculated Total</button>
      </div>
      <label class="disc-doc-reviewed"><input id="discEditChecked" type="checkbox" required> I personally checked the corrected genuine supplier invoice document.</label>
      <p class="disc-feedback" id="discEditFeedback" role="status"></p>
      <div class="disc-actions"><button type="button" id="discBackToResolve">Back to Discrepancy</button><button type="submit" id="discEditSave">Save Corrected Invoice</button><button type="button" id="discEditVerify">Recheck 3-Way Match</button></div>
    </form>
      <fieldset id="discMailPanel" class="disc-mail-report"><legend>Inventory Gmail receiving report (manually transcribed by Buyer)</legend>
        <div class="disc-edit-fields">
          <label>Email subject <input id="discMailSubject" type="text" maxlength="200" placeholder="[DELIVERY RECEIVED] PO-2026-04 - Supplier" required></label>
          <label>Inventory sender email <input id="discMailSender" type="email" maxlength="200" placeholder="inventory@company.com" required></label>
          <label>Delivery / DR reference <input id="discMailDR" type="text" maxlength="100" placeholder="DN-SynthHide-2026-1123" required></label>
          <label>Delivery received date <input id="discMailDate" type="date" required></label>
          <label class="disc-mail-wide">Inventory report / inspection notes <textarea id="discMailNote" rows="2" maxlength="1000" minlength="10" required placeholder="e.g. 5 meters PU Leather rejected due to torn edges; set aside for return."></textarea></label>
        </div>
        <label class="disc-doc-reviewed"><input id="discMailChecked" type="checkbox" required> I reviewed the Inventory team's email and entered its delivered, accepted, and rejected quantities accurately.</label>
        <p class="disc-description">Copy figures exactly from Inventory Gmail. Saving this report will AUTOMATICALLY update the ON HOLD invoice draft: billed = accepted, price = approved PO price. It will NOT mark a supplier document as verified.</p>
        <div class="disc-edit-table-wrap"><table class="disc-edit-table"><thead><tr><th>Item / Unit</th><th>Ordered (PO)</th><th>Original GR accepted (reference)</th><th>Gmail delivered</th><th>Gmail accepted</th><th>Gmail rejected</th></tr></thead><tbody id="discMailRows"></tbody></table></div>
        <div id="discAutoBillPreview" class="disc-autobill-preview" role="status">Enter accepted/rejected quantities to preview automatic billing.</div>
        <button id="discSaveEmail" type="button">Save Gmail Report + Recalculate Invoice</button>
        <p id="discMailFeedback" role="status" class="disc-feedback"></p>
      </fieldset>
`;
  document.body.append(dialog);
  const $ = id => dialog.querySelector('#'+id);
  $('discInvoiceName').textContent=number;
  dialog.querySelectorAll('.disc-close, .disc-cancel').forEach(el=>el.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click', e=>{if(e.target===dialog)dialog.close();});

  let state = null;
  let loading = false;
  function updateNotice(text) {notice.textContent=text;notice.hidden=!text;}
  function applyButton(){
    const canFlag=state?.can_flag===true&&!loading;
    button.disabled=!canFlag;
    button.title=state?.open_hold?'Invoice ON HOLD. See details and resolution below.'
      :state?.finance_status?'Invoice already in Finance handoff; contact Finance for corrections.'
      :canFlag?'Record an Inventory rejection received by Gmail and hold the invoice.'
      :'Invoice cannot be flagged until a genuine unposted invoice is recorded.';
  }
  // The existing invoice addons disable this button after asynchronous loading.
  // Once our authenticated status has arrived, preserve our status decision.
  new MutationObserver(() => {if(state && button.disabled===state.can_flag && !loading)applyButton();})
    .observe(button,{attributes:true,attributeFilter:['disabled']});
  function applyHold(){
    if(!state?.open_hold)return;
    const text='ON HOLD · Inventory Discrepancy';
    if(badge && badge.textContent!==text){badge.textContent=text;badge.className='status-badge discrepancy';}
    const caseNumber=state.latest?.id||'—';
    updateNotice('Invoice ON HOLD — discrepancy #'+caseNumber+'. Normal Finance queue/posting is blocked. Inventory rejection was reported to Procurement through Gmail; follow up with supplier and verify corrected records.');
  }
  if(badge)new MutationObserver(()=>{if(state?.open_hold)applyHold();}).observe(badge,{childList:true,characterData:true,subtree:true});
  function fillEvidence(rows){
    const target=$('discEvidence'); target.replaceChildren();
    const title=document.createElement('strong');title.textContent='Verified Inventory receiving evidence';target.append(title);
    if(!rows.length){const p=document.createElement('p');p.textContent='No linked verified receipt lines found. Check the Inventory Gmail report and GR before flagging.';target.append(p);return;}
    rows.forEach(row=>{const p=document.createElement('p');p.textContent=`${row.item_name} — PO ${row.qty_ordered} ${row.unit}; verified delivered ${row.verified_delivered}, accepted ${row.verified_accepted}, rejected ${row.verified_rejected}`;target.append(p);});
  }
  async function request(method, body){
    const response=await fetch(endpoint+(method==='GET'?'?invoice_number='+encodeURIComponent(number):''),{
      method, credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(method==='POST'?{'Content-Type':'application/json','X-CSRF-Token':state.csrf_token}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.success)throw new Error(data.message||`HTTP ${response.status}`);
    return data;
  }
  async function reload(){state=await request('GET'); applyButton(); applyHold();if(state.open_hold){resolveBtn.hidden=false;}else{resolveBtn.hidden=true;updateNotice('');}}
  const resolveBtn=document.createElement('button');
  resolveBtn.type='button';resolveBtn.hidden=true;resolveBtn.className='disc-resolve-trigger';
  resolveBtn.textContent='Review / Resolve Discrepancy';
  notice.insertAdjacentElement('afterend',resolveBtn);
  button.addEventListener('click',async()=>{
    if(!state?.can_flag||loading)return;
    $('discForm').hidden=false;$('discResolveForm').hidden=true;$('discEditForm').hidden=true;
    $('discFeedback').textContent='';fillEvidence(state.receipt_items||[]);
    placeMailPanel('flag');dialog.showModal();
    try{await loadReportScreen('flag');}
    catch(err){$('discFeedback').textContent='Could not load Gmail report fields: '+(err.message||'error');}
  });
  async function showResolve() {
    $('discForm').hidden=true;
    $('discEditForm').hidden=true;
    $('discResolveForm').hidden=false;
    $('discResolveFeedback').textContent='';
    const saved=state?.latest;
    if(saved?.buyer_notes){
      $('discResolveFeedback').textContent='Original report: '+saved.buyer_notes+(saved.gmail_reference?' | Gmail: '+saved.gmail_reference:'');
    }
    placeMailPanel('resolve');
    if(!dialog.open)dialog.showModal();
    try{await loadReportScreen('resolve');}
    catch(err){$('discMailFeedback').textContent='Unable to load report: '+(err.message||'error');}
  }
  resolveBtn.addEventListener('click',()=>{
    if(!state?.open_hold)return;
    showResolve();
  });

  // Reuse the existing authenticated Buyer supplier invoice save/verify API.
  // No new invoice, Finance posting, PO edits or Inventory stock changes.
  const invoiceEndpoint='../database/buyer-invoice-integration-local.php';
  const mailEndpoint='../database/invoice-inventory-email.php';
  let emailData=null;
  async function emailGet(){
    const response=await fetch(mailEndpoint+'?invoice_number='+encodeURIComponent(number),{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.success)throw new Error(data.message||'Unable to load Inventory Gmail report. Import SQL 06 first.');
    return data;
  }
  async function emailPost(body){
    if(!emailData?.csrf_token)throw new Error('Email report session expired. Refresh the Invoice page.');
    const response=await fetch(mailEndpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json','X-CSRF-Token':emailData.csrf_token},body:JSON.stringify({invoice_number:number,action:'save_email',...body})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.success)throw new Error(data.message||'Inventory email report could not be saved.');
    return data;
  }
  let editData=null;
  let editorBusy=false;
  let unsavedEdits=false;
  const editTable=$('discEditRows');
  const emailTable=$('discMailRows');
  const mailPanel=$('discMailPanel');
  const mailSaveBtn=$('discSaveEmail');
  let emailReady=false;
  let mailBusy=false;
  function toggleEmailInFlag(){
    const reasons=[...$('discForm').querySelectorAll('.disc-columns fieldset input[type="checkbox"]:checked')].map(el=>el.value);
    const needed=reasons.includes('quantity_mismatch')||reasons.includes('damaged_goods');
    mailPanel.hidden=!needed;
    mailPanel.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=!needed);
  }
  $('discForm').querySelectorAll('.disc-columns fieldset input[type="checkbox"]').forEach(el=>el.addEventListener('change',toggleEmailInFlag));
  function placeMailPanel(which) {
    const form=$(which === 'flag' ? 'discForm' : 'discResolveForm');
    form.insertBefore(mailPanel, $(which === 'flag' ? 'discFeedback' : 'discResolveFeedback'));
    mailSaveBtn.hidden=which==='flag';
    if(which==='flag')toggleEmailInFlag();
    else {mailPanel.hidden=false;mailPanel.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=false);}
    $('discMailFeedback').textContent=which==='flag'
      ? 'The report will be saved after Flag and Hold. No changes will be made to the actual Gmail message.'
      : 'Review the Inventory email values and click Update Gmail Report to save changes.';
  }
  function populateMailReport(em, items) {
    emailData=em;
    const mail=em?.report||null;
    $('discMailSubject').value=mail?.gmail_subject||'';
    $('discMailSender').value=mail?.sender_email||'';
    $('discMailDR').value=mail?.delivery_reference||'';
    $('discMailDate').value=String(mail?.received_date||'').slice(0,10);
    $('discMailNote').value=mail?.buyer_note||'';
    $('discMailChecked').checked=!!Number(mail?.inventory_email_reviewed);
    const saved=new Map((mail?.items||[]).map(it=>[Number(it.po_item_id),it]));
    emailTable.replaceChildren();
    for(const line of items||[]){
      const id=Number(line.po_item_id),old=saved.get(id);
      const tr=document.createElement('tr');tr.dataset.poItemId=String(id);
      for(const text of [line.item_name+' ('+line.unit+')',line.qty_ordered,line.verified_accepted??line.qty_received??'—']) {
        const td=document.createElement('td');td.textContent=String(text);tr.append(td);
      }
      for(const [cls,value] of [
        ['disc-mail-delivered',old?.delivered_qty??line.qty_ordered],
        ['disc-mail-accepted',old?.accepted_qty??''],
        ['disc-mail-rejected',old?.rejected_qty??'']]) {
        const td=document.createElement('td'),inp=document.createElement('input');
        inp.type='number';inp.step='0.01';inp.min=cls==='disc-mail-rejected'?'0':'0';inp.required=true;
        inp.className=cls;inp.value=String(value);td.append(inp);tr.append(td);
      }
      emailTable.append(tr);
    }
    emailReady=true;
    showAutoBillPreview();
  }
  function showAutoBillPreview(){
    const target=$('discAutoBillPreview');if(!target)return;
    const poLines=new Map((state?.receipt_items||[]).map(x=>[Number(x.po_item_id),x]));
    const lines=[...emailTable.querySelectorAll('tr')];
    if(!lines.length){target.textContent='Invoice draft preview unavailable until PO lines load.';return;}
    let total=0,valid=true;const parts=[];
    for(const tr of lines){
      const po=poLines.get(Number(tr.dataset.poItemId));
      const a=Number(tr.querySelector('.disc-mail-accepted')?.value);
      const r=Number(tr.querySelector('.disc-mail-rejected')?.value);
      const d=Number(tr.querySelector('.disc-mail-delivered')?.value);
      const p=Number(po?.unit_price);
      if(!po||![a,r,d,p].every(Number.isFinite)||a<=0||r<0||d<=0||Math.abs(d-a-r)>.001||p<=0){valid=false;break;}
      const amount=Math.round(Math.round(a*100)*Math.round(p*100)/100);
      total+=amount;
      parts.push(`${po.item_name}: ${a.toFixed(2)} ${po.unit} × ₱${p.toFixed(2)} = ₱${money2(amount/100)}`);
    }
    target.textContent=valid
      ? 'Automatic invoice DRAFT preview (pre-VAT): '+parts.join(' | ')+' | TOTAL ₱'+money2(total/100)+'. On Hold until documents/issue are reviewed.'
      : 'Complete Gmail quantities for every line (Delivered = Accepted + Rejected) to preview the automatic draft. Each item must have accepted quantity above zero.';
  }
  emailTable.addEventListener('input',showAutoBillPreview);
  function mailPayload(){
    if(!$('discMailChecked').checked)throw new Error('Review and confirm the actual Inventory Gmail report.');
    const controls=mailPanel.querySelectorAll('input,textarea');
    for(const input of controls){if(!input.checkValidity()){input.reportValidity();throw new Error('Complete all Inventory Gmail fields and quantities first.');}}
    const items=[...emailTable.querySelectorAll('tr')].map(tr=>({
      po_item_id:Number(tr.dataset.poItemId),
      delivered_qty:tr.querySelector('.disc-mail-delivered').value,
      accepted_qty:tr.querySelector('.disc-mail-accepted').value,
      rejected_qty:tr.querySelector('.disc-mail-rejected').value
    }));
    if(!items.length)throw new Error('There are no linked PO items for the Gmail report.');
    for(const item of items){
      const d=Number(item.delivered_qty),a=Number(item.accepted_qty),r=Number(item.rejected_qty);
      if(![d,a,r].every(Number.isFinite)||d<=0||a<0||r<0||Math.abs(d-(a+r))>0.001)
        throw new Error('For every item, Gmail delivered must equal accepted plus rejected.');
    }
    return {gmail_subject:$('discMailSubject').value.trim(),sender_email:$('discMailSender').value.trim(),
      delivery_reference:$('discMailDR').value.trim(),received_date:$('discMailDate').value,
      buyer_note:$('discMailNote').value.trim(),inventory_email_reviewed:true,items};
  }
  async function loadReportScreen(which){
    placeMailPanel(which);emailReady=false;
    const em=await emailGet();
    populateMailReport(em,state.receipt_items||[]);
  }

  const money2=n=>Number.isFinite(n)?n.toFixed(2):'0.00';
  async function invoiceGet() {
    if(!state?.open_hold || state?.finance_status)throw new Error('Only unqueued ON HOLD invoices may be edited.');
    const po=String(document.getElementById('poReference')?.textContent||'').trim();
    if(!/^PO-[A-Za-z0-9-]{1,26}$/.test(po))throw new Error('Valid PO reference is missing.');
    const r=await fetch(invoiceEndpoint+'?po_number='+encodeURIComponent(po)+'&invoice_mode=genuine',{
      credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.success)throw new Error(d.message||'Cannot load invoice for editing.');
    if(!d.invoice || d.invoice.invoice_number!==number || d.invoice.source_kind!=='supplier_document')
      throw new Error('Invoice does not match this unposted genuine supplier document.');
    return d;
  }
  async function invoicePost(body) {
    if(!editData?.csrf_token)throw new Error('Invoice editor session expired. Reload page.');
    const r=await fetch(invoiceEndpoint,{method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json',Accept:'application/json','X-CSRF-Token':editData.csrf_token},
      body:JSON.stringify({invoice_mode:'genuine',po_number:editData.po.po_number,...body})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.success)throw new Error(d.message||'Invoice update failed.');
    return d;
  }
  function recompute() {
    const sum=[...editTable.querySelectorAll('tr')].reduce((acc,tr)=>{
      const qty=Number(tr.querySelector('.disc-qty')?.value||0);
      const price=Number(tr.querySelector('.disc-price')?.value||0);
      return acc+(Number.isFinite(qty)&&Number.isFinite(price)?Math.round(qty*price*100):0);
    },0);
    $('discEditComputed').textContent='Calculated line total (pre-VAT): ₱'+money2(sum/100);
    return money2(sum/100);
  }
  function drawEditor(d, em) {
    editData=d;emailData=em;
    const mail=em?.report||null;
    const inv=d.invoice;
    $('discEditPo').value=d.po.po_number;
    $('discEditRef').value=inv.supplier_invoice_reference||'';
    $('discEditDate').value=String(inv.invoice_date||'').slice(0,10);
    $('discEditDue').value=String(inv.due_date||'').slice(0,10);
    $('discEditNotes').value=inv.source_notes||'';
    $('discEditTotal').value=inv.total_amount||'';
    // A new corrected supplier document must be reviewed again by the Buyer.
    $('discEditChecked').checked=false;
    const saved=new Map((d.invoice_items||[]).map(it=>[Number(it.po_item_id),it]));
    const receipt=new Map((d.match?.items||[]).map(it=>[Number(it.po_item_id),it]));
    const emailItems=new Map((mail?.items||[]).map(it=>[Number(it.po_item_id),it]));
    editTable.replaceChildren();
    for(const line of d.po_items||[]) {
      const id=Number(line.po_item_id), old=saved.get(id), gr=receipt.get(id), emailLine=emailItems.get(id);
      const tr=document.createElement('tr');tr.dataset.poItemId=String(id);
      for(const s of [line.item_name+' ('+line.unit+')',String(line.qty_ordered),String(emailLine?.accepted_qty??'No Gmail report')]) {
        const td=document.createElement('td');td.textContent=s;tr.append(td);
      }
      for(const [className,value] of [
        ['disc-qty',old?.qty_billed??''],['disc-price',old?.unit_price??line.unit_price]]) {
        const td=document.createElement('td'),input=document.createElement('input');
        input.type='number';input.step='0.01';input.min=className==='disc-mail-rejected'?'0':'0.01';input.required=true;
        input.className=className;input.value=String(value);input.readOnly=true;input.title='Automatically calculated from Inventory Gmail accepted quantity and approved PO price';input.addEventListener('input',recompute);
        td.append(input);tr.append(td);
      }
      editTable.append(tr);
    }
    recompute();
    unsavedEdits=false;
    $('discEditFeedback').textContent='Billed quantities, unit prices and pre-VAT total were prepared automatically from your saved Inventory Gmail report. Enter supplier document details ONLY if you have checked the actual document. Finance remains blocked while the invoice is On Hold.';
  }
  $('discOpenEdit').addEventListener('click',async()=>{
    if(editorBusy||!state?.open_hold)return;
    editorBusy=true;$('discOpenEdit').disabled=true;
    try {
      const d=await invoiceGet();const email=await emailGet();drawEditor(d,email);
      $('discResolveForm').hidden=true;$('discEditForm').hidden=false;
    } catch(e){$('discResolveFeedback').textContent=e.message||'Unable to load editor.';}
    finally{editorBusy=false;$('discOpenEdit').disabled=false;}
  });
  $('discBackToResolve').addEventListener('click',showResolve);
  $('discEditForm').addEventListener('input',e=>{
    if(e.target.matches('input:not([readonly])'))unsavedEdits=true;
  });
  $('discUseComputed').addEventListener('click',()=>{$('discEditTotal').value=recompute();unsavedEdits=true;});
  async function refreshEditor() {const d=await invoiceGet();const email=await emailGet();drawEditor(d,email);}
  $('discSaveEmail').addEventListener('click',async()=>{
    if(mailBusy||!state?.open_hold||!emailReady)return;
    let payload;
    try{payload=mailPayload();}
    catch(err){$('discMailFeedback').textContent=err.message||'Check the entered quantities.';return;}
    mailBusy=true;mailSaveBtn.disabled=true;
    $('discMailFeedback').textContent='Updating Procurement copy of Inventory Gmail report...';
    try{
      const result=await emailPost(payload);
      emailData=await emailGet();
      showAutoBillPreview();
      $('discMailFeedback').textContent=(result.message||'Gmail report saved.')+' Revision '+result.revision+'. New pre-VAT invoice draft: ₱'+result.invoice_amount_pre_vat+'. The original Gmail, PO and GR were not modified.';
    }catch(err){$('discMailFeedback').textContent=err.message||'Could not save Inventory Gmail report.';}
    finally{mailBusy=false;mailSaveBtn.disabled=false;}
  });
  $('discEditForm').addEventListener('submit',async e=>{
    e.preventDefault();if(editorBusy||!state?.open_hold)return;
    if(!$('discEditChecked').checked){$('discEditFeedback').textContent='Review and confirm the corrected supplier document first.';return;}
    editorBusy=true;$('discEditSave').disabled=true;$('discEditVerify').disabled=true;
    $('discEditFeedback').textContent='Saving updated invoice...';
    try {
      const items=[...editTable.querySelectorAll('tr')].map(tr=>({
        po_item_id:Number(tr.dataset.poItemId),
        qty_billed:tr.querySelector('.disc-qty').value,
        unit_price:tr.querySelector('.disc-price').value
      }));
      const result=await invoicePost({action:'save',source_kind:'supplier_document',
        supplier_invoice_reference:$('discEditRef').value.trim(),source_notes:$('discEditNotes').value.trim(),
        document_checked:true,invoice_date:$('discEditDate').value,due_date:$('discEditDue').value,
        total_amount:$('discEditTotal').value,items});
      await refreshEditor();
      $('discEditFeedback').textContent=(result.message||'Invoice updated.')+' It remains ON HOLD. Click Recheck 3-Way Match, then Back to Discrepancy to resolve.';
    }catch(e){$('discEditFeedback').textContent=e.message||'Could not save corrected invoice.';}
    finally{editorBusy=false;$('discEditSave').disabled=false;$('discEditVerify').disabled=false;}
  });
  $('discEditVerify').addEventListener('click',async()=>{
    if(editorBusy||!state?.open_hold)return;
    if(unsavedEdits){$('discEditFeedback').textContent='Save your invoice changes first, then recheck the stored 3-Way Match.';return;}
    editorBusy=true;$('discEditSave').disabled=true;$('discEditVerify').disabled=true;
    try {
      const result=await invoicePost({action:'verify'});
      const ok=result.data_matched===true && result.supplier_document_verified===true;
      $('discEditFeedback').textContent=ok
        ? 'Numerical match passed. Still ON HOLD: return to the discrepancy form to resolve; then verify once more before queuing to Finance.'
        : 'Still a mismatch. Verify the Buyer-entered Inventory email quantities (accepted + rejected = delivered), corrected billed quantities, PO unit prices, and totals. This email is not an authenticated Inventory GR.';
    }catch(e){$('discEditFeedback').textContent=e.message||'Recheck failed.';}
    finally{editorBusy=false;$('discEditSave').disabled=false;$('discEditVerify').disabled=false;}
  });
  $('discForm').addEventListener('submit',async e=>{
    e.preventDefault();if(loading||!state?.can_flag)return;
    const reasons=[...$('discForm').querySelectorAll('.disc-columns fieldset input[type="checkbox"]:checked')].map(x=>x.value);
    if(!reasons.length){$('discFeedback').textContent='Please select at least one issue.';return;}
    const needsEmail=reasons.includes('quantity_mismatch')||reasons.includes('damaged_goods');
    let report=null;
    if(needsEmail){
      if(!emailReady){$('discFeedback').textContent='Gmail report fields are still loading. Please check the fields before flagging.';return;}
      try{report=mailPayload();}catch(err){$('discFeedback').textContent=err.message||'Gmail report is incomplete.';return;}
    }
    loading=true;applyButton();$('discSubmit').disabled=true;$('discFeedback').textContent='';
    let flagged=false;
    try{
      const result=await request('POST',{action:'flag',invoice_number:number,reasons,notes:$('discNotes').value.trim(),gmail_reference:$('discGmail').value.trim()});
      flagged=true;
      if(report){
        // The email endpoint deliberately only allows saving after the invoice is ON HOLD.
        // Save the manually copied email quantities as the second, separately audited write.
        emailData=await emailGet();
        await emailPost(report);
      }
      $('discFeedback').textContent=(result.message||'Invoice placed ON HOLD.')+(report?' Automatic invoice draft updated from Gmail accepted quantities.':'');dialog.close();location.reload();
    }catch(err){
      if(flagged){
        await reload().catch(()=>{});
        $('discFeedback').textContent='Invoice was placed ON HOLD, but Gmail quantities could not be saved: '+(err.message||'error')+'. Open Review / Resolve Discrepancy and save the report there.';
        showResolve().catch(()=>{});
      } else $('discFeedback').textContent=err.message||'Unable to flag discrepancy.';
    }
    finally{loading=false;$('discSubmit').disabled=false;applyButton();}
  });
  $('discResolveForm').addEventListener('submit',async e=>{
    e.preventDefault();if(loading||!state?.open_hold)return;
    loading=true;$('discResolve').disabled=true;$('discResolveFeedback').textContent='';
    try{
      const result=await request('POST',{action:'resolve',invoice_number:number,resolution_note:$('discResolution').value.trim()});
      $('discResolveFeedback').textContent=result.message;dialog.close();location.reload();
    }catch(err){$('discResolveFeedback').textContent=err.message||'Invoice is not yet eligible for resolution.';}
    finally{loading=false;$('discResolve').disabled=false;applyButton();}
  });
  button.disabled=true;
  reload().catch(e=>{button.disabled=true;updateNotice('Discrepancy status unavailable: '+(e.message||'Check invoice migration.'));});
  window.addEventListener('focus',()=>{if(!loading)reload().catch(()=>{});});
});
