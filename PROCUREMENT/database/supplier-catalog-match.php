<?php
/**
 * UniProcur: shared supplier catalog matching for quotation display and saving.
 * Exact product + equivalent unit first; only curated alternative labels second.
 * A curated alternative must be explicitly confirmed by the Buyer in the UI.
 * Never matches products based on fuzzy text or substitutes prices from JavaScript.
 */
function uniCatalogNameKey(string $name): string {
    $lower = function_exists('mb_strtolower') ? mb_strtolower(trim($name), 'UTF-8') : strtolower(trim($name));
    return preg_replace('/[^a-z0-9]+/i', '', $lower) ?? '';
}

function uniCatalogUnitKey(string $unit): string {
    $key = uniCatalogNameKey($unit);
    $groups = [
        'piece' => ['piece', 'pieces', 'pc', 'pcs'],
        'pair'  => ['pair', 'pairs'],
        'meter' => ['meter', 'meters', 'metre', 'metres'],
        'sqft'  => ['sqft', 'squarefeet', 'squarefoot', 'sqfeet'],
        'roll'  => ['roll', 'rolls'],
        'liter' => ['liter', 'liters', 'litre', 'litres'],
        'pack'  => ['pack', 'packs'],
        'gross' => ['gross'],
        'box'   => ['box', 'boxes'],
    ];
    foreach ($groups as $canonical => $members) {
        if (in_array($key, $members, true)) return $canonical;
    }
    return $key;
}

/**
 * Curated candidate names are NOT declared equivalent automatically. The Buyer
 * must explicitly confirm the supplier-specific catalog variant before saving.
 * A duplicate/ambiguous match is never guessed. Keep this list small and reviewed.
 */
function uniCatalogApprovedCandidateNames(): array {
    return [
        'shoeboxes' => ['shoeboxesecofriendly'],
    ];
}

/** Returns ['item'=>?array, 'type'=>exact|alias|missing|ambiguous|unit_mismatch, 'issue'=>string]. */
function uniFindSupplierCatalogMatch(array $catalog, string $requestedName, string $requestedUnit): array {
    $nameKey = uniCatalogNameKey($requestedName);
    $unitKey = uniCatalogUnitKey($requestedUnit);
    if ($nameKey === '' || $unitKey === '') {
        return ['item'=>null, 'type'=>'missing', 'issue'=>'Item name/unit is empty'];
    }
    $exact = [];
    $nameOnly = [];
    foreach ($catalog as $entry) {
        if (!is_array($entry)) continue;
        $candidateKey = uniCatalogNameKey((string)($entry['item_name'] ?? ''));
        if ($candidateKey !== $nameKey) continue;
        if (uniCatalogUnitKey((string)($entry['unit'] ?? '')) === $unitKey) $exact[] = $entry;
        else $nameOnly[] = $entry;
    }
    if (count($exact) > 1) {
        return ['item'=>null, 'type'=>'ambiguous', 'issue'=>'Multiple active catalog rows match the requested name and unit'];
    }
    if (count($exact) === 1) {
        return ['item'=>$exact[0], 'type'=>'exact', 'issue'=>''];
    }

    // The curated variant is only considered when there is no exact match.
    $aliases = uniCatalogApprovedCandidateNames()[$nameKey] ?? [];
    $alternatives = [];
    foreach ($catalog as $entry) {
        if (!is_array($entry)) continue;
        if (uniCatalogUnitKey((string)($entry['unit'] ?? '')) !== $unitKey) continue;
        if (in_array(uniCatalogNameKey((string)($entry['item_name'] ?? '')), $aliases, true)) {
            $alternatives[] = $entry;
        }
    }
    if (count($alternatives) > 1) {
        return ['item'=>null, 'type'=>'ambiguous', 'issue'=>'Multiple possible catalog variants; require manual catalog correction'];
    }
    if (count($alternatives) === 1) {
        return ['item'=>$alternatives[0], 'type'=>'alias', 'issue'=>'Buyer confirmation of catalog variant required'];
    }
    return ['item'=>null, 'type'=>$nameOnly ? 'unit_mismatch' : 'missing',
        'issue'=>$nameOnly ? 'Product exists with a different unit' : 'No active supplier catalog match'];
}
