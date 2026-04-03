window.normalizeRole = function normalizeRole(role) {
    if (role === null || role === undefined) {
        return '';
    }

    if (typeof role === 'number') {
        const roleMap = { 0: 'Admin', 1: 'Owner', 2: 'Staff' };
        return roleMap[role] || '';
    }

    if (typeof role === 'string') {
        const trimmed = role.trim();
        if (trimmed === '') {
            return '';
        }

        if (/^\d+$/.test(trimmed)) {
            const roleMap = { 0: 'Admin', 1: 'Owner', 2: 'Staff' };
            return roleMap[Number(trimmed)] || '';
        }

        const lowered = trimmed.toLowerCase();
        if (lowered === 'admin') return 'Admin';
        if (lowered === 'owner') return 'Owner';
        if (lowered === 'staff') return 'Staff';
    }

    return '';
};

window.getCurrentUser = function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
};

window.getRoleHomePage = function getRoleHomePage(role) {
    const normalized = window.normalizeRole(role);
    if (normalized === 'Staff') return 'CashierInterface.html';
    if (normalized === 'Admin' || normalized === 'Owner') return 'AdminDashboard.html';
    return null;
};

window.redirectToRoleHome = function redirectToRoleHome(user) {
    const target = window.getRoleHomePage(user?.role);
    if (!target) {
        localStorage.removeItem('user');
        window.location.href = 'LoginPage.html';
        return;
    }

    const path = window.location.pathname || '';
    if (!path.includes(`/${target}`) && !path.endsWith(target)) {
        window.location.href = target;
    }
};

window.ensureAuthByRole = function ensureAuthByRole(allowedRoles = []) {
    const user = window.getCurrentUser();
    if (!user || !user.id) {
        window.location.href = 'LoginPage.html';
        return null;
    }

    const role = window.normalizeRole(user.role);
    if (!role) {
        localStorage.removeItem('user');
        window.location.href = 'LoginPage.html';
        return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        window.redirectToRoleHome(user);
        return null;
    }

    return user;
};

// Logout function - clears user data and redirects to login
window.logout = async function logout() {
    const API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
    try {
        await fetch(`${API_URL}/Users/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        // Ignore errors, clear local data anyway
    }
    localStorage.removeItem('user');
    window.location.href = 'LoginPage.html';
};
