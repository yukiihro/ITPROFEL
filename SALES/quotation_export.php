<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/simple_pdf.php';
requireLogin();
$pdo=getDB();
$id=(int)($_GET['id']??0);
$st=$pdo->prepare("
    SELECT 
        q.*,
        c.customer_name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.province,
        q.product_code
    FROM sales_quotations q
    JOIN customers c 
        ON c.cus_id = q.customer_id
    WHERE q.sq_id = ?
    LIMIT 1
");
$st->execute([$id]); $q=$st->fetch();
if(!$q){http_response_code(404);exit('Quotation not found.');}
$inventoryProduct = checkInventoryProduct((string)$q['product_code']);
$q['product_name'] = !empty($inventoryProduct['ok'])
    ? (string)$inventoryProduct['item_name']
    : (string)$q['product_code'];
$user=currentUser();
if(($user['role']??'')==='Customer' && (int)($user['customer_id']??0)!==(int)$q['customer_id']){http_response_code(403);exit('Forbidden.');}
$pdf=new SimplePDF();
$pdf->text(48,55,'TEAM SALES',24,true); $pdf->text(48,78,'SALES QUOTATION',12,true);
$pdf->text(48,110,'Quotation No.: '.$q['quotation_no'],11,true);
$pdf->text(400,110,'Date: '.niceDate($q['quotation_date']),10);
$pdf->text(48,132,'Valid Until: '.($q['valid_until']?niceDate($q['valid_until']):'—'),10);
$pdf->line(48,148,547,148,1);
$pdf->text(48,175,'CUSTOMER',9,true); $pdf->text(48,194,$q['customer_name'],11,true);
$pdf->text(48,213,trim(($q['address']??'').' '.($q['city']??'').' '.($q['province']??'')),9);
$pdf->text(48,232,'Email: '.($q['email']??'—').'   Phone: '.($q['phone']??'—'),9);
$pdf->rect(48,260,499,34,[0.94,0.94,0.94]);
$pdf->text(58,281,'ITEM',9,true); $pdf->text(290,281,'QTY',9,true); $pdf->text(365,281,'UNIT PRICE',9,true); $pdf->text(470,281,'TOTAL',9,true);
$pdf->text(
    58,
    315,
    (string)($q['product_name'] ?? '—'),
    10,
    true
);
$pdf->text(
    295,
    315,
    (string)($q['quantity'] ?? '—'),
    10,
    true
);
$shippingFee=(float)($q['shipping_fee']??0);
$subtotal=max(0,(float)$q['total_amount']-$shippingFee);
$unit=$q['quantity']?$subtotal/(int)$q['quantity']:0;
$pdf->text(365,315,'PHP '.number_format($unit,2),10); $pdf->textRight(545,315,'PHP '.number_format($subtotal,2),10,true);
$pdf->line(48,332,547,332,0.7);
$pdf->text(350,355,'Shipping',10); $pdf->textRight(545,355,'PHP '.number_format($shippingFee,2),10);
$pdf->textRight(545,380,'TOTAL: PHP '.number_format((float)$q['total_amount'],2),14,true);
$pdf->text(48,405,'CUSTOMER APPROVAL',10,true);
$pdf->text(48,425,'This quotation is subject to customer approval. Once approved,',9);
$pdf->text(48,442,'a Purchase Order will be generated in the Sales module.',9);
$pdf->text(48,520,'Thank you for choosing Team Sales.',10);
header('Content-Type: application/pdf'); header('Content-Disposition: inline; filename="'.$q['quotation_no'].'.pdf"');
echo $pdf->output();
