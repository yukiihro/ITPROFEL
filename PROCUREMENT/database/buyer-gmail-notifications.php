<?php
/** Gmail alerts for the existing Buyer bell. No Gmail mail is modified. */
declare(strict_types=1);
require_once __DIR__ . '/buyer-gmail-common.php';
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, max-age=0');
try {
    $method=(string)($_SERVER['REQUEST_METHOD'] ?? '');
    if (!in_array($method,['GET','POST'],true)) buyerPoJson(405,['success'=>false,'message'=>'GET or POST required.']);
    $buyer=buyerPoIdentity($conn);
    $buyerId=(int)$buyer['id'];
    if (empty($_SESSION['buyer_gmail_csrf'])) $_SESSION['buyer_gmail_csrf']=bin2hex(random_bytes(24));
    $cfg=bgmConfig();
    if (!$cfg) {
        buyerPoJson(200,['success'=>true,'configured'=>false,'connected'=>false,
            'notifications'=>[],'unread_count'=>0,
            'message'=>'Set up the Google Cloud Gmail OAuth credentials first. See README.']);
    }
    $token=bgmTokens();
    if (!$token || strcasecmp((string)($token['email'] ?? ''),(string)$cfg['expected_email'])!==0) {
        buyerPoJson(200,['success'=>true,'configured'=>true,'connected'=>false,
          'notifications'=>[],'unread_count'=>0,'message'=>'Connect the Buyer Gmail using the Manage Gmail link.']);
    }
    $events=bgmGmailEvents($cfg);
    $known=array_fill_keys(array_column($events,'key'),true);
    $stmt=$conn->prepare('SELECT event_key FROM procurement_buyer_notification_reads WHERE buyer_id=? AND event_key LIKE \'gmail:%\'');
    $stmt->bind_param('i',$buyerId);$stmt->execute();
    $readMap=array_fill_keys(array_column($stmt->get_result()->fetch_all(MYSQLI_ASSOC),'event_key'),true);
    $stmt->close();
    if ($method==='POST') {
        if (stripos((string)($_SERVER['CONTENT_TYPE'] ?? ''),'application/json')!==0) buyerPoJson(415,['success'=>false,'message'=>'JSON body required.']);
        $csrf=(string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if (!$csrf || !hash_equals((string)$_SESSION['buyer_gmail_csrf'],$csrf)) buyerPoJson(419,['success'=>false,'message'=>'Gmail notification session expired. Refresh the page.']);
        $body=json_decode((string)file_get_contents('php://input'),true);
        $keys=is_array($body)?($body['keys'] ?? null):null;
        if (!is_array($keys)||count($keys)<1||count($keys)>40) buyerPoJson(422,['success'=>false,'message'=>'Provide 1 to 40 Gmail notification keys.']);
        $unique=[];
        foreach($keys as $key) {
            if (!is_string($key)||!isset($known[$key])) buyerPoJson(422,['success'=>false,'message'=>'Unknown Gmail notification. Refresh and retry.']);
            $unique[$key]=true;
        }
        $stmt=$conn->prepare('INSERT IGNORE INTO procurement_buyer_notification_reads(buyer_id,event_key,read_at) VALUES(?,?,NOW())');
        $conn->begin_transaction();
        try {
            foreach(array_keys($unique) as $key){$stmt->bind_param('is',$buyerId,$key);$stmt->execute();}
            $stmt->close();$conn->commit();
        } catch(Throwable $e) {$conn->rollback();throw $e;}
        buyerPoJson(200,['success'=>true,'marked_read'=>count($unique)]);
    }
    $unread=0;
    foreach($events as &$event){$event['read']=isset($readMap[$event['key']]);if(!$event['read'])$unread++;}unset($event);
    buyerPoJson(200,['success'=>true,'configured'=>true,'connected'=>true,
      'account'=>(string)$cfg['expected_email'],'notifications'=>$events,
      'unread_count'=>$unread,'csrf_token'=>(string)$_SESSION['buyer_gmail_csrf'],
      'note'=>'Only sender/subject/date metadata. Gmail read/unread state is NOT changed.']);
} catch(Throwable $e) {
    error_log('Buyer Gmail notifications: '.$e->getMessage());
    buyerPoJson(503,['success'=>false,'message'=>'Gmail sync unavailable: '.$e->getMessage()]);
}
