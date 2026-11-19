<?php
// Procurement has no own login page. Sign-in happens through the universal
// login (root/index.php); guard-page.php still sends failed session checks
// here, so this stub forwards them to the universal login.
header('Location: /ITPROFEL/root/index.php', true, 302);
exit;
