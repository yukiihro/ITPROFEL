<?php
// Production self-registration is disabled. Accounts are created by the HR
// department (finance_hr.accounts) and mirrored into
// team3production.production_users by the universal login bridge
// (root/api.php — production bridge).
require_once "database.php";
json_response(["success" => false, "message" => "Sign-up is disabled. Accounts are created by HR — log in through the universal login page."], 410);
