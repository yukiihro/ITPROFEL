document.addEventListener('DOMContentLoaded', () => {
    const menu = document.getElementById('mobileMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');

    if (menu && sidebar) {
        menu.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (sidebarClose && sidebar) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Close the mobile sidebar after following any sidebar link.
    if (sidebar) {
        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        });
    }

    // Generic modal open/close (used by every "+ Add / New ..." button)
    document.querySelectorAll('[data-open-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = document.getElementById(btn.dataset.openModal);
            if (!modal) return;
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
            modal.querySelector('input, select, textarea')?.focus();
        });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal-backdrop');
            if (!modal) return;
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
        });
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('open');
                modal.setAttribute('aria-hidden', 'true');
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal-backdrop.open').forEach(modal => {
                modal.classList.remove('open');
                modal.setAttribute('aria-hidden', 'true');
            });
        }
    });

    // Table search
    document.querySelectorAll('[data-table-search]').forEach(input => {
        input.addEventListener('input', () => {
            const table = document.getElementById(input.dataset.tableSearch);
            if (!table) return;

            const term = input.value.toLowerCase().trim();

            table.querySelectorAll('tbody tr').forEach(row => {
                // Ignore action-button cells so words like "Edit" don't match every row
                const text = Array.from(row.children)
                    .filter(cell => !cell.hasAttribute('data-no-search'))
                    .map(cell => cell.innerText)
                    .join(' ')
                    .toLowerCase();
                row.style.display = text.includes(term) ? '' : 'none';
            });
        });
    });
});

    // Profile dropdown
    const profileButton = document.getElementById('profileMenuButton');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileButton && profileDropdown) {
        profileButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const open = profileDropdown.classList.toggle('open');
            profileButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        document.addEventListener('click', (event) => {
            if (!profileDropdown.contains(event.target) && !profileButton.contains(event.target)) {
                profileDropdown.classList.remove('open');
                profileButton.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // Sales Admin and Sales Staff notifications.
    const notificationButton = document.getElementById('notificationButton');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationList = document.getElementById('notificationList');
    const notificationBadge = document.getElementById('notificationBadge');
    const markAllNotificationsRead = document.getElementById('markAllNotificationsRead');
    if (notificationButton && notificationDropdown && notificationList && notificationBadge) {
        const csrfToken = notificationButton.dataset.csrfToken || '';
        let notificationRefreshInProgress = false;
        const updateBadge = (count) => {
            const unreadCount = Number(count) || 0;
            notificationBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
            notificationBadge.hidden = unreadCount === 0;
            notificationButton.setAttribute(
                'aria-label',
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
            );
        };
        const showNotificationError = (message) => {
            notificationList.replaceChildren();
            const error = document.createElement('p');
            error.className = 'notification-empty notification-error';
            error.textContent = message;
            notificationList.append(error);
        };
        const sendNotificationAction = async (payload) => {
            const response = await fetch('notifications.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Could not update notifications.');
            }
        };
        const refreshNotifications = async () => {
            if (notificationRefreshInProgress) return;
            notificationRefreshInProgress = true;
            try {
                const response = await fetch('notifications.php', {
                    credentials: 'same-origin',
                    headers: { 'Accept': 'application/json' }
                });
                const result = await response.json();
                if (!response.ok || !result.success || !result.data) {
                    throw new Error(result.message || 'Could not load notifications.');
                }

                updateBadge(result.data.unread_count);
                notificationList.replaceChildren();
                if (!Array.isArray(result.data.notifications) || result.data.notifications.length === 0) {
                    const empty = document.createElement('p');
                    empty.className = 'notification-empty';
                    empty.textContent = 'No notifications yet.';
                    notificationList.append(empty);
                    return;
                }

                result.data.notifications.forEach((notification) => {
                    const link = document.createElement('a');
                    link.className = `notification-item${notification.read_at ? '' : ' unread'}`;
                    link.href = notification.link || 'quotations.php';
                    link.dataset.notificationId = String(notification.notification_id);
                    const title = document.createElement('strong');
                    title.textContent = notification.title;
                    const message = document.createElement('span');
                    message.textContent = notification.message;
                    const date = document.createElement('time');
                    date.textContent = notification.created_at;
                    link.append(title, message, date);
                    notificationList.append(link);
                });
            } catch (error) {
                console.error('Sales notifications could not be refreshed:', error);
                showNotificationError('Notifications could not be refreshed. Please try again.');
            } finally {
                notificationRefreshInProgress = false;
            }
        };

        notificationButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isOpen = notificationDropdown.classList.toggle('open');
            notificationButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (isOpen) refreshNotifications();
        });
        document.addEventListener('click', (event) => {
            if (!notificationDropdown.contains(event.target) && !notificationButton.contains(event.target)) {
                notificationDropdown.classList.remove('open');
                notificationButton.setAttribute('aria-expanded', 'false');
            }
        });
        notificationList.addEventListener('click', async (event) => {
            const link = event.target.closest('a[data-notification-id]');
            if (!link) return;
            event.preventDefault();
            try {
                await sendNotificationAction({
                    action: 'mark_read',
                    notification_id: Number(link.dataset.notificationId)
                });
            } catch (error) {
                console.error('Sales notification could not be marked as read:', error);
            }
            window.location.assign(link.href);
        });
        markAllNotificationsRead?.addEventListener('click', async () => {
            try {
                await sendNotificationAction({ action: 'mark_all_read' });
                await refreshNotifications();
            } catch (error) {
                console.error('Sales notifications could not be marked as read:', error);
                showNotificationError('Notifications could not be marked as read.');
            }
        });

        refreshNotifications();
        window.setInterval(() => {
            if (!document.hidden) refreshNotifications();
        }, 60000);
    }

    // Manage Profile modal
    const profileModal = document.getElementById('profileModal');
    const openProfileModal = document.getElementById('openProfileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const cancelProfileModal = document.getElementById('cancelProfileModal');

    const closeProfile = () => {
        if (!profileModal) return;
        profileModal.classList.remove('open');
        profileModal.setAttribute('aria-hidden', 'true');
    };

    if (profileModal && openProfileModal) {
        openProfileModal.addEventListener('click', () => {
            profileDropdown?.classList.remove('open');
            profileButton?.setAttribute('aria-expanded', 'false');
            profileModal.classList.add('open');
            profileModal.setAttribute('aria-hidden', 'false');
            profileModal.querySelector('input[name="name"]')?.focus();
        });

        closeProfileModal?.addEventListener('click', closeProfile);
        cancelProfileModal?.addEventListener('click', closeProfile);

        profileModal.addEventListener('click', (event) => {
            if (event.target === profileModal) closeProfile();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeProfile();
        });
    }
