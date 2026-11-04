/**
 * Carrito Dashboard - Centralized Authentication & Storekeeper Helper
 * Single source of truth for Role and Storekeeper checks.
 */
const AuthHelper = (function () {
    const STOREKEEPER_ROLE_ID = 4;

    function getCurrentUser() {
        try {
            const str = localStorage.getItem('currentUser');
            return str ? JSON.parse(str) : null;
        } catch (e) {
            console.error('Error parsing currentUser:', e);
            return null;
        }
    }

    function setCurrentUser(user) {
        if (!user) {
            localStorage.removeItem('currentUser');
        } else {
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    }

    function isStorekeeper() {
        const u = getCurrentUser();
        if (!u) return false;
        return Number(u.roleId) === STOREKEEPER_ROLE_ID;
    }

    function getStorekeeperId() {
        const u = getCurrentUser();
        return (u && u.storekeeperId) ? u.storekeeperId : null;
    }

    function getStoreName() {
        const u = getCurrentUser();
        return (u && u.storeName) ? u.storeName : '';
    }

    function getUserId() {
        const u = getCurrentUser();
        return (u && u.userId) ? u.userId : null;
    }

    // Resolves storekeeperId and storeName from API if missing from localStorage
    function ensureStorekeeperDetails(onReady) {
        const u = getCurrentUser();
        if (!u || !isStorekeeper()) return;

        if (u.storekeeperId) {
            if (typeof onReady === 'function') onReady(u);
            return;
        }

        if (window.baseApiUrl) {
            $.get(`${window.baseApiUrl}/api/Storekeeper`, { PageNumber: 1, PageSize: 100 }, function (res) {
                if (res && res.data && res.data.items) {
                    const match = res.data.items.find(s => s.userId === u.userId);
                    if (match) {
                        u.storekeeperId = match.id;
                        u.storeName = match.storeName;
                        setCurrentUser(u);

                        if (u.storeName) {
                            $('#headerStoreBadge').show();
                            $('#headerStoreName').text(u.storeName);
                        }

                        $(document).trigger('storekeeperReady', [u]);
                        if (typeof onReady === 'function') onReady(u);
                    }
                }
            });
        }
    }

    // Enforces sidebar menu visibility and route access for Storekeepers
    function enforceAccessRestrictions() {
        const u = getCurrentUser();
        if (!u) return;

        // Populate basic profile in top header
        if (u.fullName) {
            $('#headerUserName').text(u.fullName);
            $('#headerAvatar').text(u.fullName.charAt(0).toUpperCase());
        }
        if (u.roleName) {
            $('#headerUserRole').text(u.roleName);
        }

        if (isStorekeeper()) {
            $('body').addClass('role-storekeeper');

            if (u.storeName) {
                $('#headerStoreBadge').show();
                $('#headerStoreName').text(u.storeName);
            }

            // Route Guard: Allowed pages for Storekeepers
            const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
            const allowedPaths = [
                '', '/', '/home', '/home/index',
                '/inventory', '/inventory/index',
                '/inventorycategory', '/inventorycategory/index',
                '/order', '/order/index'
            ];

            if (!allowedPaths.includes(path)) {
                sessionStorage.setItem('accessDeniedNotice', 'Storekeepers can only access Dashboard, Inventory, Categories, and Orders.');
                window.location.replace('/Home/Index');
                return;
            }

            ensureStorekeeperDetails();
        }

        // Show access denied notice if redirected
        const notice = sessionStorage.getItem('accessDeniedNotice');
        if (notice) {
            sessionStorage.removeItem('accessDeniedNotice');
            setTimeout(() => {
                if (typeof showNotification === 'function') {
                    showNotification(notice, 'warning');
                }
            }, 300);
        }
    }

    return {
        STOREKEEPER_ROLE_ID,
        getCurrentUser,
        setCurrentUser,
        isStorekeeper,
        getStorekeeperId,
        getStoreName,
        getUserId,
        ensureStorekeeperDetails,
        enforceAccessRestrictions
    };
})();

// Attach globally
window.AuthHelper = AuthHelper;
window.isStorekeeper = AuthHelper.isStorekeeper;
window.getStorekeeperId = AuthHelper.getStorekeeperId;
window.getStoreName = AuthHelper.getStoreName;
