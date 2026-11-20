<?php
/** UniProcur Buyer Gmail notifications (headers only, read-only Google scope).
 * No mail content, passwords, or OAuth tokens are exposed to the browser.
 * Credentials and tokens live OUTSIDE Apache's htdocs folder.
 */
declare(strict_types=1);
require_once __DIR__ . '/buyer-po-common.php';

function bgmPrivateDir(): string {
    $docRoot = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
    $real = $docRoot !== '' ? realpath($docRoot) : false;
    if (!$real) throw new RuntimeException('Apache DOCUMENT_ROOT is not configured.');
    $dir = dirname($real) . DIRECTORY_SEPARATOR . 'private';
    if (!is_dir($dir)) throw new RuntimeException('Private Gmail config folder is missing. Follow README setup.');
    $dirReal = realpath($dir);
    if (!$dirReal || str_starts_with(strtolower(str_replace('\\', '/', $dirReal)) . '/', strtolower(str_replace('\\', '/', $real)) . '/')) {
        throw new RuntimeException('Gmail credentials must be outside webroot.');
    }
    return $dirReal;
}
function bgmConfig(): ?array {
    try { $file = bgmPrivateDir() . DIRECTORY_SEPARATOR . 'uniprocur_buyer_gmail_config.php'; }
    catch (Throwable $e) { return null; }
    if (!is_file($file)) return null;
    $cfg = require $file;
    if (!is_array($cfg)) return null;
    foreach (['client_id','client_secret','redirect_uri','expected_email'] as $key) {
        if (empty($cfg[$key]) || str_contains((string)$cfg[$key], 'PASTE_')) return null;
    }
    if (!preg_match('~^https?://localhost(?::\d+)?/ITPROFEL/PROCUREMENT/database/buyer-gmail-callback\.php$~i', (string)$cfg['redirect_uri'])
        && !preg_match('~^https?://127\.0\.0\.1(?::\d+)?/ITPROFEL/PROCUREMENT/database/buyer-gmail-callback\.php$~i', (string)$cfg['redirect_uri'])) {
        throw new RuntimeException('This classroom installer only permits the stated localhost OAuth callback.');
    }
    return $cfg;
}
function bgmPath(string $name): string { return bgmPrivateDir() . DIRECTORY_SEPARATOR . $name; }
function bgmReadJson(string $file): ?array {
    if (!is_file($file)) return null;
    $data = json_decode((string)file_get_contents($file), true);
    return is_array($data) ? $data : null;
}
function bgmWriteJson(string $file, array $data): void {
    $content = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    $tmp = $file . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (file_put_contents($tmp, $content, LOCK_EX) === false) throw new RuntimeException('Cannot securely save Gmail connection.');
    @chmod($tmp, 0600);
    if (!@rename($tmp, $file)) { @unlink($tmp); throw new RuntimeException('Cannot finish saving Gmail connection.'); }
}
function bgmTokens(): ?array {
    try { return bgmReadJson(bgmPath('uniprocur_buyer_gmail_token.json')); }
    catch (Throwable $e) { return null; }
}
function bgmHttp(string $url, ?string $bearer = null, ?array $post = null): array {
    if (!function_exists('curl_init')) throw new RuntimeException('PHP cURL extension is required in XAMPP.');
    if (!str_starts_with($url, 'https://gmail.googleapis.com/gmail/v1/users/me/')
        && !str_starts_with($url, 'https://oauth2.googleapis.com/token')) {
        throw new RuntimeException('Invalid Google API endpoint.');
    }
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    if ($bearer !== null) $headers[] = 'Authorization: Bearer ' . $bearer;
    if ($post !== null) $headers[] = 'Content-Type: application/x-www-form-urlencoded';
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    if ($post !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post, '', '&', PHP_QUERY_RFC3986));
    }
    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false) throw new RuntimeException('Unable to reach Google API over HTTPS (check XAMPP cURL CA certificate). ' . substr($err, 0, 130));
    $data = json_decode($body, true);
    if ($status < 200 || $status >= 300 || !is_array($data)) {
        $reason = is_array($data) ? (string)($data['error']['message'] ?? $data['error_description'] ?? $data['error'] ?? '') : '';
        error_log('UniProcur Gmail API HTTP ' . $status . ' (' . substr($reason, 0, 120) . ')');
        throw new RuntimeException('Google API rejected the request (HTTP ' . $status . '). Check Gmail API, OAuth consent, and account access.');
    }
    return $data;
}
function bgmAccessToken(array $cfg): string {
    $token = bgmTokens();
    if (!$token || strcasecmp((string)($token['email'] ?? ''), (string)$cfg['expected_email']) !== 0) {
        throw new RuntimeException('Buyer Gmail is not connected.');
    }
    if (!empty($token['access_token']) && (int)($token['expires_at'] ?? 0) > time() + 90) return (string)$token['access_token'];
    if (empty($token['refresh_token'])) throw new RuntimeException('Gmail session expired. Reconnect the Buyer Gmail.');
    $new = bgmHttp('https://oauth2.googleapis.com/token', null, [
        'client_id'=>(string)$cfg['client_id'], 'client_secret'=>(string)$cfg['client_secret'],
        'refresh_token'=>(string)$token['refresh_token'],'grant_type'=>'refresh_token',
    ]);
    if (empty($new['access_token'])) throw new RuntimeException('Google access token refresh failed.');
    $token['access_token'] = (string)$new['access_token'];
    $token['expires_at'] = time() + (int)($new['expires_in'] ?? 3600);
    bgmWriteJson(bgmPath('uniprocur_buyer_gmail_token.json'), $token);
    return $token['access_token'];
}
function bgmCut(string $s, int $limit): string {
    return function_exists('mb_substr') ? mb_substr($s,0,$limit,'UTF-8') : substr($s,0,$limit);
}
function bgmGmailEvents(array $cfg): array {
    $cacheFile = bgmPath('uniprocur_buyer_gmail_cache.json');
    $cache = bgmReadJson($cacheFile);
    if ($cache && (time() - (int)($cache['retrieved_at'] ?? 0)) < 45 && isset($cache['events']) && is_array($cache['events'])) {
        return $cache['events'];
    }
    $access = bgmAccessToken($cfg);
    // gmail.metadata scope cannot use Gmail search q. Read INBOX headers and filter locally.
    $page = bgmHttp('https://gmail.googleapis.com/gmail/v1/users/me/messages?' . http_build_query([
        'labelIds'=>'INBOX', 'maxResults'=>40,
    ]), $access);
    $events=[];
    $cutoff = time() - 30 * 86400;
    $only = is_array($cfg['sender_allowlist'] ?? null) ? array_values(array_filter(array_map('strtolower', $cfg['sender_allowlist']))) : [];
    foreach (array_slice((array)($page['messages'] ?? []), 0, 40) as $entry) {
        $id = (string)($entry['id'] ?? '');
        if (!preg_match('/\A[a-f0-9]{8,40}\z/i', $id)) continue;
        $url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' . rawurlencode($id) . '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date';
        try { $msg = bgmHttp($url, $access); }
        catch (Throwable $e) { error_log('Gmail message metadata unavailable: ' . $e->getMessage()); continue; }
        $received = (int)floor(((float)($msg['internalDate'] ?? 0))/1000);
        if ($received < $cutoff) continue;
        $headers=[];
        foreach ((array)($msg['payload']['headers'] ?? []) as $h) {
            $key = strtolower((string)($h['name'] ?? ''));
            if (in_array($key, ['subject','from','date'], true)) $headers[$key]=(string)($h['value'] ?? '');
        }
        $subject=trim($headers['subject'] ?? '');
        $from=trim($headers['from'] ?? '');
        $senderEmail = preg_match('/<([^<>\s]+@[^<>\s]+)>/', $from, $m) ? strtolower($m[1]) : strtolower($from);
        if ($only && !in_array($senderEmail, $only, true)) continue;
        // Conservative relevance filter: only relevant Inventory/receiving/rejected-item mail.
        if (!preg_match('/inventory|rejected|reject(?:ion)?|damaged|delivery received|goods receipt|discrepanc|received items/i', $subject.' '.$from)) continue;
        $thread = (string)($msg['threadId'] ?? '');
        if (!preg_match('/\A[a-f0-9]{8,40}\z/i', $thread)) $thread=$id;
        $po='';
        if (preg_match('/\bPO[- ]?20\d{2}[- ]?[0-9A-Za-z-]{2,30}\b/i', $subject, $m)) $po=$m[0];
        $events[] = [
          'key'=>'gmail:'.$id, 'type'=>'gmail_inventory_report','category'=>'Buyer Gmail',
          'title'=>bgmCut($subject !== '' ? $subject : 'Inventory email received',145),
          'message'=>bgmCut('From: '.$from.($po!==''?' · '.$po:'').' · Open Gmail to review the original email. Not a verified Goods Receipt.',320),
          'occurred_at'=>gmdate('Y-m-d\TH:i:s\Z',max(0,$received)),
          'url'=>'https://mail.google.com/mail/u/?authuser='.rawurlencode((string)$cfg['expected_email']).'#all/'.rawurlencode($thread),
        ];
        if (count($events)>=25) break;
    }
    bgmWriteJson($cacheFile, ['retrieved_at'=>time(),'events'=>$events]);
    return $events;
}
