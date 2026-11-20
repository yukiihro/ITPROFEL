var DeliveryPage = {
  init: function () {
    var rows = [],
      role = "USER",
      canControl = false;
    function load() {
      InventoryApp.request(
        "php/deliveries.php",
        { action: "list" },
        "GET",
        function (r) {
          if (r.success) {
            rows = r.rows || [];
            render();
          }
        },
      );
    }
    function openRecord(id) {
      var x = rows.find(function (r) {
        return String(r.id) === String(id);
      });
      if (!x) return;
      var body = document.getElementById("deliveryRecordDetails");
      var supplier = (x.items || [])
        .map(function (it) {
          return it.supplier_name || "";
        })
        .filter(Boolean)
        .filter(function (v, i, a) {
          return a.indexOf(v) === i;
        })
        .join(", ");
      body.innerHTML =
        '<div class="form-grid"><label>Request Number<input readonly value="' +
        InventoryApp.esc(x.request_number || "") +
        '"></label><label>Destination<input readonly value="' +
        InventoryApp.esc(x.destination || "") +
        '"></label><label>Requested By<input readonly value="' +
        InventoryApp.esc(x.requester || "") +
        '"></label><label>Status<input readonly value="' +
        InventoryApp.esc(x.status === "Out for Delivery" ? "To Delivered" : (x.status === "Delivered" ? "Accepted Item" : (x.status || ""))) +
        '"></label>' +
        (String(x.destination || "").toLowerCase() === "procurement"
          ? '<label>PO Number<input readonly value="' +
            InventoryApp.esc(x.po_number || "Not assigned yet") +
            '"></label>'
          : "") +
        '<label>Supplier<input id="inspectionSupplier" value="' +
        InventoryApp.esc(supplier) +
        '" placeholder="Supplier name"></label></div><div class="delivery-items-editor">' +
        (x.items || [])
          .map(function (it) {
            var target = x.is_inventory_request
              ? Number(it.quantity || 0)
              : Number(it.approved_quantity || 0);
            var toDeliver = Number(it.delivered_quantity || 0);
            var rejected = Number(it.inspection_rejected_quantity || 0);
            // If this delivery has not been inspected yet, default all delivered
            // units to Accepted. Staff can still change the split and mark rejects.
            var isReceipt = !!x.is_inventory_request;
            var accepted = Number(it.inspection_accepted_quantity || 0);
            if (accepted === 0 && rejected === 0 && toDeliver > 0) accepted = toDeliver;
            return (
              '<div class="delivery-item-editor inspection-item" data-ri="' +
              it.id +
              '"><div><small>Item</small><b>' +
              InventoryApp.esc(it.item_name || "") +
              "</b><br><span>" +
              InventoryApp.esc(it.item_code || "") +
              "</span><small>Ordered / Approved: " +
              InventoryApp.qty(target) +
              " " +
              InventoryApp.esc(it.unit || "") +
              '</small></div><label><small>' + (isReceipt ? 'Delivered Items' : 'To Delivered') + '</small><input type="number" min="0" max="' +
            target +
            '" step="1" value="' +
            toDeliver +
            '" data-ri="' +
            it.id +
            '" class="to-deliver-qty"></label>' +
            (isReceipt
              ? '<label><small>Rejected Items</small><input type="number" min="0" max="' +
                target +
                '" step="1" value="' +
                rejected +
                '" class="inspection-rejected"></label><label class="reason-field"><small>Rejection Reason</small><input class="inspection-reason" value="' +
                InventoryApp.esc(it.inspection_rejection_reason || "") +
                '" placeholder="Reason (required if rejected)"></label>'
              : '') +
            '</div>'
            );
          })
          .join("") +
        "</div>";
      body.querySelectorAll(".inspection-item").forEach(function (row) {
        var toDeliver = row.querySelector(".to-deliver-qty"),
          rejected = row.querySelector(".inspection-rejected");
        function sync() {
          var d = Math.max(0, Number(toDeliver.value || 0));
          if (rejected) rejected.max = d;
        }
        toDeliver.addEventListener("input", sync);
        if (rejected) rejected.addEventListener("input", sync);
        sync();
      });
      var canEdit = canControl && (
        x.is_inventory_request
          ? x.status === "Out for Delivery"
          : x.status !== "Delivered"
      );
      document.getElementById("saveDeliveryBtn").style.display = canEdit
        ? "inline-flex"
        : "none";
      document.getElementById("saveDeliveryBtn").textContent = x.is_inventory_request
        ? "Confirm Receipt"
        : "Confirm Delivery";
      document.getElementById("saveDeliveryBtn").onclick = function () {
        var items = [];
        var valid = true;
        body.querySelectorAll(".inspection-item").forEach(function (row) {
          var d = Number(row.querySelector(".to-deliver-qty").value || 0),
            rejectedInput = row.querySelector(".inspection-rejected"),
            reasonInput = row.querySelector(".inspection-reason"),
            r = rejectedInput ? Number(rejectedInput.value || 0) : 0,
            a = d - r,
            reason = reasonInput ? reasonInput.value.trim() : "";
          if (
            !Number.isInteger(d) ||
            !Number.isInteger(a) ||
            !Number.isInteger(r) ||
            a + r !== d ||
            (r > 0 && !reason)
          )
            valid = false;
          items.push({
            request_item_id: Number(row.dataset.ri),
            delivered_quantity: d,
            accepted_quantity: a,
            rejected_quantity: r,
            rejection_reason: reason,
          });
        });
        if (!valid) {
          InventoryApp.toast(
            "Delivered quantity must equal Accepted + Rejected. Add a reason for every rejected item.",
          );
          return;
        }
        InventoryApp.request(
          "php/deliveries.php",
          {
            action: "record_delivery",
            id: id,
            items: JSON.stringify(items),
            supplier_name: document.getElementById("inspectionSupplier").value,
          },
          "POST",
          function (r) {
            InventoryApp.toast(r.message);
            if (r.success) {
              InventoryApp.closeModal(
                document.getElementById("deliveryRecordModal"),
              );
              load();
            }
          },
        );
      };
      InventoryApp.openModal("deliveryRecordModal");
    }
    function render() {
      var q = (
        document.getElementById("deliverySearch").value || ""
      ).toLowerCase();
      var data = rows.filter(function (x) {
        return JSON.stringify(x).toLowerCase().indexOf(q) >= 0;
      });
      document.getElementById("deliveryTable").innerHTML =
        data
          .map(function (x) {
            var status = x.status === "Out for Delivery" ? "To Delivered" : (x.status === "Delivered" ? "Accepted Item" : x.status),
              statusClass =
                status === "Accepted" ||
                status === "Accepted Item" ||
                status === "Delivered" ||
                status === "Out for Delivery" ||
                status === "Deliver Items"
                  ? "active"
                  : status === "Partially Delivered"
                    ? "partial"
                    : status === "To Ship"
                      ? "neutral"
                      : "low";
            var action = "";
            if (canControl && !!x.is_inventory_request) {
              if (x.status === "Delivered") {
                var hasPendingRawMaterial = (x.items || []).some(function (item) {
                  return String(item.item_type || "").toLowerCase() === "raw material" &&
                    Number(item.delivered_quantity || 0) > 0 &&
                    Number(item.rejected_action_quantity || 0) === 0;
                });
                if (hasPendingRawMaterial) {
                  action = '<button class="action-btn primary-action" data-reject-return="' + x.id + '">Reject</button>';
                }
              } else if (x.status === "Out for Delivery" && !x.dr_id) {
                action = '<button class="action-btn" data-record="' + x.id + '">Confirm Receipt</button>';
              } else if (x.status === "Delivered" || x.dr_id) {
                action = '<button class="action-btn" type="button" disabled title="Receipt has already been confirmed">Confirm Receipt</button>';
              } else {
                action = '<button class="action-btn" type="button" disabled title="Confirm Receipt is available once the status becomes Out for Delivery">Confirm Receipt</button>';
              }
            } else if (canControl && !x.is_inventory_request && x.status === "To Ship") {
              action = '<button class="action-btn" data-record="' + x.id + '">Confirm Delivery</button>';
            }
            if (canControl && x.status === "Partially Delivered" && Number(x.remaining_balance_total || 0) > 0) {
              action = '<button class="action-btn primary-action" data-send-remaining-delivery="' + x.id + '">Send Remaining Balance (' + InventoryApp.qty(x.remaining_balance_total) + ')</button>';
            }
            var itemText = (x.items || [])
              .map(function (i) { return i.item_name; })
              .join(", ");
            var sizeText = (x.items || [])
              .map(function (i) {
                var type = String(i.item_type || "").toLowerCase();
                return type === "finished good" ? (i.size || i.item_size || "----") : "----";
              })
              .filter(function (v, i, a) { return a.indexOf(v) === i; })
              .join(", ") || "----";
            var total = Number(x.qty_total || 0),
              remaining = Number(x.remaining_balance_total || 0);
            return (
              '<tr><td>' +
              (x.dr_id ? '<button class="action-btn dr-link" data-dr="' + x.dr_id + '">' + InventoryApp.esc(x.dr_number || "") + '</button>' : '—') +
              "</td><td>" +
              InventoryApp.esc(x.request_number) +
              "</td><td>" +
              InventoryApp.esc(x.requester || "") +
              "</td><td><b>" +
              InventoryApp.esc(x.destination || "") +
              "</b></td><td>" +
              InventoryApp.esc(x.recipient_name || "") +
              "</td><td>" +
              InventoryApp.esc(itemText) +
              "</td><td>" + InventoryApp.esc(sizeText) + "</td><td>" +
              InventoryApp.qty(total) +
              "</td><td>" +
              InventoryApp.qty(remaining) +
              "</td><td>" +
              InventoryApp.esc(x.expected_days || "") +
              '</td><td><span class="status ' +
              statusClass +
              '">' +
              InventoryApp.esc(status) +
              "</span></td><td>" +
              action +
              "</td></tr>"
            );
          })
          .join("") ||
        '<tr><td colspan="12" class="empty">No deliveries found.</td></tr>';
    }
    InventoryApp.session(function (r) {
      role = String(r.user.role || "USER").toUpperCase();
      canControl = !!r.user.can_control || role === "ADMIN";
      load();
      window.clearInterval(window.__deliveryTimer);
      window.__deliveryTimer = window.setInterval(load, 5000);
    });
    document.getElementById("deliverySearch").oninput = render;
    document.getElementById("deliveryTable").onclick = function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.record) {
        openRecord(b.dataset.record);
        return;
      }
      var rejectReturnId = b.dataset.rejectReturn;
      if (rejectReturnId) {
        var delivery = rows.find(function (r) {
          return String(r.id) === String(rejectReturnId);
        });
        if (!delivery || !delivery.items || !delivery.items.length) return;
        var itemSelect = document.getElementById("rejectReturnItem");
        var eligibleRawMaterials = delivery.items.filter(function (item) {
          return String(item.item_type || "").toLowerCase() === "raw material" &&
            Number(item.delivered_quantity || 0) > 0 &&
            Number(item.rejected_action_quantity || 0) === 0;
        });
        if (!eligibleRawMaterials.length) return;
        itemSelect.innerHTML = eligibleRawMaterials.map(function (item) {
          return '<option value="' + Number(item.id) + '">' +
            InventoryApp.esc(item.item_name || "") +
            '</option>';
        }).join("");
        document.getElementById("rejectReturnDetails").innerHTML =
          '<div class="form-grid"><label>Request Number<input readonly value="' +
          InventoryApp.esc(delivery.request_number || "") +
          '"></label><label>P.O. Number<input readonly value="' +
          InventoryApp.esc(delivery.po_number || "Not assigned yet") +
          '"></label><label>Delivery Receipt Number<input readonly value="' +
          InventoryApp.esc(delivery.dr_number || "Not available") +
          '"></label><label>Delivered Date<input readonly value="' +
          InventoryApp.esc(delivery.delivered_date || "") +
          '"></label></div>';
        function updateRejectReturnItem() {
          var selected = delivery.items.find(function (item) {
            return String(item.id) === String(itemSelect.value);
          });
          if (!selected) return;
          var delivered = Number(selected.delivered_quantity || 0);
          var accepted = Number(selected.inspection_accepted_quantity || 0);
          document.getElementById("rejectReturnDelivered").value = delivered;
          document.getElementById("rejectReturnAccepted").value = accepted;
          document.getElementById("rejectReturnAccepted").max = delivered;
          document.getElementById("rejectReturnQuantity").value = "";
        }
        itemSelect.onchange = updateRejectReturnItem;
        updateRejectReturnItem();
        document.getElementById("rejectReturnReason").value = "";
        document.getElementById("rejectReturnForm").onsubmit = function (event) {
          event.preventDefault();
          var selectedItemId = Number(itemSelect.value);
          var amount = Number(document.getElementById("rejectReturnQuantity").value);
          var acceptedCount = Number(document.getElementById("rejectReturnAccepted").value);
          var deliveredCount = Number(document.getElementById("rejectReturnDelivered").value);
          var reason = document.getElementById("rejectReturnReason").value.trim();
          var selectedItem = delivery.items.find(function (item) {
            return Number(item.id) === selectedItemId;
          });
          if (!selectedItem || !Number.isInteger(acceptedCount) || acceptedCount < 0 ||
              acceptedCount > deliveredCount || !Number.isInteger(amount) || amount < 1 ||
              amount > (deliveredCount - acceptedCount) || !reason) {
            InventoryApp.toast("Enter an accepted quantity not greater than delivered, a rejected quantity within the remaining delivered units, and a reason.");
            return;
          }
          InventoryApp.request("php/deliveries.php", {
            action: "reject_return",
            id: rejectReturnId,
            request_item_id: selectedItemId,
            item_action: "Reject",
            quantity: amount,
            accepted_quantity: acceptedCount,
            reason: reason
          }, "POST", function (r) {
            InventoryApp.toast(r.message || "Unable to save.");
            if (r.success) {
              InventoryApp.closeModal(document.getElementById("rejectReturnModal"));
              load();
            }
          });
        };
        InventoryApp.openModal("rejectReturnModal");
        return;
      }
      var remainingDeliveryId = b.dataset.sendRemainingDelivery;
      if (remainingDeliveryId) {
        if (!window.confirm("Send the remaining balance using the same request? No new request or approval will be created. The existing delivery will return to To Ship.")) return;
        InventoryApp.request(
          "php/requests.php",
          { action: "send_remaining_delivery", delivery_id: remainingDeliveryId },
          "POST",
          function (r) {
            InventoryApp.toast(r.message);
            if (r.success) load();
          },
        );
        return;
      }
      var dr = b.dataset.dr;
      if (dr) {
        InventoryApp.request(
          "php/delivery-receipts.php",
          { action: "details", id: dr },
          "GET",
          function (r) {
            if (!r.success) {
              InventoryApp.toast(r.message);
              return;
            }
            var d = r.receipt || {},
              items = d.items || [];
            document.getElementById("drDetails").innerHTML =
              '<div class="form-grid"><label>DR Number<input readonly value="' +
              InventoryApp.esc(d.dr_number || "") +
              '"></label><label>Receipt Date<input readonly value="' +
              InventoryApp.esc(d.receipt_date || "") +
              '"></label><label>Request Number<input readonly value="' +
              InventoryApp.esc(d.request_number || "") +
              '"></label><label>Destination<input readonly value="' +
              InventoryApp.esc(d.destination || "") +
              '"></label><label>Recipient<input readonly value="' +
              InventoryApp.esc(d.recipient_name || "") +
              '"></label><label>Requested By<input readonly value="' +
              InventoryApp.esc(d.requester || "") +
              '"></label></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Size</th><th>Warehouse</th><th>Location</th><th>Requested</th><th>Delivered</th><th>Unit</th></tr></thead><tbody>' +
              items
                .map(function (i) {
                  return (
                    "<tr><td>" +
                    InventoryApp.esc(i.item_name) +
                    "</td><td>" +
                    InventoryApp.esc(String(i.item_type || "").toLowerCase() === "finished good" ? (i.size || i.item_size || "----") : "----") +
                    "</td><td>" +
                    InventoryApp.esc(i.warehouse_name) +
                    "</td><td>" +
                    InventoryApp.esc(i.location || "") +
                    "</td><td>" +
                    InventoryApp.qty(i.quantity) +
                    "</td><td>" +
                    InventoryApp.qty(i.delivered_quantity || 0) +
                    "</td><td>" +
                    InventoryApp.esc(i.unit || "") +
                    "</td></tr>"
                  );
                })
                .join("") +
              "</tbody></table></div>";
            InventoryApp.openModal("drDetailsModal");
          },
        );
      }
    };
  },
};
document.addEventListener("DOMContentLoaded", function () {
  DeliveryPage.init();
});
