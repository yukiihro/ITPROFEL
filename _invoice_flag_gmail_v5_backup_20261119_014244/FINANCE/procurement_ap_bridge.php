<?php
/**
 * D.E.V.S Finance — Procurement invoice intake only.
 * - Reads authenticated Procurement invoice outbox from SERVER SIDE.
 * - Receives one verified handoff into a separate, idempotent Finance inbox.
 * - Acknowledges "received" to Procurement (never "posted" or "paid").
 * - Posting creates the Accounts Payable entry directly as Unpaid; it never
 *   touches payment_transactions or financial_transactions.
 */
declare(strict_types=1);
require_once dirname(__DIR__) . '/root/db.php';
if (session_status() !== PHP_SESSION_ACTIVE) session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function apReply(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
function apUser(): array {
    $u = $_SESSION['user'] ?? null;
    if (!is_array($u) || !isset($u['id'])) apReply(401, ['ok'=>false, 'message'=>'Sign in to the Finance portal first.']);
    $department = strtolower(trim((string)($u['department'] ?? '')));
    $role = strtolower(trim((string)($u['role'] ?? '')));
    $position = strtolower(trim((string)($u['position'] ?? '')));
    if ($role !== 'administrator' && !($department === 'finance' && in_array($position, ['admin','manager'], true))) {
        apReply(403, ['ok'=>false, 'message'=>'Only a Finance Admin or Manager can use the Procurement invoice inbox.']);
    }
    return $u;
}
/* Local audit helper: audit() lives in api.php, which this bridge does not
   include. Same audit_trail row shape so the notification feed picks it up. */
function apAudit(array $user, string $action, string $module, ?int $recordId, string $details): void {
    try {
        db()->prepare(
            'INSERT INTO audit_trail (user_id, action, module, record_id, description, new_value)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            (int)$user['id'], $action, $module, $recordId, $details,
            trim((string)($user['email'] ?? '')) . '|' . trim((string)($user['role'] ?? '')),
        ]);
    } catch (Throwable $e) { error_log('apAudit: ' . $e->getMessage()); }
}
function apSettings(): array {
    $secretFile = getenv('UNIPROCUR_FINANCE_TOKEN_FILE') ?: dirname(__DIR__, 3) . '/uniprocur_secrets/finance_integration_token.txt';
    $secret = is_file($secretFile) ? trim((string)file_get_contents($secretFile)) : '';
    if (!preg_match('/\A[a-fA-F0-9]{64}\z/D', $secret)) throw new RuntimeException('Finance integration token not configured. Use the existing Procurement token file, outside htdocs.');
    $url = getenv('UNIPROCUR_PROCUREMENT_INVOICE_URL') ?: 'http://127.0.0.1/ITPROFEL/PROCUREMENT/database/finance-invoice-api.php';
    $parts = parse_url($url);
    $host = strtolower((string)($parts['host'] ?? ''));
    if (($parts['scheme'] ?? '') !== 'http' || !in_array($host,['127.0.0.1','localhost'], true)
        || ($parts['user'] ?? '') !== '' || ($parts['pass'] ?? '') !== '' || !empty($parts['query']) || !empty($parts['fragment'])) {
        throw new RuntimeException('Finance invoice bridge is LOCAL XAMPP only. Configure a trusted centralized HTTPS integration for other PCs.');
    }
    return [$url, strtolower($secret)];
}
function apHttp(string $method, ?array $payload = null, string $status = 'all'): array {
    [$base, $token] = apSettings();
    $url = $base . ($method === 'GET' ? '?status=' . rawurlencode($status) : '');
    $headers = [ 'Accept: application/json', 'X-Finance-Integration-Key: ' . $token ];
    if ($method === 'POST') $headers[] = 'Content-Type: application/json';
    if (!function_exists('curl_init')) throw new RuntimeException('Enable PHP cURL in XAMPP to use Finance invoice integration.');
    $ch = curl_init($url);
    if ($ch === false) throw new RuntimeException('Failed to initialize Finance connection.');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_CONNECTTIMEOUT=>3, CURLOPT_TIMEOUT=>8,
        CURLOPT_FOLLOWLOCATION=>false, CURLOPT_HTTPHEADER=>$headers,
        CURLOPT_CUSTOMREQUEST=>$method, CURLOPT_MAXREDIRS=>0,
        CURLOPT_PROTOCOLS=>CURLPROTO_HTTP
    ]);
    if ($method === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_THROW_ON_ERROR));
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($raw === false) throw new RuntimeException('Cannot reach Procurement API: ' . $error);
    if (strlen((string)$raw) > 1024*1024) throw new RuntimeException('Procurement response exceeds allowed size.');
    $result = json_decode((string)$raw, true);
    if (!is_array($result)) throw new RuntimeException('Procurement API did not return JSON.');
    if ($code < 200 || $code >= 300 || ($result['success'] ?? false) !== true) {
        throw new RuntimeException('Procurement API error (HTTP '. $code . '): ' . substr((string)($result['message'] ?? 'Unknown issue'),0,180));
    }
    return $result;
}
function apVerifySnapshot(array $row): array {
    $snapshot = $row['invoice_snapshot'] ?? null;
    if (!is_array($snapshot)) throw new DomainException('No verified invoice snapshot.');
    $ref = (string)($row['request_ref'] ?? '');
    $sha = (string)($row['snapshot_sha256'] ?? '');
    $version = (int)($row['request_version'] ?? 0);
    if (!preg_match('/\A[a-f0-9]{32}\z/D', $ref) || !preg_match('/\A[a-f0-9]{64}\z/D', $sha) || $version < 1)
        throw new DomainException('Invalid Procurement handoff identifiers.');
    $threeWayMatch = (string)($snapshot['three_way_match'] ?? '');
    // Procurement's writer (finance-invoice-handoff-common.php) stamps V11 snapshots
    // with RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS; older pending handoffs
    // may still carry the legacy constant. Both mean a verified re-check.
    if (!in_array($threeWayMatch, [
            'RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS',
            'RECHECKED_AGAINST_LOCAL_POSTED_INVENTORY_GOODS_RECEIPTS',
        ], true)
        || ($snapshot['tax_status'] ?? '') !== 'NOT_VERIFIED_PRE_VAT_ONLY'
        || !in_array(($snapshot['document_review'] ?? ''), [
            'BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION',
            'INTERNAL_REFERENCE_REVIEW_ONLY_NO_SUPPLIER_DOCUMENT',
        ], true)
        || !is_array($snapshot['goods_receipts'] ?? null) || !count($snapshot['goods_receipts'])
        || !is_array($snapshot['items'] ?? null) || !count($snapshot['items'])) {
        throw new DomainException('Procurement invoice snapshot is not verified against posted Inventory GRs.');
    }
    $invoice = (string)($snapshot['invoice_number'] ?? '');
    $supplierRef = (string)($snapshot['supplier_invoice_reference'] ?? '');
    $po = (string)($snapshot['po_number'] ?? '');
    $supplier = trim((string)($snapshot['supplier']['name'] ?? ''));
    $amount = (string)($snapshot['amount_pre_vat'] ?? '');
    $due = (string)($snapshot['due_date'] ?? '');
    if (!preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]{0,63}\z/D', $invoice)
        || strlen($supplierRef) < 1 || strlen($supplierRef) > 100
        || !preg_match('/\APO-[A-Za-z0-9-]{1,30}\z/D',$po)
        || $supplier === '' || strlen($supplier) > 120
        || !preg_match('/\A(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?\z/D',$amount) || (float)$amount <= 0
        || !preg_match('/\A\d{4}-\d{2}-\d{2}\z/D', $due)) {
        throw new DomainException('Procurement invoice snapshot has invalid required fields.');
    }
    return ['ref'=>$ref,'sha'=>$sha,'version'=>$version,'invoice'=>$invoice,
        'supplier_invoice_reference'=>$supplierRef,'po'=>$po,'supplier'=>$supplier,'amount'=>$amount,'due'=>$due];
}
function apInbox(PDO $pdo): array {
    $stmt = $pdo->query('SELECT i.request_ref,i.request_version,i.snapshot_sha256,i.invoice_number,i.supplier_invoice_reference,
        i.po_number,i.supplier_name,i.amount_pre_vat,i.due_date,i.ack_state,i.received_at,i.acknowledged_at,
        i.vat_rate,i.vat_amount,i.amount_total,i.posted_at,
        (SELECT ap.ap_id FROM accounts_payable ap WHERE ap.invoice_no = i.invoice_number COLLATE utf8mb4_general_ci ORDER BY ap.ap_id DESC LIMIT 1) AS posted_ap_id
        FROM finance_procurement_invoice_inbox i ORDER BY i.received_at DESC LIMIT 100');
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
function apRemote(array $out): array {
    $list = $out['finance_requests'] ?? null;
    if (!is_array($list)) throw new RuntimeException('Invalid Procurement invoice queue response.');
    return $list;
}
function apAcknowledge(PDO $pdo, array $row, array $user): bool {
    $ref = (string)$row['request_ref'];
    $decisionRef = 'fin-ap-recv-' . $ref . '-' . bin2hex(random_bytes(4));
    try {
        $response = apHttp('POST', [
            'request_ref'=>$ref,'request_version'=>(int)$row['request_version'],
            'snapshot_sha256'=>(string)$row['snapshot_sha256'], 'status'=>'received',
            'decision_reference'=>$decisionRef,
            'reviewer_ref'=>'finance-admin-' . preg_replace('/[^0-9]/','',(string)$user['id']),
            'finance_reference'=>'AP-INBOX-' . substr($ref,0,12),
            'note'=>'Received by Finance AP inbox. No accounting entry, tax verification, or payment created.'
        ]);
        $status = (string)($response['status'] ?? '');
        if ($status !== 'received' && $status !== 'idempotent') {
            $fresh = apRemote(apHttp('GET', null, 'all'));
            $matched = null;
            foreach ($fresh as $entry) if (($entry['request_ref'] ?? null) === $ref) { $matched = $entry; break; }
            if (($matched['handoff_status'] ?? '') !== 'received' && ($matched['handoff_status'] ?? '') !== 'posted') {
                throw new RuntimeException('Procurement did not acknowledge Finance receipt.');
            }
        }
    } catch (Throwable $e) {
        $fresh = apRemote(apHttp('GET', null, 'all'));
        $matched = null;
        foreach ($fresh as $entry) if (($entry['request_ref'] ?? null) === $ref) { $matched = $entry; break; }
        $remoteStatus = (string)($matched['handoff_status'] ?? '');
        if ($remoteStatus !== 'received' && $remoteStatus !== 'posted') {
            throw $e;
        }
    }
    $stmt=$pdo->prepare("UPDATE finance_procurement_invoice_inbox SET ack_state='acknowledged',acknowledged_at=NOW()
                           WHERE request_ref=? AND ack_state='local_received'");
    $stmt->execute([$ref]);
    return true;
}
function apEnsureAcknowledged(PDO $pdo, array $stored, array $user): array {
    if (($stored['ack_state'] ?? '') === 'acknowledged') return $stored;
    $ref = (string)$stored['request_ref'];
    $fresh = apRemote(apHttp('GET', null, 'all'));
    $matched = null;
    foreach ($fresh as $entry) if (($entry['request_ref'] ?? null) === $ref) { $matched = $entry; break; }
    if (!$matched) throw new DomainException('Procurement handoff not found. Refresh queue.');
    if (($matched['snapshot_sha256'] ?? '') !== $stored['snapshot_sha256'] || (int)($matched['request_version'] ?? 0) !== (int)$stored['request_version'])
        throw new DomainException('Procurement handoff changed; manual review required.');
    $remoteStatus = (string)($matched['handoff_status'] ?? '');
    if ($remoteStatus === 'received') {
        $stmt = $pdo->prepare("UPDATE finance_procurement_invoice_inbox SET ack_state='acknowledged',acknowledged_at=COALESCE(acknowledged_at,NOW()) WHERE request_ref=?");
        $stmt->execute([$ref]);
    } elseif ($remoteStatus === 'pending') {
        apAcknowledge($pdo, $stored, $user);
    } else {
        throw new DomainException('Procurement handoff is not in a receivable state.');
    }
    $q = $pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? LIMIT 1');
    $q->execute([$ref]);
    return $q->fetch() ?: $stored;
}

try {
    $u = apUser();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = (string)($_GET['action'] ?? 'queue');
    if (empty($_SESSION['finance_proc_ap_csrf'])) $_SESSION['finance_proc_ap_csrf'] = bin2hex(random_bytes(32));
    $pdo = db();
    if ($method === 'GET' && $action === 'queue') {
        $local = apInbox($pdo); // Missing SQL migration produces a clear preflight error.
        $remote=[]; $remoteError='';
        try {
            $remote = apRemote(apHttp('GET', null, 'all'));
            $remote = array_values(array_filter($remote, fn($r) => is_array($r) && in_array(($r['handoff_status'] ?? ''), ['pending','received'], true)));
        } catch(Throwable $e) { $remoteError = $e->getMessage(); }
        apReply(200,['ok'=>true,'csrf_token'=>$_SESSION['finance_proc_ap_csrf'],
            'remote'=>$remote,'local'=>$local,'remote_error'=>$remoteError,
            'note'=>'Finance receives verified Procurement snapshots. This inbox does not create an AP ledger entry or payment.']);
    }
    if ($method !== 'POST' || !in_array($action,['receive','retry_ack','post'],true))
        apReply(405,['ok'=>false,'message'=>'Use GET queue or POST receive/retry_ack/post.']);
    if (stripos((string)($_SERVER['CONTENT_TYPE'] ?? ''),'application/json') !== 0)
        apReply(415,['ok'=>false,'message'=>'JSON required.']);
    $csrf = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if (!$csrf || !hash_equals((string)$_SESSION['finance_proc_ap_csrf'], $csrf))
        apReply(419,['ok'=>false,'message'=>'Finance session expired; refresh Accounts Payable.']);
    $body=json_decode(file_get_contents('php://input') ?: '',true);
    if (!is_array($body)) apReply(400,['ok'=>false,'message'=>'Invalid JSON.']);
    $ref=$body['request_ref'] ?? null;
    if (!is_string($ref) || !preg_match('/\A[a-f0-9]{32}\z/D',$ref))
        apReply(422,['ok'=>false,'message'=>'Valid Procurement request reference required.']);
    if ($action === 'retry_ack') {
        $q=$pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? LIMIT 1');
        $q->execute([$ref]);$stored=$q->fetch();
        if (!$stored) apReply(404,['ok'=>false,'message'=>'No locally received invoice for this reference.']);
        if ($stored['ack_state']==='acknowledged') apReply(200,['ok'=>true,'already_received'=>true,'message'=>'Already acknowledged by Procurement.']);
        // A fresh authenticated response is necessary before acknowledging an old local record.
        $fresh=apRemote(apHttp('GET',null,'all'));
        $matched=null;foreach($fresh as $entry) if (($entry['request_ref'] ?? null)===$ref) {$matched=$entry;break;}
        if (!$matched || ($matched['snapshot_sha256'] ?? '') !== $stored['snapshot_sha256'] || (int)($matched['request_version']??0)!==(int)$stored['request_version'])
            apReply(409,['ok'=>false,'message'=>'Procurement handoff changed; manual review required.']);
        apAcknowledge($pdo,$stored,$u);
        apReply(200,['ok'=>true,'message'=>'Finance receipt acknowledged by Procurement.']);
    }
    if ($action === 'receive') {
    $fresh=apRemote(apHttp('GET',null,'all'));
    $matched=null;foreach($fresh as $entry) if (($entry['request_ref'] ?? null)===$ref) {$matched=$entry;break;}
    if (!$matched) apReply(409,['ok'=>false,'message'=>'Invoice not found in Procurement. Refresh queue.']);
    $remoteStatus=(string)($matched['handoff_status'] ?? '');
    if (!in_array($remoteStatus,['pending','received'],true)) apReply(409,['ok'=>false,'message'=>'Invoice is not pending in Procurement. Refresh queue.']);
    $fields=apVerifySnapshot($matched);
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? FOR UPDATE');
        $q->execute([$ref]);$existing=$q->fetch();
        if ($existing && ($existing['snapshot_sha256'] !== $fields['sha'] || (int)$existing['request_version'] !== $fields['version']))
            throw new DomainException('Previously received snapshot differs; manual review required.');
        if (!$existing) {
            $q=$pdo->prepare('SELECT request_ref, posted_at, posted_ap_id, ack_state FROM finance_procurement_invoice_inbox WHERE invoice_number=? FOR UPDATE');
            $q->execute([$fields['invoice']]);$dup=$q->fetch();
            if ($dup && (string)$dup['request_ref'] !== $ref) {
                throw new DomainException('Invoice '.$fields['invoice'].' is already recorded in Finance inbox under a different handoff/request. Existing PO/ref must be reconciled before receiving this handoff (possible corrected re-handoff).');
            }
            $q=$pdo->prepare('INSERT INTO finance_procurement_invoice_inbox
                (request_ref,request_version,snapshot_sha256,invoice_number,supplier_invoice_reference,po_number,supplier_name,
                 amount_pre_vat,due_date,received_by,ack_state)
                VALUES (?,?,?,?,?,?,?,?,?, ?,\'local_received\')');
            $q->execute([$ref,$fields['version'],$fields['sha'],$fields['invoice'],$fields['supplier_invoice_reference'],
                $fields['po'],$fields['supplier'],$fields['amount'],$fields['due'],'finance-admin-' . $u['id']]);
        }
        $pdo->commit();
    } catch(Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    $q=$pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? LIMIT 1');
    $q->execute([$ref]);$saved=$q->fetch();
    if (($saved['ack_state'] ?? '') !== 'acknowledged') {
        try {
            if ($remoteStatus === 'received') {
                $stmt=$pdo->prepare("UPDATE finance_procurement_invoice_inbox SET ack_state='acknowledged',acknowledged_at=COALESCE(acknowledged_at,NOW()) WHERE request_ref=?");
                $stmt->execute([$ref]);
            } else {
                apAcknowledge($pdo,$saved,$u);
            }
        } catch(Throwable $ackError) {
            error_log('Finance invoice receipt acknowledgement: '.$ackError->getMessage());
            apReply(502,['ok'=>false,'saved_locally'=>true,
                'message'=>'Invoice saved in Finance inbox, but Procurement acknowledgment failed. Use Retry Acknowledgment after checking connectivity.']);
        }
    }
    apAudit($u, 'receive', 'procurement_invoice', null,
        sprintf('Received Procurement invoice %s from %s (₱%s, PO %s, due %s)',
            (string)$fields['invoice'],
            trim((string)$fields['supplier']) ?: 'unknown supplier',
            number_format((float)$fields['amount'], 2),
            trim((string)$fields['po']) ?: '—',
            (string)$fields['due']));
    apReply(200,['ok'=>true,'message'=>'Invoice received in Finance AP inbox and acknowledged to Procurement.']);
    }
  if ($action === 'post') {
    // Finance accounting posting for a Procurement invoice handoff.
    $q=$pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? LIMIT 1');
    $q->execute([$ref]);$stored=$q->fetch();
    if (!$stored) {
      // Accept direct post from pending queue by importing the handoff first.
      $fresh=apRemote(apHttp('GET',null,'all'));
      $matched=null;foreach($fresh as $entry) if (($entry['request_ref'] ?? null)===$ref) {$matched=$entry;break;}
      if (!$matched) apReply(404,['ok'=>false,'message'=>'No Procurement handoff found for this reference.']);
      if (!in_array((string)($matched['handoff_status'] ?? ''), ['pending','received'], true))
        apReply(409,['ok'=>false,'message'=>'Invoice is not awaiting posting in Procurement. Refresh queue.']);
      $fields=apVerifySnapshot($matched);
      $pdo->beginTransaction();
      try {
        $q=$pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? FOR UPDATE');
        $q->execute([$ref]);$existing=$q->fetch();
        if (!$existing) {
          $q=$pdo->prepare('SELECT request_ref, posted_at, posted_ap_id FROM finance_procurement_invoice_inbox WHERE invoice_number=? FOR UPDATE');
          $q->execute([$fields['invoice']]);$dup=$q->fetch();
          if ($dup && (string)$dup['request_ref'] !== $ref) {
            throw new DomainException('Invoice '.$fields['invoice'].' is already recorded in Finance inbox under a different handoff/request. Existing record must be reconciled before posting this handoff.');
          }
          $q=$pdo->prepare('INSERT INTO finance_procurement_invoice_inbox
              (request_ref,request_version,snapshot_sha256,invoice_number,supplier_invoice_reference,po_number,supplier_name,
               amount_pre_vat,due_date,received_by,ack_state)
              VALUES (?,?,?,?,?,?,?,?,?, ?,\'local_received\')');
          $q->execute([$ref,$fields['version'],$fields['sha'],$fields['invoice'],$fields['supplier_invoice_reference'],
              $fields['po'],$fields['supplier'],$fields['amount'],$fields['due'],'finance-admin-' . $u['id']]);
        }
        $pdo->commit();
      } catch(Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
      $q=$pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? LIMIT 1');
      $q->execute([$ref]);$stored=$q->fetch();
    }
    if (!$stored) apReply(404,['ok'=>false,'message'=>'No locally received invoice for this reference.']);
    if ($stored['posted_at'] !== null) apReply(200,['ok'=>true,'already_posted'=>true,
        'ap_id'=>(int)$stored['posted_ap_id'],'message'=>'Already posted to Finance accounting (AP-'.(int)$stored['posted_ap_id'].').']);
    if (($stored['ack_state'] ?? '') !== 'acknowledged') {
      $stored = apEnsureAcknowledged($pdo, $stored, $u);
    }
    $fresh=apRemote(apHttp('GET',null,'all'));
    $matched=null;foreach($fresh as $entry) if (($entry['request_ref'] ?? null)===$ref) {$matched=$entry;break;}
    if (!$matched) apReply(409,['ok'=>false,'message'=>'Invoice not found in Procurement. Refresh queue.']);
    if (($matched['snapshot_sha256'] ?? '') !== $stored['snapshot_sha256'] || (int)($matched['request_version'] ?? 0) !== (int)$stored['request_version'])
        apReply(409,['ok'=>false,'message'=>'Procurement handoff changed; manual review required.']);
    $remoteStatus=(string)($matched['handoff_status'] ?? '');
    if ($remoteStatus === 'posted') apReply(200,['ok'=>true,'already_posted'=>true,'message'=>'Invoice already posted in Procurement. Refresh queue.']);
    if ($remoteStatus !== 'received') apReply(409,['ok'=>false,'message'=>'Invoice is not ready for posting in Procurement (status: '.$remoteStatus.'). Refresh queue.']);
    $fields=apVerifySnapshot($matched);
    $vatRate = $body['vat_rate'] ?? null;
    if (!is_numeric($vatRate) || (float)$vatRate < 0 || (float)$vatRate > 30)
        apReply(422,['ok'=>false,'message'=>'VAT rate must be a number between 0 and 30 percent.']);
    $vatRate = round((float)$vatRate, 2);
    $pre = (float)$fields['amount'];
    $vat = round($pre * $vatRate / 100, 2);
    $total = round($pre + $vat, 2);
    if ($total > 9999999999.99) apReply(422,['ok'=>false,'message'=>'Posted amount exceeds the accounting limit.']);
    $pdo->beginTransaction();
    try {
        $q=$pdo->prepare('SELECT * FROM finance_procurement_invoice_inbox WHERE request_ref=? FOR UPDATE');
        $q->execute([$ref]);$locked=$q->fetch();
        if (!$locked || $locked['posted_at'] !== null) {
            $pdo->commit();
            apReply(200,['ok'=>true,'already_posted'=>true,'message'=>'Already posted to Finance accounting.']);
        }
        // Resolve-or-create the supplier exactly like Finance's own payables flow.
        $supName = trim((string)$fields['supplier']);
        $selSup=$pdo->prepare('SELECT supplier_id FROM suppliers WHERE supplier_name = ? LIMIT 1');
        $selSup->execute([$supName]);
        $supId=(int)($selSup->fetchColumn() ?: 0);
        if ($supId === 0) {
            $newSup=$pdo->prepare('INSERT INTO suppliers (supplier_name) VALUES (?)');
            $newSup->execute([$supName]);
            $supId=(int)$pdo->lastInsertId();
        }
        // Reuse existing AP row if present to keep receive/post idempotent.
        // A posted Procurement handoff is settled on arrival: the AP entry is
        // recorded as Unpaid immediately, with no financial transaction or
        // payment record behind it.
        $selAp=$pdo->prepare('SELECT ap_id FROM accounts_payable WHERE invoice_no = ? ORDER BY ap_id DESC LIMIT 1');
        $selAp->execute([$fields['invoice']]);
        $apId=(int)($selAp->fetchColumn() ?: 0);
        if ($apId === 0) {
          $ins=$pdo->prepare('INSERT INTO accounts_payable (supplier_id,invoice_no,po_number,amount,cost_of_goods,due_date,status) VALUES (?,?,?,?,?,?,?)');
          $ins->execute([$supId,$fields['invoice'],$fields['po'],$total,$pre,$fields['due'],'Unpaid']);
          $apId=(int)$pdo->lastInsertId();
        } else {
          $paidUpd=$pdo->prepare("UPDATE accounts_payable SET status='Unpaid'
                                   WHERE ap_id=?
                                     AND LOWER(TRIM(COALESCE(status,''))) NOT IN ('paid','unpaid')");
          $paidUpd->execute([$apId]);
        }
        $upd=$pdo->prepare('UPDATE finance_procurement_invoice_inbox SET vat_rate=?,vat_amount=?,amount_total=?,posted_ap_id=?,posted_at=NOW(),ack_state=\'acknowledged\',acknowledged_at=COALESCE(acknowledged_at,NOW()) WHERE request_ref=? AND posted_at IS NULL');
        $upd->execute([$vatRate,$vat,$total,$apId,$ref]);
        $pdo->commit();
        apAudit($u, 'post', 'procurement_invoice', $apId,
            sprintf('Posted Procurement invoice %s from %s to Accounts Payable AP-%d (₱%s incl. VAT %s%%, PO %s) — recorded as Unpaid',
                (string)$fields['invoice'],
                trim((string)$fields['supplier']) ?: 'unknown supplier',
                $apId,
                number_format($total, 2),
                rtrim(rtrim(number_format($vatRate, 2, '.', ''), '0'), '.'),
                trim((string)$fields['po']) ?: '—'));
    } catch(Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    // Acknowledge the posting to Procurement (received -> posted).
    $finRef='AP-'.$apId;
    $response=apHttp('POST',[
        'request_ref'=>$ref,'request_version'=>(int)$stored['request_version'],
        'snapshot_sha256'=>(string)$stored['snapshot_sha256'],'status'=>'posted',
        'decision_reference'=>'fin-ap-post-'.$ref.'-'.bin2hex(random_bytes(4)),
        'reviewer_ref'=>'finance-admin-'.preg_replace('/[^0-9]/','',(string)$u['id']),
        'finance_reference'=>$finRef,
        'note'=>'Posted to Finance accounting (accounts_payable AP-'.$apId.', recorded as Unpaid). VAT '.number_format($vatRate,2).'% confirmed by Finance.'
    ]);
    if (($response['status'] ?? '') !== 'posted') throw new RuntimeException('Procurement did not acknowledge the posting.');
    apReply(200,['ok'=>true,'ap_id'=>$apId,'finance_reference'=>$finRef,
        'amount_pre_vat'=>number_format($pre,2,'.',''),'vat_rate'=>number_format($vatRate,2,'.',''),
        'vat_amount'=>number_format($vat,2,'.',''),'amount_total'=>number_format($total,2,'.',''),
        'message'=>'Posted to Finance accounting as AP-'.$apId.' (recorded as Unpaid) and acknowledged to Procurement.']);
  }
} catch(DomainException $e) { apReply(409,['ok'=>false,'message'=>$e->getMessage()]); }
  catch(PDOException $e) {
    error_log('Finance AP invoice bridge DB: '.$e->getMessage());
    apReply(503,['ok'=>false,'message'=>'Finance inbox table unavailable. Import the included FINANCE_AP_INBOX_MIGRATION.sql in finance_hr first.']);
} catch(Throwable $e) {
    error_log('Finance AP invoice bridge: '.$e->getMessage());
    apReply(503,['ok'=>false,'message'=>'Finance invoice inbox unavailable: '.$e->getMessage()]);
}
