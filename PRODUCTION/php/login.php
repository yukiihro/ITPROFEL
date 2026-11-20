<?php
// Production has no own login page anymore. Sign-in happens through the
// universal login (root/index.php), which bridges the HR account into this
// app's session (root/api.php — production bridge).
require_once "database.php";
json_response(["success" => false, "message" => "Production login is disabled — use the universal login page."], 410);
