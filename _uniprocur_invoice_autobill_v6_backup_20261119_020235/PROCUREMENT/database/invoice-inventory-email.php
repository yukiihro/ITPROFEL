<?php
/** Buyer-entered Inventory Gmail receiving evidence. Never writes to the Inventory DB. */
declare(strict_types=1);
date_default_timezone_set('Asia/Manila');
require_once __DIR__.'/buyer-po-common.php';
require_once __DIR__.'/finance-invoice-handoff-common.php';
require_once __DIR__.'/manual-email-invoice-match.php';
header('X-Content-Type-Options: nosniff');
$started=false;
try {
    $method=(string)($_SERVER['REQUEST_METHOD']??'');
    if(!in_array($method,['GET','POST'],true))buyerPoJson(405,['success'=>false,'message'=>'GET/POST only.']);
    $buyer=buyerPoIdentity($conn);$buyerId=(int)$buyer['id'];
    if(empty($_SESSION['inventory_email_invoice_csrf']))$_SESSION['inventory_email_invoice_csrf']=bin2hex(random_bytes(32));
    if($method==='GET'){$number=$_GET['invoice_number']??'';$body=[];}
    else {
        if(stripos((string)($_SERVER['CONTENT_TYPE']??''),'application/json')!==0)buyerPoJson(415,['success'=>false,'message'=>'JSON required.']);
        $token=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if($token===''||!hash_equals((string)$_SESSION['inventory_email_invoice_csrf'],$token))buyerPoJson(419,['success'=>false,'message'=>'Session expired; refresh the Invoice page.']);
        $body=json_decode(file_get_contents('php://input')?:'',true);
        if(!is_array($body))buyerPoJson(400,['success'=>false,'message'=>'Invalid JSON.']);
        $number=$body['invoice_number']??'';
    }
    if(!is_string($number)||!preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]{0,63}\z/D',$number))buyerPoJson(422,['success'=>false,'message'=>'Valid invoice number required.']);
    $inv=fihInvoice($conn,$number,$buyerId);
    if(!$inv)buyerPoJson(404,['success'=>false,'message'=>'Invoice not found for Buyer.']);
    $id=(int)$inv['invoice_id'];$poId=(int)$inv['po_id'];
    $s=$conn->prepare('SELECT handoff_status FROM procurement_finance_invoice_handoffs WHERE invoice_id=? LIMIT 1');$s->bind_param('i',$id);$s->execute();$handoff=$s->get_result()->fetch_assoc();$s->close();
    $financeStatus=(string)($handoff['handoff_status']??'');
    $s=$conn->prepare("SELECT id FROM procurement_invoice_discrepancies WHERE invoice_id=? AND status='open' LIMIT 1");$s->bind_param('i',$id);$s->execute();$open=(bool)$s->get_result()->fetch_assoc();$s->close();
    $allowed=$open && $financeStatus==='' && ($inv['source_kind']??'')==='supplier_document' && strtolower((string)$inv['invoice_status'])!=='posted';
    if($method==='GET') {
        buyerPoJson(200,['success'=>true,'invoice_number'=>$number,'can_edit'=>$allowed,'open_hold'=>$open,
          'report'=>memReadReport($conn,$id),'csrf_token'=>$_SESSION['inventory_email_invoice_csrf'],
          'source_warning'=>'Inventory quantities here are MANUALLY TRANSCRIBED from Gmail by Procurement, not authenticated Inventory GR values. Finance must inspect the source email and supplier invoice.']);
    }
    if(!$allowed)throw new DomainException('Gmail quantities may be edited only while a genuine Buyer invoice is ON HOLD and not queued/posted to Finance.');
    if(($body['action']??'')!=='save_email')throw new DomainException('Invalid action.');
    $subject=trim((string)($body['gmail_subject']??''));$sender=trim((string)($body['sender_email']??''));
    $dr=trim((string)($body['delivery_reference']??''));$received=(string)($body['received_date']??'');
    $note=trim((string)($body['buyer_note']??''));$emailReviewed=($body['inventory_email_reviewed']??null)===true;
    if(strlen($subject)<8||strlen($subject)>200||!filter_var($sender,FILTER_VALIDATE_EMAIL)||strlen($sender)>200||strlen($dr)<3||strlen($dr)>100||strlen($note)<10||strlen($note)>1000||!$emailReviewed)
        throw new DomainException('Enter valid Inventory email subject, sender, delivery reference, 10+ character note, and confirm you reviewed the email.');
    if(!preg_match('/\A\d{4}-\d{2}-\d{2}\z/D',$received)||!checkdate((int)substr($received,5,2),(int)substr($received,8,2),(int)substr($received,0,4)))
        throw new DomainException('Valid delivery date required (YYYY-MM-DD).');
    $items=$body['items']??null;if(!is_array($items)||count($items)<1||count($items)>100)throw new DomainException('Include every PO item in the Inventory email report.');
    $conn->begin_transaction();$started=true;
    $s=$conn->prepare('SELECT id,status FROM invoices WHERE id=? AND created_by=? FOR UPDATE');$s->bind_param('ii',$id,$buyerId);$s->execute();$locked=$s->get_result()->fetch_assoc();$s->close();
    if(!$locked||strtolower((string)$locked['status'])==='posted')throw new DomainException('Invoice locked or posted.');
    $s=$conn->prepare('SELECT id FROM procurement_finance_invoice_handoffs WHERE invoice_id=? LIMIT 1');$s->bind_param('i',$id);$s->execute();$f=$s->get_result()->fetch_assoc();$s->close();if($f)throw new DomainException('Invoice already handed to Finance.');
    $s=$conn->prepare("SELECT id FROM procurement_invoice_discrepancies WHERE invoice_id=? AND status='open' LIMIT 1 FOR UPDATE");$s->bind_param('i',$id);$s->execute();$case=$s->get_result()->fetch_assoc();$s->close();if(!$case)throw new DomainException('Flag discrepancy first.');
    $s=$conn->prepare('SELECT id,item_name,unit,qty_ordered FROM po_items WHERE po_id=? ORDER BY id');$s->bind_param('i',$poId);$s->execute();$poLines=$s->get_result()->fetch_all(MYSQLI_ASSOC);$s->close();
    if(count($items)!==count($poLines))throw new DomainException('Gmail quantities must include each PO item once.');
    $poMap=[];foreach($poLines as $line)$poMap[(int)$line['id']]=$line;
    $mapped=[];$rejectedAny=false;
    foreach($items as $line) {
        if(!is_array($line))throw new DomainException('Invalid item.');
        $item=filter_var($line['po_item_id']??null,FILTER_VALIDATE_INT);
        if(!$item||!isset($poMap[$item]))throw new DomainException('Duplicate or unrelated PO item in Gmail data.');
        $ordered=memCents($poMap[$item]['qty_ordered']);
        $delivered=memCents($line['delivered_qty']??'');$accepted=memCents($line['accepted_qty']??'');$rejected=memCents($line['rejected_qty']??'',true);
        if($delivered!==$accepted+$rejected || $delivered!==$ordered)
            throw new DomainException('For '.$poMap[$item]['item_name'].': delivered must equal accepted + rejected AND PO ordered. This flow covers complete deliveries with rejected items only.');
        $rejectedAny=$rejectedAny||$rejected>0;
        $mapped[]=['po_item_id'=>$item,'delivered_qty'=>number_format($delivered/100,2,'.',''),
          'accepted_qty'=>number_format($accepted/100,2,'.',''),'rejected_qty'=>number_format($rejected/100,2,'.','')];
        unset($poMap[$item]);
    }
    if($poMap||!$rejectedAny)throw new DomainException('All PO lines and at least one rejected item are required for Gmail discrepancy report.');
    $s=$conn->prepare('SELECT id,revision FROM procurement_invoice_email_receipts WHERE invoice_id=? FOR UPDATE');$s->bind_param('i',$id);$s->execute();$old=$s->get_result()->fetch_assoc();$s->close();
    if($old){
        $reportId=(int)$old['id'];$revision=(int)$old['revision']+1;
        $s=$conn->prepare('UPDATE procurement_invoice_email_receipts SET gmail_subject=?,sender_email=?,delivery_reference=?,received_date=?,buyer_note=?,inventory_email_reviewed=1,revision=? WHERE id=? AND buyer_id=?');
        $s->bind_param('sssssiii',$subject,$sender,$dr,$received,$note,$revision,$reportId,$buyerId);$s->execute();$s->close();
        $s=$conn->prepare('DELETE FROM procurement_invoice_email_receipt_items WHERE report_id=?');$s->bind_param('i',$reportId);$s->execute();$s->close();
    }else{
        $revision=1;
        $s=$conn->prepare('INSERT INTO procurement_invoice_email_receipts(invoice_id,po_id,buyer_id,gmail_subject,sender_email,delivery_reference,received_date,buyer_note,inventory_email_reviewed,revision) VALUES (?,?,?,?,?,?,?,?,1,1)');
        $s->bind_param('iiisssss',$id,$poId,$buyerId,$subject,$sender,$dr,$received,$note);$s->execute();$reportId=(int)$conn->insert_id;$s->close();
    }
    $s=$conn->prepare('INSERT INTO procurement_invoice_email_receipt_items(report_id,po_item_id,delivered_qty,accepted_qty,rejected_qty) VALUES (?,?,?,?,?)');
    foreach($mapped as $line){$iid=(int)$line['po_item_id'];$d=$line['delivered_qty'];$a=$line['accepted_qty'];$r=$line['rejected_qty'];$s->bind_param('iisss',$reportId,$iid,$d,$a,$r);$s->execute();}$s->close();
    $snap=json_encode(['invoice_number'=>$number,'po_number'=>$inv['po_number'],'email'=>['subject'=>$subject,'sender'=>$sender,'delivery_reference'=>$dr,'received_date'=>$received,'note'=>$note], 'items'=>$mapped],JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);
    $action=$old?'updated':'created';
    $s=$conn->prepare('INSERT INTO procurement_invoice_email_receipt_audit(report_id,revision,action,actor_buyer_id,evidence_json) VALUES (?,?,?,?,?)');
    $s->bind_param('iisis',$reportId,$revision,$action,$buyerId,$snap);$s->execute();$s->close();
    // Invalidate previous numerical verification until Buyer rechecks corrected invoice.
    $s=$conn->prepare("UPDATE invoices SET status='discrepancy' WHERE id=? AND status IN ('ready_to_post','pending_match','discrepancy')");$s->bind_param('i',$id);$s->execute();$s->close();
    $s=$conn->prepare("UPDATE buyer_invoice_source_local SET match_status='discrepancy',match_summary='Buyer-entered Inventory Gmail quantities changed; verification required.',verified_at=NULL,verified_by=NULL WHERE invoice_id=?");$s->bind_param('i',$id);$s->execute();$s->close();
    $conn->commit();$started=false;
    buyerPoJson(200,['success'=>true,'revision'=>$revision,'message'=>'Inventory Gmail quantities saved in Procurement with audit history. Invoice remains ON HOLD. No Inventory GR or Finance records changed.']);
}catch(DomainException $e){if($started)$conn->rollback();buyerPoJson(409,['success'=>false,'message'=>$e->getMessage()]);}
catch(Throwable $e){if($started){try{$conn->rollback();}catch(Throwable $ignored){}}error_log('Inventory email invoice: '.$e->getMessage());buyerPoJson(500,['success'=>false,'message'=>'Could not save Gmail quantities. Check imported 06 SQL and PHP logs.']);}
