<?php
/** Buyer: manually log an Inventory rejection received by Gmail. No Gmail API calls.
 * Flags are backed by the linked invoice/PO and verified Inventory receipt evidence.
 * Historical Finance postings cannot be changed by this endpoint.
 */
declare(strict_types=1);
date_default_timezone_set('Asia/Manila');
require_once __DIR__ . '/buyer-po-common.php';
require_once __DIR__ . '/finance-invoice-handoff-common.php';
header('X-Content-Type-Options: nosniff');
$transaction = false;

function discReadEvidence(mysqli $db, int $poId): array {
    $stmt=$db->prepare('SELECT pi.id AS po_item_id, pi.item_name, pi.unit, pi.qty_ordered, pi.qty_received,
        COALESCE(SUM(ri.delivered_qty),0) AS verified_delivered,
        COALESCE(SUM(ri.accepted_qty),0) AS verified_accepted,
        COALESCE(SUM(ri.rejected_qty),0) AS verified_rejected
        FROM po_items pi
        LEFT JOIN procurement_inventory_receipt_items ri ON ri.po_item_id=pi.id
        LEFT JOIN procurement_inventory_receipts gr ON gr.id=ri.receipt_id AND gr.po_id=pi.po_id
        WHERE pi.po_id=? GROUP BY pi.id,pi.item_name,pi.unit,pi.qty_ordered,pi.qty_received ORDER BY pi.id');
    $stmt->bind_param('i',$poId);$stmt->execute();
    $rows=$stmt->get_result()->fetch_all(MYSQLI_ASSOC);$stmt->close();
    // A linked receipt row is authenticated/verified by the existing Inventory integration.
    return $rows;
}
function discLatest(mysqli $db, int $invoiceId): ?array {
    $q=$db->prepare('SELECT id,status,reasons_json,buyer_notes,gmail_reference,created_at,resolved_at,resolution_note
                     FROM procurement_invoice_discrepancies WHERE invoice_id=? ORDER BY id DESC LIMIT 1');
    $q->bind_param('i',$invoiceId);$q->execute();$row=$q->get_result()->fetch_assoc();$q->close();
    if ($row) { $row['reasons']=json_decode((string)$row['reasons_json'],true) ?: []; unset($row['reasons_json']); }
    return $row ?: null;
}
function discHandoff(mysqli $db,int $invoiceId): string {
    $q=$db->prepare('SELECT handoff_status FROM procurement_finance_invoice_handoffs WHERE invoice_id=? LIMIT 1');
    $q->bind_param('i',$invoiceId);$q->execute();$r=$q->get_result()->fetch_assoc();$q->close();
    return (string)($r['handoff_status'] ?? '');
}
function discHasConfirmedFullMatch(mysqli $db,array $inv): void {
    if (strtolower((string)$inv['po_status'])==='partial') {
        $match=pamEvaluateStored($db,$inv);
        if (!$match['data_matched'] || !$match['supplier_document_verified'])
            throw new DomainException('Partial invoice must bill only verified Inventory accepted quantities; rejected goods must be evidenced in the GR and a corrected supplier document checked.');
        return;
    }
    // A resolution requires the corrected invoice and real verified receipts to
    // agree with the full PO. A Gmail message alone is NOT proof of resolution.
    if (strtolower((string)$inv['po_status']) !== 'received') {
        throw new DomainException('PO must be fully received before resolving this hold.');
    }
    if (($inv['source_kind']??'') !== 'supplier_document' || (int)($inv['document_checked']??0)!==1) {
        throw new DomainException('A checked genuine supplier document is required to resolve the hold.');
    }
    if ((int)$inv['supplier_id'] !== (int)$inv['po_supplier_id']) {
        throw new DomainException('Supplier does not match the PO.');
    }
    $invoiceId=(int)$inv['invoice_id'];$poId=(int)$inv['po_id'];
    $q=$db->prepare('SELECT pi.id,pi.item_name,pi.unit,pi.qty_ordered,pi.qty_received,pi.unit_price,
          ii.id AS line_id,ii.item_name AS billed_name,ii.unit AS billed_unit,ii.qty_billed,
          ii.unit_price AS billed_price,ii.subtotal AS billed_subtotal,
          (SELECT COALESCE(SUM(ri.accepted_qty),0)
           FROM procurement_inventory_receipt_items ri
           JOIN procurement_inventory_receipts gr ON gr.id=ri.receipt_id
           WHERE gr.po_id=pi.po_id AND ri.po_item_id=pi.id) AS accepted
          FROM po_items pi LEFT JOIN invoice_items ii ON ii.po_item_id=pi.id AND ii.invoice_id=?
          WHERE pi.po_id=? ORDER BY pi.id');
    $q->bind_param('ii',$invoiceId,$poId);$q->execute();$lines=$q->get_result()->fetch_all(MYSQLI_ASSOC);$q->close();
    $q=$db->prepare('SELECT COUNT(*) AS n FROM invoice_items WHERE invoice_id=?');
    $q->bind_param('i',$invoiceId);$q->execute();$n=(int)$q->get_result()->fetch_assoc()['n'];$q->close();
    if (!$lines || count($lines)!==$n) throw new DomainException('Invoice must contain exactly the PO item lines.');
    $sum=0;
    foreach ($lines as $x) {
        $ordered=(float)$x['qty_ordered'];$received=(float)$x['qty_received'];
        $accepted=(float)$x['accepted'];$billed=(float)($x['qty_billed']??0);
        if (!$x['line_id'] || $ordered<=0 || $accepted<=0
            || abs($ordered-$received)>0.001 || abs($accepted-$received)>0.001 || abs($accepted-$billed)>0.001
            || (string)$x['item_name'] !== (string)$x['billed_name']
            || (string)$x['unit'] !== (string)$x['billed_unit']
            || fihMoneyCents($x['unit_price'])!==fihMoneyCents($x['billed_price'])) {
            throw new DomainException('PO, verified GR, and invoice still differ. Correct the delivery/invoice first.');
        }
        $lineCents=(int)round($billed*fihMoneyCents($x['billed_price']));
        if ($lineCents!==fihMoneyCents($x['billed_subtotal'])) {
            throw new DomainException('Invoice line total does not match quantity × price.');
        }
        $sum += $lineCents;
    }
    if($sum<=0 || $sum!==fihMoneyCents($inv['total_amount']) || $sum!==fihMoneyCents($inv['po_total'])) {
        throw new DomainException('PO/invoice totals do not match.');
    }
}

try {
    $method = (string)($_SERVER['REQUEST_METHOD']??'');
    if (!in_array($method,['GET','POST'],true)) buyerPoJson(405,['success'=>false,'message'=>'GET or POST only.']);
    $buyer=buyerPoIdentity($conn);$buyerId=(int)$buyer['id'];
    if (empty($_SESSION['invoice_discrepancy_csrf'])) $_SESSION['invoice_discrepancy_csrf']=bin2hex(random_bytes(32));
    if ($method==='GET') $number=$_GET['invoice_number']??'';
    else {
        if (stripos((string)($_SERVER['CONTENT_TYPE']??''),'application/json')!==0)
            buyerPoJson(415,['success'=>false,'message'=>'JSON required.']);
        $token=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if ($token===''||!hash_equals((string)$_SESSION['invoice_discrepancy_csrf'],$token))
            buyerPoJson(419,['success'=>false,'message'=>'Session expired. Refresh invoice page.']);
        $body=json_decode(file_get_contents('php://input')?:'',true);
        if (!is_array($body)||json_last_error()!==JSON_ERROR_NONE)
            buyerPoJson(400,['success'=>false,'message'=>'Invalid JSON.']);
        $number=$body['invoice_number']??'';
    }
    if (!is_string($number)||!preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]{0,63}\z/D',$number))
        buyerPoJson(422,['success'=>false,'message'=>'Valid invoice number required.']);
    $inv=fihInvoice($conn,$number,$buyerId);
    if (!$inv) buyerPoJson(404,['success'=>false,'message'=>'Invoice not found for this Buyer.']);
    $invoiceId=(int)$inv['invoice_id'];$poId=(int)$inv['po_id'];
    if ($method==='GET') {
        $latest=discLatest($conn,$invoiceId);
        $financeStatus=discHandoff($conn,$invoiceId);
        $posted=strtolower((string)$inv['invoice_status'])==='posted'||$financeStatus==='posted';
        $canFlag=!$posted && $financeStatus==='' && ($inv['source_kind']??'')!=='demo'
            && in_array(strtolower((string)$inv['invoice_status']),['pending_match','discrepancy','ready_to_post'],true)
            && ($latest['status']??'')!=='open';
        buyerPoJson(200,[ 'success'=>true,'invoice_number'=>$number,'invoice_status'=>$inv['invoice_status'],
            'finance_status'=>$financeStatus,'can_flag'=>$canFlag,'can_resolve'=>($latest['status']??'')==='open',
            'open_hold'=>($latest['status']??'')==='open','latest'=>$latest,
            'receipt_items'=>discReadEvidence($conn,$poId),
            'csrf_token'=>$_SESSION['invoice_discrepancy_csrf'],
            'notice'=>'Inventory emails Procurement through Gmail. Buyer records that report manually; no Gmail is accessed by this feature.']);
    }
    $action=(string)($body['action']??'');
    if (!in_array($action,['flag','resolve'],true)) buyerPoJson(422,['success'=>false,'message'=>'Choose Flag or Resolve.']);
    $conn->begin_transaction();$transaction=true;
    // Serialize with concurrent invoice edits and Finance handoff attempts.
    $q=$conn->prepare('SELECT id,status FROM invoices WHERE id=? AND created_by=? FOR UPDATE');
    $q->bind_param('ii',$invoiceId,$buyerId);$q->execute();$locked=$q->get_result()->fetch_assoc();$q->close();
    if (!$locked) throw new DomainException('Invoice unavailable.');
    $inv=fihInvoice($conn,$number,$buyerId);
    $financeStatus=discHandoff($conn,$invoiceId);
    $posted=strtolower((string)$inv['invoice_status'])==='posted'||$financeStatus==='posted';
    if($posted || $financeStatus!=='') throw new DomainException('Invoice already entered Finance handoff or was posted. Contact Finance for correction; no historical posting was changed.');
    if (($inv['source_kind']??'')==='demo') throw new DomainException('Classroom DEMO invoices cannot be flagged as genuine supplier discrepancies.');
    $current=$conn->prepare("SELECT id FROM procurement_invoice_discrepancies WHERE invoice_id=? AND status='open' LIMIT 1 FOR UPDATE");
    $current->bind_param('i',$invoiceId);$current->execute();$open=$current->get_result()->fetch_assoc();$current->close();
    if ($action==='flag') {
        if ($open) throw new DomainException('This invoice already has an open discrepancy.');
        if(!in_array(strtolower((string)$inv['invoice_status']),['pending_match','discrepancy','ready_to_post'],true))
            throw new DomainException('Invoice cannot be flagged in its current status.');
        $reasons=$body['reasons']??null;$allowed=['quantity_mismatch','price_mismatch','damaged_goods','other'];
        if(!is_array($reasons)||!$reasons||count($reasons)>4||count($reasons)!==count(array_unique($reasons))||array_diff($reasons,$allowed))
            throw new DomainException('Select valid discrepancy reasons.');
        $note=trim((string)($body['notes']??''));$gmail=trim((string)($body['gmail_reference']??''));
        if(strlen($note)<10||strlen($note)>1000||strlen($gmail)>200)
            throw new DomainException('Enter a 10–1000 character note and optional Gmail reference (max 200).');
        $evidence=discReadEvidence($conn,$poId);
        $reasonsJson=json_encode(array_values($reasons),JSON_THROW_ON_ERROR);
        $evidenceJson=json_encode($evidence,JSON_THROW_ON_ERROR);
        $q=$conn->prepare("INSERT INTO procurement_invoice_discrepancies
            (invoice_id,po_id,buyer_id,reasons_json,buyer_notes,gmail_reference,evidence_json,status)
            VALUES (?,?,?,?,?,?,?,'open')");
        $q->bind_param('iiissss',$invoiceId,$poId,$buyerId,$reasonsJson,$note,$gmail,$evidenceJson);
        $q->execute();$caseId=(int)$conn->insert_id;$q->close();
        if (strtolower((string)$inv['invoice_status'])!=='discrepancy') {
            $q=$conn->prepare("UPDATE invoices SET status='discrepancy' WHERE id=? AND status IN ('pending_match','ready_to_post')");
            $q->bind_param('i',$invoiceId);$q->execute();
            if($q->affected_rows!==1) throw new DomainException('Invoice status changed.');
            $q->close();
        }
        $q=$conn->prepare("UPDATE buyer_invoice_source_local SET match_status='discrepancy',match_summary='Manual discrepancy ON HOLD; review Gmail notice and verified GR.',verified_at=NULL,verified_by=NULL WHERE invoice_id=?");
        $q->bind_param('i',$invoiceId);$q->execute();$q->close();
        $conn->commit();$transaction=false;
        buyerPoJson(200,['success'=>true,'case_id'=>$caseId,'hold_status'=>'open','message'=>'Discrepancy recorded. Invoice ON HOLD; normal Finance queue/posting blocked. No Gmail was sent.']);
    }
    if (!$open) throw new DomainException('No open discrepancy to resolve.');
    $resolution=trim((string)($body['resolution_note']??''));
    if(strlen($resolution)<10||strlen($resolution)>1000)
        throw new DomainException('Enter a resolution note (10–1000 characters).');
    discHasConfirmedFullMatch($conn,$inv);
    $caseId=(int)$open['id'];
    $q=$conn->prepare("UPDATE procurement_invoice_discrepancies SET status='resolved',resolution_note=?,resolved_by=?,resolved_at=NOW() WHERE id=? AND status='open'");
    $q->bind_param('sii',$resolution,$buyerId,$caseId);$q->execute();if($q->affected_rows!==1)throw new DomainException('Discrepancy changed.');$q->close();
    if (!in_array(strtolower((string)$inv['invoice_status']), ['discrepancy','pending_match','ready_to_post'],true))
        throw new DomainException('Invoice is no longer eligible for resolution.');
    if (strtolower((string)$inv['invoice_status'])!=='pending_match') {
        $q=$conn->prepare("UPDATE invoices SET status='pending_match' WHERE id=? AND status IN ('discrepancy','ready_to_post')");
        $q->bind_param('i',$invoiceId);$q->execute();
        if($q->affected_rows!==1) throw new DomainException('Invoice changed during resolution.');
        $q->close();
    }
    $q=$conn->prepare("UPDATE buyer_invoice_source_local SET match_status='unverified',match_summary='Hold resolved; 3-way verification required again.',verified_at=NULL,verified_by=NULL WHERE invoice_id=?");
    $q->bind_param('i',$invoiceId);$q->execute();$q->close();
    $conn->commit();$transaction=false;
    buyerPoJson(200,['success'=>true,'case_id'=>$caseId,'hold_status'=>'resolved',
        'message'=>'Discrepancy resolved after accepted-quantity GR/Invoice verification. Re-verify 3-Way Match before Finance queue. Rejected materials remain excluded; no accounting posting occurred.']);
} catch(DomainException $e) {
    if($transaction){try{$conn->rollback();}catch(Throwable $ignored){}}
    buyerPoJson(409,['success'=>false,'message'=>$e->getMessage()]);
} catch(Throwable $e) {
    if($transaction){try{$conn->rollback();}catch(Throwable $ignored){}}
    error_log('Invoice discrepancy: '.$e->getMessage());
    buyerPoJson(500,['success'=>false,'message'=>'Discrepancy action failed. Check migration and PHP/MySQL logs.']);
}
