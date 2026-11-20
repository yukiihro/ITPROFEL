var RequestPage = {
  init: function () {
    var rows = [],
      returnRows = [],
      returnWarehouses = [],
      inspectingReturnId = null,
      role = "USER",
      canControl = false,
      currentUserId = 0,
      inventoryOwnEdit = false,
      form = document.getElementById("requestForm"),
      editing = null,
      approvalId = null,
      approvalWarehouse = null,
      allItems = [],
      activeView = "incoming",
      activeStatus = "",
      statusPages = { Approved: 1, Pending: 1 },
      pageSize = 3;
    function normalizeDestination(request) {
      var destination = String(request.destination || "").trim();
      if (destination) return destination;
      var source = [
        request.recipient_name,
        request.recipient_gmail,
        request.requester_team,
      ]
        .join(" ")
        .toLowerCase();
      if (source.indexOf("procurement") !== -1) return "Procurement";
      if (
        source.indexOf("production") !== -1 ||
        source.indexOf("team 3") !== -1
      )
        return "Production";
      if (source.indexOf("sales") !== -1) return "Sales";
      return "";
    }
    function loadOptions() {
      InventoryApp.loadWarehouses(function (ws) {
        var s = document.getElementById("requestWarehouse");
        s.innerHTML =
          '<option value="">Select warehouse</option>' +
          ws
            .map(function (x) {
              return (
                '<option value="' +
                x.id +
                '">' +
                InventoryApp.esc(x.warehouse_name) +
                (x.location ? " — " + InventoryApp.esc(x.location) : "") +
                "</option>"
              );
            })
            .join("");
      });
    }
    function load() {
      InventoryApp.request(
        "php/requests.php",
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
    function loadReturns() {
      InventoryApp.request("php/sales-returns.php", { action: "list" }, "GET", function (r) {
        if (!r.success) { InventoryApp.toast(r.message || "Unable to load Sales Returns."); return; }
        returnRows = r.rows || [];
        returnWarehouses = r.warehouses || [];
        var pending = returnRows.filter(function (x) { return x.status === "Pending"; }).length;
        var count = document.getElementById("returnTabCount");
        if (count) count.textContent = pending;
        if (activeView === "returns") render();
      });
    }
    function returnCard(x) {
      var itemHtml = (x.items || []).map(function (it) {
        var photoUrl = "php/sales-return-photo.php?item_id=" + encodeURIComponent(it.id);
        return '<div class="return-line"><label>ITEM<strong>' + InventoryApp.esc(it.item_name) + '</strong><small>' + InventoryApp.esc(it.item_code || "") + '</small></label><label>SIZE<strong>' + InventoryApp.esc(it.size || "—") + '</strong></label><label>QUANTITY<strong>' + InventoryApp.qty(it.quantity) + '</strong></label><label>DAMAGE DESCRIPTION<strong>' + InventoryApp.esc(it.damage_description || "—") + '</strong></label><div><span class="item-label">PHOTO EVIDENCE</span><a href="' + photoUrl + '" target="_blank" rel="noopener"><img class="return-photo" src="' + photoUrl + '" alt="Damage evidence"></a></div></div>';
      }).join("");
      var action = x.status === "Pending" && canControl ? '<button type="button" class="action-btn primary-action" data-inspect-return="' + x.id + '">Inspect &amp; Receive</button>' : '';
      var statusClassName = x.status === "Pending" ? "low" : (x.status === "Received" ? "active" : (x.status === "Partially Received" ? "low" : "critical"));
      return '<section class="request-card"><div class="request-card-head"><div class="request-title"><strong>' + InventoryApp.esc(x.return_number) + '</strong><span>Sales Return</span></div><span class="status ' + statusClassName + '">' + InventoryApp.esc(x.status) + '</span></div><div class="request-meta"><div><span>Return Date</span><b>' + InventoryApp.esc(x.return_date) + '</b></div><div><span>Sales Reference</span><b>' + InventoryApp.esc(x.sales_reference || "—") + '</b></div><div><span>Items</span><b>' + InventoryApp.esc(x.item_count) + '</b></div><div><span>Submitted</span><b>' + InventoryApp.esc(x.created_at || "—") + '</b></div><div><span>Inspected By</span><b>' + InventoryApp.esc(x.received_by_name || "—") + '</b></div></div><div class="return-card-items">' + itemHtml + '</div>' + (x.remarks ? '<div class="request-items"><p><b>Sales Remarks:</b> ' + InventoryApp.esc(x.remarks) + '</p></div>' : '') + '<div class="request-card-foot"><div class="request-actions">' + action + '</div></div></section>';
    }
    function renderReturns() {
      var table = document.getElementById("requestTable");
      var q = (document.getElementById("requestSearch").value || "").toLowerCase();
      var filtered = returnRows.filter(function (x) { return JSON.stringify(x).toLowerCase().indexOf(q) >= 0; });
      table.innerHTML = filtered.map(returnCard).join("") || '<div class="request-empty">No Sales Return transactions found.</div>';
    }
    function openReturnInspection(id) {
      var record = returnRows.find(function (x) { return String(x.id) === String(id); });
      if (!record || record.status !== "Pending") return;
      inspectingReturnId = Number(id);
      var html = '<p class="return-inspect-help">Check the damage photo, then split the returned quantity into accepted (restock) and rejected (damaged/not suitable for stock). The two quantities must equal the returned quantity.</p>';
      (record.items || []).forEach(function (it) {
        var whOptions = '<option value="">Select warehouse</option>' + returnWarehouses.map(function (w) { return '<option value="' + w.id + '">' + InventoryApp.esc(w.warehouse_name) + (w.location ? ' — ' + InventoryApp.esc(w.location) : '') + '</option>'; }).join("");
        var photoUrl = "php/sales-return-photo.php?item_id=" + encodeURIComponent(it.id);
        html += '<div class="return-inspect-item" data-return-item="' + it.id + '"><h4>' + InventoryApp.esc(it.item_name) + ' — Size ' + InventoryApp.esc(it.size || '—') + ' (Returned: ' + InventoryApp.qty(it.quantity) + ')</h4><div class="return-inspect-photo"><a href="' + photoUrl + '" target="_blank" rel="noopener"><img src="' + photoUrl + '" alt="Damage evidence"></a><div><b>Damage description</b><p>' + InventoryApp.esc(it.damage_description) + '</p></div></div><div class="return-inspect-line"><label>Accepted / Restock<input type="number" min="0" max="' + it.quantity + '" value="0" class="return-accepted" data-max="' + it.quantity + '"></label><label>Rejected / Damaged<input type="number" min="0" max="' + it.quantity + '" value="' + it.quantity + '" class="return-rejected" data-max="' + it.quantity + '"></label><label>Warehouse for accepted<select class="return-warehouse">' + whOptions + '</select></label><label>Inspection remarks<input type="text" class="return-inspection-remarks" maxlength="1000" placeholder="Optional remarks"></label></div></div>';
      });
      document.getElementById("returnInspectDetails").innerHTML = '<h4>' + InventoryApp.esc(record.return_number) + ' · ' + InventoryApp.esc(record.sales_reference || 'No sales reference') + '</h4>' + html;
      document.querySelectorAll(".return-accepted").forEach(function (input) {
        input.addEventListener("input", function () { var line = input.closest(".return-inspect-item"), max = Number(input.dataset.max), value = Math.max(0, Math.min(max, Number(input.value || 0))); line.querySelector(".return-rejected").value = max - value; });
      });
      document.querySelectorAll(".return-rejected").forEach(function (input) {
        input.addEventListener("input", function () { var line = input.closest(".return-inspect-item"), max = Number(input.dataset.max), value = Math.max(0, Math.min(max, Number(input.value || 0))); line.querySelector(".return-accepted").value = max - value; });
      });
      InventoryApp.openModal("returnInspectModal");
    }
    function expectedItemType(destination) {
      var d = String(destination || "")
        .trim()
        .toLowerCase();
      if (d === "procurement") return "Raw Material";
      if (d === "production" || d === "sales") return "Finished Good";
      return "";
    }
    function allowedItems() {
      var expected = expectedItemType(form.destination.value).toLowerCase();
      var source = allItems
        .filter(function (i) {
          return (
            String(i.status || "Active").toLowerCase() === "active" &&
            String(i.item_type || "").trim().toLowerCase() === expected
          );
        })
        .sort(function (a, b) {
          return Number(a.id) - Number(b.id);
        });

      // Finished Goods are selected by model here; the size is selected in
      // the separate Size field. Collapse the size-specific Item Master rows
      // so a model appears only once in this dropdown.
      if (expected !== "finished good") return source;
      var seenNames = Object.create(null);
      return source.filter(function (item) {
        var key = String(item.item_name || "").trim().toLowerCase();
        if (!key || seenNames[key]) return false;
        seenNames[key] = true;
        return true;
      });
    }
    function canonicalItemId(selected) {
      var selectedItem = allItems.find(function (item) {
        return String(item.id) === String(selected);
      });
      if (!selectedItem || String(selectedItem.item_type || "").toLowerCase() !== "finished good")
        return String(selected || "");
      var model = allowedItems().find(function (item) {
        return String(item.item_name || "").trim().toLowerCase() ===
          String(selectedItem.item_name || "").trim().toLowerCase();
      });
      return model ? String(model.id) : String(selected || "");
    }
    function selectionReady() {
      return !!(form.destination.value && form.warehouse_id.value);
    }
    function sizeOptionList(selected) {
      var o = '<option value="">Select size</option>';
      for (var n = 20; n <= 45; n++)
        o +=
          '<option value="' +
          n +
          '" ' +
          (String(selected) === String(n) ? "selected" : "") +
          ">" +
          n +
          "</option>";
      return o;
    }
    function updateItemSizeFields() {
      var needsSize =
        expectedItemType(form.destination.value).toLowerCase() === "finished good";
      document.querySelectorAll(".request-item-editor").forEach(function (d) {
        var size = d.querySelector(".request-item-size");
        var label = size ? size.closest("label") : null;
        if (label) label.hidden = !needsSize;
        if (size) {
          size.required = needsSize;
          size.disabled = !needsSize || !selectionReady() || !d.querySelector(".request-item-select").value;
          if (!needsSize) size.value = "";
        }
      });
    }
    function updateItemSelectionState() {
      var ready = selectionReady(),
        addBtn = document.getElementById("addRequestItemBtn");
      if (addBtn && !inventoryOwnEdit) addBtn.disabled = !ready;
      document.querySelectorAll(".request-item-editor").forEach(function (d) {
        var sel = d.querySelector(".request-item-select"),
          size = d.querySelector(".request-item-size");
        if (inventoryOwnEdit) return;
        if (!ready) {
          sel.value = "";
          size.value = "";
        }
        sel.disabled = !ready;
        size.disabled = !ready || !sel.value;
      });
    }
    function refreshItemEditors() {
      document.querySelectorAll(".request-item-select").forEach(function (sel) {
        var current = sel.value;
        sel.innerHTML = itemOptionList(current);
        if (
          !Array.from(sel.options).some(function (o) {
            return String(o.value) === String(current);
          })
        )
          sel.value = "";
        sel.dispatchEvent(new Event("change"));
      });
    }
    function itemOptionList(selected, usedIds) {
      var source = allowedItems();
      selected = canonicalItemId(selected);
      usedIds = (usedIds || []).map(canonicalItemId);
      return (
        '<option value="">Select Item</option>' +
        source
          .filter(function (i) {
            return String(i.id) === String(selected) || usedIds.indexOf(String(i.id)) < 0;
          })
          .map(function (i) {
            return (
              '<option value="' +
              i.id +
              '" ' +
              (String(i.id) === String(selected) ? "selected" : "") +
              ">" +
              InventoryApp.esc(i.item_name) +
              "</option>"
            );
          })
          .join("")
      );
    }
    function maxRequestItems() {
      return String(form.destination.value || "").toLowerCase() === "production" ? 4 : Infinity;
    }
    function refreshUniqueItemOptions() {
      var editors = Array.from(document.querySelectorAll(".request-item-editor"));
      var selectedIds = editors.map(function (editor) {
        return String(editor.querySelector(".request-item-select").value || "");
      });
      editors.forEach(function (editor, index) {
        var select = editor.querySelector(".request-item-select");
        var current = String(select.value || "");
        var usedByOthers = selectedIds.filter(function (id, i) {
          return id && i !== index;
        });
        select.innerHTML = itemOptionList(current, usedByOthers);
        select.value = current;
      });
      var addBtn = document.getElementById("addRequestItemBtn");
      if (addBtn) {
        var count = editors.length;
        var maxItems = maxRequestItems();
        addBtn.disabled = !selectionReady() || count >= maxItems;
        addBtn.title = count >= maxItems ? "A Production request can contain up to 4 different items." : (maxItems === 4 ? "Add another item (maximum 4 for Production)." : "Add another item.");
      }
    }
    function addItemEditor(item) {
      if (document.querySelectorAll(".request-item-editor").length >= maxRequestItems()) {
        InventoryApp.toast("A Production request can contain up to 4 different items only.");
        return;
      }
      var b = document.getElementById("requestItemBuilder"),
        d = document.createElement("div");
      item = item || {};
      d.className = "request-item-editor";
      d.innerHTML =
        '<label>Item<select class="request-item-select" required>' +
        itemOptionList(item.item_id || item.id || "") +
        '</select></label><label>Size<select class="request-item-size" required>' +
        sizeOptionList(/^\d+$/.test(String(item.size || "")) ? item.size : "") +
        '</select></label><label>Quantity<input class="request-item-qty" type="number" min="1" step="1" value="' +
        InventoryApp.esc(item.quantity || "") +
        '" required></label><label>Unit<input class="request-item-unit" value="' +
        InventoryApp.esc(item.unit || item.item_unit || "") +
        '" readonly></label><button type="button" class="remove-request-item" title="Remove item">×</button>';
      b.appendChild(d);
      var sel = d.querySelector(".request-item-select"),
        unit = d.querySelector(".request-item-unit");
      function syncUnit() {
        var it = allItems.find(function (x) {
          return String(x.id) === String(sel.value);
        });
        unit.value = it ? it.unit || "pcs" : "";
      }
      var sizeSel = d.querySelector(".request-item-size");
      sel.addEventListener("change", function () {
        syncUnit();
        sizeSel.disabled = !selectionReady() || !sel.value;
        if (!sel.value) sizeSel.value = "";
        refreshUniqueItemOptions();
      });
      syncUnit();
      updateItemSelectionState();
      updateItemSizeFields();
      d.querySelector(".remove-request-item").addEventListener(
        "click",
        function () {
          if (document.querySelectorAll(".request-item-editor").length <= 1) {
            InventoryApp.toast("A request must have at least one item.");
            return;
          }
          d.remove();
          refreshUniqueItemOptions();
        },
      );
      refreshUniqueItemOptions();
    }
    function collectItems() {
      var out = [],
        seenIds = {};
      document.querySelectorAll(".request-item-editor").forEach(function (d) {
        var itemId = d.querySelector(".request-item-select").value,
          qty = d.querySelector(".request-item-qty").value,
          size = d.querySelector(".request-item-size").value;
        var needsSize =
          expectedItemType(form.destination.value).toLowerCase() === "finished good";
        if (itemId && seenIds[itemId]) {
          InventoryApp.toast("Choose 4 different items. The same item cannot be selected twice.");
          out.invalidDuplicate = true;
          return;
        }
        if (itemId) seenIds[itemId] = true;
        if (itemId && (!needsSize || size) && Number.isInteger(Number(qty)) && Number(qty) > 0)
          out.push({
            item_id: Number(itemId),
            quantity: Number(qty),
            size: needsSize ? size : "",
          });
      });
      if (out.length > maxRequestItems()) {
        InventoryApp.toast("A Production request can contain up to 4 different items only.");
        out.invalidDuplicate = true;
      }
      return out;
    }
    function statusClass(x) {
      return x === "Approved"
        ? "active"
        : x === "Disapproved"
          ? "critical"
          : x === "Partially Approved"
            ? "warning"
            : "low";
    }
    function requestCard(x, own) {
      var items = x.items || [];
      var itemRows = items
        .map(function (item) {
          var size =
            item.item_type === "Raw Material" ? "----" : item.size || "----";
          var aq = Number(item.approved_quantity || 0),
            accepted = Number(item.accepted_quantity || 0),
            delivered = Number(item.delivered_quantity || 0),
            remaining = Math.max(
              0,
              Number(item.quantity || 0) - (delivered > 0 ? accepted : aq),
            );
          return (
            '<div class="request-item-row"><div><span class="item-label">CODE</span><strong>' +
            InventoryApp.esc(item.item_code || "—") +
            '</strong></div><div class="item-name-cell"><span class="item-label">ITEM</span><strong>' +
            InventoryApp.esc(item.item_name || "—") +
            '</strong></div><div><span class="item-label">SIZE</span><strong>' +
            InventoryApp.esc(size) +
            '</strong></div><div><span class="item-label">REQUESTED</span><strong>' +
            InventoryApp.qty(item.quantity) +
            '</strong></div><div><span class="item-label">APPROVED</span><strong>' +
            InventoryApp.qty(aq) +
            '</strong></div><div><span class="item-label">REMAINING BALANCE</span><strong>' +
            InventoryApp.qty(remaining) +
            '</strong></div><div><span class="item-label">UNIT</span><strong>' +
            InventoryApp.esc(item.unit || item.item_unit || "—") +
            '</strong></div><div class="warehouse-cell"><span class="item-label">WAREHOUSE</span><strong>' +
            InventoryApp.esc(item.warehouse_name || "—") +
            "</strong></div></div>"
          );
        })
        .join("");
      var actions = "";
      if (!own && canControl && x.status === "Pending") {
        actions +=
          '<button type="button" class="action-btn primary-action admin-only" data-approve="' +
          x.id +
          '">Approve</button>';
      }
      if (
        canControl &&
        x.status === "Pending" &&
        (!own || String(x.requester_team || "").toLowerCase() === "inventory")
      )
        actions +=
          '<button class="action-btn admin-only" data-edit="' +
          x.id +
          '">Edit</button>';
      if (own && x.status === "Pending")
        actions +=
          '<span class="request-note">Waiting for ' +
          InventoryApp.esc(x.destination || "destination team") +
          " to process</span>";
      if (own && x.status === "Partially Approved") {
        var remainingTotal = items.reduce(function (sum, item) {
          return sum + Math.max(0, Number(item.quantity || 0) - Number(item.approved_quantity || 0));
        }, 0);
        if (remainingTotal > 0)
          actions += '<button type="button" class="action-btn primary-action" data-send-remaining="' +
            x.id + '">Send Remaining Balance (' + InventoryApp.qty(remainingTotal) + ')</button>';
      }
      if (x.recipient_gmail)
        actions +=
          '<button class="action-btn" data-gmail="' +
          InventoryApp.esc(x.recipient_gmail) +
          '">Gmail</button>';
      var delivery = x.delivery_status
        ? "<div><span>Delivery</span><b>" +
          InventoryApp.esc(x.delivery_status) +
          "</b></div>"
        : "";
      return (
        '<section class="request-card"><div class="request-card-head"><div class="request-title"><strong>' +
        InventoryApp.esc(x.request_number) +
        "</strong><span>" +
        InventoryApp.esc(x.requester || "") +
        '</span></div><span class="status ' +
        statusClass(x.status) +
        '">' +
        InventoryApp.esc(x.status) +
        '</span></div><div class="request-meta"><div><span>Destination</span><b>' +
        InventoryApp.esc(x.destination || "—") +
        "</b></div><div><span>Requested By Team</span><b>" +
        InventoryApp.esc(x.requester_team || "—") +
        "</b></div><div><span>Recipient</span><b>" +
        InventoryApp.esc(x.recipient_name || "—") +
        "</b></div><div><span>P.O. Number</span><b>" +
        InventoryApp.esc(x.po_number || "Not yet provided") +
        "</b></div><div><span>Expected Delivery</span><b>" +
        InventoryApp.esc(x.expected_days || "—") +
        "</b></div><div><span>Items</span><b>" +
        items.length +
        "</b></div>" +
        delivery +
        '</div><div class="request-items">' +
        itemRows +
        '</div><div class="request-card-foot"><div class="request-actions">' +
        actions +
        "</div></div></section>"
      );
    }
    function render() {
      if (activeView === "returns") { renderReturns(); return; }
      var table = document.getElementById("requestTable");
      var q = (
        document.getElementById("requestSearch").value || ""
      ).toLowerCase();
      var ownMode = activeView === "inventory";
      var destinationFilter =
        (document.querySelector(".destination-filter.active") || {}).dataset
          ?.destination || "";
      var data = rows
        .map(function (x) {
          x.destination = normalizeDestination(x);
          return x;
        })
        .filter(function (x) {
          var own =
            String(x.requested_by || "") === String(currentUserId || "");
          return ownMode ? own : !own;
        })
        .filter(function (x) {
          return JSON.stringify(x).toLowerCase().indexOf(q) >= 0;
        })
        .filter(function (x) {
          return (
            !destinationFilter ||
            String(x.destination || "") === destinationFilter
          );
        });

      data.sort(function (a, b) {
        var ad = String(a.request_date || ""),
          bd = String(b.request_date || "");
        if (ad !== bd) return bd.localeCompare(ad);
        return Number(b.id || 0) - Number(a.id || 0);
      });
      var groups = { Approved: [], Pending: [] };
      data.forEach(function (x) {
        if (x.status === "Partially Approved" || x.status === "Approved")
          groups.Approved.push(x);
        else if (groups[x.status]) groups[x.status].push(x);
      });
      ["Approved", "Pending"].forEach(function (st) {
        var max = Math.max(1, Math.ceil(groups[st].length / pageSize));
        if (statusPages[st] > max) statusPages[st] = max;
      });
      function col(title, status, cls) {
        var selected = activeStatus === status;
        var page = statusPages[status] || 1,
          start = (page - 1) * pageSize,
          items = groups[status].slice(start, start + pageSize),
          pages = Math.max(1, Math.ceil(groups[status].length / pageSize));
        var body = "";
        if (selected) {
          body =
            items
              .map(function (x) {
                return requestCard(x, ownMode);
              })
              .join("") ||
            '<div class="request-empty">No ' +
              title.toLowerCase() +
              " requests.</div>";
          body +=
            '<div class="request-pager"><button type="button" class="pager-btn" data-page-status="' +
            status +
            '" data-page-dir="-1" ' +
            (page <= 1 ? "disabled" : "") +
            ">Previous</button><span>Page " +
            page +
            " of " +
            pages +
            '</span><button type="button" class="pager-btn" data-page-status="' +
            status +
            '" data-page-dir="1" ' +
            (page >= pages ? "disabled" : "") +
            ">Next</button></div>";
        }
        return (
          '<section class="request-column ' +
          cls +
          (selected ? " selected" : "") +
          '"><button type="button" class="request-column-head" data-status-tab="' +
          status +
          '" aria-expanded="' +
          (selected ? "true" : "false") +
          '"><h2>' +
          title +
          "</h2><span>" +
          groups[status].length +
          '</span></button><div class="request-column-body">' +
          body +
          "</div></section>"
        );
      }
      table.innerHTML =
        '<div class="request-columns ' +
        (activeStatus ? "status-open" : "status-closed") +
        '">' +
        col("Approved", "Approved", "approved-column") +
        col("Pending", "Pending", "pending-column") +
        "</div>";
    }

    function openNew() {
      editing = null;
      inventoryOwnEdit = false;
      form.destination.disabled = false;
      form.warehouse_id.disabled = false;
      document.getElementById("addRequestItemBtn").hidden = false;
      form.reset();
      document.getElementById("requestItemBuilder").innerHTML = "";
      addItemEditor();
      updateItemSelectionState();
      document.querySelector("#requestModal h3").textContent = "New Request";
      InventoryApp.openModal("requestModal");
    }
    function editRequest(id) {
      var x = rows.find(function (r) {
        return String(r.id) === String(id);
      });
      if (!x) return;
      inventoryOwnEdit =
        String(x.requested_by || "") === String(currentUserId || "") &&
        String(x.requester_team || "").toLowerCase() === "inventory";
      form.destination.disabled = inventoryOwnEdit;
      form.warehouse_id.disabled = inventoryOwnEdit;
      editing = id;
      form.destination.value = x.destination || "";
      form.recipient_name.value = x.recipient_name || "";
      form.recipient_gmail.value = x.recipient_gmail || "";
      form.expected_days.value = x.expected_days || "2-3 days";
      form.remarks.value = x.remarks || "";
      form.warehouse_id.value =
        x.items && x.items[0] ? x.items[0].warehouse_id || "" : "";
      document.getElementById("requestItemBuilder").innerHTML = "";
      (x.items || []).forEach(addItemEditor);
      if (!x.items || !x.items.length) addItemEditor();
      document.querySelectorAll(".request-item-editor").forEach(function (el) {
        el.querySelectorAll("select,input").forEach(function (input) {
          input.disabled = inventoryOwnEdit;
        });
        var remove = el.querySelector(".remove-request-item");
        if (remove) remove.hidden = inventoryOwnEdit;
      });
      document.getElementById("addRequestItemBtn").hidden = inventoryOwnEdit;
      updateItemSelectionState();
      document.querySelector("#requestModal h3").textContent = "Edit Request";
      InventoryApp.openModal("requestModal");
    }
    function closeApproval() {
      InventoryApp.closeModal(document.getElementById("approvalModal"));
      approvalId = null;
      approvalWarehouse = null;
      document.getElementById("confirmApprovalBtn").disabled = true;
    }
    function openApproval(id) {
      approvalId = id;
      approvalWarehouse = null;
      var details = document.getElementById("approvalDetails"),
        list = document.getElementById("approvalWarehouses"),
        confirm = document.getElementById("confirmApprovalBtn");
      details.innerHTML =
        '<div class="detail"><small>Loading request...</small></div>';
      list.innerHTML = "";
      confirm.disabled = true;
      InventoryApp.openModal("approvalModal");
      InventoryApp.request(
        "php/requests.php",
        { action: "approval_options", id: id },
        "GET",
        function (r) {
          if (!r.success) {
            InventoryApp.toast(r.message);
            closeApproval();
            return;
          }
          var q = r.request,
            items = r.items || [];
          details.innerHTML =
            '<div class="detail"><small>Request No.</small><b>' +
            InventoryApp.esc(q.request_number) +
            '</b></div><div class="detail"><small>Destination</small><b>' +
            InventoryApp.esc(q.destination) +
            '</b></div><div class="detail"><small>Send To</small><b>' +
            InventoryApp.esc(q.recipient_name || "") +
            '</b></div><div class="detail"><small>Items</small><b>' +
            items.length +
            " item(s)</b></div>";
          list.innerHTML =
            '<p class="approval-summary">Set the quantity that will be approved. The quantity not approved will appear as the Remaining Balance.</p><div class="approval-item-list">' +
              items
                .map(function (it) {
                  return (
                    '<div class="approval-item" data-ri="' +
                    it.id +
                    '"><div><small>Item</small><b>' +
                    InventoryApp.esc(it.item_code || it.item_name) +
                    "</b><br><span>" +
                    InventoryApp.esc(it.item_name || "") +
                    '</span></div><div><small>Requested (Locked)</small><input class="approval-requested" type="number" value="' +
                    InventoryApp.qty(it.quantity) +
                    '" readonly disabled tabindex="-1"></div><div><small>Approve Qty</small><input class="approval-qty" data-ri="' +
                    it.id +
                    '" type="number" min="0" max="' +
                    InventoryApp.qty(it.quantity) +
                    '" step="1" value="' +
                    InventoryApp.qty(it.quantity) +
                    '"></div><div><small>Remaining Balance</small><b class="approval-remaining" data-ri="' +
                    it.id +
                    '">' +
                    InventoryApp.qty(it.quantity) +
                    "</b></div></div>"
                  );
                })
                .join("") +
              '</div><div class="warehouse-choice-list">' +
              (r.warehouses || [])
                .map(function (w) {
                  var available = Number(w.available) === 1;
                  return (
                    '<label class="warehouse-choice ' +
                    (available ? "" : "disabled") +
                    '"><span><input type="radio" name="approvalWarehouse" value="' +
                    w.id +
                    '" ' +
                    (available ? "" : "disabled") +
                    "><b>" +
                    InventoryApp.esc(w.warehouse_name) +
                    "</b>" +
                    (w.location ? " — " + InventoryApp.esc(w.location) : "") +
                    '</span><span class="stock-info"><strong>' +
                    InventoryApp.esc(w.stock_summary || "") +
                    "</strong>" +
                    (w.stock_items || [])
                      .map(function (si) {
                        return (
                          "<span>" +
                          InventoryApp.esc(si.item_name) +
                          ": " +
                          InventoryApp.qty(si.available_qty) +
                          " available</span>"
                        );
                      })
                      .join("") +
                    "</span></label>"
                  );
                })
                .join("") ||
            '<div class="empty">No warehouse has stock for this request.</div></div>';
          list.querySelectorAll(".approval-qty").forEach(function (inp) {
            function syncRemaining() {
              var max = Number(inp.max || 0),
                v = parseInt(inp.value || 0, 10);
              if (!Number.isInteger(v)) v = 0;
              v = Math.max(0, Math.min(max, v));
              inp.value = v;
              var out = list.querySelector(
                '.approval-remaining[data-ri="' + inp.dataset.ri + '"]',
              );
              if (out) out.textContent = InventoryApp.qty(max - v);
            }
            inp.addEventListener("input", syncRemaining);
            syncRemaining();
          });
          list
            .querySelectorAll('input[name="approvalWarehouse"]')
            .forEach(function (input) {
              input.addEventListener("change", function () {
                approvalWarehouse = this.value;
                list
                  .querySelectorAll(".warehouse-choice")
                  .forEach(function (el) {
                    el.classList.remove("selected");
                  });
                this.closest(".warehouse-choice").classList.add("selected");
                confirm.disabled = false;
              });
            });
        },
      );
    }
    function renderDestinationFilters() {
      var bar = document.getElementById("destinationFilters");
      if (!bar) return;
      bar.hidden = activeView === "returns";
      var options = [];
      if (activeView === "incoming")
        options = ["", "Procurement", "Production", "Sales"];
      else if (activeView === "inventory")
        options = ["", "Procurement", "Production", "Sales"];
      else options = ["", "Procurement", "Production", "Sales"];
      var current =
        bar.querySelector(".destination-filter.active")?.dataset.destination ||
        "";
      if (options.indexOf(current) < 0) current = "";
      bar.innerHTML = options
        .map(function (d) {
          return (
            '<button type="button" class="destination-filter ' +
            (d === current ? "active" : "") +
            '" data-destination="' +
            InventoryApp.esc(d) +
            '">' +
            InventoryApp.esc(d || "All") +
            "</button>"
          );
        })
        .join("");
      bar.querySelectorAll(".destination-filter").forEach(function (b) {
        b.addEventListener("click", function () {
          bar.querySelectorAll(".destination-filter").forEach(function (x) {
            x.classList.toggle("active", x === b);
          });
          activeStatus = "";
          statusPages = { Approved: 1, Pending: 1 };
          render();
        });
      });
    }
    function switchView(view) {
      activeView = view;
      activeStatus = "";
      statusPages = { Approved: 1, Pending: 1 };
      document.querySelectorAll(".request-tab").forEach(function (b) {
        b.classList.toggle("active", b.dataset.view === view);
      });
      var addBtn = document.getElementById("addRequestBtn");
      if (addBtn) {
        addBtn.hidden = !(view === "inventory" && canControl);
        addBtn.style.display = addBtn.hidden ? "none" : "";
      }
      var search = document.getElementById("requestSearch");
      if (search) search.placeholder = view === "returns" ? "Search Sales Return" : "Search request";
      renderDestinationFilters();
      if (view === "returns") loadReturns();
      else render();
    }
    InventoryApp.session(function (r) {
      role = String(r.user.role || "USER").toUpperCase();
      canControl = !!r.user.can_control;
      currentUserId = Number(r.user.id || 0);
      var addBtn = document.getElementById("addRequestBtn");
      if (addBtn) {
        addBtn.hidden = true;
        addBtn.style.display = "none";
        addBtn.disabled = false;
        addBtn.onclick = function (e) {
          e.preventDefault();
          if (activeView !== "inventory") return;
          openNew();
        };
      }
      renderDestinationFilters();
      loadOptions();
      InventoryApp.loadItems(function (items) {
        allItems = items || [];
        load();
        loadReturns();
      });
    });
    document.getElementById("requestSearch").oninput = function () {
      activeStatus = "";
      statusPages = { Approved: 1, Pending: 1 };
      render();
    };
    document.querySelectorAll(".request-tab").forEach(function (b) {
      b.addEventListener("click", function () {
        switchView(b.dataset.view);
      });
    });
    document
      .getElementById("requestDestination")
      .addEventListener("change", function () {
        refreshItemEditors();
        updateItemSelectionState();
        updateItemSizeFields();
        refreshUniqueItemOptions();
      });
    document
      .getElementById("requestWarehouse")
      .addEventListener("change", updateItemSelectionState);
    document
      .getElementById("addRequestItemBtn")
      .addEventListener("click", function () {
        if (!selectionReady()) {
          InventoryApp.toast("Select a destination and a warehouse first.");
          return;
        }
        addItemEditor();
      });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var items = collectItems();
      if (items.invalidDuplicate) return;
      if (!items.length) {
        InventoryApp.toast("Please select an item, size and quantity.");
        return;
      }
      var action = editing ? "update" : "create";
      InventoryApp.request(
        "php/requests.php",
        {
          action: action,
          id: editing || "",
          items: JSON.stringify(items),
          destination: form.destination.value,
          warehouse_id: form.warehouse_id.value,
          recipient_name: form.recipient_name.value,
          recipient_gmail: form.recipient_gmail.value,
          expected_days: form.expected_days.value,
          remarks: form.remarks.value,
        },
        "POST",
        function (r) {
          InventoryApp.toast(r.message);
          if (r.success) {
            InventoryApp.closeModal(document.getElementById("requestModal"));
            inventoryOwnEdit = false;
            document.getElementById("addRequestItemBtn").hidden = false;
            load();
          }
        },
      );
    });
    document.getElementById("requestTable").onclick = function (e) {
      var tab = e.target.closest("[data-status-tab]");
      if (tab) {
        var nextStatus = tab.dataset.statusTab;
        activeStatus = activeStatus === nextStatus ? "" : nextStatus;
        statusPages[activeStatus] = statusPages[activeStatus] || 1;
        render();
        return;
      }
      var pager = e.target.closest("[data-page-status]");
      if (pager && !pager.disabled) {
        var st = pager.dataset.pageStatus;
        statusPages[st] = Math.max(
          1,
          (statusPages[st] || 1) + Number(pager.dataset.pageDir || 0),
        );
        render();
        return;
      }
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.inspectReturn) { openReturnInspection(b.dataset.inspectReturn); return; }
      if (b.dataset.approve) {
        openApproval(b.dataset.approve);
        return;
      }
      if (b.dataset.edit) {
        editRequest(b.dataset.edit);
        return;
      }
      if (b.dataset.sendRemaining) {
        var originalId = b.dataset.sendRemaining;
        if (!confirm("Send only the remaining unapproved quantities as a new request?")) return;
        b.disabled = true;
        InventoryApp.request("php/requests.php", { action: "send_remaining", id: originalId }, "POST", function (r) {
          InventoryApp.toast(r.message);
          if (r.success) load();
          else b.disabled = false;
        });
        return;
      }
      if (b.dataset.gmail) {
        window.open(
          "https://mail.google.com/mail/?view=cm&fs=1&to=" +
            encodeURIComponent(b.dataset.gmail),
          "_blank",
        );
      }
    };
    document.querySelectorAll(".approval-close").forEach(function (b) {
      b.addEventListener("click", closeApproval);
    });
    document
      .getElementById("confirmApprovalBtn")
      .addEventListener("click", function () {
        if (!approvalId || !approvalWarehouse) return;
        var chosen = document.querySelector(
          'input[name="approvalWarehouse"]:checked',
        );
        var warehouseName = chosen
          ? chosen.closest(".warehouse-choice").querySelector("b").textContent
          : "";
        var approvedQuantities = {},
          valid = true;
        document
          .getElementById("approvalWarehouses")
          .querySelectorAll(".approval-qty")
          .forEach(function (inp) {
            var max = Number(inp.max || 0),
              v = Number(inp.value || 0);
            if (!Number.isInteger(v) || v < 0 || v > max) valid = false;
            approvedQuantities[inp.dataset.ri] = v;
          });
        if (!valid) {
          InventoryApp.toast("Use whole-number approved quantities.");
          return;
        }
        var summary = Object.keys(approvedQuantities)
          .map(function (k) {
            var inp = document.querySelector(
                '.approval-qty[data-ri="' + k + '"]',
              ),
              max = Number(inp.max || 0),
              v = Number(inp.value || 0);
            return v + " approved / " + (max - v) + " remaining";
          })
          .join(", ");
        if (
          !confirm(
            "Confirm approval? " + summary + " from " + warehouseName + "?",
          )
        )
          return;
        var btn = this;
        btn.disabled = true;
        InventoryApp.request(
          "php/requests.php",
          {
            action: "approve",
            id: approvalId,
            warehouse_id: approvalWarehouse,
            approved_quantities: JSON.stringify(approvedQuantities),
          },
          "POST",
          function (r) {
            InventoryApp.toast(r.message);
            if (r.success) {
              closeApproval();
              load();
            } else btn.disabled = false;
          },
        );
      });
    document.querySelectorAll(".return-inspect-close").forEach(function (b) {
      b.addEventListener("click", function () { InventoryApp.closeModal(document.getElementById("returnInspectModal")); inspectingReturnId = null; });
    });
    document.getElementById("confirmReturnReceiveBtn").addEventListener("click", function () {
      if (!inspectingReturnId) return;
      var decisions = {}, valid = true;
      document.querySelectorAll(".return-inspect-item").forEach(function (line) {
        var accepted = line.querySelector(".return-accepted"), rejected = line.querySelector(".return-rejected"), wh = line.querySelector(".return-warehouse");
        var a = Number(accepted.value), r = Number(rejected.value), max = Number(accepted.dataset.max);
        if (!Number.isInteger(a) || !Number.isInteger(r) || a < 0 || r < 0 || a + r !== max || (a > 0 && !wh.value)) valid = false;
        decisions[line.dataset.returnItem] = { accepted_quantity:a, rejected_quantity:r, warehouse_id:wh.value, inspection_remarks:line.querySelector(".return-inspection-remarks").value };
      });
      if (!valid) { InventoryApp.toast("Accepted and rejected quantities must equal the returned quantity. Select a warehouse when accepting stock."); return; }
      if (!confirm("Confirm inspection? Only accepted quantities will be added to warehouse stock.")) return;
      var btn = this; btn.disabled = true;
      InventoryApp.request("php/sales-returns.php", { action:"receive", id:inspectingReturnId, decisions:JSON.stringify(decisions) }, "POST", function (r) {
        InventoryApp.toast(r.message); btn.disabled = false;
        if (r.success) { InventoryApp.closeModal(document.getElementById("returnInspectModal")); inspectingReturnId = null; loadReturns(); }
      });
    });
  },
};
document.addEventListener("DOMContentLoaded", function () {
  RequestPage.init();
});
