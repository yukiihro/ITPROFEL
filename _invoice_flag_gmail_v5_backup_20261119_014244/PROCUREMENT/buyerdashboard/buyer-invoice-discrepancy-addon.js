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
      <h2>Resolve On-Hold Invoice</h2>
      <p>Resolve only after an updated genuine supplier invoice matches the verified Inventory accepted quantities. When rejected goods are recorded, the original PO stays Partial and the rejected quantity remains unpaid. Reverification is required after resolution.</p>
      <label for="discResolution">Resolution note</label>
      <textarea id="discResolution" minlength="10" maxlength="1000" rows="4" placeholder="Explain the replacement delivery and corrected supplier billing." required></textarea>
      <p class="disc-feedback" id="discResolveFeedback" role="alert"></p>
      <div class="disc-actions"><button type="button" id="discOpenEdit">Edit Invoice</button><button type="button" class="disc-cancel">Cancel</button><button type="submit" id="discResolve">Verify and Resolve Hold</button></div>
    </form>
    <form id="discEditForm" hidden>
      <h2>Edit Supplier Invoice · On Hold</h2>
      <p class="disc-description">Only change values supported by an updated supplier document. This editor DOES NOT modify the Purchase Order or Inventory Goods Receipt. Your invoice remains on hold until explicit resolution.</p>
      <div class="disc-edit-fields">
        <label>Purchase Order <input id="discEditPo" type="text" readonly></label>
        <label>Supplier invoice reference <input id="discEditRef" type="text" maxlength="80" required></label>
        <label>Invoice date <input id="discEditDate" type="date" required></label>
        <label>Due date <input id="discEditDue" type="date" required></label>
        <label>Supplier invoice notes <input id="discEditNotes" type="text" maxlength="255"></label>
      </div>
      <div class="disc-edit-table-wrap"><table class="disc-edit-table"><thead><tr><th>Item / Unit</th><th>Ordered</th><th>Verified accepted</th><th>Billed quantity</th><th>Invoice unit price (₱)</th></tr></thead><tbody id="discEditRows"></tbody></table></div>
      <div class="disc-edit-total">
        <label>Supplier invoice total (pre-VAT) <input id="discEditTotal" type="number" min="0.01" step="0.01" required></label>
        <span id="discEditComputed">Calculated line total: —</span>
        <button id="discUseComputed" type="button">Use Calculated Total</button>
      </div>
      <label class="disc-doc-reviewed"><input id="discEditChecked" type="checkbox" required> I personally checked the corrected genuine supplier invoice document.</label>
      <p class="disc-feedback" id="discEditFeedback" role="status"></p>
      <div class="disc-actions"><button type="button" id="discBackToResolve">Back to Discrepancy</button><button type="submit" id="discEditSave">Save Corrected Invoice</button><button type="button" id="discEditVerify">Recheck 3-Way Match</button></div>
    </form>`;
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
  button.addEventListener('click',()=>{
    if(!state?.can_flag||loading)return;
    $('discForm').hidden=false;$('discResolveForm').hidden=true;$('discFeedback').textContent='';
    fillEvidence(state.receipt_items||[]);dialog.showModal();
  });
  function showResolve() {
    $('discForm').hidden=true;
    $('discEditForm').hidden=true;
    $('discResolveForm').hidden=false;
    $('discResolveFeedback').textContent='';
    const saved=state?.latest;
    if(saved?.buyer_notes){
      $('discResolveFeedback').textContent='Original report: '+saved.buyer_notes+(saved.gmail_reference?' | Gmail: '+saved.gmail_reference:'');
    }
    if(!dialog.open)dialog.showModal();
  }
  resolveBtn.addEventListener('click',()=>{
    if(!state?.open_hold)return;
    showResolve();
  });

  // Reuse the existing authenticated Buyer supplier invoice save/verify API.
  // No new invoice, Finance posting, PO edits or Inventory stock changes.
  const invoiceEndpoint='../database/buyer-invoice-integration-local.php';
  let editData=null;
  let editorBusy=false;
  let unsavedEdits=false;
  const editTable=$('discEditRows');
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
  function drawEditor(d) {
    editData=d;
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
    editTable.replaceChildren();
    for(const line of d.po_items||[]) {
      const id=Number(line.po_item_id), old=saved.get(id), gr=receipt.get(id);
      const tr=document.createElement('tr');tr.dataset.poItemId=String(id);
      for(const s of [line.item_name+' ('+line.unit+')',String(line.qty_ordered),String(gr?.real_gr_accepted??line.qty_received??'—')]) {
        const td=document.createElement('td');td.textContent=s;tr.append(td);
      }
      for(const [className,value] of [['disc-qty',old?.qty_billed??''],['disc-price',old?.unit_price??line.unit_price]]) {
        const td=document.createElement('td'),input=document.createElement('input');
        input.type='number';input.step='0.01';input.min='0.01';input.required=true;
        input.className=className;input.value=String(value);input.addEventListener('input',recompute);
        td.append(input);tr.append(td);
      }
      editTable.append(tr);
    }
    recompute();
    unsavedEdits=false;
    $('discEditFeedback').textContent='Save only quantities supported by a genuine supplier-issued correction. Partial deliveries with verified rejected goods can be matched against accepted quantities. Invoice stays ON HOLD until resolution.';
  }
  $('discOpenEdit').addEventListener('click',async()=>{
    if(editorBusy||!state?.open_hold)return;
    editorBusy=true;$('discOpenEdit').disabled=true;
    try {
      const d=await invoiceGet();drawEditor(d);
      $('discResolveForm').hidden=true;$('discEditForm').hidden=false;
    } catch(e){$('discResolveFeedback').textContent=e.message||'Unable to load editor.';}
    finally{editorBusy=false;$('discOpenEdit').disabled=false;}
  });
  $('discBackToResolve').addEventListener('click',showResolve);
  $('discEditForm').addEventListener('input',e=>{
    if(e.target.matches('input:not([readonly])'))unsavedEdits=true;
  });
  $('discUseComputed').addEventListener('click',()=>{$('discEditTotal').value=recompute();unsavedEdits=true;});
  async function refreshEditor() {const d=await invoiceGet();drawEditor(d);}
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
        : 'Still a mismatch. Verify that the corrected invoice bills only quantities accepted in the Inventory GR, with original PO unit prices. Rejected goods must be recorded in the verified GR before resolving.';
    }catch(e){$('discEditFeedback').textContent=e.message||'Recheck failed.';}
    finally{editorBusy=false;$('discEditSave').disabled=false;$('discEditVerify').disabled=false;}
  });
  $('discForm').addEventListener('submit',async e=>{
    e.preventDefault();if(loading||!state?.can_flag)return;
    const reasons=[...dialog.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value);
    if(!reasons.length){$('discFeedback').textContent='Please select at least one issue.';return;}
    loading=true;applyButton();$('discSubmit').disabled=true;$('discFeedback').textContent='';
    try{
      const result=await request('POST',{action:'flag',invoice_number:number,reasons,notes:$('discNotes').value.trim(),gmail_reference:$('discGmail').value.trim()});
      $('discFeedback').textContent=result.message;dialog.close();location.reload();
    }catch(err){$('discFeedback').textContent=err.message||'Unable to flag discrepancy.';}
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
