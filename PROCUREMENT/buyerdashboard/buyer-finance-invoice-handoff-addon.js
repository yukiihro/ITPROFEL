/* Procurement Finance invoice queue UI. UNIPROCUR_INTERNAL_FINANCE_REVIEW_V1.
 * Internal reference may queue for Finance review only. Finance ledger posting NOT performed here.
 * All eligibility rules are also enforced in PHP on every POST.
 */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') return;
  const invoiceNumber = params.get('invoice_number') || '';
  const button = document.getElementById('postButton');
  if (!button || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(invoiceNumber)) return;
  const endpoint = '../database/buyer-finance-invoice-handoff.php';
  const note = document.createElement('p');
  note.className = 'buyer-finance-handoff-message';
  note.setAttribute('role', 'status');
  note.setAttribute('aria-live', 'polite');
  note.hidden = true;
  const summary = document.querySelector('.summary');
  (summary || button.parentNode).insertAdjacentElement('afterend', note);
  const originalIcon = button.querySelector('span[aria-hidden]')?.cloneNode(true) || null;
  const setButtonLabel = label => {
    if (originalIcon) button.replaceChildren(originalIcon.cloneNode(true), document.createTextNode(' '+label));
    else button.textContent=label;
  };
  let eligible = false;
  let isInternal = false;
  let csrf = '';
  let busy = false;
  let savedState = '';

  function show(message, kind='info') {
    note.hidden = !message;
    note.textContent = message || '';
    note.dataset.kind = kind;
  }
  function renderButton() {
    if (busy) { button.disabled = true;setButtonLabel('Queuing…');return; }
    if (savedState) {
      button.disabled = true;
      setButtonLabel(savedState === 'posted' ? 'Posted by Finance ✓'
        : savedState === 'received' ? 'Received by Finance ✓'
        : savedState === 'pending' ? (isInternal ? 'Internal Review Queued' : 'Queued for Finance') : 'Finance Rejected');
      return;
    }
    button.disabled = !eligible;
    setButtonLabel(eligible ? (isInternal ? 'Queue for Finance Review' : 'Queue for Finance') : (isInternal ? 'Internal Review Unavailable' : 'Post to Accounting'));
    button.title = eligible
      ? 'Send to local Procurement queue; the Finance team must retrieve and independently review it.'
      : 'A verified internal invoice can be queued for review only; actual Finance posting requires genuine supplier documents.';
  }
  async function reload() {
    const response = await fetch(endpoint+'?invoice_number='+encodeURIComponent(invoiceNumber), {
      credentials:'same-origin', cache:'no-store', headers:{Accept:'application/json'}
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
    csrf = result.csrf_token || '';
    isInternal = result.is_demo === true;
    savedState = result.handoff?.handoff_status || '';
    eligible = result.eligible_for_queue === true && !savedState;
    if (savedState) show(result.reason || 'Saved Finance handoff found.', savedState==='rejected' ? 'warning' : 'info');
    else if (result.is_demo && eligible) show('Internal reference: Finance REVIEW ONLY. A genuine supplier invoice is required for Accounts Payable posting.', 'warning');
    else if (result.is_demo) show(result.reason || 'Internal reference not eligible for review.', 'warning');
    else if (eligible) show('Eligible for local Procurement Finance queue. Finance must still validate the original supplier document, tax, and payable.', 'info');
    else show(result.reason || 'Invoice not eligible for Finance queue.', 'warning');
    renderButton();
  }
  // Existing addons intentionally disable the button. Re-enable only AFTER
  // authenticated server eligibility is confirmed; avoid racing DOM load.
  const disabledObserver = new MutationObserver(() => {
    if (eligible && !busy && !savedState && button.disabled) button.disabled=false;
  });
  disabledObserver.observe(button,{attributes:true,attributeFilter:['disabled']});
  button.addEventListener('click', async event => {
    if (!eligible || busy || savedState) {event.preventDefault();return;}
    
    busy = true;renderButton();
    try {
      if (!csrf) throw new Error('Session unavailable; refresh the page.');
      const response = await fetch(endpoint, {
        method:'POST', credentials:'same-origin', cache:'no-store',
        headers:{'Content-Type':'application/json', 'Accept':'application/json', 'X-CSRF-Token':csrf},
        body:JSON.stringify({invoice_number:invoiceNumber,confirm_queue_only:true})
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to queue invoice.');
      eligible=false;
      savedState=result.handoff_status||'pending';
      show(result.message || 'Queued locally for Finance pickup.', 'success');
      await reload();
    } catch(e) {
      show(e.message || 'Handoff failed.', 'warning');
    } finally {busy=false;renderButton();}
  });
  // Do not alter the class/shape of the existing Figma button.
  button.disabled=true;
  reload().catch(e=>{eligible=false;show('Finance handoff unavailable: '+(e.message || 'Check installer/SQL migration.'),'warning');renderButton();});
  window.addEventListener('focus',()=>{if(!busy)reload().catch(()=>{});});
});
