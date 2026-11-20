/* D.E.V.S Finance AP | Incoming invoices from UniProcur.
   Read-only inbox display + explicit receipt acknowledgment. Never posts accounting entries. */
"use strict";
(() => {
  const endpoint = 'procurement_ap_bridge.php';
  let csrf = '';
  let busy = false;
  let loading = false;
  const money = n => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(n || 0));
  const el = (tag, cls = '', txt = null) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== null) e.textContent = String(txt);
    return e;
  };
  const safeValue = value => value === null || value === undefined || value === '' ? '—' : String(value);

  async function call(action, body = null) {
    const res = await fetch(endpoint + '?action=' + encodeURIComponent(action), {
      method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: body ? { 'Accept':'application/json', 'Content-Type':'application/json', 'X-CSRF-Token':csrf } : { 'Accept':'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    let out = {};
    try { out = await res.json(); } catch { throw new Error('Finance invoice bridge returned an invalid response.'); }
    if (!res.ok || out.ok !== true) throw new Error(out.message || 'Cannot load Procurement invoices.');
    return out;
  }

  function mount() {
    const activePage = document.querySelector('.nav-item.active[data-page]');
    const onPayables = activePage?.dataset.page === 'payables' &&
      document.getElementById('apSearch') !== null;
    if (!onPayables) {
      document.getElementById('procurementApInbox')?.remove();
      return;
    }
    const parent = document.querySelector('.payables-table-wrapper');
    if (!parent || !parent.parentElement) return;
    if (document.getElementById('procurementApInbox')) return;
    const panel = el('section','proc-ap-panel');
    panel.id = 'procurementApInbox';
    const head = el('div','proc-ap-head');
    const titles = el('div');
    titles.append(el('h3','', 'Incoming from Procurement'),
      el('p','', 'Invoice handoffs come from verified Inventory GRs or clearly labeled Buyer-entered Inventory Gmail reports. Finance must review Gmail evidence, supplier documents and VAT before posting.'));
    const refresh = el('button','proc-ap-refresh','Refresh Incoming');
    refresh.type='button';refresh.addEventListener('click',load);
    head.append(titles,refresh);
    const status = el('p','proc-ap-status','Checking Finance invoice inbox…');status.id='procApStatus';status.setAttribute('role','status');
    const scroller = el('div','proc-ap-scroll');
    const table = el('table','proc-ap-table');
    const tr = el('tr');
    ['Procurement Invoice','PO / Supplier','Due Date','Amount (pre-VAT)','Status','Action'].forEach(t=>tr.append(el('th','',t)));
    const th = el('thead');th.append(tr);
    const tbody=el('tbody');tbody.id='procApRows';table.append(th,tbody);scroller.append(table);
    const foot = el('p','proc-ap-foot','Receiving adds to a separate Finance AP inbox only. Use Post to Accounting to record the Finance AP entry after confirming VAT — it is saved as Unpaid in Accounts Payable (Finance will pay it later), with no separate financial transaction.');
    panel.append(head,status,scroller,foot);
    parent.parentElement.insertBefore(panel,parent);
    load();
  }
  function label(entry, local) {
    if (local?.posted_at) return 'Posted to Accounting';
    if (local?.ack_state === 'acknowledged') return 'Received by Finance';
    if (local?.ack_state === 'local_received') return 'Receipt saved · ACK pending';
    if (entry.handoff_status === 'received') return 'Received (remote)';
    return 'Awaiting Finance receipt';
  }
  function render(remote, local) {
    const rows = document.getElementById('procApRows');
    if (!rows) return;
    rows.replaceChildren();
    const localMap = new Map((local || []).map(row=>[row.request_ref,row]));
    const seen = new Set();
    const all = [];
    // Show pending/received handoffs (not yet posted) so the inbox mirrors
    // Procurement's current invoices. Posted ones already live in Payables.
    (remote || []).forEach(r => {
      if (!r.request_ref) return;
      if (!['pending','received'].includes(String(r.handoff_status || ''))) return;
      if (seen.has(r.request_ref)) return;
      seen.add(r.request_ref);
      all.push(r);
    });
    (local || []).forEach(r => {
      if (r.posted_at) return; // already posted -> in Payables, skip
      if (seen.has(r.request_ref)) return;
      seen.add(r.request_ref);
      all.push({request_ref:r.request_ref,handoff_status:'received',request_version:r.request_version,
        snapshot_sha256:r.snapshot_sha256,invoice_snapshot:{invoice_number:r.invoice_number,po_number:r.po_number,
        supplier:{name:r.supplier_name},due_date:r.due_date,amount_pre_vat:r.amount_pre_vat}});
    });
    if (!all.length) {
      const tr=el('tr');const td=el('td','proc-ap-empty','No eligible Procurement invoices yet. This is expected before Inventory posts a real Goods Receipt and Procurement verifies an invoice.');td.colSpan=6;tr.append(td);rows.append(tr);return;
    }
    all.forEach(r=>{
      const s=r.invoice_snapshot || {};
      const l=localMap.get(r.request_ref);
      const buyerEmailReport = s.three_way_match === 'BUYER_TRANSCRIBED_INVENTORY_EMAIL_PO_INVOICE_MATCH';
      const tr=el('tr');
      tr.append(el('td','',safeValue(s.invoice_number)));
      const supplier=el('td');supplier.append(el('strong','',safeValue(s.po_number)),el('div','proc-ap-sub',safeValue(s.supplier?.name)));tr.append(supplier);
      tr.append(el('td','',safeValue(s.due_date)),el('td','',money(s.amount_pre_vat)));
      tr.append(el('td','',label(r,l)+(buyerEmailReport?' · Inventory Gmail (Buyer-entered)':'')));
      const action=el('td');
      if (l?.posted_at) {
        const apRef = l.posted_ap_id ? 'AP-'+Number(l.posted_ap_id) : 'Done';
        action.append(el('span','proc-ap-muted',apRef));
      } else if (l?.ack_state === 'local_received') {
        const b=el('button','proc-ap-action','Receive & Post');b.type='button';b.addEventListener('click',()=>receiveAndPost(r.request_ref,l,s,true,buyerEmailReport));action.append(b);
      } else if (!l && r.handoff_status === 'pending') {
        const b=el('button','proc-ap-action','Receive & Post');b.type='button';b.addEventListener('click',()=>receiveAndPost(r.request_ref,l,s,false,buyerEmailReport));action.append(b);
      } else if (l?.ack_state === 'acknowledged' || r.handoff_status === 'received') {
        const b=el('button','proc-ap-action','Post to Accounting');b.type='button';b.addEventListener('click',()=>post(r.request_ref,l||{amount_pre_vat:s.amount_pre_vat},false,buyerEmailReport));action.append(b);
      } else action.append(el('span','proc-ap-muted','—'));
      tr.append(action);rows.append(tr);
    });
  }
  async function load() {
    if (loading) return;
    loading = true;
    const status=document.getElementById('procApStatus');
    if (!status) {loading=false;return;}
    status.textContent='Checking Procurement invoice handoffs…';
    try {
      const response=await call('queue');
      csrf=response.csrf_token || '';
      render(response.remote || [],response.local || []);
      status.textContent=response.remote_error
        ? 'Connection issue: ' + response.remote_error + ' — showing available local records.'
        : 'Finance AP inbox connected. ' + (response.remote || []).length + ' Procurement handoff(s) and ' + (response.local || []).length + ' locally received.';
    } catch (error) {
      status.textContent='Invoice bridge unavailable: ' + error.message;
      const tbody=document.getElementById('procApRows');
      if (tbody) tbody.replaceChildren();
    } finally {loading=false;}
  }
  async function receive(ref,retry) {
    if (busy) return;
    busy = true;
    const status=document.getElementById('procApStatus');
    if (status) status.textContent='Saving Finance receipt…';
    try {
      const result=await call(retry?'retry_ack':'receive',{request_ref:ref});
      if (status) status.textContent=result.message || 'Finance invoice received.';
      return result;
    } catch(error) {
      if (status) status.textContent=error.message;
      throw error;
    } finally {
      busy=false;
      await load();
    }
  }
  async function receiveAndPost(ref, local, snapshot, retryAck, buyerEmailReport=false) {
    if (busy) return;
    const base = local || { amount_pre_vat: snapshot?.amount_pre_vat };
    busy = true;
    const status=document.getElementById('procApStatus');
    try {
      if (status) status.textContent=retryAck ? 'Retrying receipt acknowledgment…' : 'Receiving invoice from Procurement…';
      await call(retryAck ? 'retry_ack' : 'receive', {request_ref:ref});
    } catch(error) {
      if (status) status.textContent=error.message;
      window.alert(error.message || 'Invoice processing failed.');
      busy=false;
      await load();
      return;
    }
    busy=false;
    await load();
    await post(ref, base, true, buyerEmailReport);
  }
  async function post(ref, local, afterReceive, buyerEmailReport=false) {
    if (busy) return;
    const pre = Number(local?.amount_pre_vat || 0);
    const rate = 12;
    const vat = Math.round((pre * rate / 100) * 100) / 100;
    const total = Math.round((pre + vat) * 100) / 100;
    const summary = 'Post this Procurement invoice to Finance accounting?\n\n'
      + 'Amount (pre-VAT): ' + money(pre) + '\n'
      + 'VAT (' + rate + '%): ' + money(vat) + '\n'
      + 'AP entry total: ' + money(total) + '\n\n'
      + 'The AP entry is recorded as Unpaid in Accounts Payable so Finance can pay it later, and Procurement is told the invoice is posted. No financial transaction is created.';
    if (buyerEmailReport && !window.confirm('These quantities came from a Buyer-entered Inventory Gmail report, not the Inventory API.\n\nHave you independently reviewed the original email and attachments and the corrected supplier invoice?')) return;
    if (!window.confirm(summary)) return;
    busy = true;
    const status=document.getElementById('procApStatus');
    if (status) status.textContent='Posting to Finance accounting…';
    let ok = false;
    try {
      const result=await call('post',{request_ref:ref,vat_rate:rate,confirm_inventory_email_review:buyerEmailReport});
      if (status) status.textContent=result.message || 'Invoice posted to Finance accounting.';
      ok = true;
    } catch(error) {
      if (status) status.textContent=error.message;
      window.alert(error.message || 'Invoice posting failed.');
    } finally {
      busy=false;
      try { await load(); } catch (e) { /* ignore */ }
      if (ok) window.location.reload();
    }
  }
  const start = () => {
    mount();
    const obs=new MutationObserver(()=>mount());
    obs.observe(document.body,{childList:true,subtree:true});
    // Keep the inbox in sync with Procurement automatically.
    setInterval(() => { if (document.getElementById('procurementApInbox')) load(); }, 30000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
