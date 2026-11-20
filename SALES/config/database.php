<?php
// Future-ready MySQL connection using PDO.
// Change these values when you connect the project to XAMPP/MySQL.

$db_host = 'localhost';
$db_name = 'team_sales';
$db_user = 'root';
$db_pass = '';

function getDB(): ?PDO {
    global $db_host, $db_name, $db_user, $db_pass;

    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

        $pdo = new PDO(
            "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
            $db_user,
            $db_pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
        return $pdo;
}
?>
