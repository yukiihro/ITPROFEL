<?php
$current = basename($_SERVER['PHP_SELF']);
$user = currentUser();
$userRole = $user['role'] ?? '';
$corePages = ['quotations.php', 'purchase_orders.php', 'orders.php', 'delivery.php', 'returns.php'];
$billingPages = ['invoices.php', 'customer_account.php'];
$salesReport = ['reports.php'];
$inventoryPages = ['inventory.php', 'inventory_stockout_approval.php', 'purchase_order_requests.php', 'inventory_delivery_approval.php'];
$activeSection = '';
if (in_array($current, $billingPages, true)) $activeSection = 'billing';
elseif (in_array($current, $corePages, true)) $activeSection = 'core';
elseif (in_array($current, $salesReport, true)) $activeSection = 'sales';
elseif (in_array($current, $inventoryPages, true)) $activeSection = 'inventory';
$isSalesAdmin = $userRole === 'Sales Admin';
$isSalesStaff = $userRole === 'Sales Staff';
$isCustomer = $userRole === 'Customer';
?>
<?php if (!$isCustomer): ?>
    <aside class="sidebar" id="sidebar">
        <button class="sidebar-close" id="sidebarClose" type="button" aria-label="Close sidebar">&times;</button>
        <div class="brand">
            <div class="brand-logo"><img src="assets/img/logo.png" alt=""></div>
            <div class="brand-text"><strong>TEAM SALES</strong><span>Sales Management</span></div>
        </div>
        <nav class="nav-menu">
            <div class="nav-label">MAIN</div>
            <a class="section-nav <?= $current === 'dashboard.php' ? 'active' : '' ?>" href="dashboard.php"><span class="nav-icon">D</span><span>Dashboard</span><span class="section-arrow">&rsaquo;</span></a>

            <?php if ($isSalesStaff): ?>
                <div class="nav-label">SALES</div>
                <a class="section-nav <?= $activeSection === 'core' ? 'active' : '' ?>" href="quotations.php?section=core"><span class="nav-icon">C</span><span>Core Sales & Order Management</span><span class="section-arrow">&rsaquo;</span></a>
                <div class="nav-label">INVENTORY</div>
                <a class="section-nav <?= $current === 'inventory.php' ? 'active' : '' ?>" href="inventory.php"><span class="nav-icon">I</span><span>Inventory</span><span class="section-arrow">&rsaquo;</span></a>
                <div class="nav-label">BILLING</div>
                <a class="section-nav <?= $current === 'customer_account.php' ? 'active' : '' ?>" href="customer_account.php?section=payment"><span class="nav-icon">B</span><span>Payment</span><span class="section-arrow">&rsaquo;</span></a>
                <div class="nav-label">REPORTS</div>
                <a class="section-nav <?= $activeSection === 'sales' ? 'active' : '' ?>" href="reports.php?section=sales"><span class="nav-icon">S</span><span>Sales Report</span><span class="section-arrow">&rsaquo;</span></a>
            <?php elseif ($isSalesAdmin): ?>
                <div class="nav-label">ADMINISTRATION</div>
                <a class="section-nav <?= $current === 'admin_pricing.php' ? 'active' : '' ?>" href="admin_pricing.php"><span class="nav-icon">$</span><span>Price &amp; Shipping</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'recent_activity.php' ? 'active' : '' ?>" href="recent_activity.php"><span class="nav-icon">A</span><span>Recent User Activity</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'admin_customers.php' ? 'active' : '' ?>" href="admin_customers.php"><span class="nav-icon">C</span><span>Customer Management</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'customer_account_approvals.php' ? 'active' : '' ?>" href="customer_account_approvals.php"><span class="nav-icon">V</span><span>Customer Account Verification</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'sales_quotation_approval.php' ? 'active' : '' ?>" href="sales_quotation_approval.php"><span class="nav-icon">Q</span><span>Sales Quotation Approval</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'purchase_order_requests.php' ? 'active' : '' ?>" href="purchase_order_requests.php"><span class="nav-icon">P</span><span>Purchase Order Requests</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'sales_order_approval.php' ? 'active' : '' ?>" href="sales_order_approval.php"><span class="nav-icon">O</span><span>Sales Order Approval</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'sales_return_approval.php' ? 'active' : '' ?>" href="sales_return_approval.php"><span class="nav-icon">R</span><span>Sales Return Approval</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'inventory_stockout_approval.php' ? 'active' : '' ?>" href="inventory_stockout_approval.php"><span class="nav-icon">I</span><span>Request Stock from Inventory</span><span class="section-arrow">&rsaquo;</span></a>
                <a class="section-nav <?= $current === 'inventory_delivery_approval.php' ? 'active' : '' ?>" href="inventory_delivery_approval.php"><span class="nav-icon">D</span><span>Inventory Delivery Approval</span><span class="section-arrow">&rsaquo;</span></a>
            <?php endif; ?>
        </nav>
        <footer>
            <p style="text-align:center;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-weight:bold">DLSP 2026-2027</p>
        </footer>
    </aside>
<?php endif; ?>

