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
      <header class="disc-head"><div><small>Footwear Procurement</small><h2 id="discTitle">Report Inventory Discrepancy</h2><p id="discInvoiceName"></p></div><button type="button" class="disc-close" aria-label="Close">×</button></header>
      <p class="disc-description">Choose the issue and copy the received / accepted / rejected figures from the Inventory email. Flagging places the invoice ON HOLD. This does not change Inventory stock or send to Finance.</p>
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
      <h2>Inventory report</h2>
      <p id="discResolveIntro">Review the linked Inventory Goods Receipt and matching Gmail notification. The invoice remains ON HOLD until you verify a genuine corrected supplier invoice.</p>
      <label for="discResolution">Resolution note</label>
      <textarea id="discResolution" minlength="10" maxlength="1000" rows="4" placeholder="Explain the replacement delivery and corrected supplier billing." required></textarea>
      <p class="disc-feedback" id="discResolveFeedback" role="alert"></p>
      <div class="disc-actions"><button type="button" id="discOpenEdit">Next: Review Corrected Invoice</button><button type="button" class="disc-cancel">Cancel</button><button type="submit" id="discResolve">Verify and Resolve Hold</button></div>
    </form>
    <form id="discEditForm" hidden>
      <h2>Corrected supplier invoice</h2>
      <p class="disc-description">The system prepares the accepted quantity, PO price and pre-VAT amount. Compare them with the actual corrected document from the approved PO supplier. The calculated draft is NOT a supplier-issued invoice.</p>
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
      <div class="disc-actions"><button type="button" id="discBackToResolve">Back to Discrepancy</button><button type="submit" id="discEditSave">Save Corrected Invoice</button><button type="button" id="discEditVerify">Recheck Gmail/PO/Invoice Match</button><button type="button" id="discGoToVerify" disabled>Next: Resolve Hold</button></div>
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
  // v12 single-page layout: reuse original forms/actions and audited APIs.
  // No Finance/PO/Inventory writes are introduced by this UI change.
  const singleHeader = document.createElement('header');
  singleHeader.id = 'discSingleHeader';
  singleHeader.hidden = true;
  singleHeader.innerHTML = '<div><small>Invoice discrepancy review</small><h2>Review &amp; resolve</h2><p>Inventory evidence, corrected supplier invoice, and resolution on one page.</p></div><button type="button" id="discSingleClose" aria-label="Close dialog">&times;</button>';
  dialog.prepend(singleHeader);
  singleHeader.querySelector('#discSingleClose').addEventListener('click', () => dialog.close());
  const finalPanel = document.createElement('section');
  finalPanel.id = 'discSingleFinal';
  finalPanel.className = 'disc-single-section';
  finalPanel.hidden = true;
  const finalHeading = document.createElement('h2');
  finalHeading.textContent = 'Resolve discrepancy';
  const finalHelp = document.createElement('p');
  finalHelp.className = 'disc-single-hint';
  finalHelp.textContent = 'The invoice remains ON HOLD until a genuine corrected document is reviewed and server-side matching passes.';
  finalPanel.append(finalHeading, finalHelp);
  for (const id of ['discResolution', 'discResolve', 'discResolveFeedback']) {
    const el = dialog.querySelector('#' + id);
    if (id === 'discResolution' || id === 'discResolve') el.setAttribute('form', 'discResolveForm');
  }
  const resolution = dialog.querySelector('#discResolution');
  const resolutionLabel = dialog.querySelector('label[for="discResolution"]');
  finalPanel.append(resolutionLabel, resolution);
  const finalAction = document.createElement('div');
  finalAction.className = 'disc-single-final-actions';
  const resolveSubmit = dialog.querySelector('#discResolve');
  resolveSubmit.textContent = 'Resolve Hold';
  resolveSubmit.disabled = true;
  finalAction.append(resolveSubmit);
  finalPanel.append(finalAction, dialog.querySelector('#discResolveFeedback'));
  dialog.querySelector('#discEditForm').insertAdjacentElement('afterend', finalPanel);
  // Collect optional data in expandable details; only corrected reference and the
  // explicit document-review checkbox remain prominent.
  const editorFields = dialog.querySelector('#discEditForm .disc-edit-fields');
  const referenceLabel = dialog.querySelector('#discEditRef').closest('label');
  referenceLabel.classList.add('disc-single-ref');
  const advanced = document.createElement('details');
  advanced.id = 'discSingleAdvanced';
  advanced.innerHTML = '<summary>More invoice details (dates, totals &amp; item prices)</summary>';
  const advancedBody = document.createElement('div');
  advancedBody.className = 'disc-single-advanced-body';
  for (const node of [...editorFields.children]) if (node !== referenceLabel) advancedBody.append(node);
  editorFields.insertAdjacentElement('afterend', referenceLabel);
  advanced.append(advancedBody);
  const editorTableWrap = dialog.querySelector('#discEditForm .disc-edit-table-wrap');
  const editTotal = dialog.querySelector('#discEditForm .disc-edit-total');
  advancedBody.append(editorTableWrap, editTotal);
  referenceLabel.insertAdjacentElement('afterend', advanced);
  const amount = document.createElement('div');
  amount.id = 'discSingleAmount';
  amount.className = 'disc-single-amount';
  amount.textContent = 'Corrected amount loads from the saved Inventory report.';
  advanced.insertAdjacentElement('beforebegin', amount);
  const inspectInfo = document.createElement('p');
  inspectInfo.className = 'disc-single-hint';
  inspectInfo.textContent = 'Enter the reference from the genuine corrected supplier document. Do not confirm if the document is missing or its supplier differs from the approved PO.';
  referenceLabel.insertAdjacentElement('afterend', inspectInfo);
  const qtyBox = document.createElement('div');
  qtyBox.id = 'discSingleQty';
  qtyBox.className = 'disc-single-qty';
  qtyBox.setAttribute('role', 'status');
  const mailPanelForSummary = dialog.querySelector('#discMailPanel');
  const mailDetails = document.createElement('details');
  mailDetails.id = 'discSingleMailDetails';
  mailDetails.innerHTML = '<summary>Review report details and individual quantities</summary>';
  const mailDetailsBody = document.createElement('div');
  mailDetailsBody.className = 'disc-single-advanced-body';
  mailDetails.append(mailDetailsBody);
  const mailFields = mailPanelForSummary.querySelector('.disc-edit-fields');
  const mailTable = mailPanelForSummary.querySelector('.disc-edit-table-wrap');
  // Do not move .disc-edit-fields until v9/v10 DOMContentLoaded callbacks have
  // inserted their panels; those addons expect the fields to be direct children.
  setTimeout(() => { mailDetailsBody.append(mailFields, mailTable); }, 0);

  // v10 inserts its GR block on DOMContentLoaded later; the summary is inserted
  // ahead of the fields regardless of its load order.
  mailPanelForSummary.insertBefore(qtyBox, mailPanelForSummary.querySelector('#discAutoBillPreview'));
  mailPanelForSummary.insertBefore(mailDetails, mailPanelForSummary.querySelector('#discAutoBillPreview'));
  const mailTableBody = dialog.querySelector('#discMailRows');
  const fmtNum = n => Number.isFinite(n) ? n.toLocaleString('en-PH', {maximumFractionDigits:2}) : '—';
  function updateSimpleSummary() {
    const rows = [...mailTableBody.querySelectorAll('tr')];
    qtyBox.replaceChildren();
    if (!rows.length) {qtyBox.textContent = 'Loading linked Inventory quantities...';return;}
    for (const tr of rows) {
      const cells = tr.querySelectorAll('td');
      const title = cells[0]?.textContent.trim() || 'Item';
      const delivered = Number(tr.querySelector('.disc-mail-delivered')?.value);
      const accepted = Number(tr.querySelector('.disc-mail-accepted')?.value);
      const rejected = Number(tr.querySelector('.disc-mail-rejected')?.value);
      const valid = [delivered, accepted, rejected].every(Number.isFinite) && delivered > 0 && accepted >= 0 && rejected >= 0 && Math.abs(delivered - accepted - rejected) < .001;
      const row = document.createElement('div');
      row.className = 'disc-single-qty-row';
      const name = document.createElement('strong');
      name.textContent = title;
      row.append(name);
      for (const [label,value] of [['Delivered',delivered],['Accepted',accepted],['Rejected',rejected]]) {
        const stat = document.createElement('span');
        stat.className = 'disc-single-stat';
        const l = document.createElement('small');l.textContent=label;
        const v = document.createElement('b');v.textContent=valid?fmtNum(value):'—';
        stat.append(l,v);row.append(stat);
      }
      qtyBox.append(row);
    }
  }
  mailTableBody.addEventListener('input', updateSimpleSummary);
  new MutationObserver(updateSimpleSummary).observe(mailTableBody, {childList:true});
  const priceInput = dialog.querySelector('#discEditTotal');
  function updateSimpleAmount() {
    const n = Number(priceInput.value);
    amount.textContent = 'Corrected draft (pre-VAT): ' + (n > 0 && Number.isFinite(n) ? '₱'+n.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2}) : 'Not available');
  }
  priceInput.addEventListener('input', updateSimpleAmount);
  const onePage = () => {
    dialog.querySelector('#discForm').hidden = true;
    dialog.querySelector('#discResolveForm').hidden = true;
    dialog.querySelector('#discEditForm').hidden = false;
    finalPanel.hidden = true;
    singleHeader.hidden = false;
    resolveSubmit.disabled = true;
    updateSimpleSummary();
    updateSimpleAmount();
  };
  // v22: Never display an empty verification editor while a verified Inventory GR
  // is missing. This reads ONLY the Buyer-facing, server-authenticated GR API.
  const grGate = document.createElement('section');
  grGate.id = 'discVerifiedGrGateV22';
  grGate.hidden = true;
  grGate.setAttribute('role', 'status');
  grGate.innerHTML = '<h3 id="discGrGateTitle">Checking Goods Receipt...</h3><p id="discGrGateText"></p><div class="disc-gr-gate-actions"><button type="button" id="discGrGateRetry">Check again</button><button type="button" id="discGrGateClose">Close</button></div>';
  dialog.querySelector('#discEditForm').insertAdjacentElement('beforebegin',grGate);
  const grGateTitle = grGate.querySelector('#discGrGateTitle');
  const grGateText = grGate.querySelector('#discGrGateText');
  const grRetry = grGate.querySelector('#discGrGateRetry');
  grGate.querySelector('#discGrGateClose').addEventListener('click',()=>dialog.close());
  grRetry.addEventListener('click',()=>{if(!grRetry.disabled)void showResolve();});
  function showGrGate(title, message, checking=false) {
    grGate.hidden=false;
    dialog.querySelector('#discEditForm').hidden=true;
    grGateTitle.textContent=title;
    grGateText.textContent=message;
    grRetry.disabled=checking;
  }
  const grSummary = document.createElement('div');
  grSummary.className='disc-gr-summary-v22';
  grSummary.id='discGrSummaryV22';
  grSummary.hidden=true;
  dialog.querySelector('#discEditForm').querySelector('.disc-edit-fields').insertAdjacentElement('beforebegin',grSummary);
  function showGrSummary(gr) {
    grSummary.replaceChildren();
    const title=document.createElement('strong');
    title.textContent='Verified Inventory receipt · '+gr.po.po_number;
    grSummary.append(title);
    const ids=(gr.receipts||[]).map(x=>String(x.goods_receipt_number||'').trim()).filter(Boolean);
    const ref=document.createElement('p');
    ref.textContent='GR reference: '+(ids.join(' · ')||'Verified Inventory receipt');
    grSummary.append(ref);
    for(const it of gr.items||[]) {
      const p=document.createElement('p');
      p.textContent=String(it.item_name||'Item')+' · Accepted '+Number(it.real_accepted)+' '+String(it.unit||'')+
        ' · Rejected '+Number(it.real_rejected)+' '+String(it.unit||'');
      grSummary.append(p);
    }
    grSummary.hidden=false;
  }
  async function verifiedReceiptPreflight() {
    const po=String(document.getElementById('poReference')?.textContent||'').trim();
    if (!/^PO-[A-Za-z0-9-]{1,26}$/.test(po)) throw new Error('The linked Purchase Order is not loaded. Reload this Invoice page.');
    const url='../database/get-buyer-real-goods-receipts.php?po_number='+encodeURIComponent(po);
    const r=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data.success!==true)throw new Error(data.message||'Could not check the Inventory receipt. Please reload or check the Procurement session.');
    if(!data.po||String(data.po.po_number)!==po)throw new Error('The Inventory receipt does not match this Purchase Order.');
    const receipts=Array.isArray(data.receipts)?data.receipts:[];
    const items=Array.isArray(data.items)?data.items:[];
    if(!receipts.length)throw new Error('Waiting for Inventory to confirm a verified Goods Receipt for '+po+'. The Gmail notification is only supporting evidence and cannot verify quantities. Ask Inventory to finalize the Delivery Receipt, then use Check again.');
    const status=String(data.po.po_status||'').toLowerCase();
    if(!['received','partial'].includes(status))throw new Error('A Goods Receipt exists but the PO status has not synced to Received or Partially Received. Reconcile Inventory receiving before verifying.');
    if(!items.length)throw new Error('No verified receipt item lines were returned for '+po+'. Invoice verification is blocked.');
    if(items.some(it=>!Number.isFinite(Number(it.real_accepted))||Number(it.real_accepted)<=0))throw new Error('Inventory accepted zero quantity for at least one item. There is no positive accepted-only quantity for that line to bill. Do not verify this invoice; review the rejection/receipt first.');
    if(items.some(it=>!it.matches_real_receipts))throw new Error('Inventory accepted quantities do not match Procurement received quantities. Reconcile the verified GR before verification.');
    return data;
  }

  const flagPage = () => {singleHeader.hidden=true;finalPanel.hidden=true;dialog.querySelector('#discEditForm').hidden=true;};

  $('discInvoiceName').textContent=number;
  dialog.querySelectorAll('.disc-close, .disc-cancel').forEach(el=>el.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click', e=>{if(e.target===dialog)dialog.close();});

  let state = null;
  let loading = false;
  function updateNotice(text) {notice.textContent=text;notice.hidden=!text;}
  // v13: Once a hold is resolved, do not offer to flag the same discrepancy again.
  // The server intentionally sets pending_match, requiring one more genuine
  // supplier-document/PO/GR verification before Finance is permitted.
  function isFinalReview(){
    return state?.latest?.status === 'resolved'
      && ['pending_match','discrepancy'].includes(String(state?.invoice_status||'').toLowerCase())
      && !state?.finance_status;
  }
  // A new accepted-quantity invoice with no discrepancy case should receive
  // the same single-page check, WITHOUT creating a fake hold for rejected GR items.
  function isDirectReview(){
    return !state?.open_hold && !state?.finance_status && !state?.latest
      && state?.can_flag===true
      && ['pending_match','discrepancy'].includes(String(state?.invoice_status||'').toLowerCase());
  }
  function canEditDocument(){
    return !state?.finance_status && (state?.open_hold === true || isFinalReview() || isDirectReview());
  }
  function applyButton(){
    if (state?.latest?.status === 'resolved') {
      const pending=isFinalReview();
      button.disabled=!pending || loading;
      button.textContent=pending?'Review & Verify Invoice':'Verification Completed';
      button.title=pending?'Final supplier-document and 3-Way Match verification before Finance.'
        :'This discrepancy was resolved. No new hold is needed for this case.';
      return;
    }
    const canFlag=state?.can_flag===true&&!loading;
    if(!state?.open_hold && String(state?.invoice_status||'').toLowerCase()==='ready_to_post') {
      button.textContent='Verification Completed';
      button.disabled=true;
      button.title='Server-side checks passed. Finance queue is a separate action.';
      return;
    }
    button.disabled=!canFlag;
    if(canFlag && isDirectReview()) button.textContent='Review & Verify Invoice';
    button.title=state?.open_hold?'Invoice ON HOLD. Review the saved discrepancy.'
      :state?.finance_status?'Invoice already in Finance handoff.'
      :canFlag?'Review actual supplier invoice against verified GR and PO; reject any real mismatch.'
      :'Invoice cannot be verified until a genuine unposted invoice is recorded.';
  }
  // The base invoice module may disable this shared button after its own async refresh.
  // Restore the action warranted by the authenticated discrepancy state, including
  // a resolved hold that is awaiting FINAL REVIEW. Do not alter backend eligibility.
  new MutationObserver(() => {
    if (!state || loading) return;
    const shouldDisable = state.latest?.status === 'resolved'
      ? !isFinalReview()
      : (String(state.invoice_status||'').toLowerCase()==='ready_to_post' && !state.open_hold)
        || state.can_flag !== true;
    if (button.disabled !== shouldDisable) applyButton();
  }).observe(button,{attributes:true,attributeFilter:['disabled']});
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
  async function reload(){
    state=await request('GET');applyButton();applyHold();
    resolveBtn.hidden=!state.open_hold;
    if (!state.open_hold) {
      if (isFinalReview()) updateNotice('Discrepancy resolved. Final invoice verification is pending. Check the corrected supplier document, then click Verify Corrected Invoice. Do not send to Finance until verified.');
      else if (state.latest?.status==='resolved' && String(state.invoice_status).toLowerCase()==='ready_to_post') updateNotice('Discrepancy resolved and invoice 3-Way Match verified. Use Post to Accounting only if the Finance handoff control is enabled.');
      else updateNotice('');
    }
  }
  const resolveBtn=document.createElement('button');
  resolveBtn.type='button';resolveBtn.hidden=true;resolveBtn.className='disc-resolve-trigger';
  resolveBtn.textContent='Review / Resolve Discrepancy';
  notice.insertAdjacentElement('afterend',resolveBtn);
  button.addEventListener('click',async()=>{
    if((isFinalReview() || isDirectReview()) && !loading){await showResolve();return;}
    if(!state?.can_flag||loading || state?.latest?.status==='resolved')return;
    flagPage();$('discForm').hidden=false;$('discResolveForm').hidden=true;$('discEditForm').hidden=true;
    $('discFeedback').textContent='';fillEvidence(state.receipt_items||[]);
    placeMailPanel('flag');dialog.showModal();
    try{await loadReportScreen('flag');}
    catch(err){$('discFeedback').textContent='Could not load Gmail report fields: '+(err.message||'error');}
  });
  async function showResolve() {
    const direct=isDirectReview();
    const finalOnly=isFinalReview() || direct;
    verifiedPass=false;
    grSummary.hidden=true;
    grGate.hidden=true;
    if(!direct)placeMailPanel('resolve');
    onePage();
    if(direct)mailPanel.hidden=true;
    dialog.classList.toggle('disc-final-verify-v13',finalOnly);
    finalPanel.hidden=finalOnly;
    $('discResolution').required=!finalOnly;
    $('discEditSave').textContent='Save & Verify Invoice';
    $('discResolveForm').querySelector('h2').textContent=finalOnly?'Inventory report — saved evidence':'Inventory report';
    $('discEditForm').querySelector('h2').textContent=finalOnly?'Final invoice verification':'Corrected supplier invoice';
    singleHeader.querySelector('h2').textContent='Review & Verify Invoice';
    singleHeader.querySelector('p').textContent=finalOnly
      ?'Confirm the genuine supplier document only after Inventory has a verified Goods Receipt. Accepted items only.'
      :'Check verified Inventory evidence and the corrected supplier document. Resolve a genuine hold only if server checks pass.';
    $('discResolveFeedback').textContent='';
    $('discEditFeedback').textContent='';
    if(!dialog.open)dialog.showModal();

    // Only the direct/final verification path gets the verified-GR gate.
    // Existing ON HOLD / discrepancy flows keep their separate audited checks.
    let verifiedGr=null;
    if(finalOnly){
      showGrGate('Checking verified Inventory receipt...', 'Checking the verified receipt for this Purchase Order.',true);
      try {
        verifiedGr=await verifiedReceiptPreflight();
      } catch(err){
        showGrGate('Waiting for Inventory Goods Receipt', err.message||'The Goods Receipt is not ready.');
        return;
      }
    }
    try {
      if(!direct) await loadReportScreen('resolve');
      if (finalOnly && !direct) {
        mailSaveBtn.hidden=true;
        mailPanel.querySelectorAll('input,textarea').forEach(el=>el.disabled=true);
      }
    } catch(err) { $('discMailFeedback').textContent='Unable to load Inventory report: '+(err.message||'error'); }
    try {
      const d=await invoiceGet();
      if(!d.invoice||!Array.isArray(d.po_items)||!d.po_items.length)throw new Error('The saved supplier invoice or its PO items are missing. Check the invoice record before verifying.');
      const email=direct?{report:null}:await emailGet();
      drawEditor(d,email);
      updateSimpleAmount();
      if(finalOnly) {
        showGrSummary(verifiedGr);
        // Advanced fields are already prefilled from the genuine saved invoice.
        // Never hide missing required data; show those fields for correction.
        const required=['discEditDate','discEditDue','discEditTotal'];
        const missing=required.filter(id=>!$(id).value || (id==='discEditTotal' && Number($(id).value)<=0));
        advanced.hidden=missing.length===0;
        advanced.open=missing.length>0;
        $('discEditForm').querySelector('.disc-description').textContent='The verified GR quantities, PO prices, and saved dates are already loaded. Enter the real supplier document reference, confirm you reviewed it, then save and verify.';
        $('discEditFeedback').textContent=d.invoice.legacy_invoice===true
          ? 'Existing '+d.invoice.invoice_number+' will be updated IN PLACE (no duplicate). Enter the actual supplier-issued reference, compare the amounts with that document, and confirm only if you personally reviewed it.'
          : (missing.length
            ? 'Some saved invoice details are missing. Complete the visible details from the genuine supplier document before verifying.'
            : 'Review the genuine supplier invoice against the verified receipt above. Do not tick the checkbox unless you actually checked the document.');
      } else {
        advanced.hidden=false;
        $('discEditFeedback').textContent='Check the supplier-issued invoice number and the genuine supplier document. Final numerical matching uses the original verified Goods Receipt.';
      }
      grGate.hidden=true;
      $('discEditForm').hidden=false;
    } catch(err) {
      $('discEditSave').disabled=true;
      showGrGate('Invoice verification unavailable',err.message||'Unable to load the saved supplier invoice.');
    }
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
  // v7 guided navigation. Keep the server's existing finance/hold restrictions.
  let verifiedPass=false;
  let wizardStep=1;
  const wizardProgress=document.createElement('nav');
  wizardProgress.id='discWizardProgress';
  wizardProgress.setAttribute('aria-label','Discrepancy resolution steps');
  wizardProgress.innerHTML='<span data-wstep="1">1. Inventory Report</span><span data-wstep="2">2. Corrected Invoice</span><span data-wstep="3">3. Resolve Hold</span>';
  $('discResolveForm').prepend(wizardProgress);
  function setWizardStep(step){
    // Retained for v7 email-save calls; the v12 page never hides its sections.
    wizardStep=step;
    $('discResolve').disabled=!verifiedPass;
  }
  $('discGoToVerify').addEventListener('click',()=>{
    if(!verifiedPass || unsavedEdits){
      $('discEditFeedback').textContent='Save and recheck the corrected supplier invoice before continuing.';
      return;
    }
    $('discEditForm').hidden=true;
    $('discResolveForm').hidden=false;
    $('discResolveForm').prepend(wizardProgress);
    placeMailPanel('resolve');
    setWizardStep(3);
    $('discResolveFeedback').textContent='You can resolve this hold only if the server-side match and document checks still pass.';
  });
  function toggleEmailInFlag(){
    const reasons=[...$('discForm').querySelectorAll('.disc-columns fieldset input[type="checkbox"]:checked')].map(el=>el.value);
    const needed=reasons.includes('quantity_mismatch')||reasons.includes('damaged_goods');
    mailPanel.hidden=!needed;
    mailPanel.querySelectorAll('input,textarea,button').forEach(el=>el.disabled=!needed);
  }
  $('discForm').querySelectorAll('.disc-columns fieldset input[type="checkbox"]').forEach(el=>el.addEventListener('change',toggleEmailInFlag));
  function placeMailPanel(which) {
    const form=$(which === 'flag' ? 'discForm' : 'discResolveForm');
    form.insertBefore(mailPanel, which === 'flag' ? $('discFeedback') : form.querySelector('.disc-actions'));
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
    if(!canEditDocument())throw new Error('Only an unqueued genuine invoice pending verification or an eligible held invoice may be reviewed.');
    const po=String(document.getElementById('poReference')?.textContent||'').trim();
    if(!/^PO-[A-Za-z0-9-]{1,26}$/.test(po))throw new Error('Valid PO reference is missing.');
    const r=await fetch(invoiceEndpoint+'?po_number='+encodeURIComponent(po)+'&invoice_mode=genuine',{
      credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok||!d.success)throw new Error(d.message||'Cannot load invoice for editing.');
    // A verified GR can precede buyer_invoice_source_local on older imported invoices.
    // The PHP lookup explicitly marks a single eligible legacy invoice and will
    // UPDATE that same invoice ID only after a real supplier document is reviewed.
    if(!d.invoice || d.invoice.invoice_number!==number ||
       (d.invoice.source_kind!=='supplier_document' && d.invoice.legacy_invoice!==true))
      throw new Error('This invoice has no editable genuine supplier-document record. Check its source and status in Record Invoice; no duplicate should be created.');
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
    $('discEditSave').disabled=false;
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
        ['disc-qty',old?.qty_billed??gr?.real_gr_accepted??''],['disc-price',old?.unit_price??line.unit_price]]) {
        const td=document.createElement('td'),input=document.createElement('input');
        input.type='number';input.step='0.01';input.min=className==='disc-mail-rejected'?'0':'0.01';input.required=true;
        input.className=className;input.value=String(value);input.readOnly=true;input.title='Automatically calculated from Inventory Gmail accepted quantity and approved PO price';input.addEventListener('input',recompute);
        td.append(input);tr.append(td);
      }
      editTable.append(tr);
    }
    recompute();
    updateSimpleAmount();
    unsavedEdits=false;
    $('discEditFeedback').textContent='Billed quantities and prices are loaded from the saved invoice and authenticated Inventory GR. Review the genuine supplier document; Finance stays blocked until the server verifies the match.';
  }
  $('discOpenEdit').addEventListener('click',async()=>{
    if(editorBusy||!state?.open_hold)return;
    if(!emailData?.report){$('discResolveFeedback').textContent='Save the Inventory Gmail report in Step 1 first.';return;}
    editorBusy=true;$('discOpenEdit').disabled=true;
    try {
      const d=await invoiceGet();const email=await emailGet();drawEditor(d,email);
      $('discResolveForm').hidden=true;$('discEditForm').hidden=false;
      setWizardStep(2);
      $('discEditForm').prepend(wizardProgress);
    } catch(e){$('discResolveFeedback').textContent=e.message||'Unable to load editor.';}
    finally{editorBusy=false;$('discOpenEdit').disabled=false;}
  });
  $('discBackToResolve').addEventListener('click',showResolve);
  $('discEditForm').addEventListener('input',e=>{
    if(e.target.matches('input:not([readonly])')){unsavedEdits=true;verifiedPass=false;$('discGoToVerify').disabled=true;$('discResolve').disabled=true;}
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
      verifiedPass=false;
      $('discResolve').disabled=true;
      setWizardStep(1);
      showAutoBillPreview();
      $('discMailFeedback').textContent=(result.message||'Gmail report saved.')+' Revision '+result.revision+'. New pre-VAT invoice draft: ₱'+result.invoice_amount_pre_vat+'. The original Gmail, PO and GR were not modified.';
    }catch(err){$('discMailFeedback').textContent=err.message||'Could not save Inventory Gmail report.';}
    finally{mailBusy=false;mailSaveBtn.disabled=false;}
  });
  $('discEditForm').addEventListener('submit',async e=>{
    e.preventDefault();if(editorBusy||!canEditDocument())return;
    if(!$('discEditChecked').checked){$('discEditFeedback').textContent='Review and confirm the genuine corrected supplier document first. If there is no document, Finance must stay blocked.';return;}
    editorBusy=true;$('discEditSave').disabled=true;$('discEditVerify').disabled=true;
    $('discEditFeedback').textContent='Saving updated invoice...';
    try {
      const items=[...editTable.querySelectorAll('tr')].map(tr=>({
        po_item_id:Number(tr.dataset.poItemId),
        qty_billed:tr.querySelector('.disc-qty').value,
        unit_price:tr.querySelector('.disc-price').value
      }));
      verifiedPass=false;
      $('discGoToVerify').disabled=true;
      const result=await invoicePost({action:'save',source_kind:'supplier_document',
        supplier_invoice_reference:$('discEditRef').value.trim(),source_notes:$('discEditNotes').value.trim(),
        document_checked:true,invoice_date:$('discEditDate').value,due_date:$('discEditDue').value,
        total_amount:$('discEditTotal').value,items});
      await refreshEditor();
      // This checkbox was explicitly checked by the Buyer for this save.
      $('discEditChecked').checked=true;
      updateSimpleAmount();
      const checked=await invoicePost({action:'verify'});
      const ok=checked.data_matched===true && checked.supplier_document_verified===true;
      const verifiedReady=ok && checked.status==='ready_to_post';
      verifiedPass=ok;
      $('discResolve').disabled=!ok;
      $('discGoToVerify').disabled=!ok;
      if ((isFinalReview() || isDirectReview()) && verifiedReady) {
        $('discEditFeedback').textContent='3-Way Match passed. Invoice is ready for Finance review (subject to queue controls).';
        dialog.close();location.reload();return;
      }
      // Combine the old Resolve + Final Verify clicks into this ONE explicit
      // Buyer action, AFTER genuine document review and server match succeed.
      if (ok && state?.open_hold) {
        const po=String($('discEditPo').value||'');
        const note=$('discResolution').value.trim() ||
          'Reviewed verified Inventory GR and corrected supplier invoice for '+po+'. Accepted-only quantities, approved supplier/price and invoice amount passed the 3-Way Match.';
        const resolved=await request('POST',{action:'resolve',invoice_number:number,resolution_note:note});
        const final=await invoicePost({action:'verify'});
        if (final.status==='ready_to_post' && final.data_matched===true && final.supplier_document_verified===true) {
          $('discEditFeedback').textContent='Discrepancy resolved and final server verification passed. Ready for Finance review.';
          dialog.close();location.reload();return;
        }
        $('discEditFeedback').textContent='The hold was resolved, but final verification is still pending: '+
          (final.message||resolved.message||'Review the 3-Way Match results. Finance remains blocked.');
        await reload();return;
      }
      if (ok && !$('discResolution').value.trim()) {
        const po=String($('discEditPo').value||'');
        $('discResolution').value='Reviewed linked Inventory receiving evidence and the corrected supplier invoice for '+po+'. The corrected billed quantities and approved PO prices passed the server-side 3-way match.';
      }
      $('discEditFeedback').textContent=ok
        ? 'Corrected invoice saved and 3-Way Match passed. ON HOLD remains until you click Resolve Hold below.'
        : 'Saved but final verification is not yet ready. Review the real corrected supplier document, PO supplier, quantities, and any failed 3-Way Match checks. Finance remains blocked.';
    }catch(e){$('discResolve').disabled=true;$('discEditFeedback').textContent=(e.message||'Could not save or verify corrected invoice.')+(state?.open_hold?' The invoice remains ON HOLD.':' Final verification did not complete. Finance remains blocked.');}
    finally{editorBusy=false;$('discEditSave').disabled=false;$('discEditVerify').disabled=false;}
  });
  $('discEditVerify').addEventListener('click',async()=>{
    if(editorBusy||!state?.open_hold)return;
    if(unsavedEdits){$('discEditFeedback').textContent='Save your invoice changes first, then recheck the stored 3-Way Match.';return;}
    editorBusy=true;$('discEditSave').disabled=true;$('discEditVerify').disabled=true;
    try {
      const result=await invoicePost({action:'verify'});
      const ok=result.data_matched===true && result.supplier_document_verified===true;
      verifiedPass=ok;
      $('discGoToVerify').disabled=!ok;
      $('discEditFeedback').textContent=ok
        ? 'Numerical match passed. Still ON HOLD: return to the discrepancy form to resolve; then verify once more before queuing to Finance.'
        : 'Still a mismatch. Verify the Buyer-entered Inventory email quantities (accepted + rejected = delivered), corrected billed quantities, PO unit prices, and totals. This email is not an authenticated Inventory GR.';
    }catch(e){$('discEditFeedback').textContent=e.message||'Recheck failed.';}
    finally{editorBusy=false;$('discEditSave').disabled=false;$('discEditVerify').disabled=false;}
  });
  $('discForm').addEventListener('submit',async e=>{
    e.preventDefault();if(loading||!state?.can_flag||state?.latest?.status==='resolved')return;
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
  $('discEditSave').textContent='Save & Verify Invoice';
  for(const id of ['discEditVerify','discGoToVerify','discBackToResolve','discOpenEdit']) {
    const el=$(id);if(el){el.hidden=true;el.style.display='none';}
  }
  finalPanel.hidden=true;
  $('discMailPanel').querySelector('legend').textContent='Inventory report & Gmail reference';
  $('discSaveEmail').textContent='Update Inventory Report (only if needed)';
  $('discEditForm').querySelector('h2').textContent='Corrected supplier invoice';
  $('discEditForm').querySelector('.disc-description').textContent='The accepted quantity and PO price are already loaded. Check the actual corrected document from the approved supplier, enter its reference, and save to run the server-side verification.';
  $('discEditTotal').readOnly=true;
  $('discResolveForm').addEventListener('submit',async e=>{
    e.preventDefault();if(loading||!state?.open_hold)return;
    if(!verifiedPass){$('discResolveFeedback').textContent='Save and verify the genuine corrected supplier invoice first.';return;}
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
