/* UniProcur v10: prefills discrepancy Step 1 from authenticated Inventory receipts.
 * Gmail v8 bell/v9 email chooser remain unchanged. No save or approval is performed.
 * Unverified/partial data are never silently represented as confirmed receiving. */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.querySelector('dialog.disc-modal');
  const panel = modal && modal.querySelector('#discMailPanel');
  const tbody = modal && modal.querySelector('#discMailRows');
  const invoice = new URLSearchParams(location.search).get('invoice_number') || '';
  if (!modal || !panel || !tbody || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(invoice)) return;
  if (panel.querySelector('#discVerifiedGrV10')) return;
  const $ = id => modal.querySelector('#' + id);
  const box = document.createElement('section');
  box.id = 'discVerifiedGrV10';
  box.className = 'disc-gr-v10';
  const heading = document.createElement('strong');
  heading.textContent = 'Inventory Goods Receipt — automatic quantities';
  const details = document.createElement('p');
  details.className = 'disc-gr-v10-status';
  details.setAttribute('role', 'status');
  details.textContent = 'Open this step to look for a verified Inventory Goods Receipt.';
  const reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.textContent = 'Reload verified GR';
  reloadButton.className = 'disc-gr-v10-refresh';
  const hint = document.createElement('p');
  hint.className = 'disc-gr-v10-hint';
  hint.textContent = 'DR reference, date and quantities come from Inventory records. Gmail subject/sender come from the email selector above. The inspection reason must still be checked in the original email.';
  box.append(heading,details,reloadButton,hint);
  const existingEmailPicker = panel.querySelector('#discGmailV9');
  if (existingEmailPicker) existingEmailPicker.insertAdjacentElement('afterend',box);
  else panel.insertBefore(box,panel.querySelector('.disc-edit-fields') || panel.firstChild);

  const legend = panel.querySelector('legend');
  if (legend) legend.textContent = 'Inventory Goods Receipt and Gmail reference';
  const trHead = panel.querySelector('.disc-edit-table-wrap thead tr');
  if (trHead) {
    const headings = trHead.querySelectorAll('th');
    if (headings.length >= 6) {
      headings[2].textContent = 'Linked GR accepted';
      headings[3].textContent = 'Inventory delivered';
      headings[4].textContent = 'Inventory accepted';
      headings[5].textContent = 'Inventory rejected';
    }
  }
  const checkbox = $('discMailChecked');
  if (checkbox && checkbox.parentElement) checkbox.parentElement.lastChild.textContent =
    ' I reviewed the linked Inventory Goods Receipt and the supporting Inventory email before saving this Buyer report.';
  const intro = panel.querySelector('.disc-description');
  if (intro) intro.textContent = 'Auto-filled quantities are based on the verified Inventory DR snapshot; the email is a supporting notification. Saving recalculates the ON HOLD invoice draft only. It does not verify the supplier document or change Inventory stock.';
  let snapshot = null;
  let lastAppliedRow = null;
  let userEdited = false;
  let generation = 0;
  let appliedGeneration = -1;
  let delayedApply = null;

  const date = $('discMailDate');
  const dr = $('discMailDR');
  const note = $('discMailNote');
  const inputBy = (tr, cls) => tr.querySelector('.' + cls);
  const show = (message, isError) => {
    details.textContent = message;
    box.classList.toggle('disc-gr-v10-warning', !!isError);
  };
  const setReadOnly = locked => {
    [dr,date].forEach(el => { if (el) el.readOnly = locked; });
    for (const tr of tbody.querySelectorAll('tr')) {
      for (const cls of ['disc-mail-delivered','disc-mail-accepted','disc-mail-rejected']) {
        const input = inputBy(tr,cls);
        if (input) input.readOnly = locked;
      }
    }
  };
  // Do not overwrite an existing Buyer-saved report without an explicit click.
  const mayAutoFill = () => {
    const rows = [...tbody.querySelectorAll('tr')];
    if (!rows.length || !snapshot || rows.length !== snapshot.items.length) return false;
    if (dr.value.trim() || date.value || $('discMailChecked')?.checked) return false;
    if (rows.some(tr => inputBy(tr,'disc-mail-accepted')?.value.trim() || inputBy(tr,'disc-mail-rejected')?.value.trim())) return false;
    return true;
  };
  const noteFromSnapshot = () => {
    const s = snapshot;
    const short = s.items.map(x => `${x.item_name}: ${x.delivered_qty} delivered, ${x.accepted_qty} accepted, ${x.rejected_qty} rejected`).join('; ');
    return (`Inventory verified receipt ${s.reference}. ${short}. Inspect original Inventory email for any rejection reason.`).slice(0,1000);
  };
  function applySnapshot(force) {
    if (!snapshot || !modal.open) return false;
    const rows = [...tbody.querySelectorAll('tr')];
    if (rows.length !== snapshot.items.length || rows.length === 0) return false;
    if (!force && (!mayAutoFill() || userEdited || appliedGeneration === generation)) return false;
    const byId = new Map(snapshot.items.map(x => [Number(x.po_item_id),x]));
    if (rows.some(tr => !byId.has(Number(tr.dataset.poItemId)))) {
      show('Inventory receipt items do not match invoice PO lines. No data were changed.',true);
      return false;
    }
    dr.value = snapshot.reference;
    date.value = snapshot.received_date;
    for (const tr of rows) {
      const entry = byId.get(Number(tr.dataset.poItemId));
      inputBy(tr,'disc-mail-delivered').value = String(entry.delivered_qty);
      inputBy(tr,'disc-mail-accepted').value = String(entry.accepted_qty);
      inputBy(tr,'disc-mail-rejected').value = String(entry.rejected_qty);
    }
    if (note && (force || !note.value.trim())) note.value = noteFromSnapshot();
    setReadOnly(true);
    appliedGeneration = generation;
    lastAppliedRow = rows[0];
    userEdited = false;
    // v7 listens for table input events to update its automatic draft preview.
    tbody.dispatchEvent(new Event('input',{bubbles:true}));
    show(`Verified Inventory DR ${snapshot.reference} (${snapshot.received_date}) loaded. Delivered/accepted/rejected quantities are read-only. Select the corresponding Gmail email above to fill subject/sender; review the inspection reason.`);
    return true;
  }
  async function load(force) {
    const seq = ++generation;
    snapshot = null;
    reloadButton.disabled = true;
    show('Looking for the saved verified Inventory Goods Receipt...');
    try {
      const r = await fetch('../database/buyer-inventory-gr-autofill-v10.php?invoice_number=' + encodeURIComponent(invoice),
        {credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      const data = await r.json().catch(() => ({}));
      if (seq !== generation) return;
      if (!r.ok || !data.success) throw new Error(data.message || `HTTP ${r.status}`);
      if (!data.can_prefill || !data.receipt) {
        setReadOnly(false);
        show((data.message || 'No verified Inventory DR available.') + ' Existing manual fields remain available, but do not count as authenticated receiving.',true);
        return;
      }
      snapshot = data.receipt;
      if (!applySnapshot(force)) {
        show(`Verified DR ${snapshot.reference} found. If a report is already saved, click "Reload verified GR" to replace its displayed quantities. Nothing is saved until you confirm.`,false);
      }
    } catch (e) {
      if (seq !== generation) return;
      show('Unable to auto-fill: ' + (e.message||String(e)) + '. Gmail notification and manual discrepancy workflow are unchanged.',true);
      setReadOnly(false);
    } finally {
      if (seq === generation) reloadButton.disabled = false;
    }
  }
  reloadButton.addEventListener('click', () => { userEdited = false; load(true); });
  panel.addEventListener('input',e => {
    if (e.isTrusted && (e.target.matches('#discMailDR,#discMailDate,#discMailNote,.disc-mail-delivered,.disc-mail-accepted,.disc-mail-rejected'))) userEdited = true;
  });
  // v7 asynchronously reconstructs item inputs after fetching saved email evidence.
  // Its completion is signaled by the new PO item rows, not by a fixed timeout.
  new MutationObserver(() => {
    if (!modal.open || !snapshot) return;
    if (tbody.querySelector('tr') !== lastAppliedRow) appliedGeneration = -1;
    if (delayedApply !== null) clearTimeout(delayedApply);
    delayedApply = setTimeout(() => { delayedApply = null; applySnapshot(false); }, 30);
  }).observe(tbody,{childList:true});
  new MutationObserver(() => {
    if (modal.open) load(false);
    else {
      snapshot = null; generation++;
      setReadOnly(false);
      lastAppliedRow = null;
      userEdited = false;
    }
  }).observe(modal,{attributes:true,attributeFilter:['open']});
});
