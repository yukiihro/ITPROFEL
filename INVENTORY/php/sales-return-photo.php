<?php
require_once "database.php";
require_login();
$itemId = (int)($_GET["item_id"] ?? 0);
if ($itemId <= 0) { http_response_code(400); exit; }
$s = $pdo->prepare("SELECT photo_path FROM sales_return_items WHERE id=? LIMIT 1");
$s->execute([$itemId]);
$relative = $s->fetchColumn();
if (!$relative || strpos($relative, "uploads/sales-returns/") !== 0) { http_response_code(404); exit; }
$root = realpath(__DIR__ . "/..");
$file = realpath($root . DIRECTORY_SEPARATOR . str_replace(["/", "\\"], DIRECTORY_SEPARATOR, $relative));
$uploadRoot = realpath($root . DIRECTORY_SEPARATOR . "uploads" . DIRECTORY_SEPARATOR . "sales-returns");
if (!$file || !$uploadRoot || strpos($file, $uploadRoot . DIRECTORY_SEPARATOR) !== 0 || !is_file($file)) { http_response_code(404); exit; }
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file);
if (!in_array($mime, ["image/jpeg", "image/png", "image/webp"], true)) { http_response_code(415); exit; }
header("Content-Type: " . $mime);
header("Content-Length: " . filesize($file));
header("X-Content-Type-Options: nosniff");
header("Cache-Control: private, max-age=300");
readfile($file);
exit;
