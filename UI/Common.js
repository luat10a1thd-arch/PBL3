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

function ensureToastStyles() {
    if (document.getElementById('globalToastStyles')) return;
    const style = document.createElement('style');
    style.id = 'globalToastStyles';
    style.textContent = `
        .global-toast-container{position:fixed;top:16px;right:16px;z-index:100000;display:flex;flex-direction:column;gap:10px;pointer-events:none}
        .global-toast{min-width:260px;max-width:360px;padding:12px 14px;border-radius:10px;color:#fff;font-weight:600;font-size:.9rem;display:flex;align-items:flex-start;gap:10px;box-shadow:0 12px 28px rgba(0,0,0,.35);opacity:0;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease}
        .global-toast.show{opacity:1;transform:translateY(0)}
        .global-toast.info{background:linear-gradient(135deg,#3b82f6,#2563eb)}
        .global-toast.success{background:linear-gradient(135deg,#16a34a,#15803d)}
        .global-toast.warning{background:linear-gradient(135deg,#f59e0b,#d97706)}
        .global-toast.error{background:linear-gradient(135deg,#ef4444,#dc2626)}
        .global-toast i{margin-top:1px}
    `;
    document.head.appendChild(style);
}

window.showToast = function showToast(message, type = 'info', duration = 3000) {
    const safeMessage = String(message || '').trim();
    if (!safeMessage) return;
    ensureToastStyles();

    let container = document.getElementById('globalToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'globalToastContainer';
        container.className = 'global-toast-container';
        document.body.appendChild(container);
    }

    const iconByType = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };
    const normalizedType = iconByType[type] ? type : 'info';
    const toast = document.createElement('div');
    toast.className = `global-toast ${normalizedType}`;
    toast.innerHTML = `<i class="fa-solid ${iconByType[normalizedType]}"></i><span>${safeMessage}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 220);
    }, Math.max(1200, Number(duration) || 3000));
};

window.showSuccessToast = function showSuccessToast(message, duration = 2600) {
    window.showToast(message, 'success', duration);
};

window.showErrorToast = function showErrorToast(message, duration = 3600) {
    window.showToast(message, 'error', duration);
};

window.showWarningToast = function showWarningToast(message, duration = 3200) {
    window.showToast(message, 'warning', duration);
};
