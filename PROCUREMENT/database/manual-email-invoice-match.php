<?php
/**
 * Buyer-transcribed Inventory delivery report from Gmail. The provenance MUST remain
 * distinct from authenticated Inventory Goods Receipt API data. No writes to Inventory.
 */
declare(strict_types=1);
function memHasReport(mysqli $db,int $invoiceId): bool {
    $s=$db->prepare('SELECT id FROM procurement_invoice_email_receipts WHERE invoice_id=? LIMIT 1');
    $s->bind_param('i',$invoiceId);$s->execute();$ok=(bool)$s->get_result()->fetch_assoc();$s->close();return $ok;
}
function memReadReport(mysqli $db,int $invoiceId): ?array {
    $s=$db->prepare('SELECT * FROM procurement_invoice_email_receipts WHERE invoice_id=? LIMIT 1');
    $s->bind_param('i',$invoiceId);$s->execute();$record=$s->get_result()->fetch_assoc();$s->close();
    if(!$record)return null;
    $id=(int)$record['id'];
    $s=$db->prepare('SELECT po_item_id,delivered_qty,accepted_qty,rejected_qty FROM procurement_invoice_email_receipt_items WHERE report_id=? ORDER BY po_item_id');
    $s->bind_param('i',$id);$s->execute();$record['items']=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    return $record;
}
function memCents(mixed $v, bool $allowZero = false): int {
    $text=(string)$v;
    if(!preg_match('/\A(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?\z/D',$text))
        throw new DomainException('Email report quantity/price must have at most two decimals.');
    $p=explode('.',$text);$c=((int)$p[0])*100+(int)str_pad($p[1]??'0',2,'0');
    if(!$allowZero&&$c<=0)throw new DomainException('Positive quantity/price required.');
    return $c;
}
function memLineCents(int $qty,int $price): int {
    if($qty<=0||$price<=0||$qty>intdiv(PHP_INT_MAX-50,$price))throw new DomainException('Invalid invoice line amount.');
    return intdiv($qty*$price+50,100);
}
function memEvaluate(mysqli $db,array $po,?array $invoice): array {
    $id=(int)($invoice['id']??0);$report=memReadReport($db,$id);
    if(!$report)throw new DomainException('No manually recorded Inventory Gmail report for this invoice.');
    $poId=(int)$po['id'];$poNumber=(string)$po['po_number'];
    $s=$db->prepare('SELECT pi.id AS po_item_id,pi.item_name,pi.unit,pi.qty_ordered,pi.qty_received,pi.unit_price,pi.subtotal AS po_subtotal,
        ii.id AS invoice_line_id,ii.item_name AS invoice_item_name,ii.unit AS invoice_unit,
        ii.qty_billed,ii.unit_price AS billed_unit_price,ii.subtotal AS invoice_subtotal
        FROM po_items pi LEFT JOIN invoice_items ii ON ii.po_item_id=pi.id AND ii.invoice_id=? WHERE pi.po_id=? ORDER BY pi.id');
    $s->bind_param('ii',$id,$poId);$s->execute();$rows=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    $s=$db->prepare('SELECT COUNT(*) AS n FROM invoice_items WHERE invoice_id=?');$s->bind_param('i',$id);$s->execute();$n=(int)$s->get_result()->fetch_assoc()['n'];$s->close();
    $evidence=[];foreach($report['items'] as $r) {
        $key=(int)$r['po_item_id'];if(isset($evidence[$key]))throw new DomainException('Duplicate Gmail report item.');$evidence[$key]=$r;
    }
    $checks=[];$details=[];$good=true;$sum=0;$poTotal=0;$rejectedAny=false;
    $check=static function(bool $ok,string $msg) use (&$checks,&$good): void {
        $checks[]=['passed'=>$ok,'message'=>$msg];if(!$ok)$good=false;
    };
    $check((int)$report['invoice_id']===$id && (int)$report['po_id']===$poId,'Gmail report is linked to this invoice and PO.');
    $check((int)$report['inventory_email_reviewed']===1 && trim((string)$report['gmail_subject'])!=='' && filter_var($report['sender_email'],FILTER_VALIDATE_EMAIL)!==false && trim((string)$report['delivery_reference'])!=='','Buyer recorded email subject, sender, delivery reference, and review attestation.');
    $check(in_array(strtolower((string)$po['status']),['received','partial'],true),'PO has a received or partial status; original PO remains unchanged.');
    $check(count($rows)>0 && count($rows)===$n && count($rows)===count($evidence),'Every PO item has one invoice line and one Gmail inspection line.');
    foreach($rows as $row) {
        $itemId=(int)$row['po_item_id'];$r=$evidence[$itemId]??null;
        $ordered=memCents($row['qty_ordered']);$price=memCents($row['unit_price']);
        $delivered=$r?memCents($r['delivered_qty'],true):0;
        $accepted=$r?memCents($r['accepted_qty'],true):0;
        $rejected=$r?memCents($r['rejected_qty'],true):0;
        $billed=$row['invoice_line_id']?memCents($row['qty_billed'],true):0;
        $billPrice=$row['invoice_line_id']?memCents($row['billed_unit_price'],true):0;
        $receiptOK=$r!==null && $delivered===$accepted+$rejected && $delivered===$ordered && $accepted>0 && $rejected>=0;
        $qtyOK=$row['invoice_line_id'] && $billed===$accepted && $billed>0;
        $priceOK=$row['invoice_line_id'] && $price===$billPrice;
        $identityOK=$row['invoice_line_id'] && (string)$row['item_name']===(string)$row['invoice_item_name'] && (string)$row['unit']===(string)$row['invoice_unit'];
        $check($receiptOK,'Gmail delivered = accepted + rejected = PO ordered for '.$row['item_name'].'.');
        $check((bool)$qtyOK,'Corrected supplier invoice bills Gmail-reported accepted quantity for '.$row['item_name'].'.');
        $check((bool)$priceOK && (bool)$identityOK,'Supplier invoice item/unit/price matches approved PO for '.$row['item_name'].'.');
        $lineOriginal=memLineCents($ordered,$price);
        $check($lineOriginal===memCents($row['po_subtotal']),'Original PO line amount is consistent for '.$row['item_name'].'.');
        $poTotal+=$lineOriginal;
        if($row['invoice_line_id'] && $billed>0 && $billPrice>0) {
            $expected=memLineCents($billed,$billPrice);
            $check($expected===memCents($row['invoice_subtotal']),'Corrected invoice subtotal matches billed quantity × price for '.$row['item_name'].'.');
            $sum+=$expected;
        } else $check(false,'Missing billed line for '.$row['item_name'].'.');
        $rejectedAny=$rejectedAny||$rejected>0;
        $details[]=['po_item_id'=>$itemId,'item_name'=>$row['item_name'],'unit'=>$row['unit'],
            'po_qty'=>$row['qty_ordered'],'po_received'=>$row['qty_received'],
            'real_gr_accepted'=>null,'real_gr_rejected'=>null,
            'email_delivered'=>$r['delivered_qty']??null,'email_accepted'=>$r['accepted_qty']??null,'email_rejected'=>$r['rejected_qty']??null,
            'invoice_qty'=>$row['qty_billed'],'po_unit_price'=>$row['unit_price'],'invoice_unit_price'=>$row['billed_unit_price'],
            'receipt_matched'=>$receiptOK,'invoice_quantity_matched'=>(bool)$qtyOK,'price_matched'=>(bool)$priceOK,'line_identity_matched'=>(bool)$identityOK,
            'ordered_qty'=>$row['qty_ordered'],'received_qty'=>$r['accepted_qty']??null,'rejected_qty'=>$r['rejected_qty']??null,
            'delivered_qty'=>$r['delivered_qty']??null,'billed_qty'=>$row['qty_billed'],'unit_price_pre_vat'=>$row['billed_unit_price'],
            'line_total_pre_vat'=>$row['invoice_subtotal']];
    }
    $check($rejectedAny,'At least one rejected item was reported through Inventory Gmail.');
    if($invoice) {
        $check((int)$invoice['supplier_id']===(int)$po['supplier_id'],'Corrected invoice supplier matches PO.');
        $check($sum>0 && $sum===memCents($invoice['total_amount']),'Corrected supplier invoice total matches billed lines (pre-VAT).');
        $check($poTotal===memCents($po['total_amount']),'Original PO total matches approved line amounts.');
        $check($sum<$poTotal,'Corrected invoice excludes rejected quantities from original PO amount.');
        $check((string)$invoice['invoice_date']>=(string)$po['order_date'] && (string)$invoice['due_date']>=(string)$invoice['invoice_date'],'Invoice/due dates are valid.');
    }else $check(false,'Corrected supplier invoice missing.');
    return ['data_matched'=>$good,'checks'=>$checks,'items'=>$details,
        'real_receipts'=>[],'email_receipt'=>['subject'=>$report['gmail_subject'],'sender'=>$report['sender_email'],'delivery_reference'=>$report['delivery_reference'],'received_date'=>$report['received_date'],'revision'=>(int)$report['revision']],
        'receipt_source'=>'BUYER_ENTERED_INVENTORY_GMAIL','supplier_document_verified'=> $invoice && ($invoice['source_kind']??'')==='supplier_document' && (int)($invoice['document_checked']??0)===1,
        'pre_vat_only'=>true];
}
function memEvaluateStored(mysqli $db,array $inv): array {
    $s=$db->prepare('SELECT id,po_number,status,supplier_id,order_date,total_amount FROM purchase_orders WHERE id=?');$pid=(int)$inv['po_id'];$s->bind_param('i',$pid);$s->execute();$po=$s->get_result()->fetch_assoc();$s->close();
    $s=$db->prepare('SELECT i.*,src.supplier_invoice_reference,src.source_kind,src.document_checked,src.match_status,src.verified_at FROM invoices i LEFT JOIN buyer_invoice_source_local src ON src.invoice_id=i.id WHERE i.id=?');$iid=(int)$inv['invoice_id'];$s->bind_param('i',$iid);$s->execute();$invoice=$s->get_result()->fetch_assoc();$s->close();
    if(!$po||!$invoice)throw new DomainException('PO or invoice missing.');
    return memEvaluate($db,$po,$invoice);
}
function memFinanceSnapshot(mysqli $db,array $inv): array {
    $id=(int)$inv['invoice_id'];
    if(($inv['source_kind']??'')!=='supplier_document' || (int)($inv['document_checked']??0)!==1 || ($inv['match_status']??'')!=='matched' || empty($inv['verified_at']) || strtolower((string)$inv['invoice_status'])!=='ready_to_post')
        throw new DomainException('Corrected genuine supplier invoice must be re-verified before Finance handoff.');
    if(!pamHasResolvedDiscrepancy($db,$id))throw new DomainException('Gmail-reported discrepancy must be resolved before Finance handoff.');
    $match=memEvaluateStored($db,$inv);
    if(!$match['data_matched'] || !$match['supplier_document_verified'])throw new DomainException('Manual Gmail quantities and corrected invoice no longer match.');
    $report=memReadReport($db,$id);
    $s=$db->prepare("SELECT id,resolved_at,resolution_note FROM procurement_invoice_discrepancies WHERE invoice_id=? AND status='resolved' ORDER BY id DESC LIMIT 1");$s->bind_param('i',$id);$s->execute();$resolution=$s->get_result()->fetch_assoc();$s->close();
    if(!$resolution)throw new DomainException('Resolved discrepancy audit record missing.');
    return ['invoice_number'=>$inv['invoice_number'],'supplier_invoice_reference'=>$inv['supplier_invoice_reference'],
      'po_number'=>$inv['po_number'],'supplier'=>['id'=>(int)$inv['supplier_id'],'name'=>$inv['supplier_name'],'payment_terms'=>$inv['payment_terms']],
      'invoice_date'=>$inv['invoice_date'],'due_date'=>$inv['due_date'],'amount_pre_vat'=>(string)$inv['total_amount'],
      'original_po_amount_pre_vat'=>(string)$inv['po_total'],'tax_status'=>'NOT_VERIFIED_PRE_VAT_ONLY',
      'document_review'=>'BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION',
      'three_way_match'=>'BUYER_TRANSCRIBED_INVENTORY_EMAIL_PO_INVOICE_MATCH',
      'receipt_policy'=>'BILLED_ACCEPTED_QUANTITIES_FROM_INVENTORY_EMAIL_REJECTED_EXCLUDED',
      'inventory_email_report'=>['subject'=>$report['gmail_subject'],'sender'=>$report['sender_email'],
        'delivery_reference'=>$report['delivery_reference'],'received_date'=>$report['received_date'],
        'revision'=>(int)$report['revision'],'buyer_id'=>(int)$report['buyer_id'],
        'buyer_checked_email'=>(bool)$report['inventory_email_reviewed'],'note'=>$report['buyer_note']],
      'discrepancy_resolution'=>['case_id'=>(int)$resolution['id'],'resolved_at'=>$resolution['resolved_at'],'note'=>$resolution['resolution_note']],
      'goods_receipts'=>[],
      'items'=>array_map(static fn($x)=>[
        'po_item_id'=>$x['po_item_id'],'item_name'=>$x['item_name'],'unit'=>$x['unit'],
        'ordered_qty'=>$x['ordered_qty'],'received_qty'=>$x['received_qty'],'rejected_qty'=>$x['rejected_qty'],
        'delivered_qty'=>$x['delivered_qty'],'billed_qty'=>$x['billed_qty'],
        'unit_price_pre_vat'=>$x['unit_price_pre_vat'],'line_total_pre_vat'=>$x['line_total_pre_vat']
      ],$match['items'])];
}
