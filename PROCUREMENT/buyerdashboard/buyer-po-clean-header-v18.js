/* UniProcur PO header cleanup v18.
 * Removes ONLY the redundant top Record Invoice action added by the
 * legacy PO -> Invoice bridge. The bridge's View GR link remains intact.
 * The v17 Review Rejection -> Continue to Invoice path is untouched.
 */
'use strict';
(() => {
  if (window.__uniprocurPoCleanHeaderV18) return;
  window.__uniprocurPoCleanHeaderV18 = true;

  function clean() {
    const actions = document.querySelector('.document-actions');
    if (!actions) return;
    const removeOnlyTopInvoice = () => {
      actions.querySelectorAll('#poRecordInvoiceButton').forEach(button => button.remove());
    };
    removeOnlyTopInvoice();
    // If a delayed script re-inserts the top button, keep it removed.
    new MutationObserver(removeOnlyTopInvoice).observe(actions, { childList: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clean);
  } else {
    clean();
  }
})();
