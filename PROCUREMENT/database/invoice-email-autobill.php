<?php
/** Auto-calculate an UNVERIFIED invoice draft from a Buyer-transcribed Inventory Gmail report.
 * No Gmail access, no PO/GR writes, no independent supplier-document authentication.
 */
declare(strict_types=1);
function eabDraftLines(array $reported, array $poLines): array {
    $poMap=[];
    foreach ($poLines as $row) $poMap[(int)$row['id']]=$row;
    $lines=[];$sum=0;
    if (!$reported || count($reported)!==count($poMap)) throw new DomainException('Gmail report must include every PO item.');
    foreach($reported as $row){
        $id=(int)$row['po_item_id'];
        if(!isset($poMap[$id]))throw new DomainException('Duplicate or unrelated PO item.');
        $po=$poMap[$id];unset($poMap[$id]);
        // Invoice items currently require positive billed quantity. An all-rejected PO line
        // must use a return/replacement workflow; never silently bill zero as positive.
        $accepted=memCents($row['accepted_qty']);
        $price=memCents($po['unit_price']);
        $subtotal=memLineCents($accepted,$price);
        $sum+=$subtotal;
        if($sum>999999999999)throw new DomainException('Automatic invoice amount is beyond supported limit.');
        $lines[]=[
            'po_item_id'=>$id,'item_name'=>(string)$po['item_name'],'unit'=>(string)$po['unit'],
            'qty_billed'=>number_format($accepted/100,2,'.',''),
            'unit_price'=>number_format($price/100,2,'.',''),
            'line_total'=>number_format($subtotal/100,2,'.','')
        ];
    }
    if($poMap)throw new DomainException('A PO item is missing from the Inventory email report.');
    if($sum<=0)throw new DomainException('No accepted quantity to bill.');
    return ['amount_pre_vat'=>number_format($sum/100,2,'.',''),'lines'=>$lines];
}
function eabApplyDraft(mysqli $db,int $invoiceId,int $buyerId,array $draft,int $revision): array {
    $q=$db->prepare('SELECT id,total_amount,status FROM invoices WHERE id=? AND created_by=? FOR UPDATE');
    $q->bind_param('ii',$invoiceId,$buyerId);$q->execute();$original=$q->get_result()->fetch_assoc();$q->close();
    if(!$original || !in_array(strtolower((string)$original['status']),['pending_match','discrepancy','ready_to_post'],true))
        throw new DomainException('Only an unposted ON HOLD invoice may be recalculated.');
    $q=$db->prepare('SELECT source_kind FROM buyer_invoice_source_local WHERE invoice_id=? FOR UPDATE');
    $q->bind_param('i',$invoiceId);$q->execute();$source=$q->get_result()->fetch_assoc();$q->close();
    if(!$source || $source['source_kind']!=='supplier_document')
        throw new DomainException('Cannot recalculate an archived demo or unrelated invoice source.');
    $amount=$draft['amount_pre_vat'];
    $q=$db->prepare("UPDATE invoices SET total_amount=?,status='discrepancy' WHERE id=? AND created_by=?");
    $q->bind_param('sii',$amount,$invoiceId,$buyerId);$q->execute();$q->close();
    $q=$db->prepare('DELETE FROM invoice_items WHERE invoice_id=?');
    $q->bind_param('i',$invoiceId);$q->execute();$q->close();
    $q=$db->prepare('INSERT INTO invoice_items(invoice_id,po_item_id,item_name,unit,qty_billed,unit_price) VALUES(?,?,?,?,?,?)');
    foreach($draft['lines'] as $line){
        $pid=$line['po_item_id'];$name=$line['item_name'];$unit=$line['unit'];$qty=$line['qty_billed'];$price=$line['unit_price'];
        $q->bind_param('iissss',$invoiceId,$pid,$name,$unit,$qty,$price);$q->execute();
    }$q->close();
    // Do not retain a previous supplier-document attestation after changing quantities.
    // This is a system-calculated, UNVERIFIED invoice draft until source documents are reviewed.
    $summary='AUTO GMAIL DRAFT v6: Accepted-only billed quantities copied from Buyer-entered Inventory email revision '.$revision.'. Supplier invoice document review is NOT verified.';
    $q=$db->prepare("UPDATE buyer_invoice_source_local SET document_checked=0,match_status='discrepancy',match_summary=?,verified_at=NULL,verified_by=NULL WHERE invoice_id=? AND source_kind='supplier_document'");
    $q->bind_param('si',$summary,$invoiceId);$q->execute();$changed=$q->affected_rows;$q->close();
    if($changed<1)throw new DomainException('Invoice source row changed while preparing the draft.');
    return ['previous_amount_pre_vat'=>(string)$original['total_amount'],'new_amount_pre_vat'=>$amount,'lines'=>$draft['lines'],'supplier_document_verified'=>false];
}
