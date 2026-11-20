<?php
/** Fixed Google OAuth callback URI. */
declare(strict_types=1);
$_GET['action']='callback';
require __DIR__.'/buyer-gmail-connect.php';
