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
      // v11: Supplier on a linked Procurement PO must come from the approved PO, not Item Master.
      var procurementLinkedV11 = !!x.is_inventory_request &&
        String(x.destination || "").trim().toLowerCase() === "procurement";
      body.innerHTML =
        '<div class="form-grid"><label>Request Number<input readonly value="' +
        InventoryApp.esc(x.request_number || "") +
        '"></label><label>Destination<input readonly value="' +
        InventoryApp.esc(x.destination || "") +
        '"></label><label>Requested By<input readonly value="' +
        InventoryApp.esc(x.requester || "") +
        '"></label><label>Status<input readonly value="' +
        InventoryApp.esc(x.status || "") +
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
            // Pre-fill with the full approved quantity so "Confirm Delivery"
            // ships everything by default. A delivery that was already
            // recorded keeps its saved quantity for correction.
            var toDeliver = Number(it.delivered_quantity || 0) || target;
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
              '</small></div><label><small>Total Delivered</small><input type="number" min="0" max="' +
              target +
              '" step="1" value="' +
              toDeliver +
              '" data-ri="' +
              it.id +
              '" class="to-deliver-qty"></label></div>'
            );
          })
          .join("") +
        "</div>";
      // Inventory can confirm receipt only after the shipment is Out for Delivery.
      // Delivery confirmation records delivered quantities only. Raw-material
      // rejection is a separate action available after the delivery is complete.
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
      if (procurementLinkedV11 && canEdit) {
        var supplierFieldV11 = document.getElementById("inspectionSupplier");
        var saveButtonV11 = document.getElementById("saveDeliveryBtn");
        supplierFieldV11.readOnly = true;
        supplierFieldV11.value = "Verifying approved PO supplier...";
        saveButtonV11.disabled = true;
        InventoryApp.request("php/deliveries.php", {
          action: "po_supplier",
          po_number: x.po_number || "",
          request_number: x.request_number || ""
        }, "GET", function (result) {
          if (result && result.success && result.supplier_name) {
            supplierFieldV11.value = result.supplier_name;
            saveButtonV11.disabled = false;
          } else {
            supplierFieldV11.value = "Supplier verification unavailable";
            saveButtonV11.disabled = true;
            InventoryApp.toast((result && result.message) || "Cannot verify approved PO supplier. Receipt not saved.");
          }
        });
      } else {
        document.getElementById("saveDeliveryBtn").disabled = false;
      }
      document.getElementById("saveDeliveryBtn").onclick = function () {
        var items = [];
        var valid = true;
        body.querySelectorAll(".inspection-item").forEach(function (row) {
          var d = Number(row.querySelector(".to-deliver-qty").value || 0);
          if (!Number.isInteger(d) || d < 0) valid = false;
          items.push({
            request_item_id: Number(row.dataset.ri),
            delivered_quantity: d,
            accepted_quantity: d,
            rejected_quantity: 0,
            rejection_reason: "",
          });
        });
        if (!valid) {
          InventoryApp.toast("Enter valid whole-number delivered quantities.");
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
    function openRawMaterialRejection(id) {
      var x = rows.find(function (r) { return String(r.id) === String(id); });
      if (!x) return;
      var raw = (x.items || []).filter(function (i) {
        return String(i.item_type || "").toLowerCase() === "raw material";
      });
      var box = document.getElementById("rawMaterialRejectDetails");
      box.innerHTML = '<div class="form-grid"><label>Request Number<input readonly value="' +
        InventoryApp.esc(x.request_number || "") + '"></label><label>Supplier<input readonly value="' +
        InventoryApp.esc(raw.map(function (i) { return i.supplier_name || ""; }).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).join(", ")) +
        '"></label></div><p class="muted">Enter only the quantity being rejected. Rejected quantity cannot exceed delivered quantity.</p>' +
        raw.map(function (it) {
          var already = Number(it.inspection_rejected_quantity || 0);
          var delivered = Number(it.delivered_quantity || 0);
          return '<div class="delivery-item-editor reject-raw-row" data-ri="' + it.id + '">' +
            '<div><b>' + InventoryApp.esc(it.item_name || "") + '</b><small>Delivered: ' +
            InventoryApp.qty(delivered) + ' ' + InventoryApp.esc(it.unit || "") + '</small></div>' +
            '<label><small>Rejected Quantity</small><input class="reject-qty" type="number" min="0" max="' +
            delivered + '" step="1" value="' + already + '"></label>' +
            '<label class="reason-field"><small>Reason</small><input class="reject-reason" value="' +
            InventoryApp.esc(it.inspection_rejection_reason || "") + '" placeholder="Reason for rejection"></label></div>';
        }).join("");
      document.getElementById("saveRawMaterialRejectBtn").onclick = function () {
        var rejected = [], valid = true;
        box.querySelectorAll(".reject-raw-row").forEach(function (row) {
          var qty = Number(row.querySelector(".reject-qty").value || 0);
          var reason = row.querySelector(".reject-reason").value.trim();
          var max = Number(row.querySelector(".reject-qty").max || 0);
          if (!Number.isInteger(qty) || qty < 0 || qty > max || (qty > 0 && !reason)) valid = false;
          if (qty > 0) rejected.push({ request_item_id: Number(row.dataset.ri), rejected_quantity: qty, rejection_reason: reason });
        });
        if (!valid || !rejected.length) {
          InventoryApp.toast("Enter a valid rejected quantity and reason for at least one Raw Material.");
          return;
        }
        InventoryApp.request("php/deliveries.php", {
          action: "reject_raw_materials",
          id: id,
          items: JSON.stringify(rejected)
        }, "POST", function (r) {
          InventoryApp.toast(r.message || "Rejected quantities saved.");
          if (r.success) {
            InventoryApp.closeModal(document.getElementById("rawMaterialRejectModal"));
            load();
          }
        });
      };
      InventoryApp.openModal("rawMaterialRejectModal");
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
            var status = x.status,
              statusClass =
                status === "Accepted" ||
                status === "Delivered" ||
                status === "Out for Delivery"
                  ? "active"
                  : status === "Partially Delivered"
                    ? "partial"
                    : status === "To Ship"
                      ? "neutral"
                      : "low";
            var action = "";
            if (canControl && !!x.is_inventory_request) {
              if (x.status === "Out for Delivery" && !x.dr_id) {
                action = '<button class="action-btn" data-record="' + x.id + '">Confirm Receipt</button>';
              } else if (x.status === "Delivered" || x.dr_id) {
                action = '<button class="action-btn" type="button" disabled title="Receipt has already been confirmed">Delivered</button>';
              } else {
                action = '<button class="action-btn" type="button" disabled title="Confirm Receipt is available once the status becomes Out for Delivery">Confirm Receipt</button>';
              }
            } else if (canControl && !x.is_inventory_request && x.status === "To Ship") {
              action = '<button class="action-btn" data-record="' + x.id + '">Confirm Delivery</button>';
            }
            if (canControl && x.status === "Partially Delivered" && Number(x.remaining_balance_total || 0) > 0) {
              action = '<button class="action-btn primary-action" data-send-remaining-delivery="' + x.id + '">Send Remaining Balance (' + InventoryApp.qty(x.remaining_balance_total) + ')</button>';
            }
            var rawMaterials = (x.items || []).filter(function (i) {
              return String(i.item_type || "").toLowerCase() === "raw material";
            });
            if (canControl && x.is_inventory_request && x.status === "Delivered" && rawMaterials.length) {
              action = (x.rejection_report_status === "Email Sent")
                ? '<button class="action-btn" type="button" disabled title="Rejection notice already emailed">Email Sent</button>'
                : '<button class="action-btn primary-action" data-reject="' + x.id + '">' +
                  (x.rejection_report_id ? "Update Rejection" : "Reject Raw Materials") + '</button>';
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
      if (b.dataset.reject) {
        openRawMaterialRejection(b.dataset.reject);
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
