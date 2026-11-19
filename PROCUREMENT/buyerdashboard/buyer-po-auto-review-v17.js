/* UniProcur v17: One-click rejection review using persisted, verified GR evidence.
 * Read-only; no automatic invoice creation, Finance, Inventory or stock mutations.
 */
'use strict';
(() => {
  if (window.__uniprocurAutoReviewV17) return;
  window.__uniprocurAutoReviewV17 = true;
  const number = new URLSearchParams(location.search).get('po_number') || '';
  if (!/^PO-[A-Za-z0-9-]{1,26}$/.test(number)) return;
  const $ = id => document.getElementById(id);
  const fmt = value => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const peso = value => new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP' }).format(Number(value) || 0);
  let modalBusy = false;
  const receiptUrl = '../database/get-buyer-real-goods-receipts.php?po_number='+encodeURIComponent(number);
  const invoiceUrl = '../database/buyer-invoice-integration-local.php?po_number='+encodeURIComponent(number)+'&invoice_mode=genuine';
  const localInvoice = 'buyer-invoices.html?record_invoice=1&po_number='+encodeURIComponent(number);
  function make(tag, cls, str) {
    const el = document.createElement(tag);
    if (cls) el.className=cls;
    if (str !== undefined) el.textContent=String(str);
    return el;
  }
  function setupDialog() {
    if ($('poAutoReviewV17')) return $('poAutoReviewV17');
    const dlg=make('dialog','po-v17-dialog');dlg.id='poAutoReviewV17';dlg.setAttribute('aria-label','Review Inventory rejection and invoice draft');
    dlg.innerHTML = '<div class="po-v17-dialog-content"><header class="po-v17-head"><div><small>UNIPROCUR · PURCHASE ORDER</small><h2>Review Rejection & Invoice</h2></div><button id="poV17Close" type="button" aria-label="Close">×</button></header><div id="poV17Contents" class="po-v17-contents" role="status">Loading verified Inventory receipt…</div><footer id="poV17Footer" class="po-v17-footer"></footer></div>';
    document.body.append(dlg);
    dlg.querySelector('#poV17Close').addEventListener('click',()=>dlg.close());
    dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
    return dlg;
  }
  async function getJson(url) {
    const resp=await fetch(url,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
    const body=await resp.json().catch(()=>({}));
    if(!resp.ok||body.success!==true)throw Error(body.message||'Unable to verify the requested records.');
    return body;
  }
  function detailRow(holder,label,value) {
    const div=make('div','po-v17-detail');div.append(make('span','',label),make('strong','',value));holder.append(div);
  }
  async function openReview(href) {
    if (modalBusy)return;
    modalBusy=true;
    const dlg=setupDialog(),content=$('poV17Contents'),footer=$('poV17Footer');
    content.replaceChildren(make('p','po-v17-muted','Checking verified Inventory GR and PO invoice prices…'));
    footer.replaceChildren();
    if(!dlg.open)dlg.showModal();
    try {
      const [gr,data]=await Promise.all([getJson(receiptUrl),getJson(invoiceUrl)]);
      if(String(gr.po?.po_number)!==number||String(data.po?.po_number)!==number) throw Error('The Inventory and Procurement PO references do not match.');
      const receipts=Array.isArray(gr.receipts)?gr.receipts:[];
      const lines=Array.isArray(gr.items)?gr.items:[];
      const poLines=Array.isArray(data.po_items)?data.po_items:[];
      if(!receipts.length||!lines.length||!poLines.length) throw Error('No verified Goods Receipt or PO lines found for this order.');
      if(lines.length!==poLines.length||!lines.every(l=>l.matches_real_receipts===true)) throw Error('The saved PO received quantities do not match verified Goods Receipts. Review the Inventory data first.');
      const prices=new Map(poLines.map(l=>[Number(l.po_item_id),l]));
      if(lines.some(l=>!prices.has(Number(l.id)))) throw Error('Cannot match Inventory GR line IDs to Purchase Order lines.');
      let sum=0, accepted=0, delivered=0, rejected=0;
      content.replaceChildren();
      const poInfo=make('section','po-v17-summary');
      detailRow(poInfo,'Purchase Order',number);
      detailRow(poInfo,'Approved Supplier',data.po.supplier_name||gr.po.supplier_name||'—');
      detailRow(poInfo,'Goods Receipt',receipts.map(r=>r.goods_receipt_number).filter(Boolean).join(', ')||'—');
      content.append(poInfo);
      const table=make('table','po-v17-table');
      const head=make('thead');const hr=make('tr');
      ['Item','Delivered','Accepted','Rejected','PO Unit Price','Draft pre-VAT'].forEach(h=>hr.append(make('th','',h)));
      head.append(hr);table.append(head);
      const tbody=make('tbody');
      for(const line of lines) {
        const po=prices.get(Number(line.id));
        const a=Number(line.real_accepted)||0, r=Number(line.real_rejected)||0, d=Number(line.real_delivered)||0;
        if(a < 0||r < 0||d < 0||Math.abs(d-a-r)>.011)throw Error('Inventory delivered / accepted / rejected quantities are inconsistent.');
        if(!Number.isFinite(Number(po.unit_price))||Number(po.unit_price)<0)throw Error('Invalid PO price.');
        const v=Math.round(a*Number(po.unit_price)*100)/100;
        sum+=v;accepted+=a;rejected+=r;delivered+=d;
        const row=make('tr');[po.item_name+' ('+(po.unit||'')+')',fmt(d),fmt(a),fmt(r),peso(po.unit_price),peso(v)].forEach(v=>row.append(make('td','',v)));
        tbody.append(row);
      }
      table.append(tbody);
      const wrap=make('div','po-v17-table-wrap');wrap.append(table);content.append(wrap);
      const totals=make('section','po-v17-metrics');
      [['Delivered',fmt(delivered)],['Accepted',fmt(accepted)],['Rejected',fmt(rejected)],['Expected invoice draft (pre-VAT)',peso(sum)]].forEach(([l,v])=>detailRow(totals,l,v));
      content.append(totals);
      const notice=make('p',rejected>0?'po-v17-warning':'po-v17-muted',rejected>0
        ? 'Rejected items are excluded from the expected invoice quantity. The Inventory rejection reason is available in the original rejection report; it is not carried in this verified GR API. No supplier contact or Gmail re-entry is required for this quantity review.'
        : 'No rejected quantity in these verified Goods Receipts.');
      content.append(notice);
      const safety=make('p','po-v17-muted', 'This is an Inventory-based expected amount, NOT a confirmed supplier invoice. PO and GR remain unchanged. Invoice saving, final verification, and Finance queue follow the existing system checks.');
      content.append(safety);
      const grlink=make('a','po-v17-light','Open verified Goods Receipt');
      grlink.href='buyer-real-goods-receipts.html?po_number='+encodeURIComponent(number);
      footer.append(grlink);
      if (data.invoice && data.invoice.invoice_number) {
        const inv=make('a','po-v17-primary','Review Existing Invoice');
        inv.href='buyer-view-invoice.html?invoice_number='+encodeURIComponent(data.invoice.invoice_number);
        footer.append(inv);
      } else {
        const button=make('a','po-v17-primary','Continue to Invoice');
        button.href=localInvoice;footer.append(button);
      }
    } catch(e) {
      content.replaceChildren(make('p','po-v17-error',e.message||'Cannot verify Inventory data.'));
      const link=make('a','po-v17-light','View verified Goods Receipts');link.href='buyer-real-goods-receipts.html?po_number='+encodeURIComponent(number);footer.append(link);
    } finally {modalBusy=false;}
  }
  function enhance() {
    const root=$('po-receipt-v16');if(!root||root.hidden)return;
    const action=root.querySelector('.po-v16-actions .po-v16-action');
    if(action && action.dataset.v17!=='yes') {
      // V16 already checks this PO's GR and invoice association before providing a link.
      action.dataset.v17='yes';
      action.textContent='Review Rejection & Prepare Invoice';
      const note=root.querySelector('.po-v16-actions .po-v16-muted');
      if(note && /No linked invoice found/.test(note.textContent))
        note.textContent='No saved invoice yet. The next screen will prefill accepted-only quantities. Flag a discrepancy only if invoice figures do not match.';
    }
  }
  function start() {
    setupDialog();
    document.addEventListener('click',e=>{
      const action=e.target.closest('#po-receipt-v16 .po-v16-action');
      if(!action || !action.hasAttribute('href'))return;
      e.preventDefault();e.stopPropagation();openReview(action.getAttribute('href'));
    },true);
    const sheet=$('poSheet');if(!sheet)return;
    const obs=new MutationObserver(enhance);obs.observe(sheet,{childList:true,subtree:true});
    enhance();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
