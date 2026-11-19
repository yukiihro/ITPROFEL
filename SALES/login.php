<?php
// Sales has no own login page. Sign-in happens through the universal login
// (root/index.php); this stub forwards any direct visits there.
header('Cache-Control: no-store, max-age=0');
header('Location: ../root/index.php', true, 302);
exit;
