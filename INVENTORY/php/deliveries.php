<?php
require_once "database.php";
require_once __DIR__ . "/procurement-po-supplier-bridge-v11.php";
require_login();
$action = $_REQUEST["action"] ?? "list";
function delivery_target_qty($it)
{
  $aq = (int)($it["approved_quantity"] ?? 0);
  return $aq > 0 ? $aq : (int)$it["quantity"];
}
function ensure_delivery_receipt($pdo, $deliveryId, $requestId)
{
  $find = $pdo->prepare("SELECT id FROM delivery_receipts WHERE delivery_id=? LIMIT 1");
  $find->execute([$deliveryId]);
  if ($find->fetchColumn()) return;
  $number = "DR-" . date("YmdHis") . "-" . $deliveryId;
  $pdo->prepare("INSERT INTO delivery_receipts(dr_number,delivery_id,request_id,receipt_date) VALUES(?,?,?,CURDATE())")
       ->execute([$number, $deliveryId, $requestId]);
}
function sync_delivery_status($pdo, $deliveryId, $notify = true)
{
  $q = $pdo->prepare("SELECT d.*,r.request_number,r.requested_by,r.requester_team,r.destination,r.recipient_gmail FROM deliveries d JOIN requests r ON r.id=d.request_id WHERE d.id=? FOR UPDATE");
  $q->execute([$deliveryId]);
  $d = $q->fetch();
  if (!$d) return null;
  return $d;
}
function delivery_rows($pdo)
{
  $sql = "SELECT d.*,r.request_number,r.status request_status,r.recipient_name,r.recipient_gmail,r.destination,r.requester_team,r.po_number,COALESCE(NULLIF(u.full_name,''),NULLIF(r.requester_team,''),NULLIF(r.recipient_name,''),'—') requester FROM deliveries d JOIN requests r ON r.id=d.request_id LEFT JOIN users u ON u.id=r.requested_by WHERE (r.status IN ('Approved','Partially Approved') OR (LOWER(COALESCE(r.requester_team,''))='inventory' AND r.status='Pending')) AND COALESCE(r.remarks,'') NOT LIKE '%DEMO SAMPLE%' AND COALESCE(d.remarks,'') NOT LIKE '%DEMO SAMPLE%' AND LOWER(COALESCE(r.remarks,'')) NOT LIKE '%sample%' AND LOWER(COALESCE(d.remarks,'')) NOT LIKE '%sample%' AND COALESCE(r.request_number,'') NOT LIKE 'REQ-DEMO-%'";
  $p = [];
  if (!can_control_session($pdo)) {
    $sql .= " AND r.requested_by=?";
    $p[] = $_SESSION["user_id"];
  }
  $sql .= " ORDER BY d.updated_at DESC";
  $s = $pdo->prepare($sql);
  $s->execute($p);
  $rows = $s->fetchAll();
  foreach ($rows as &$row) {
    $q = $pdo->prepare("SELECT ri.id,ri.item_name,ri.quantity,ri.approved_quantity,ri.rejected_quantity,ri.delivered_quantity,ri.accepted_quantity,ri.inspection_accepted_quantity,ri.inspection_rejected_quantity,ri.inspection_rejection_reason,ri.unit,ri.size,i.item_code,i.item_type,i.size item_size,i.supplier_name,w.warehouse_name,w.location FROM request_items ri LEFT JOIN items i ON i.id=ri.item_id LEFT JOIN warehouses w ON w.id=ri.warehouse_id WHERE ri.request_id=? ORDER BY ri.id");
    $q->execute([$row["request_id"]]);
    $row["items"] = $q->fetchAll();
    $isInventory = strtolower(trim((string)($row["requester_team"] ?? ""))) === "inventory";
    $row["is_inventory_request"] = $isInventory ? 1 : 0;
    $row["total_items"] = count($row["items"]);
    $row["complete_items"] = 0;
    $row["has_partial"] = false;
    $row["all_delivered"] = true;
    $row["remaining_balance_total"] = 0;
    $row["qty_total"] = 0;
    foreach ($row["items"] as &$it) {
      $target = $isInventory ? (int)$it["quantity"] : (int)$it["approved_quantity"];
      // Older records may have inspection_accepted_quantity populated while accepted_quantity is still 0.
      // Use the higher confirmed accepted quantity so a complete delivery is not shown as partial.
      $acceptedRecorded = max(
        (int)($it["accepted_quantity"] ?? 0),
        (int)($it["inspection_accepted_quantity"] ?? 0)
      );
      // Remaining balance is based on the approved delivery target minus the
      // physical quantity already delivered. Rejected units were still delivered,
      // so they remain part of the delivered quantity.
      $remaining = max(0, $target - (int)($it["delivered_quantity"] ?? 0));
      $it["remaining_balance"] = $remaining;
      $it["delivery_target"] = $target;
      $row["remaining_balance_total"] += $remaining;
      $row["qty_total"] += $target;
      $del = (int)$it["delivered_quantity"];
      if ($del > 0 && $del < $target) $row["has_partial"] = true;
      if ($del < $target) $row["all_delivered"] = false;
      if ($del >= $target) $row["complete_items"]++;
    }
    unset($it);
    if ($isInventory) {
      // Shipment status reflects physical quantities only:
      // short shipment = Partially Delivered; full shipment = Out for Delivery
      // until the Confirm Receipt form is completed, then Delivered.
      $allShipped = true;
      $anyShipped = false;
      foreach ($row["items"] as $it) {
        $target = (int)$it["quantity"];
        $shipped = (int)($it["delivered_quantity"] ?? 0);
        if ($shipped > 0) $anyShipped = true;
        if ($shipped < $target) $allShipped = false;
      }
      // A complete shipment is NOT a completed receipt. Inventory must open
      // Confirm Receipt and save Delivered / Accepted / Rejected quantities.
      // Only the explicit receipt-confirmation timestamp may finalize it.
      if (!empty($row["receipt_confirmed_at"])) $row["status"] = "Delivered";
      elseif ($allShipped && $anyShipped) $row["status"] = "Out for Delivery";
      elseif ($anyShipped) $row["status"] = "Partially Delivered";
      else $row["status"] = "To Ship";
    } else {
      $any = false;
      $all = true;
      foreach ($row["items"] as $it) {
        $target = $isInventory ? (int)$it["quantity"] : (int)$it["approved_quantity"];
        $del = (int)$it["delivered_quantity"];
        if ($del > 0) $any = true;
        if ($del < $target) $all = false;
      }
      if (!empty($row["received_date"])) $row["status"] = "Delivered";
      elseif (($row["status"] ?? "") === "To Ship") $row["status"] = "To Ship";
      elseif ($all && $any) $row["status"] = "Out for Delivery";
      elseif ($any) $row["status"] = "Partially Delivered";
      else $row["status"] = "To Ship";
    }
    $drSql = $isInventory
      ? "SELECT id,dr_number FROM delivery_receipts WHERE delivery_id=? AND EXISTS (SELECT 1 FROM deliveries dx WHERE dx.id=? AND dx.receipt_confirmed_at IS NOT NULL)"
      : "SELECT id,dr_number FROM delivery_receipts WHERE delivery_id=? AND EXISTS (SELECT 1 FROM deliveries dx WHERE dx.id=? AND dx.status='Delivered')";
    $dr = $pdo->prepare($drSql);
    $dr->execute([$row["id"], $row["id"]]);
    $receipt = $dr->fetch();
    $row["dr_id"] = $receipt["id"] ?? null;
    $row["dr_number"] = $receipt["dr_number"] ?? "";
    $rb = $pdo->prepare("SELECT received_by FROM delivery_receipts WHERE delivery_id=?");
    $rb->execute([$row["id"]]);
    $row["received_by"] = (string)$rb->fetchColumn();
    if (!$isInventory && $row["received_by"] !== "") $row["status"] = "Delivered";
  }
  return $rows;
}

// v11: Only authorized Inventory staff can ask the server for the authoritative PO supplier.
if ($action === "po_supplier") {
  require_admin();
  try {
    $po = trim((string)($_GET["po_number"] ?? ""));
    $request = trim((string)($_GET["request_number"] ?? ""));
    $supplier = inventoryPoSupplierV11($po, $request);
    json_response(["success" => true, "po_number" => $po, "supplier_name" => $supplier]);
  } catch (Throwable $e) {
    error_log('v11 Inventory supplier lookup: ' . $e->getMessage());
    json_response(["success" => false, "message" => "Could not verify supplier from Procurement PO. Check server configuration."], 409);
  }
}
if ($action === "list") {
  json_response(["success" => true, "rows" => delivery_rows($pdo)]);
}


if ($action === "update") {
  require_admin();
  $id = (int)post_value("id");
  $status = post_value("status");
  $allowed = ["To Ship", "Out for Delivery", "Partially Delivered", "Delivered"];
  if (!in_array($status, $allowed, true)) json_response(["success" => false, "message" => "Invalid delivery status."], 422);
  $pdo->beginTransaction();
  try {
    $d = sync_delivery_status($pdo, $id, false);
    if (!$d) throw new Exception("Delivery not found.");
    if ($status === "Delivered" && $d["status"] !== "Delivered") throw new Exception("Delivery status is automatic. Record the actual delivered quantities first.");
    if ($status === "Out for Delivery" && $d["status"] === "To Ship") {
      $pdo->prepare("UPDATE deliveries SET status='Out for Delivery',shipped_date=COALESCE(shipped_date,CURDATE()),out_for_delivery_date=CURDATE() WHERE id=?")->execute([$id]);
    }
    $pdo->commit();
    json_response(["success" => true, "message" => "Delivery status updated automatically from the recorded quantities."]);
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(["success" => false, "message" => $e->getMessage()], 422);
  }
}

if ($action === "record_delivery") {
  require_admin();
  $id = (int)post_value("id");
  $items = json_decode(post_value("items", "[]"), true);
  if (!is_array($items)) json_response(["success" => false, "message" => "Invalid delivery quantities."], 422);
  $pdo->beginTransaction();
  try {
    $q = $pdo->prepare("SELECT d.*,r.request_number,r.requested_by,r.requester_team,r.destination,r.recipient_gmail,r.po_number FROM deliveries d JOIN requests r ON r.id=d.request_id WHERE d.id=? FOR UPDATE");
    $q->execute([$id]);
    $d = $q->fetch();
    if (!$d) throw new Exception("Delivery not found.");
    $isInventoryRequest = strtolower(trim((string)($d["requester_team"] ?? ""))) === "inventory";
    $legacyDeliveredButUnconfirmed = $isInventoryRequest
      && ($d["status"] ?? "") === "Delivered"
      && empty($d["receipt_confirmed_at"]);
    if ($isInventoryRequest && ($d["status"] ?? "") !== "Out for Delivery" && !$legacyDeliveredButUnconfirmed) {
      throw new Exception("Confirm Receipt is available only when the delivery status is Out for Delivery. Complete the shipment first if quantities are missing.");
    }
    // v11: The Inventory Item Master is NOT the authoritative supplier for a Procurement PO.
    // Fail closed: never finalize a Procurement-linked receipt/rejection with an unverified supplier.
    $procurementLinkedV11 = $isInventoryRequest
      && strcasecmp(trim((string)($d["destination"] ?? "")), "Procurement") === 0;
    $supplierFromPoV11 = null;
    if ($procurementLinkedV11) {
      $supplierFromPoV11 = inventoryPoSupplierV11(
        trim((string)($d["po_number"] ?? "")),
        trim((string)($d["request_number"] ?? ""))
      );
    }
    $s = $pdo->prepare("SELECT id,approved_quantity,quantity,delivered_quantity FROM request_items WHERE request_id=? FOR UPDATE");
    $s->execute([$d["request_id"]]);
    $expected = [];
    foreach ($s->fetchAll() as $it) $expected[(int)$it["id"]] = $isInventoryRequest ? (int)$it["quantity"] : (int)$it["approved_quantity"];
    $update = $pdo->prepare("UPDATE request_items SET delivered_quantity=?,accepted_quantity=?,inspection_accepted_quantity=?,inspection_rejected_quantity=?,inspection_rejection_reason=? WHERE id=? AND request_id=?");
    $seen = [];
    $rejectedItems = [];
    $inspectionItems = [];
    $supplierNames = [];
    foreach ($items as $it) {
      $ri = (int)($it["request_item_id"] ?? 0);
      $raw = $it["delivered_quantity"] ?? null;
      $qty = (int)$raw;
      $acceptedRaw = $it["accepted_quantity"] ?? $qty;
      $rejectedRaw = $it["rejected_quantity"] ?? 0;
      $accepted = (int)$acceptedRaw;
      $rejected = (int)$rejectedRaw;
      $reason = trim((string)($it["rejection_reason"] ?? ""));
      if (!isset($expected[$ri]) || !is_numeric($raw) || ((string)$qty !== (string)$raw) || $qty < 0 || $qty > $expected[$ri] || $accepted < 0 || $rejected < 0 || $accepted + $rejected !== $qty || ((string)$accepted !== (string)$acceptedRaw) || ((string)$rejected !== (string)$rejectedRaw)) throw new Exception("Inspection quantities are invalid. Accepted + Rejected must equal Delivered, using whole numbers only.");
      if ($rejected > 0 && $reason === "") throw new Exception("Please provide a rejection reason for every rejected item.");
      // Inventory-originated requests are received by Inventory immediately.
      // Requests from Production/Sales stay unaccepted until that team confirms receipt.
      $acceptedForRequest = $isInventoryRequest ? $accepted : 0;
      // Keep the received quantities and inventory ledger in sync. For an
      // Inventory-originated request (Production -> Inventory), only accepted
      // units are posted to on-hand stock; rejected units remain in Rejected Items.
      $qitem = $pdo->prepare("SELECT ri.item_id,ri.item_name,ri.size,ri.quantity,ri.unit,ri.warehouse_id,i.item_type,i.size item_master_size,i.supplier_name FROM request_items ri LEFT JOIN items i ON i.id=ri.item_id WHERE ri.id=? AND ri.request_id=? FOR UPDATE");
      $qitem->execute([$ri, $d["request_id"]]);
      $detail = $qitem->fetch();
      if (!$detail) throw new Exception("A requested item could not be found while saving the receipt.");

      // Resolve Finished Goods by the size saved on the request line, not by
      // the possibly stale/base item_id. This keeps Item Master, Stock In,
      // Inventory balance and Stock Movement on the exact same size variant.
      $itemId = (int)($detail["item_id"] ?? 0);
      $requestedSize = trim((string)($detail["size"] ?? ""));

      // Do not trust request_items.item_id to identify a shoe-size variant.
      // Older requests and integrations may retain the base/first-size ID even
      // though request_items.size contains the exact size ordered. Resolve the
      // Finished Good variant by normalized item name + exact requested size
      // before writing ANY inventory ledger entry.
      $isFinishedGood = strtolower(trim((string)($detail["item_type"] ?? ""))) === "finished good";
      if (!$isFinishedGood && $requestedSize !== "") {
        $fgExists = $pdo->prepare("SELECT 1 FROM items WHERE LOWER(TRIM(item_name))=LOWER(TRIM(?)) AND item_type='Finished Good' LIMIT 1");
        $fgExists->execute([$detail["item_name"]]);
        $isFinishedGood = (bool)$fgExists->fetchColumn();
      }

      if ($isFinishedGood) {
        if ($requestedSize === "") {
          throw new Exception("The requested shoe size is missing for {$detail["item_name"]}. Please correct the request item before confirming receipt.");
        }
        $variantQuery = $pdo->prepare("SELECT id,item_code,item_name,item_type,size,unit,supplier_name FROM items WHERE LOWER(TRIM(item_name))=LOWER(TRIM(?)) AND item_type='Finished Good' AND status='Active' AND TRIM(COALESCE(size,''))=TRIM(?) ORDER BY id");
        $variantQuery->execute([$detail["item_name"], $requestedSize]);
        $variants = $variantQuery->fetchAll();
        if (count($variants) !== 1) {
          throw new Exception("Cannot post {$detail["item_name"]} size {$requestedSize}: expected exactly one active matching Finished Goods record in Item Master, found " . count($variants) . ". Please correct Item Master first.");
        }
        $variant = $variants[0];
        $itemId = (int)$variant["id"];
        $detail["item_type"] = $variant["item_type"];
        $detail["item_master_size"] = $variant["size"];
        $detail["unit"] = $variant["unit"] ?: $detail["unit"];
        $detail["supplier_name"] = $variant["supplier_name"];
        if ((int)($detail["item_id"] ?? 0) !== $itemId) {
          $pdo->prepare("UPDATE request_items SET item_id=? WHERE id=? AND request_id=?")->execute([$itemId, $ri, $d["request_id"]]);
          $detail["item_id"] = $itemId;
        }
      }

      if ($isInventoryRequest && $accepted > 0) {
        $warehouseId = (int)($detail["warehouse_id"] ?? 0);
        if ($itemId <= 0 || $warehouseId <= 0) {
          throw new Exception("The item or receiving warehouse is not linked correctly. Please check the request before confirming receipt.");
        }
        // The stock-in ledger is the idempotency source: a repeated save must
        // add only the newly accepted difference, never duplicate old receipt.
        $posted = $pdo->prepare("SELECT COALESCE(SUM(quantity),0) FROM stock_in WHERE reference_number=? AND item_id=? AND warehouse_id=?");
        $posted->execute([$d["request_number"], $itemId, $warehouseId]);
        $alreadyPosted = (int)$posted->fetchColumn();
        if ($accepted < $alreadyPosted) {
          throw new Exception("The accepted quantity is lower than the quantity already posted to stock for {$detail["item_name"]}. Please ask an administrator to review this receipt.");
        }
        $stockInDelta = $accepted - $alreadyPosted;
        if ($stockInDelta > 0) {
          $stockInNumber = "SIN-" . (int)$id . "-" . $ri . "-" . $accepted;
          $receiptRemarks = "Received from Production; Request " . $d["request_number"] .
            (!empty($d["po_number"]) ? "; P.O. " . $d["po_number"] : "") .
            "; accepted quantity cumulative " . $accepted;
          $pdo->prepare("INSERT INTO stock_in(stock_in_number,item_id,warehouse_id,quantity,unit,supplier,reference_number,remarks,date,user_id) VALUES(?,?,?,?,?,?,?,?,?,?)")
            ->execute([$stockInNumber, $itemId, $warehouseId, $stockInDelta, $detail["unit"] ?? "pcs", "", $d["request_number"], $receiptRemarks, date("Y-m-d"), $_SESSION["user_id"]]);
          $pdo->prepare("INSERT INTO inventory(item_id,warehouse_id,quantity) VALUES(?,?,?) ON DUPLICATE KEY UPDATE quantity=quantity+VALUES(quantity)")
            ->execute([$itemId, $warehouseId, $stockInDelta]);
          $pdo->prepare("INSERT INTO stock_movements(item_id,warehouse_id,movement_type,quantity,unit,reference_number,remarks,date,user_id) VALUES(?,?,?,?,?,?,?,?,?)")
            ->execute([$itemId, $warehouseId, "STOCK IN", $stockInDelta, $detail["unit"] ?? "pcs", $d["request_number"], $receiptRemarks, date("Y-m-d"), $_SESSION["user_id"]]);
        }
      }

      $update->execute([$qty, $acceptedForRequest, $accepted, $rejected, $reason, $ri, $d["request_id"]]);
      $seen[$ri] = true;
      $line = ["request_item_id" => $ri, "item_name" => $detail["item_name"], "ordered_quantity" => (int)$detail["quantity"], "delivered_quantity" => $qty, "accepted_quantity" => $accepted, "rejected_quantity" => $rejected, "unit" => $detail["unit"], "rejection_reason" => $reason];
      $inspectionItems[] = $line;
      if ($rejected > 0) {
        $rejectedItems[] = $line;
        if (!empty($detail["supplier_name"])) $supplierNames[] = $detail["supplier_name"];
      }
    }

    if (count($rejectedItems)) {
      $po = strtolower(trim((string)($d["destination"] ?? ""))) === "procurement" ? trim((string)($d["po_number"] ?? "")) : "";
      $supplier = $procurementLinkedV11 ? $supplierFromPoV11 : trim((string)post_value("supplier_name"));
      $receivedDate = trim((string)post_value("received_date")) ?: date("Y-m-d");
      if ($supplier === "") $supplier = implode(", ", array_values(array_unique($supplierNames)));
      $find = $pdo->prepare("SELECT id FROM supplier_rejections WHERE delivery_id=?");
      $find->execute([$id]);
      $existing = (int)$find->fetchColumn();
      if ($existing) {
        $pdo->prepare("UPDATE supplier_rejections SET po_number=?,supplier_name=?,received_date=?,report_status='Pending',supplier_response=NULL,email_sent_at=NULL,supplier_response_at=NULL,created_by=? WHERE id=?")->execute([$po, $supplier, $receivedDate, $_SESSION["user_id"], $existing]);
        $rejectionId = $existing;
        $pdo->prepare("DELETE FROM supplier_rejection_items WHERE rejection_id=?")->execute([$rejectionId]);
      } else {
        $pdo->prepare("INSERT INTO supplier_rejections(request_id,delivery_id,po_number,supplier_name,received_date,created_by) VALUES(?,?,?,?,?,?)")->execute([$d["request_id"], $id, $po, $supplier, $receivedDate, $_SESSION["user_id"]]);
        $rejectionId = (int)$pdo->lastInsertId();
        $reportNumber = "RR-" . date("Y") . "-" . str_pad((string)$rejectionId, 3, "0", STR_PAD_LEFT);
        $pdo->prepare("UPDATE supplier_rejections SET report_number=? WHERE id=?")->execute([$reportNumber, $rejectionId]);
      }
      $insReject = $pdo->prepare("INSERT INTO supplier_rejection_items(rejection_id,request_item_id,item_name,ordered_quantity,delivered_quantity,accepted_quantity,rejected_quantity,unit,rejection_reason) VALUES(?,?,?,?,?,?,?,?,?)");
      foreach ($inspectionItems as $ri) $insReject->execute([$rejectionId, $ri["request_item_id"], $ri["item_name"], $ri["ordered_quantity"], $ri["delivered_quantity"], $ri["accepted_quantity"], $ri["rejected_quantity"], $ri["unit"], $ri["rejection_reason"]]);
    } else {
    }

    $isInventory = strtolower(trim((string)($d["requester_team"] ?? ""))) === "inventory";
    $s = $pdo->prepare("SELECT quantity,approved_quantity,delivered_quantity,inspection_accepted_quantity FROM request_items WHERE request_id=? FOR UPDATE");
    $s->execute([$d["request_id"]]);
    $allTargetsMet = true;
    $anyDelivered = false;
    $remainingTotal = 0;
    foreach ($s->fetchAll() as $it) {
      $target = $isInventory ? (int)$it["quantity"] : (int)$it["approved_quantity"];
      $del = (int)$it["delivered_quantity"];
      $accepted = (int)$it["inspection_accepted_quantity"];
      // For Inventory-originated requests, receipt completion is based on the
      // physical quantity recorded as delivered. Rejected units are still
      // physically received and are tracked separately in Rejected Items.
      $balanceBasis = $isInventory ? $del : ($del > 0 ? $accepted : (int)$it["approved_quantity"]);
      $balance = max(0, (int)$it["quantity"] - $balanceBasis);
      $remainingTotal += $balance;
      if ($del > 0) $anyDelivered = true;
      if (($isInventory ? $del : $del) < $target) $allTargetsMet = false;
    }
    if ($isInventory) {
      $status = ($allTargetsMet && $remainingTotal === 0) ? "Delivered" : ($anyDelivered ? "Partially Delivered" : "To Ship");
    } else {
      // Inventory has physically sent the items. The requesting team must still accept them.
      $status = ($allTargetsMet && $anyDelivered) ? "Out for Delivery" : ($anyDelivered ? "Partially Delivered" : "To Ship");
    }
    $sets = "status=?,shipped_date=COALESCE(shipped_date,CURDATE()),out_for_delivery_date=COALESCE(out_for_delivery_date,CURDATE())";
    $params = [$status];
    if ($isInventory && $status === "Delivered") $sets .= " ,delivered_date=COALESCE(delivered_date,CURDATE()),received_date=COALESCE(received_date,CURDATE()),receipt_confirmed_at=NOW()";
    $params[] = $id;
    $pdo->prepare("UPDATE deliveries SET $sets WHERE id=?")->execute($params);
    if ($status === "Delivered") {
      ensure_delivery_receipt($pdo, $id, (int)$d["request_id"]);
      if ($isInventory) {
        $u = $pdo->prepare("SELECT full_name FROM users WHERE id=? LIMIT 1");
        $u->execute([$_SESSION["user_id"]]);
        $receiver = (string)$u->fetchColumn();
        $pdo->prepare("UPDATE delivery_receipts SET received_by=?,received_date=CURDATE() WHERE delivery_id=?")->execute([$receiver, $id]);
      }
    }

    $title = $status === "Delivered" ? "Delivery Complete" : "Delivery Update";
    $msg = $status === "Delivered" ? "Delivery {$d["request_number"]} is complete." : "Delivery {$d["request_number"]} is {$status}.";
    create_notification_for_user($pdo, $title, $msg, "delivery", $_SESSION["user_id"], $d["requested_by"]);
    create_notification_for_email($pdo, $d["recipient_gmail"] ?? "", $title, $msg, "delivery", $_SESSION["user_id"]);
    create_notification_for_team($pdo, $d["destination"] ?? "", $title, $msg, "delivery", $_SESSION["user_id"]);
    create_notification_for_admins($pdo, $title, $msg, "delivery", $_SESSION["user_id"]);
    if ($status === "Partially Delivered") {
      create_notification_for_user($pdo, "Partial Delivery", "Request {$d["request_number"]} has missing delivered quantities.", "delivery", $_SESSION["user_id"], $d["requested_by"]);
    }
    $pdo->commit();

    // Notify Procurement after Inventory has safely saved its receipt.
    // Same contract as api/requests.php accept_delivery: the DR is already
    // committed above, so a failed callback never loses Inventory's data.
    $confirmedRequestNumber = (string)$d["request_number"];
    // Only Inventory-initiated, Procurement-destination requests belong to the
    // Procurement PO receiving flow. The Procurement verifier rejects anything
    // else (e.g. Production requests that merely carry a PO number), so skip
    // the callback entirely for those instead of surfacing a failure toast.
    $procurementFlow = strcasecmp(trim((string)($d["destination"] ?? "")), "Procurement") === 0
        && strcasecmp(trim((string)($d["requester_team"] ?? "")), "Inventory") === 0;
    $confirmedPoNumber = $procurementFlow ? trim((string)($d["po_number"] ?? "")) : "";
    $procurementSynced = false;
    $syncKey = (string)(getenv("IMS_API_KEY") ?: ($_SERVER["IMS_API_KEY"] ?? ""));
    $syncUrl = (string)(getenv("PROCUREMENT_RECEIPT_SYNC_URL") ?: ($_SERVER["PROCUREMENT_RECEIPT_SYNC_URL"] ?? "http://127.0.0.1/ITPROFEL/PROCUREMENT/database/inventory-receipt-confirmed.php"));
    if ($syncKey !== "" && function_exists("curl_init") && $confirmedPoNumber !== "") {
      $syncCurl = curl_init($syncUrl);
      if ($syncCurl !== false) {
        curl_setopt_array($syncCurl, [
          CURLOPT_RETURNTRANSFER => true,
          CURLOPT_POST => true,
          CURLOPT_POSTFIELDS => json_encode(["request_number"=>$confirmedRequestNumber,"po_number"=>$confirmedPoNumber]),
          CURLOPT_CONNECTTIMEOUT => 3,
          CURLOPT_TIMEOUT => 8,
          CURLOPT_FOLLOWLOCATION => false,
          CURLOPT_HTTPHEADER => ["Content-Type: application/json", "Accept: application/json", "X-API-Team: Inventory", "X-API-Key: ".$syncKey],
          CURLOPT_COOKIE => "",
          CURLOPT_PROXY => ""
        ]);
        $syncBody = curl_exec($syncCurl);
        $syncCode = (int)curl_getinfo($syncCurl, CURLINFO_HTTP_CODE);
        curl_close($syncCurl);
        $syncJson = is_string($syncBody) ? json_decode($syncBody, true) : null;
        $procurementSynced = $syncCode >= 200 && $syncCode < 300 && is_array($syncJson) && ($syncJson["success"] ?? false) === true;
      }
    }
    $syncNote = ($confirmedPoNumber !== "" && !$procurementSynced)
      ? " Inventory receipt is saved, but Procurement status sync failed. Check the Procurement API URL and shared API key."
      : "";
    $baseMessage = count($rejectedItems) ? "Delivery inspection saved. Rejected items were added to Rejected Items." : ($isInventory ? ($status === "Delivered" ? "Inventory received the complete request. Accepted quantities were posted to Stock In, Inventory balance, and Stock Movement; rejected quantities remain in Rejected Items." : "Inventory receipt saved. Accepted quantities were posted to Stock In and Stock Movement; rejected quantities remain separate. Remaining Balance is reflected as Partially Delivered.") : ("Delivery recorded. Status is " . $status . "; the requesting team can confirm receipt when the approved quantities arrive."));
    if (!$anyDelivered) {
      $baseMessage = "No delivered quantities were entered, so the status stayed " . $status . ". Enter the delivered quantity in the modal (it is pre-filled with the approved quantity) to confirm the delivery.";
    }
    json_response(["success" => true, "status" => $status, "message" => $baseMessage . $syncNote, "procurement_synced" => $procurementSynced, "po_number" => $confirmedPoNumber]);
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(["success" => false, "message" => $e->getMessage()], 422);
  }
}

if ($action === "accept") {
  require_login();
  $id = (int)post_value("id");
  $pdo->beginTransaction();
  try {
    $q = $pdo->prepare("SELECT d.*,r.request_number,r.requested_by,r.requester_team,r.destination,r.recipient_gmail FROM deliveries d JOIN requests r ON r.id=d.request_id WHERE d.id=? FOR UPDATE");
    $q->execute([$id]);
    $d = $q->fetch();
    if (!$d) throw new Exception("Delivery not found.");
    if ((int)($d["requested_by"] ?? 0) !== (int)$_SESSION["user_id"] && !can_control_session($pdo)) throw new Exception("Only the requesting department can confirm receipt.");
    if (strtolower(trim((string)$d["requester_team"])) === "inventory") throw new Exception("Inventory-originated requests are received and recorded by Inventory in the delivery form.");
    if (!in_array($d["status"], ["Out for Delivery", "Partially Delivered"], true)) throw new Exception("Delivery must be recorded before receipt can be confirmed.");
    $s = $pdo->prepare("SELECT quantity,approved_quantity,delivered_quantity,inspection_accepted_quantity FROM request_items WHERE request_id=? FOR UPDATE");
    $s->execute([$d["request_id"]]);
    $items = $s->fetchAll();
    $remaining = 0;
    $allReceived = true;
    foreach ($items as $it) {
      $target = (int)$it["approved_quantity"];
      $del = (int)$it["delivered_quantity"];
      if ($del < $target) $allReceived = false;
      $accepted = $del > 0 ? (int)$it["inspection_accepted_quantity"] : (int)$it["approved_quantity"];
      $remaining += max(0, (int)$it["quantity"] - $accepted);
    }
    if (!$allReceived) throw new Exception("The approved quantities must be recorded before the requesting team can confirm receipt.");
    $pdo->prepare("UPDATE request_items SET accepted_quantity=inspection_accepted_quantity WHERE request_id=?")->execute([$d["request_id"]]);
    $u = $pdo->prepare("SELECT full_name FROM users WHERE id=? LIMIT 1");
    $u->execute([$_SESSION["user_id"]]);
    $receiver = (string)$u->fetchColumn();
    $newStatus = $remaining > 0 ? "Partially Delivered" : "Delivered";
    $pdo->prepare("UPDATE deliveries SET status=?,delivered_date=COALESCE(delivered_date,CURDATE()),received_date=CURDATE() WHERE id=?")->execute([$newStatus, $id]);
    if ($newStatus === "Delivered") {
      ensure_delivery_receipt($pdo, $id, (int)$d["request_id"]);
      $pdo->prepare("UPDATE delivery_receipts SET received_by=?,received_date=CURDATE() WHERE delivery_id=?")->execute([$receiver, $id]);
    }
    create_notification_for_admins($pdo, "Delivery Accepted", "Delivery {$d["request_number"]} was confirmed by {$receiver}. Status: {$newStatus}.", "delivery", $_SESSION["user_id"]);
    create_notification_for_team($pdo, $d["destination"] ?? "", "Delivery Accepted", "Delivery {$d["request_number"]} was confirmed. Status: {$newStatus}.", "delivery", $_SESSION["user_id"]);
    $pdo->commit();
    json_response(["success" => true, "message" => "Receipt confirmed. Received By was automatically saved as {$receiver}. Status: {$newStatus}."]);
  } catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(["success" => false, "message" => $e->getMessage()], 422);
  }
}

json_response(["success" => false, "message" => "Invalid action."], 400);
