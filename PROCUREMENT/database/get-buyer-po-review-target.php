<?php
/** UNIPROCUR_PO_REJECTION_V16: read-only Invoice navigation lookup for an owned Buyer PO.
 * No Inventory, invoice, discrepancy, stock, or Finance mutation here. */
declare(strict_types=1);
require_once __DIR__.'/buyer-po-common.php';
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') buyerPoJson(405, ['success'=>false,'message'=>'GET required.']);
$number=trim((string)($_GET['po_number']??''));
if (!preg_match('/\APO-[A-Za-z0-9-]{1,26}\z/',$number)) buyerPoJson(422,['success'=>false,'message'=>'Invalid PO number.']);
try {
  $buyer=buyerPoIdentity($conn);$id=(int)$buyer['id'];
  $stmt=$conn->prepare('SELECT po.id,po.supplier_id FROM purchase_orders po JOIN rfqs r ON r.id=po.rfq_id JOIN purchase_requisitions pr ON pr.id=r.pr_id WHERE po.po_number=? AND po.created_by=? AND r.created_by=? AND pr.created_by=? LIMIT 1');
  $stmt->bind_param('siii',$number,$id,$id,$id);$stmt->execute();$po=$stmt->get_result()->fetch_assoc();$stmt->close();
  if (!$po) buyerPoJson(404,['success'=>false,'message'=>'PO not found for Buyer.']);
  $poId=(int)$po['id'];$supplierId=(int)$po['supplier_id'];
  $stmt=$conn->prepare('SELECT invoice_number,LOWER(status) AS status,supplier_id FROM invoices WHERE po_id=? AND created_by=? ORDER BY id DESC LIMIT 1');
  $stmt->bind_param('ii',$poId,$id);$stmt->execute();$invoice=$stmt->get_result()->fetch_assoc();$stmt->close();
  $bad=$invoice && (int)$invoice['supplier_id']!==$supplierId;
  $matched=$invoice && !$bad ? ['invoice_number'=>(string)$invoice['invoice_number'],'status'=>(string)$invoice['status']] : null;
  buyerPoJson(200,['success'=>true,'po_number'=>$number,'invoice'=>$matched,'invoice_supplier_mismatch'=>(bool)$bad,'read_only'=>true]);
} catch(Throwable $e) {
  error_log('PO v16 Invoice lookup: '.$e->getMessage());
  buyerPoJson(500,['success'=>false,'message'=>'Unable to retrieve invoice reference.']);
}
