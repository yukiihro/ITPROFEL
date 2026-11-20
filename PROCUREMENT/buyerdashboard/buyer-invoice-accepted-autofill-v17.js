/* UniProcur v17: display expected pre-VAT invoice total from the existing
 * Invoice modal's GR accepted quantities x PO prices. Never overrides a saved invoice
 * or a supplier-entered invoice amount. Server-side validation remains authoritative.
 */
'use strict';
(() => {
  if(window.__uniprocurAcceptedAutofillV17)return;
  window.__uniprocurAcceptedAutofillV17=true;
  function start(){
    let watched=null,lastAutoValue=null;
    function applyInitial(){
      const modal=document.getElementById('invoiceRecordDialog');if(!modal)return;
      const rows=modal.querySelector('#captureLineRows');
      const total=modal.querySelector('#captureInvoiceTotal');
      const save=modal.querySelector('#captureSave');
      const calc=modal.querySelector('#captureCalculated');
      if(!rows||!total||!save||!rows.children.length)return;
      // Existing invoice is never overwritten (its total may be from actual document).
      const isNewInvoice=save.textContent.trim()==='Save & Verify Invoice';
      if(!isNewInvoice){lastAutoValue=null;return;}
      const values=[...rows.children].map(tr=>{
        const qty=Number(tr.querySelector('[data-qty]')?.value),price=Number(tr.querySelector('[data-price]')?.value);
        return Number.isFinite(qty)&&Number.isFinite(price)&&qty>0&&price>0 ? Math.round(qty*price*100)/100 : NaN;
      });
      if(values.some(x=>!Number.isFinite(x)))return;
      const amount=(Math.round(values.reduce((a,b)=>a+b,0)*100)/100).toFixed(2);
      // Only initial load; do not silently overwrite user's changed total.
      total.value=amount;lastAutoValue=amount;
      const prior=document.getElementById('poV17InvoiceHint');
      if(!prior){
        const note=document.createElement('p');note.id='poV17InvoiceHint';note.style.cssText='font-size:12px;line-height:1.5;border:1px solid #b8d7c4;background:#edf7f1;padding:9px 12px;border-radius:6px;color:#275f3f';
        note.textContent='Expected pre-VAT total is auto-filled using the verified Inventory received quantity × approved PO unit price. Compare this with the actual supplier invoice before saving. Rejected items are excluded.';
        (calc?.closest('.capture-total-row')||total.parentNode).after(note);
      }
    }
    function hook(){
      const rows=document.getElementById('captureLineRows');if(!rows||rows===watched)return;
      watched=rows;
      new MutationObserver(()=>queueMicrotask(applyInitial)).observe(rows,{childList:true});
      rows.addEventListener('input',()=>{
        const total=document.getElementById('captureInvoiceTotal');
        const save=document.getElementById('captureSave');
        if(!total||!save||save.textContent.trim()!=='Save & Verify Invoice')return;
        // Update only if unchanged from previous auto total; preserve any manual document total.
        if(lastAutoValue===null||Math.abs(Number(total.value)-Number(lastAutoValue))>0.009)return;
        const values=[...rows.children].map(tr=>Number(tr.querySelector('[data-qty]')?.value)*Number(tr.querySelector('[data-price]')?.value));
        if(values.some(x=>!Number.isFinite(x)))return;
        lastAutoValue=(Math.round(values.reduce((a,b)=>a+b,0)*100)/100).toFixed(2);
        total.value=lastAutoValue;
      });
      applyInitial();
    }
    hook();
    const watch=new MutationObserver(hook);watch.observe(document.body,{childList:true,subtree:false});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
