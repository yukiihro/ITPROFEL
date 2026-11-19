/* Read-only enhancement of existing Figma View Invoice page with real GR & match.
 * Does not replace the original page, modify PO/stock, or enable Finance posting. */
"use strict";
document.addEventListener("DOMContentLoaded", async () => {
  const params=new URLSearchParams(location.search);
  if(params.get("demo")==="1")return; // Original Figma demo must stay a clearly labeled demo.
  const invoiceNumber=params.get("invoice_number")||"";
  if(!invoiceNumber)return;
  const $=id=>document.getElementById(id);
  const money=x=>x===null||x===undefined||x===""?"—":"Php. "+new Intl.NumberFormat("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(x));
  const qty=(value,unit)=>value===null||value===undefined?"—":new Intl.NumberFormat("en-PH",{maximumFractionDigits:2}).format(Number(value))+(unit?" "+unit:"");
  const set=(id,text)=>{const e=$(id);if(e)e.textContent=String(text);};
  async function get(url) {
    const r=await fetch(url,{cache:"no-store",credentials:"same-origin",headers:{Accept:"application/json"}});
    const d=await r.json();if(!r.ok||!d.success)throw new Error(d.message||"Unable to load receipt verification");return d;
  }
  try {
    const details=await get("../database/get-buyer-invoice-details.php?invoice_number="+encodeURIComponent(invoiceNumber));
    if(!details.invoice?.po_number)return;
    const data=await get("../database/buyer-invoice-integration-local.php?po_number="+encodeURIComponent(details.invoice.po_number));
    if(!data.invoice||String(data.invoice.invoice_number)!==invoiceNumber||!data.match)return;
    const sheet=$("invoiceSheet");
    if(sheet&&sheet.hidden){await new Promise(resolve=>{
      const observer=new MutationObserver(()=>{if(!sheet.hidden){observer.disconnect();resolve();}});
      observer.observe(sheet,{attributes:true,attributeFilter:["hidden"]});
      setTimeout(()=>{observer.disconnect();resolve();},3000);
    });}
    if(sheet?.hidden)return; // Original details page failed; do not cover up its error.
    const inv=data.invoice, match=data.match, lines=data.invoice_items||[], poItems=data.po_items||[];
    const grs=match.real_receipts||[];
    const emailSource=match.receipt_source==='BUYER_ENTERED_INVENTORY_GMAIL';
    const emailEvidence=match.email_receipt||null;
    const grNumbers=grs.map(x=>x.goods_receipt_number).filter(Boolean);
    set("supplierInvoiceNumber", inv.supplier_invoice_reference||"—");
    set("grReference",emailSource ? "Inventory Gmail: "+(emailEvidence?.delivery_reference||"Buyer-entered") : (grNumbers.length?grNumbers.join(" · "):"No real Goods Receipt"));
    $("grReference").style.overflowWrap="anywhere";
    const byPo=new Map(poItems.map(x=>[Number(x.po_item_id),x]));
    const byInvoice=new Map(lines.map(x=>[Number(x.po_item_id),x]));
    const realByPo=new Map(match.items.map(x=>[Number(x.po_item_id),x]));
    const body=$("itemRows");body.replaceChildren();
    if(emailSource){const h=document.querySelectorAll(".line-items thead th");if(h[3])h[3].textContent="Accepted (Inventory Gmail)";}
    let subtotal=0;
    poItems.forEach((line,index)=>{
      const id=Number(line.po_item_id), saved=byInvoice.get(id), verified=realByPo.get(id), tr=document.createElement("tr");
      const unit=line.unit||"";
      const cols=[index+1,line.item_name,qty(line.qty_ordered,unit),qty(emailSource ? (verified?.email_accepted??0) : (verified?.real_gr_accepted??0),unit),saved?qty(saved.qty_billed,unit):"—",money(saved?.unit_price??line.unit_price),saved?money(saved.subtotal):"—"];
      for(const value of cols){const td=document.createElement("td");td.textContent=String(value);tr.append(td);}
      body.append(tr);
      subtotal+=Number(saved?.subtotal||0);
    });
    set("subtotal",money(subtotal));
    set("vat","—"); // Existing invoice schema & this integration do not represent VAT separately.
    set("totalAmount",money(inv.total_amount));
    const hasDocument=match.supplier_document_verified===true;
    const dataMatched=match.data_matched===true;
    const verified=inv.match_status==="matched"&&hasDocument&&dataMatched&&inv.status==="ready_to_post";
    const demo=inv.source_kind==="demo";
    const demoReady=demo&&inv.match_status==="demo_ready"&&inv.status==="ready_to_post"&&dataMatched;
    // Never present a stored demo or an unmatched invoice as Finance-ready.
    if(demo){
      set("statusBadge","Archived Demo · Not Finance Eligible");
      $("statusBadge").className="status-badge demo";
    }else if(verified){
      set("statusBadge","Verified · Ready for Finance Review");
      $("statusBadge").className="status-badge ready";
    }else{
      set("statusBadge",dataMatched?"Verification Pending":"Discrepancy · Review Required");
      $("statusBadge").className=`status-badge ${dataMatched?"pending":"discrepancy"}`;
    }
    let summary="3-Way Match: Discrepancy — review invoice quantities, prices, and receipts";
    if(verified)summary=emailSource ? "✓ Buyer-entered Inventory Gmail quantities matched corrected supplier invoice — Finance must review email evidence" : "✓ 3-Way Match: Verified — Ready to Post (Finance not connected)";
    else if(demoReady)summary="✓ 3-Way Match: CLASSROOM SIMULATION Ready to Post (NOT for real Finance posting)";
    else if(demo&&dataMatched)summary="3-Way Match: Data matches — DEMO only; not Ready to Post";
    else if(dataMatched)summary="3-Way Match: Data matches; verification/approval still required";
    set("matchResult",demo?"Archived demo record — this is NOT a verified supplier invoice and cannot be sent to Finance.":summary);
    $("matchResult").classList.toggle("sample",verified||demoReady);
    set("sourceHint",emailSource ? "Source: Buyer-transcribed Inventory Gmail ("+(emailEvidence?.subject||"no subject")+"). These are NOT independently verified Inventory GR quantities. Finance must inspect the source email, attached delivery report, supplier document and tax before posting." : `${grNumbers.length} real Inventory Goods Receipt(s) checked. Invoice source: ${demo?"classroom DEMO":"supplier-document declaration"}. ${demoReady?"Classroom simulation is stored as Ready to Post; this is NOT approval for real Finance accounting.":verified?"PO, real GR and recorded invoice passed local 3-way checks.":"Do not send to Finance until genuine supplier documents and approvals are verified."} VAT is not calculated by this local integration.`);
    set("dataBanner",demo
      ? "ARCHIVED CLASSROOM DEMO — retained for reference only. This is not a genuine supplier invoice, and Finance processing is blocked."
      : verified
        ? (emailSource ? "Buyer-entered Inventory Gmail quantities and corrected supplier invoice match. Finance must independently review the original email and attached documents before posting." : "Verified Inventory Goods Receipts and recorded supplier invoice match. Finance must still review and approve this invoice.")
        : (emailSource ? "Gmail-reported quantities or supplier invoice not yet verified. Do not send to Finance until the discrepancy is resolved." : "Supplier invoice is not yet verified against an authenticated Goods Receipt. Do not send it to Finance."));
    // Reflect the Finance handoff state when it has already progressed, so the
    // badge and match summary never contradict the queue button's state.
    try {
      const handoffState=await get("../database/buyer-finance-invoice-handoff.php?invoice_number="+encodeURIComponent(invoiceNumber));
      const financeStatus=String(handoffState.handoff?.handoff_status||"");
      if(financeStatus==="posted"&&hasDocument&&dataMatched){
        set("statusBadge","Posted by Finance · Accounting");
        $("statusBadge").className="status-badge posted";
        set("matchResult","✓ 3-Way Match: Verified — Posted to Finance accounting");
        set("dataBanner","Finance posted this invoice to accounting. No further Procurement action is required.");
      }else if(verified&&financeStatus==="received"){
        set("statusBadge","Received by Finance · Awaiting posting");
        $("statusBadge").className="status-badge posted";
        set("matchResult","✓ 3-Way Match: Verified — Received by Finance (accounting posting pending)");
        set("dataBanner","Finance acknowledged receipt of this invoice; accounting posting is still pending.");
      }else if(verified&&financeStatus==="pending"){
        set("statusBadge","Verified · Queued for Finance");
        $("statusBadge").className="status-badge ready";
        set("matchResult","✓ 3-Way Match: Verified — Queued for Finance review");
        set("dataBanner","This invoice is queued in the Procurement Finance inbox. Finance must still review and approve it.");
      }
    }catch(handoffError){ /* Handoff state unavailable; keep the verified labels above. */ }
    // The existing main script already disables these buttons. Keep them disabled.
    $("postButton").disabled=true;
    $("discrepancyButton").disabled=true;
  }catch(error){
    // Preserve existing invoice view on errors; never fabricate matching data.
    const hint=$("sourceHint");
    if(hint&&!$("invoiceSheet")?.hidden)hint.textContent="Real GR verification was unavailable: "+(error.message||"connection error")+". No match has been confirmed.";
  }
});
