<?php
/** OAuth web-server authorization for dedicated Buyer Gmail. */
declare(strict_types=1);
require_once __DIR__ . '/buyer-gmail-common.php';
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, max-age=0');
$buyer=buyerPoIdentity($conn);
$cfg=bgmConfig();
$action=(string)($_GET['action'] ?? 'status');
function bgmHtml(string $title,string $message,string $actions=''): never {
    header('Content-Type: text/html; charset=utf-8');
    $t=htmlspecialchars($title,ENT_QUOTES,'UTF-8');
    $m=htmlspecialchars($message,ENT_QUOTES,'UTF-8');
    echo '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'. $t .'</title><style>body{font:15px/1.6 Arial,sans-serif;background:#f7f8fa;color:#1b2533;padding:24px}main{max-width:520px;background:#fff;border:1px solid #ddd;border-radius:14px;padding:28px;margin:8vh auto}h1{font-size:23px}a,button{display:inline-block;background:#a30f1c;color:#fff;padding:10px 16px;border:0;border-radius:8px;text-decoration:none;font:600 14px Arial;cursor:pointer;margin-right:10px}small{color:#606e7c}</style></head><body><main><h1>'.$t.'</h1><p>'.$m.'</p>'.$actions.'<p><small>This is a separate Google OAuth connection. Gmail password is never stored in UniProcur.</small></p></main></body></html>';
    exit;
}
$back='<a href="../buyerdashboard/buyer-dashboard.html">Back to Buyer Dashboard</a>';
try {
    if (!$cfg) bgmHtml('Buyer Gmail setup needed','Configure client ID, client secret, and the exact OAuth callback in C:\\xampp\\private\\uniprocur_buyer_gmail_config.php first.',$back);
    if ($action==='connect') {
        if (($_SERVER['REQUEST_METHOD'] ?? '')!=='GET') {http_response_code(405);bgmHtml('Not allowed','Use GET to start Google authorization.',$back);}
        $state=bin2hex(random_bytes(24));
        $_SESSION['bgm_oauth_state']=$state;
        $_SESSION['bgm_oauth_time']=time();
        $url='https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
          'client_id'=>(string)$cfg['client_id'],
          'redirect_uri'=>(string)$cfg['redirect_uri'],
          'response_type'=>'code',
          'scope'=>'https://www.googleapis.com/auth/gmail.metadata',
          'access_type'=>'offline',
          'prompt'=>'consent select_account',
          'login_hint'=>(string)$cfg['expected_email'],
          'state'=>$state,
        ],'','&',PHP_QUERY_RFC3986);
        header('Location: '.$url,true,302);exit;
    }
    if ($action==='callback') {
        $state=(string)($_GET['state']??'');
        $code=(string)($_GET['code']??'');
        $expectedState=(string)($_SESSION['bgm_oauth_state']??'');
        $stamp=(int)($_SESSION['bgm_oauth_time']??0);
        unset($_SESSION['bgm_oauth_state'],$_SESSION['bgm_oauth_time']);
        if (!$state||!$expectedState||!hash_equals($expectedState,$state)||time()-$stamp>600) throw new RuntimeException('OAuth state expired. Please try connecting again.');
        if (!empty($_GET['error'])) throw new RuntimeException('Google authorization was cancelled or declined.');
        if (!$code) throw new RuntimeException('Google did not return an authorization code.');
        $token=bgmHttp('https://oauth2.googleapis.com/token',null,[
           'code'=>$code,'client_id'=>(string)$cfg['client_id'],
           'client_secret'=>(string)$cfg['client_secret'],
           'redirect_uri'=>(string)$cfg['redirect_uri'],'grant_type'=>'authorization_code'
        ]);
        if (empty($token['access_token'])||empty($token['refresh_token'])) {
            throw new RuntimeException('Google did not grant offline Gmail access. Try reconnecting with consent.');
        }
        $profile=bgmHttp('https://gmail.googleapis.com/gmail/v1/users/me/profile',(string)$token['access_token']);
        $account=strtolower(trim((string)($profile['emailAddress']??'')));
        if (!$account||strcasecmp($account,(string)$cfg['expected_email'])!==0) {
            throw new RuntimeException('Wrong Google account selected. Authorize '.(string)$cfg['expected_email'].' instead.');
        }
        bgmWriteJson(bgmPath('uniprocur_buyer_gmail_token.json'),[
           'email'=>$account,'access_token'=>(string)$token['access_token'],
           'refresh_token'=>(string)$token['refresh_token'],
           'expires_at'=>time()+(int)($token['expires_in']??3600),
           'connected_at'=>gmdate('c'),
        ]);
        @unlink(bgmPath('uniprocur_buyer_gmail_cache.json'));
        header('Location: ../buyerdashboard/buyer-dashboard.html?gmail=connected',true,303);exit;
    }
    if ($action==='disconnect') {
        if (($_SERVER['REQUEST_METHOD']??'')!=='POST') {http_response_code(405);bgmHtml('Not allowed','Disconnect requires POST.',$back);}
        $csrf=(string)($_POST['csrf']??'');
        if (!isset($_SESSION['bgm_management_csrf'])||!hash_equals((string)$_SESSION['bgm_management_csrf'],$csrf)) throw new RuntimeException('Invalid session. Refresh this page and retry.');
        @unlink(bgmPath('uniprocur_buyer_gmail_token.json'));
        @unlink(bgmPath('uniprocur_buyer_gmail_cache.json'));
        unset($_SESSION['bgm_management_csrf']);
        bgmHtml('Gmail disconnected','UniProcur can no longer retrieve Gmail notifications until reconnected. Existing MySQL invoice records were not changed.',$back);
    }
    $token=bgmTokens();
    $connected=$token && strcasecmp((string)($token['email']??''),(string)$cfg['expected_email'])===0;
    $csrf=bin2hex(random_bytes(24));$_SESSION['bgm_management_csrf']=$csrf;
    if ($connected) {
        $buttons='<form action="buyer-gmail-connect.php?action=disconnect" method="post"><input type="hidden" name="csrf" value="'.htmlspecialchars($csrf,ENT_QUOTES,'UTF-8').'"><button type="submit">Disconnect Buyer Gmail</button></form>'.$back;
        bgmHtml('Buyer Gmail connected','UniProcur is connected to '.(string)$cfg['expected_email'].'. Only relevant Inbox message headers are shown in the notification bell.',$buttons);
    }
    bgmHtml('Connect Buyer Gmail','Google will ask you to sign in as '.(string)$cfg['expected_email'].' and approve read-only mail metadata access. This does not send messages or change Gmail read status.', '<a href="buyer-gmail-connect.php?action=connect">Connect with Google</a>'.$back);
} catch (Throwable $e) {
    error_log('UniProcur Buyer Gmail OAuth: '.$e->getMessage());
    http_response_code(400);
    bgmHtml('Gmail connection problem',$e->getMessage(),$back);
}
