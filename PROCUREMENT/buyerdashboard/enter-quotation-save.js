
"use strict";

(() => {
    const button = document.getElementById("compareButton");
    const message = document.getElementById("message");

    const rfqNumber = new URLSearchParams(
        window.location.search
    ).get("rfq_number");

    if (!button || !message || !rfqNumber) {
        return;
    }

    const originalButtonHTML = button.innerHTML;
    let aliasSuggestions = [];
    let variantApprovalCheckbox = null;
    const catalogWarning = document.createElement('div');
    catalogWarning.id = 'catalogMatchPreflight';
    catalogWarning.setAttribute('role', 'status');
    catalogWarning.style.whiteSpace = 'pre-line';
    catalogWarning.style.padding = '12px';
    catalogWarning.style.margin = '12px 0';
    catalogWarning.style.border = '1px solid #e6b1b1';
    catalogWarning.style.borderRadius = '6px';
    catalogWarning.style.background = '#fff5f5';
    catalogWarning.hidden = true;
    message.insertAdjacentElement('afterend', catalogWarning);

    // Display errors on the page instead of using alerts
    function showMessage(text, isError = false) {
        message.replaceChildren();
        message.classList.toggle("is-error", isError);

        message.textContent = text;
    }

    // Check whether the RFQ is available
    async function checkRFQ() {
        try {
            const response = await fetch(
                `../database/get-rfq-quotation-data.php?rfq_number=${encodeURIComponent(rfqNumber)}`,
                {
                    credentials: "same-origin"
                }
            );

            const data = await response.json();

            if (response.ok && data.success && data.suppliers?.length) {
                const missingCatalog = [];
                aliasSuggestions = [];
                for (const supplier of data.suppliers) {
                    for (const item of (supplier.items || [])) {
                        const label = `${supplier.name}: ${item.item_name} (${item.unit})`;
                        if (!item.supplier_item_id) {
                            missingCatalog.push(`${label} — ${item.catalog_issue || 'not in catalog'}`);
                        } else if (item.catalog_match_type === 'alias') {
                            aliasSuggestions.push(`${label} → ${item.catalog_item_name}`);
                        }
                    }
                }
                if (missingCatalog.length) {
                    button.disabled = true;
                    button.title = 'Resolve missing or ambiguous active supplier catalog items first';
                    catalogWarning.hidden = false;
                    catalogWarning.textContent = 'Cannot save until these supplier catalog records are corrected:\n' + missingCatalog.join('\n');
                } else {
                    variantApprovalCheckbox = null;
                    if (aliasSuggestions.length) {
                        button.disabled = true;
                        button.title = 'Confirm supplier product variants before saving';
                        catalogWarning.hidden = false;
                        catalogWarning.textContent = 'Supplier catalog variant(s) found. Confirm these are the intended products before saving:\n' + aliasSuggestions.join('\n');

                        const approvalRow = document.createElement('label');
                        approvalRow.style.display = 'flex';
                        approvalRow.style.alignItems = 'flex-start';
                        approvalRow.style.gap = '9px';
                        approvalRow.style.marginTop = '12px';
                        approvalRow.style.fontWeight = '600';
                        approvalRow.style.cursor = 'pointer';
                        variantApprovalCheckbox = document.createElement('input');
                        variantApprovalCheckbox.type = 'checkbox';
                        variantApprovalCheckbox.id = 'catalogVariantApproval';
                        variantApprovalCheckbox.style.marginTop = '3px';
                        const approvalLabel = document.createElement('span');
                        approvalLabel.textContent = 'I confirm these supplier product variants are acceptable for this quotation.';
                        approvalRow.append(variantApprovalCheckbox, approvalLabel);
                        catalogWarning.append(approvalRow);
                        variantApprovalCheckbox.addEventListener('change', () => {
                            button.disabled = !variantApprovalCheckbox.checked;
                            if (variantApprovalCheckbox.checked) button.removeAttribute('title');
                            else button.title = 'Confirm supplier product variants before saving';
                        });
                    } else {
                        button.disabled = false;
                        button.removeAttribute('title');
                        catalogWarning.hidden = true;
                        catalogWarning.textContent = '';
                    }
                }
            }

        } catch (error) {
            console.error("RFQ validation error:", error);
        }
    }

    // Save and Compare button
    button.addEventListener("click", async () => {

        if (button.disabled) {
            return;
        }
        // No browser confirmation popups: approval is collected in the visible page checkbox.
        if (aliasSuggestions.length && (!variantApprovalCheckbox || !variantApprovalCheckbox.checked)) {
            showMessage('Confirm the supplier product alternatives in the checkbox before saving.', true);
            return;
        }

        button.disabled = true;
        button.textContent = "Saving...";

        showMessage("Saving supplier quotations...");

        try {
            const response = await fetch(
                "../database/save-rfq-quotations.php",
                {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        rfq_number: rfqNumber,
                        confirm_catalog_aliases: aliasSuggestions.length > 0
                    })
                }
            );

            const data = await response.json();

            // Display missing products without a popup
            if (!response.ok || !data.success) {

                let errorMessage = data.message ||
                    "Unable to save quotations.";

                if (Array.isArray(data.missing) && data.missing.length) {
                    errorMessage += "\n\nMissing products:\n";
                    errorMessage += data.missing.join("\n");
                }

                throw new Error(errorMessage);
            }

            // Successfully saved: go directly to Comparison Matrix
            window.location.href =
                `comparison-matrix.html?rfq_number=${encodeURIComponent(rfqNumber)}`;

        } catch (error) {

            console.error("Save quotation error:", error);

            showMessage(error.message, true);

            button.disabled = false;
            button.innerHTML = originalButtonHTML;

            // Scroll to the error message
            message.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    });

    checkRFQ();

})();

