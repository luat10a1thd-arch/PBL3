const DASHBOARD_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';

function formatCurrencyVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function getPaymentMethodLabel(method) {
    const normalized = (method || '').toLowerCase();
    if (normalized.includes('cash')) return 'Tiền mặt';
    if (normalized.includes('transfer') || normalized.includes('bank')) return 'Chuyển khoản';
    if (normalized.includes('qr')) return 'QR';
    return 'Khác';
}

function getRelativeOrderText(index) {
    if (index === 0) return 'Vừa xong';
    if (index === 1) return 'Ít phút trước';
    return `${(index + 1) * 5} phút trước`;
}

async function dashboardApiRequest(endpoint) {
    const response = await fetch(`${DASHBOARD_API_URL}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
        localStorage.removeItem('user');
        window.location.href = 'LoginPage.html';
        return null;
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
        throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
}

function setupSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.querySelector('.dash-sidebar');
    if (!sidebarToggle || !sidebarOverlay || !sidebar) return;

    const openSidebar = () => { sidebar.classList.add('open'); sidebarOverlay.classList.add('visible'); };
    const closeSidebar = () => { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('visible'); };
    sidebarToggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
    sidebarOverlay.addEventListener('click', closeSidebar);
}

function hydrateUserProfile(user) {
    if (!user?.firstName || !user?.lastName) return;
    const name = `${user.firstName} ${user.lastName}`;
    const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    const role = window.normalizeRole(user.role);

    const nameNode = document.querySelector('.dash-user-name');
    const roleNode = document.querySelector('.dash-user-role');
    const avatarNode = document.querySelector('.dash-user-avatar');
    if (nameNode) nameNode.textContent = name;
    if (roleNode) roleNode.textContent = role === 'Owner' ? 'Chủ Sở Hữu' : 'Quản Trị Viên';
    if (avatarNode) avatarNode.textContent = initials;
}

function renderKpis(data) {
    const titles = document.querySelectorAll('.dash-kpi-title');
    const values = document.querySelectorAll('.dash-kpi-value');
    const badges = document.querySelectorAll('.dash-kpi-badge');

    if (titles.length >= 3 && values.length >= 3) {
        titles[0].textContent = 'Tổng Doanh Thu';
        titles[1].textContent = 'Tổng Đơn Hàng';
        titles[2].textContent = 'Lợi Nhuận Ròng';

        values[0].textContent = formatCurrencyVnd(data.totalRevenue);
        values[1].textContent = String(data.totalOrders || 0);
        values[2].textContent = formatCurrencyVnd(data.netProfit);
    }

    if (badges.length >= 3) {
        badges[0].innerHTML = `<i class="fa-solid fa-wallet"></i> ${formatCurrencyVnd(data.totalImportCost)}`;
        badges[1].innerHTML = `<i class="fa-solid fa-clock"></i> ${data.activeOrders || 0} đang mở`;
        badges[2].innerHTML = `<i class="fa-solid fa-sack-dollar"></i> Toàn hệ thống`;
    }
}

function renderRevenueTrend(revenueTrend, trendLabels) {
    const bars = document.querySelectorAll('.dash-chart-container .dash-chart-bar');
    const labels = Array.isArray(trendLabels) && trendLabels.length ? trendLabels : ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const normalized = (revenueTrend || []).slice(-7);
    while (normalized.length < 7) normalized.unshift(0);
    const max = Math.max(...normalized, 1);

    const labelNodes = document.querySelectorAll('.dash-chart-container .dash-chart-label');
    labelNodes.forEach((node, index) => {
        node.textContent = labels[index] || '';
    });

    bars.forEach((bar, index) => {
        const value = normalized[index] || 0;
        const height = Math.max(18, Math.round((value / max) * 100));
        bar.style.height = `${height}%`;
        bar.title = `${labels[index]}: ${formatCurrencyVnd(value)}`;
    });
}

function renderRecentOrders(recentOrders) {
    const listNode = document.querySelector('.dash-orders-list');
    if (!listNode) return;

    if (!recentOrders || recentOrders.length === 0) {
        listNode.innerHTML = `
            <div class="dash-order-item">
              <div class="dash-order-item-left">
                <div class="dash-order-details">
                  <p class="dash-order-id">Chưa có đơn hàng</p>
                  <p class="dash-order-desc">Hệ thống chưa ghi nhận dữ liệu</p>
                </div>
              </div>
            </div>`;
        return;
    }

    listNode.innerHTML = recentOrders.slice(0, 5).map((order, index) => `
        <div class="dash-order-item">
          <div class="dash-order-item-left">
            <div class="dash-order-icon"><i class="fa-solid fa-receipt"></i></div>
            <div class="dash-order-details">
              <p class="dash-order-id">Đơn #${order.orderId}</p>
              <p class="dash-order-desc">${order.itemSummary} • ${order.tableLabel}</p>
            </div>
          </div>
          <div class="dash-order-right">
            <p class="dash-order-price">${formatCurrencyVnd(order.total)}</p>
            <p class="dash-order-time">${getPaymentMethodLabel(order.paymentMethod)} • ${getRelativeOrderText(index)}</p>
          </div>
        </div>`).join('');
}

function renderLowStock(lowStockIngredients) {
    const tableBody = document.querySelector('.dash-bottom-grid .dash-table-card .dash-table tbody');
    if (!tableBody) return;

    if (!lowStockIngredients || lowStockIngredients.length === 0) {
        tableBody.innerHTML = `
            <tr class="no-border-row">
                <td colspan="3" style="text-align:center; color:var(--dash-text-muted);">Không có cảnh báo tồn kho</td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = lowStockIngredients.slice(0, 5).map((ingredient, index) => {
        const stockQty = Number(ingredient.stockQty || 0);
        const statusClass = stockQty <= 0 ? 'critical' : 'low';
        const statusText = stockQty <= 0 ? 'Hết hàng' : 'Sắp hết';
        return `
            <tr${index === lowStockIngredients.length - 1 ? ' class="no-border-row"' : ''}>
                <td>${ingredient.name}</td>
                <td class="faded right">${stockQty}</td>
                <td class="right"><span class="dash-status-badge ${statusClass}">${statusText}</span></td>
            </tr>`;
    }).join('');
}

function renderShiftTeam(openShiftStaff) {
    const teamList = document.querySelector('.dash-team-list');
    if (!teamList) return;

    const actionHtml = `
        <div class="dash-team-action-container">
          <button class="dash-team-btn" onclick="window.location.href='StaffManagement.html'">Quản Lý Lịch Trực</button>
        </div>`;

    if (!openShiftStaff || openShiftStaff.length === 0) {
        teamList.innerHTML = `
            <div class="dash-team-member">
              <div class="dash-team-avatar secondary">--</div>
              <div class="dash-team-info">
                <p class="dash-team-name">Không có ca đang mở</p>
                <p class="dash-team-role secondary">Hệ thống</p>
              </div>
              <div class="dash-team-status">
                <p class="dash-team-clock-label">Trạng thái</p>
                <p class="dash-team-clock-time">N/A</p>
              </div>
            </div>
            ${actionHtml}`;
        return;
    }

    const members = openShiftStaff.slice(0, 4).map((shift, index) => {
        const name = shift.employeeName || `NV #${shift.employeeId}`;
        const parts = name.split(' ').filter(Boolean);
        const initials = (parts[0]?.[0] || 'N') + (parts[parts.length - 1]?.[0] || 'V');
        const avatarClass = index % 2 === 0 ? 'primary' : 'secondary';
        return `
            <div class="dash-team-member">
              <div class="dash-team-avatar ${avatarClass}">${initials.toUpperCase()}</div>
              <div class="dash-team-info">
                <p class="dash-team-name">${name}</p>
                <p class="dash-team-role ${index % 2 === 0 ? '' : 'secondary'}">Ca #${shift.shiftId}</p>
              </div>
              <div class="dash-team-status">
                <p class="dash-team-clock-label">Mở ca</p>
                <p class="dash-team-clock-time">${formatCurrencyVnd(shift.opening)}</p>
              </div>
            </div>`;
    }).join('');

    teamList.innerHTML = members + actionHtml;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = window.ensureAuthByRole(['Admin', 'Owner']);
        if (!user) return;

        hydrateUserProfile(user);
        setupSidebar();

        const data = await dashboardApiRequest('/orders/admin-overview');
        if (!data) return;

        renderKpis(data);
        renderRevenueTrend(data.revenueTrend, data.revenueTrendLabels);
        renderRecentOrders(data.recentOrders);
        renderLowStock(data.lowStockIngredients);
        renderShiftTeam(data.openShiftStaff);
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải dữ liệu trang tổng quan');
    }
});
