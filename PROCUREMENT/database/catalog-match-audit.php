<?php
/** Read-only CLI audit: enumerate unresolved matches and proposed named variants on open RFQs. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once __DIR__ . '/supplier-catalog-match.php';
require_once __DIR__ . '/procurement_db_connection.php';

$sql = "SELECT r.rfq_number, pi.item_name, pi.unit, s.id AS supplier_id, s.name AS supplier_name
        FROM rfqs r
        JOIN pr_items pi ON pi.pr_id = r.pr_id
        JOIN rfq_quotes rq ON rq.rfq_id = r.id
        JOIN suppliers s ON s.id = rq.supplier_id
        WHERE r.status = 'open'
        ORDER BY r.rfq_number, s.name, pi.id";
$rows = $conn->query($sql);
if (!$rows) { fwrite(STDERR, "Database query failed.\n"); exit(1); }
$stmt = $conn->prepare('SELECT id,item_name,unit,unit_price FROM supplier_items WHERE supplier_id=? AND is_active=1');
$cached = []; $issues=0; $variants=0; $checked=0;
while ($row = $rows->fetch_assoc()) {
    $id = (int)$row['supplier_id'];
    if (!array_key_exists($id, $cached)) {
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $cached[$id] = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }
    $match=uniFindSupplierCatalogMatch($cached[$id], (string)$row['item_name'], (string)$row['unit']);
    $checked++;
    if ($match['type']==='alias') {
        $variants++;
        echo '[REVIEW VARIANT] '.$row['rfq_number'].' | '.$row['supplier_name'].' | '.$row['item_name'].' ('.$row['unit'].') => '. $match['item']['item_name'].' ('.$match['item']['unit'].') | DB price: '.$match['item']['unit_price']."\n";
    } elseif ($match['item']===null) {
        $issues++;
        echo '[BLOCKED '.$match['type'].'] '.$row['rfq_number'].' | '.$row['supplier_name'].' | '.$row['item_name'].' ('.$row['unit'].') | '.$match['issue']."\n";
    }
}
$stmt->close();
printf("Audit finished. Checked %d selected supplier-item rows; %d unresolved; %d variants requiring Buyer confirmation.\n", $checked, $issues, $variants);
