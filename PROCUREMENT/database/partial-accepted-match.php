<?php
/**
 * Partial delivery/accepted-quantity supplier invoice verification.
 * Only a genuine, independently reviewed supplier invoice for a PO whose
 * authenticated Inventory GR accounts for the ENTIRE delivery (including
 * rejected quantities) may be verified. The original PO/Inventory GR are
 * never edited here. One invoice per PO is supported by the existing UI.
 */
declare(strict_types=1);

function pamCents(mixed $value, bool $zero = false): int {
    $text = (string)$value;
    if (!preg_match('/\A(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?\z/D', $text)) {
        throw new DomainException('Invalid quantity or price precision.');
    }
    $parts = explode('.', $text);
    $cents = ((int)$parts[0]) * 100 + (int)str_pad($parts[1] ?? '0', 2, '0');
    if ($cents < 0 || (!$zero && $cents === 0)) throw new DomainException('Expected a positive quantity or price.');
    return $cents;
}
function pamLineTotal(int $qtyCents, int $priceCents): int {
    if ($qtyCents < 1 || $priceCents < 1 || $qtyCents > intdiv(PHP_INT_MAX - 50, $priceCents))
        throw new DomainException('Invalid line amount.');
    $total = intdiv($qtyCents * $priceCents + 50, 100);
    if ($total > 999999999999) throw new DomainException('Invoice total outside supported range.');
    return $total;
}
function pamItems(mysqli $db, int $poId, string $poNumber, int $invoiceId): array {
    $sql = 'SELECT pi.id AS po_item_id,pi.item_name,pi.unit,pi.qty_ordered,
        pi.qty_received,pi.unit_price,pi.subtotal AS po_line_subtotal,
        ii.id AS invoice_line_id,ii.item_name AS billed_item_name,
        ii.unit AS billed_unit,ii.qty_billed,ii.unit_price AS billed_unit_price,
        ii.subtotal AS billed_subtotal,
        COALESCE(r.accepted,0) AS gr_accepted,COALESCE(r.rejected,0) AS gr_rejected,
        COALESCE(r.delivered,0) AS gr_delivered
      FROM po_items pi
      LEFT JOIN invoice_items ii ON ii.po_item_id=pi.id AND ii.invoice_id=?
      LEFT JOIN (
        SELECT ri.po_item_id,SUM(ri.accepted_qty) AS accepted,
               SUM(ri.rejected_qty) AS rejected,SUM(ri.delivered_qty) AS delivered
        FROM procurement_inventory_receipt_items ri
        JOIN procurement_inventory_receipts gr ON gr.id=ri.receipt_id
        WHERE gr.po_id=? AND gr.po_number=?
        GROUP BY ri.po_item_id
      ) r ON r.po_item_id=pi.id
      WHERE pi.po_id=? ORDER BY pi.id';
    $s=$db->prepare($sql);
    $s->bind_param('iisi',$invoiceId,$poId,$poNumber,$poId);
    $s->execute();$rows=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    return $rows;
}
function pamEvaluate(mysqli $db, array $po, ?array $invoice): array {
    $poId=(int)$po['id'];$poNumber=(string)$po['po_number'];
    $invoiceId=(int)($invoice['id']??0);
    $s=$db->prepare('SELECT receipt_number AS goods_receipt_number,receipt_date AS received_date FROM procurement_inventory_receipts WHERE po_id=? AND po_number=? ORDER BY id');
    $s->bind_param('is',$poId,$poNumber);$s->execute();$receipts=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    $rows=pamItems($db,$poId,$poNumber,$invoiceId);
    $s=$db->prepare('SELECT COUNT(*) AS n FROM invoice_items WHERE invoice_id=?');
    $s->bind_param('i',$invoiceId);$s->execute();$lineCount=(int)$s->get_result()->fetch_assoc()['n'];$s->close();
    $checks=[];$items=[];$good=true;$total=0;$originalTotal=0;$rejectedTotal=0;
    $check=static function(bool $pass,string $description) use (&$checks,&$good): void {
        $checks[]=['passed'=>$pass,'message'=>$description];
        if(!$pass)$good=false;
    };
    $check(strtolower((string)($po['status']??''))==='partial','Purchase Order is Partial due to rejected goods.');
    $check(count($receipts)>0,'Authenticated Inventory Goods Receipt is available.');
    $check(count($rows)>0 && count($rows)===$lineCount,'Exactly one supplier invoice line per PO item.');
    foreach ($rows as $line) {
        $ordered=pamCents($line['qty_ordered']);
        $accepted=pamCents($line['gr_accepted'],true);
        $rejected=pamCents($line['gr_rejected'],true);
        $delivered=pamCents($line['gr_delivered'],true);
        $received=pamCents($line['qty_received'],true);
        $billed=$line['invoice_line_id']?pamCents($line['qty_billed'],true):0;
        $poPrice=pamCents($line['unit_price']);
        $invoicePrice=$line['invoice_line_id']?pamCents($line['billed_unit_price'],true):0;
        $validGR=$ordered>0 && $accepted>0 && $accepted<=$ordered
            && $delivered===$ordered && $delivered===$accepted+$rejected && $received===$accepted;
        $quantityOK=$line['invoice_line_id'] && $billed===$accepted && $billed>0;
        $priceOK=$line['invoice_line_id'] && $poPrice===$invoicePrice;
        $identityOK=$line['invoice_line_id'] && (string)$line['item_name']===(string)$line['billed_item_name']
            && (string)$line['unit']===(string)$line['billed_unit'];
        $check($validGR,'Verified GR quantities (including rejected goods) match delivery and PO for '.$line['item_name'].'.');
        $check((bool)$quantityOK,'Invoice bills only the accepted quantity for '.$line['item_name'].'.');
        $check((bool)$priceOK && (bool)$identityOK,'Item and unit price match the approved PO for '.$line['item_name'].'.');
        $poExpected=pamLineTotal($ordered,$poPrice);
        $check($poExpected===pamCents($line['po_line_subtotal']),'Approved PO line subtotal matches quantity times price for '.$line['item_name'].'.');
        $originalTotal+=$poExpected;
        $rejectedTotal+=$rejected;
        if ($line['invoice_line_id'] && $billed>0 && $invoicePrice>0) {
            $expected=pamLineTotal($billed,$invoicePrice);
            $check($expected===pamCents($line['billed_subtotal']),'Supplier invoice line subtotal is correct for '.$line['item_name'].'.');
            $total+=$expected;
        } else $check(false,'Supplier invoice line is missing for '.$line['item_name'].'.');
        $items[]=[
            'po_item_id'=>(int)$line['po_item_id'],'item_name'=>$line['item_name'],'unit'=>$line['unit'],
            'po_qty'=>$line['qty_ordered'],'po_received'=>$line['qty_received'],
            'real_gr_accepted'=>$line['gr_accepted'],'real_gr_rejected'=>$line['gr_rejected'],
            'gr_delivered'=>$line['gr_delivered'],'invoice_qty'=>$line['qty_billed'],
            'po_unit_price'=>$line['unit_price'],'invoice_unit_price'=>$line['billed_unit_price'],
            'receipt_matched'=>$validGR,'invoice_quantity_matched'=>(bool)$quantityOK,
            'price_matched'=>(bool)$priceOK,'line_identity_matched'=>(bool)$identityOK,
            'ordered_qty'=>$line['qty_ordered'],'received_qty'=>$line['gr_accepted'],
            'rejected_qty'=>$line['gr_rejected'],'delivered_qty'=>$line['gr_delivered'],
            'billed_qty'=>$line['qty_billed'],'unit_price_pre_vat'=>$line['billed_unit_price'],
            'line_total_pre_vat'=>$line['billed_subtotal']
        ];
    }
    $check($rejectedTotal>0,'At least one rejected quantity is recorded in the verified GR.');
    if ($invoice) {
        $check((int)$invoice['supplier_id']===(int)$po['supplier_id'],'Supplier matches the approved PO.');
        $check($total>0 && $total===pamCents($invoice['total_amount']),'Supplier invoice amount equals billed accepted-line totals (pre-VAT).');
        $check($originalTotal===pamCents($po['total_amount']),'Original approved PO amount is consistent.');
        $check($total<$originalTotal,'Partial accepted-quantity invoice is below the original PO total.');
        $check((string)$invoice['invoice_date']>=(string)$po['order_date'],'Invoice date is not before the PO date.');
        $check((string)$invoice['due_date']>=(string)$invoice['invoice_date'],'Due date is after or equal to invoice date.');
    }else $check(false,'A corrected genuine supplier invoice is required.');
    return ['data_matched'=>$good,'checks'=>$checks,'items'=>$items,'real_receipts'=>$receipts,
        'supplier_document_verified'=>(bool)($invoice && ($invoice['source_kind']??'')==='supplier_document' && (int)($invoice['document_checked']??0)===1),
        'partial_accepted_receipt'=>true,'pre_vat_only'=>true];
}
function pamEvaluateStored(mysqli $db,array $inv): array {
    $s=$db->prepare('SELECT po.id,po.po_number,po.status,po.supplier_id,po.order_date,po.total_amount FROM purchase_orders po WHERE po.id=?');
    $id=(int)$inv['po_id'];$s->bind_param('i',$id);$s->execute();$po=$s->get_result()->fetch_assoc();$s->close();
    if(!$po)throw new DomainException('PO no longer exists.');
    $s=$db->prepare('SELECT i.*,src.supplier_invoice_reference,src.source_kind,src.document_checked,src.verified_at,src.match_status FROM invoices i LEFT JOIN buyer_invoice_source_local src ON src.invoice_id=i.id WHERE i.id=?');
    $id=(int)$inv['invoice_id'];$s->bind_param('i',$id);$s->execute();$invoice=$s->get_result()->fetch_assoc();$s->close();
    if(!$invoice)throw new DomainException('Invoice no longer exists.');
    return pamEvaluate($db,$po,$invoice);
}
// Preserve historical discrepancy policy while allowing a genuine invoice whose
// verified PO/GR/accepted quantities match to proceed WITHOUT a fabricated case.
// Open or non-resolved cases always block Finance. This function does NOT infer
// any supplier document authenticity; pamEvaluate checks the document separately.
function pamNoUnresolvedDiscrepancy(mysqli $db,int $invoiceId): bool {
    // Historical cases may exist. An OPEN case anywhere always takes priority.
    if (invoiceDiscrepancyHasOpen($db,$invoiceId)) return false;
    $s=$db->prepare("SELECT status FROM procurement_invoice_discrepancies WHERE invoice_id=? ORDER BY id DESC LIMIT 1");
    $s->bind_param('i',$invoiceId);$s->execute();$row=$s->get_result()->fetch_assoc();$s->close();
    // No discrepancy ever reported: not a mismatch merely because a GR has rejected goods.
    if(!$row) return true;
    return (string)$row['status']==='resolved';
}
function pamHasResolvedDiscrepancy(mysqli $db,int $invoiceId): bool {
    $s=$db->prepare("SELECT status FROM procurement_invoice_discrepancies WHERE invoice_id=? ORDER BY id DESC LIMIT 1");
    $s->bind_param('i',$invoiceId);$s->execute();$status=(string)($s->get_result()->fetch_assoc()['status']??'');$s->close();
    return $status==='resolved';
}
function pamFinanceSnapshot(mysqli $db,array $inv): array {
    $id=(int)$inv['invoice_id'];
    if (strtolower((string)$inv['invoice_status'])!=='ready_to_post' || strtolower((string)$inv['po_status'])!=='partial')
        throw new DomainException('Only verified, unposted Partial POs are eligible for accepted-quantity Finance handoff.');
    if (($inv['source_kind']??'')!=='supplier_document' || (int)($inv['document_checked']??0)!==1
        || ($inv['match_status']??'')!=='matched' || empty($inv['verified_at']))
        throw new DomainException('A genuine, verified supplier invoice is required. Internal demo references cannot be posted.');
    if (!pamNoUnresolvedDiscrepancy($db,$id))
        throw new DomainException('This invoice has an unresolved discrepancy. Resolve and reverify before Finance handoff.');
    if ((int)$inv['supplier_id']!==(int)$inv['po_supplier_id'])
        throw new DomainException('Invoice supplier does not match PO.');
    $match=pamEvaluateStored($db,$inv);
    if (!$match['data_matched'] || !$match['supplier_document_verified'])
        throw new DomainException('Accepted quantity, rejected receipt, billed items or amounts changed; reverify invoice before Finance.');
    $s=$db->prepare("SELECT id,resolution_note,resolved_at,gmail_reference FROM procurement_invoice_discrepancies WHERE invoice_id=? AND status='resolved' ORDER BY id DESC LIMIT 1");
    $s->bind_param('i',$id);$s->execute();$resolution=$s->get_result()->fetch_assoc();$s->close();
    return [
        'invoice_number'=>$inv['invoice_number'],
        'supplier_invoice_reference'=>$inv['supplier_invoice_reference'],
        'po_number'=>$inv['po_number'],
        'supplier'=>['id'=>(int)$inv['supplier_id'],'name'=>$inv['supplier_name'],'payment_terms'=>$inv['payment_terms']],
        'invoice_date'=>$inv['invoice_date'],'due_date'=>$inv['due_date'],
        'amount_pre_vat'=>(string)$inv['total_amount'],
        'original_po_amount_pre_vat'=>(string)$inv['po_total'],
        'tax_status'=>'NOT_VERIFIED_PRE_VAT_ONLY',
        'document_review'=>'BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION',
        'three_way_match'=>'RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS',
        'receipt_policy'=>'ACCEPTED_QUANTITY_ONLY_REJECTED_QUANTITY_EXCLUDED',
        // No discrepancy case is required when a genuine accepted-quantity invoice
        // matches a verified Inventory GR. Preserve resolved-case audit when present.
        'discrepancy_resolution'=>$resolution
            ? ['case_id'=>(int)$resolution['id'],'resolved_at'=>$resolution['resolved_at'],
               'note'=>$resolution['resolution_note'],'inventory_gmail_reference'=>$resolution['gmail_reference']]
            : ['case_id'=>null,'resolved_at'=>null,'note'=>'No invoice mismatch was recorded. Verified rejected items remain in the Inventory GR.',
               'inventory_gmail_reference'=>null],
        'goods_receipts'=>$match['real_receipts'],
        'items'=>array_map(static fn($it)=>[
           'po_item_id'=>$it['po_item_id'],'item_name'=>$it['item_name'],'unit'=>$it['unit'],
           'ordered_qty'=>$it['ordered_qty'],'received_qty'=>$it['received_qty'],
           'rejected_qty'=>$it['rejected_qty'],'delivered_qty'=>$it['delivered_qty'],
           'billed_qty'=>$it['billed_qty'],'unit_price_pre_vat'=>$it['unit_price_pre_vat'],
           'line_total_pre_vat'=>$it['line_total_pre_vat']
        ],$match['items'])
    ];
}
