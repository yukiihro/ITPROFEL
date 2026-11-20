var RejectedReturnItemsPage = {
  init: function () {
    var rows = [];

    function render() {
      var search = (document.getElementById("rejectedReturnSearch").value || "").toLowerCase();
      var type = document.getElementById("rejectedReturnType").value;
      var sort = document.getElementById("rejectedReturnSort").value;
      var filtered = rows.filter(function (row) {
        return (!type || row.item_action === type) &&
          JSON.stringify(row).toLowerCase().indexOf(search) >= 0;
      });

      filtered.sort(function (a, b) {
        var dateA = new Date(a.dr_received_date || a.received_date || 0).getTime() || 0;
        var dateB = new Date(b.dr_received_date || b.received_date || 0).getTime() || 0;
        if (sort === "oldest") return dateA - dateB;
        if (sort === "item_asc") return String(a.item_name || "").localeCompare(String(b.item_name || ""));
        if (sort === "item_desc") return String(b.item_name || "").localeCompare(String(a.item_name || ""));
        if (sort === "type") return String(a.item_action || "").localeCompare(String(b.item_action || "")) || dateB - dateA;
        return dateB - dateA;
      });

      document.getElementById("rejectedReturnTable").innerHTML = filtered.map(function (r) {
        var actionLabel = r.item_action === "Return" ? "Return" : (r.item_action === "Inspection Reject" ? "Inspection Reject" : "Reject");
        return "<tr><td>" + InventoryApp.esc(r.dr_number || "—") +
          "</td><td>" + InventoryApp.esc(r.request_number || "—") +
          "</td><td>" + InventoryApp.esc(r.item_name || "—") +
          "</td><td>" + actionLabel +
          "</td><td>" + InventoryApp.qty(r.delivered_quantity) +
          "</td><td>" + InventoryApp.qty(r.accepted_quantity) +
          "</td><td>" + InventoryApp.qty(r.rejected_quantity || 0) +
          "</td><td>" + InventoryApp.esc(r.unit || "—") +
          "</td><td>" + InventoryApp.esc(r.rejection_reason || "—") +
          "</td><td>" + InventoryApp.esc(r.dr_received_date || r.received_date || "—") +
          "</td></tr>";
      }).join("") || '<tr><td colspan="10" class="empty">No rejected or returned items found.</td></tr>';
    }

    function load() {
      InventoryApp.request("php/reject-return-items.php", { action: "list" }, "GET", function (r) {
        if (r.success) {
          rows = r.rows || [];
          render();
        } else {
          InventoryApp.toast(r.message || "Unable to load rejected/return items.");
        }
      });
    }

    document.getElementById("rejectedReturnSearch").oninput = render;
    document.getElementById("rejectedReturnType").onchange = render;
    document.getElementById("rejectedReturnSort").onchange = render;
    document.getElementById("refreshRejectedReturn").onclick = load;
    load();
  }
};

InventoryApp.session(function (r) {
  if (r.user.can_control) {
    RejectedReturnItemsPage.init();
  } else {
    InventoryApp.toast("Warehouse Manager or Inventory Admin access is required.");
  }
});
