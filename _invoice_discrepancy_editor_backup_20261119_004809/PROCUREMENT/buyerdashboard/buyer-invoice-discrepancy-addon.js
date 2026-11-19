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
      <p>Only after corrected goods and supplier invoice fully match the approved PO. Reverification is required after resolution.</p>
      <label for="discResolution">Resolution note</label>
      <textarea id="discResolution" minlength="10" maxlength="1000" rows="4" placeholder="Explain the replacement delivery and corrected supplier billing." required></textarea>
      <p class="disc-feedback" id="discResolveFeedback" role="alert"></p>
      <div class="disc-actions"><button type="button" class="disc-cancel">Cancel</button><button type="submit" id="discResolve">Verify and Resolve Hold</button></div>
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
  resolveBtn.addEventListener('click',()=>{
    if(!state?.open_hold)return;
    $('discForm').hidden=true;$('discResolveForm').hidden=false;
    $('discResolveFeedback').textContent='';dialog.showModal();
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
