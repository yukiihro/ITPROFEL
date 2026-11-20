<?php
require_once __DIR__ . "/_bootstrap.php";

api_method(["POST"]);
$team = api_auth();
if ($team !== "Sales") api_response(false, "Only the Sales team can submit Sales Returns.", null, 403);
$contentLength = (int)($_SERVER["CONTENT_LENGTH"] ?? 0);
if ($contentLength > 24 * 1024 * 1024) api_response(false, "Sales Return request body exceeds the 24 MB limit. Compress the photos and try again.", null, 413);
$data = api_input();
$returnNumber = trim((string)($data["return_number"] ?? ""));
$salesReference = trim((string)($data["sales_reference"] ?? ""));
$returnDate = trim((string)($data["return_date"] ?? date("Y-m-d")));
$remarks = trim((string)($data["remarks"] ?? ""));
$items = $data["items"] ?? [];
if ($returnNumber === "" || !preg_match('/^[A-Za-z0-9._\/-]{2,80}$/', $returnNumber)) api_response(false, "A valid unique return_number is required.", null, 422);
$d = DateTime::createFromFormat('Y-m-d', $returnDate);
if (!$d || $d->format('Y-m-d') !== $returnDate) api_response(false, "return_date must use YYYY-MM-DD.", null, 422);
if (!is_array($items) || count($items) < 1 || count($items) > 20) api_response(false, "Submit between 1 and 20 returned items.", null, 422);

$uploadDir = __DIR__ . "/../uploads/sales-returns";
if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) api_response(false, "Unable to create the Sales Return evidence folder.", null, 500);
$clean = [];
foreach ($items as $idx => $item) {
    $name = trim((string)($item["item_name"] ?? ""));
    $size = trim((string)($item["size"] ?? ""));
    $itemId = (int)($item["item_id"] ?? 0);
    $qty = $item["quantity"] ?? null;
    $damage = trim((string)($item["damage_description"] ?? ""));
    $imageData = (string)($item["damage_photo_base64"] ?? "");
    $mime = strtolower(trim((string)($item["damage_photo_mime"] ?? "image/jpeg")));
    if ($name === "" || !is_numeric($qty) || (string)(int)$qty !== (string)$qty || (int)$qty <= 0 || $damage === "" || $imageData === "") {
        api_response(false, "Each item requires item_name, positive whole-number quantity, damage_description, and damage_photo_base64.", null, 422);
    }
    $q = null;
    if ($itemId > 0) {
        $q = $pdo->prepare("SELECT id,item_name,item_type,size,unit,status FROM items WHERE id=? AND status='Active' LIMIT 1");
        $q->execute([$itemId]);
        $found = $q->fetch();
        if ($found && strcasecmp(trim($found["item_name"]), $name) === 0 && ($size === "" || trim((string)$found["size"]) === $size)) $q = $found;
        else $q = null;
    }
    if (!$q) {
        $sql = "SELECT id,item_name,item_type,size,unit,status FROM items WHERE status='Active' AND item_type='Finished Good' AND LOWER(TRIM(item_name))=LOWER(TRIM(?))";
        $params = [$name];
        if ($size !== "") { $sql .= " AND TRIM(COALESCE(size,''))=TRIM(?)"; $params[] = $size; }
        $st = $pdo->prepare($sql . " ORDER BY id LIMIT 2");
        $st->execute($params);
        $matches = $st->fetchAll();
        if (count($matches) !== 1) api_response(false, "Could not uniquely match Finished Good item '" . $name . "' size '" . $size . "'. Send a valid item_id or exact item name and size.", null, 422);
        $q = $matches[0];
    }
    if ($q["item_type"] !== "Finished Good") api_response(false, "Sales Returns can only be submitted for Finished Goods.", null, 422);
    $mimeMap = ["image/jpeg"=>"jpg", "image/png"=>"png", "image/webp"=>"webp"];
    if (!isset($mimeMap[$mime])) api_response(false, "Damage photo must be JPG, PNG, or WEBP.", null, 422);
    if (strpos($imageData, "base64,") !== false) $imageData = substr($imageData, strpos($imageData, "base64,") + 7);
    $binary = base64_decode($imageData, true);
    if ($binary === false || strlen($binary) < 16 || strlen($binary) > 5 * 1024 * 1024) api_response(false, "Each damage photo must be valid and no larger than 5 MB.", null, 422);
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $actualMime = $finfo->buffer($binary);
    if ($actualMime !== $mime) api_response(false, "The uploaded photo content does not match its declared image type.", null, 422);
    $clean[] = ["item"=>$q, "quantity"=>(int)$qty, "damage"=>$damage, "binary"=>$binary, "extension"=>$mimeMap[$mime]];
}

$savedFiles = [];
try {
    $pdo->beginTransaction();
    $dupe = $pdo->prepare("SELECT id FROM sales_returns WHERE return_number=? LIMIT 1");
    $dupe->execute([$returnNumber]);
    if ($dupe->fetch()) throw new Exception("This Sales Return Number has already been submitted.");
    $st = $pdo->prepare("INSERT INTO sales_returns(return_number,sales_reference,return_date,source_team,status,remarks) VALUES(?,?,?,'Sales','Pending',?)");
    $st->execute([$returnNumber,$salesReference,$returnDate,$remarks]);
    $returnId = (int)$pdo->lastInsertId();
    foreach ($clean as $i => $line) {
        $fileName = 'sr_' . $returnId . '_' . ($i + 1) . '_' . bin2hex(random_bytes(8)) . '.' . $line["extension"];
        $absolute = $uploadDir . '/' . $fileName;
        if (file_put_contents($absolute, $line["binary"], LOCK_EX) === false) throw new Exception("Unable to save damage photo evidence.");
        $savedFiles[] = $absolute;
        $relative = 'uploads/sales-returns/' . $fileName;
        $it = $line["item"];
        $ins = $pdo->prepare("INSERT INTO sales_return_items(sales_return_id,item_id,item_name,size,quantity,damage_description,photo_path) VALUES(?,?,?,?,?,?,?)");
        $ins->execute([$returnId,$it["id"],$it["item_name"],$it["size"] ?? $data["size"] ?? "",$line["quantity"],$line["damage"],$relative]);
    }
    create_notification_for_admins($pdo, "New Sales Return", "Sales submitted return " . $returnNumber . " for inventory inspection.", "sales-return", null);
    $pdo->commit();
    api_response(true, "Sales Return submitted successfully and is pending Inventory inspection.", ["return_id"=>$returnId,"return_number"=>$returnNumber,"status"=>"Pending"], 201);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    foreach ($savedFiles as $file) if (is_file($file)) @unlink($file);
    if ($e instanceof PDOException && (string)$e->getCode() === "23000") api_response(false, "This Sales Return Number has already been submitted.", null, 409);
    api_response(false, $e->getMessage(), null, 422);
}
