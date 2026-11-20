/* UNIPROCUR_PO_REJECTION_V16
 * Additive, read-only PO tracking/rejection panel. Existing PO, Inventory, Invoice,
 * Gmail and Finance workflows remain unchanged. Invoice actions are navigation only.
 */
"use strict";
(() => {
  if (window.__uniprocurPoRejectionV16) return;
  window.__uniprocurPoRejectionV16 = true;
  const params = new URLSearchParams(location.search);
  const poNumber = String(params.get("po_number") || "").trim();
  if (!/^PO-[A-Za-z0-9-]{1,26}$/.test(poNumber)) return;
  const $ = id => document.getElementById(id);
  const quantity = n => new Intl.NumberFormat("en-PH", {maximumFractionDigits: 2}).format(Number(n) || 0);
  const plural = n => Number(n) === 1 ? "item" : "items";
  const infoUrl = "../database/get-buyer-po-review-target.php?po_number=" + encodeURIComponent(poNumber);
  const receiptUrl = "../database/get-buyer-real-goods-receipts.php?po_number=" + encodeURIComponent(poNumber);
  const invoiceCreateUrl = "buyer-invoices.html?record_invoice=1&po_number=" + encodeURIComponent(poNumber);
  const grViewUrl = "buyer-real-goods-receipts.html?po_number=" + encodeURIComponent(poNumber);
  let busy = false;
  let loaded = false;
  let active = true;
  function create(tag, className, contents) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (contents !== undefined) el.textContent = String(contents);
    return el;
  }
  function card() {
    let panel = $("po-receipt-v16");
    if (panel) return panel;
    const trackingPanel = document.querySelector(".tracking-section .tracking-panel");
    if (!trackingPanel) return null;
    panel = create("section", "po-receipt-v16");
    panel.id = "po-receipt-v16";
    panel.setAttribute("aria-label", "Inventory receipt and rejected items");
    panel.hidden = true;
    trackingPanel.insertAdjacentElement("afterend", panel);
    const label = document.querySelector('.track-step[data-stage="4"] strong');
    if (label) label.textContent = "Inventory Receipt";
    return panel;
  }
  function labelLastStage(status, hasGr, accepted, rejected, fullyReceived) {
    const last = document.querySelector('.track-step[data-stage="4"]');
    if (!last) return;
    const partial = hasGr && !fullyReceived && status === "partial";
    last.classList.toggle("po-v16-partial", partial);
    if (hasGr && $("stageFour")) {
      if (partial) $("stageFour").textContent = `Partial · ${quantity(accepted)} accepted${rejected > 0 ? ", " + quantity(rejected) + " rejected" : ""}`;
      else if (fullyReceived) $("stageFour").textContent = `Received · ${quantity(accepted)} accepted`;
    }
  }
  function render(receipt, reference) {
    const panel = card();
    if (!panel) return;
    panel.replaceChildren();
    const po = receipt.po || {};
    const receipts = Array.isArray(receipt.receipts) ? receipt.receipts : [];
    const items = Array.isArray(receipt.items) ? receipt.items : [];
    const poStatus = String(po.po_status || "").toLowerCase();
    const verifiedCount = receipts.filter(x => x.goods_receipt_number).length;
    const hasGr = verifiedCount > 0 && items.length > 0;
    const accepted = items.reduce((s, x) => s + (Number(x.real_accepted) || 0), 0);
    const delivered = items.reduce((s, x) => s + (Number(x.real_delivered) || 0), 0);
    const rejected = items.reduce((s, x) => s + (Number(x.real_rejected) || 0), 0);
    const matches = hasGr && items.every(x => x.matches_real_receipts === true);
    const fullyReceived = hasGr && matches && Boolean(receipt.fully_received_from_real_gr);
    labelLastStage(poStatus, hasGr, accepted, rejected, fullyReceived);
    if (!hasGr) {
      if (poStatus === "partial" || poStatus === "received") {
        panel.hidden = false;
        panel.append(create("p", "po-v16-muted", "The PO status has changed, but a verified Inventory Goods Receipt is not yet available here. No rejection is being assumed."));
      } else panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const headline = create("div", "po-v16-headline");
    headline.append(create("strong", "", "Inventory Receipt"));
    headline.append(create("span", "po-v16-source", `${verifiedCount} verified GR${verifiedCount === 1 ? "" : "s"}`));
    panel.append(headline);
    const summary = create("div", "po-v16-numbers");
    [["Delivered",delivered],["Accepted",accepted],["Rejected",rejected]].forEach(([label,val]) => {
      const box = create("div", "po-v16-quantity" + (label === "Rejected" && val > 0 ? " po-v16-rejected" : ""));
      box.append(create("span", "", label), create("strong", "", quantity(val)));
      summary.append(box);
    });
    panel.append(summary);
    const latest = receipts[0];
    const receiptLink = create("a", "po-v16-link", `View Verified GR${latest && latest.goods_receipt_number ? " · " + latest.goods_receipt_number : ""}`);
    receiptLink.href = grViewUrl;
    panel.append(receiptLink);
    // A PO status of 'partial' is not by itself proof of rejection; only verified rejected_qty counts.
    if (rejected > 0) {
      const alert = create("div", "po-v16-alert");
      alert.append(create("strong", "", `Inventory rejection reported · ${quantity(rejected)} rejected quantity`));
      alert.append(create("p", "", "Review the Inventory receipt before correcting the supplier invoice. This PO alert does not automatically put an invoice ON HOLD."));
      const actions = create("div", "po-v16-actions");
      const link = create("a", "po-v16-action", "Review Rejection / Flag Discrepancy");
      const foundInvoice = reference && reference.success && reference.invoice && reference.invoice.invoice_number;
      const mismatch = Boolean(reference && reference.success && reference.invoice_supplier_mismatch);
      if (foundInvoice) {
        link.href = "buyer-view-invoice.html?invoice_number=" + encodeURIComponent(reference.invoice.invoice_number);
        link.title = "Open " + reference.invoice.invoice_number + ". Flag Discrepancy happens on the Invoice page.";
        actions.append(link);
        actions.append(create("small", "po-v16-muted", `Linked invoice: ${reference.invoice.invoice_number}`));
      } else if (mismatch) {
        const caution = create("p", "po-v16-warning", "An invoice exists with a different supplier. Reconcile that record first; automatic invoice navigation is blocked.");
        actions.append(caution);
      } else if (reference && reference.success) {
        link.href = invoiceCreateUrl;
        link.textContent = "Record Invoice / Review Rejection";
        link.title = "Open the existing Record Invoice flow for this Purchase Order";
        actions.append(link);
        actions.append(create("small", "po-v16-muted", "No linked invoice found. Record it first; then flag the discrepancy on the Invoice page."));
      } else {
        actions.append(create("p", "po-v16-warning", "Invoice lookup is temporarily unavailable. Open Invoice from the Procurement sidebar to find the matching PO."));
      }
      alert.append(actions);
      panel.append(alert);
    } else {
      // UNIPROCUR_PO_CLEAN_RECEIPT_V20: accepted-only receipts can go directly
      // to the EXISTING Invoice module without opening the rejection workflow.
      // No invoice is saved here. This is navigation only.
      panel.append(create("p", "po-v16-muted", "No rejected items in the verified Inventory receipt for this PO."));
      const balanced = items.every(item => {
        const d = Number(item.real_delivered);
        const a = Number(item.real_accepted);
        const r = Number(item.real_rejected);
        return [d, a, r].every(Number.isFinite) && d >= 0 && a >= 0 && r >= 0 && Math.abs(d - a - r) < 0.011;
      });
      const canRecord = matches && balanced && accepted > 0 &&
        ["partial", "received"].includes(poStatus);
      if (canRecord) {
        const actions = create("div", "po-v20-invoice-actions");
        const invoiceLookupOk = reference && reference.success === true && reference.po_number === poNumber;
        if (!invoiceLookupOk) {
          actions.append(create("p", "po-v16-warning", "Invoice status could not be checked. Open the Invoice module to review this PO; automatic navigation is unavailable."));
        } else if (reference.invoice_supplier_mismatch === true) {
          actions.append(create("p", "po-v16-warning", "An existing invoice has a different supplier from the approved PO. Reconcile that invoice first."));
        } else {
          const found = reference.invoice && /^INV-[A-Za-z0-9-]{1,30}$/.test(String(reference.invoice.invoice_number || ""));
          const link = create("a", "po-v20-record-invoice", found ? "View Existing Invoice" : "Record Invoice");
          link.href = found
            ? "buyer-view-invoice.html?invoice_number=" + encodeURIComponent(reference.invoice.invoice_number)
            : invoiceCreateUrl;
          link.title = found
            ? "Open the saved invoice for this PO"
            : "Open Record Invoice for this PO using verified accepted quantities";
          actions.append(link);
          actions.append(create("small", "po-v16-muted", found
            ? "This PO already has an invoice. Open it instead of creating a duplicate."
            : "All delivered units were accepted. Invoice form will use the verified GR quantities; final verification is still required."));
        }
        panel.append(actions);
      } else if (accepted > 0 && !matches) {
        // The existing mismatch warning below explains why no button is shown.
      }
    }
    if (!matches) {
      panel.append(create("p", "po-v16-warning", "PO received quantities do not reconcile with verified GR totals. Please review the GR before invoice verification."));
    }
    // Source is verified Inventory DR snapshot, not Gmail notification or local PO status.
    panel.append(create("p", "po-v16-footnote", "Source: verified Inventory Goods Receipt snapshot linked to this exact PO. Email notifications are supporting evidence only."));
  }
  async function refresh() {
    if (busy || document.hidden || !active) return;
    const panel = card();
    if (!panel) return;
    busy = true;
    try {
      const [r, i] = await Promise.allSettled([
        fetch(receiptUrl, {credentials:"same-origin", cache:"no-store", headers:{Accept:"application/json"}}),
        fetch(infoUrl, {credentials:"same-origin", cache:"no-store", headers:{Accept:"application/json"}})
      ]);
      if (r.status !== "fulfilled" || !r.value.ok) throw Error("Goods Receipt endpoint unavailable");
      const receipt = await r.value.json();
      if (receipt.success !== true || String(receipt.po?.po_number || "") !== poNumber) throw Error("Unverified or mismatched GR response");
      let reference = null;
      if (i.status === "fulfilled" && i.value.ok) {
        try { reference = await i.value.json(); } catch (_) { /* safe fallback */ }
        if (reference && reference.po_number !== poNumber) reference = null;
      }
      render(receipt, reference);
      loaded = true;
    } catch (error) {
      console.warn("PO rejection display (read only):", error);
      if (!loaded) {
        const el = card();
        if (el) {el.hidden = false;el.replaceChildren(create("p", "po-v16-muted", "Inventory receipt details could not be checked. Use View GR to review the record; no rejection is assumed."));}
      }
    } finally {busy = false;}
  }
  function start() {
    const sheet = $("poSheet");
    if (!sheet) return;
    const observer = new MutationObserver(() => {
      if (!sheet.hidden && !loaded) refresh();
    });
    observer.observe(sheet, {attributes:true,attributeFilter:["hidden"]});
    if (!sheet.hidden) refresh();
    // Poll independently from the existing PO milestone refresh, and recheck on return.
    setInterval(refresh, 12000);
    document.addEventListener("visibilitychange", () => {if (!document.hidden) refresh();});
    window.addEventListener("pagehide", () => {active = false;});
    window.addEventListener("pageshow", () => {active = true;refresh();});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
