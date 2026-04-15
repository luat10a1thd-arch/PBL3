const SHIFT_REPORT_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';

const shiftReportState = {
    shifts: [],
    statusFilter: 'all'
};

function formatVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

async function shiftReportApiRequest(endpoint, method = 'GET', body = null, allowNotFound = false) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${SHIFT_REPORT_API_URL}${endpoint}`, options);
    if (response.status === 401) {
        window.showWarningToast?.('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
        localStorage.removeItem('user');
        window.location.href = 'LoginPage.html';
        return null;
    }
    if (allowNotFound && response.status === 404) return null;
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
    if (roleNode) roleNode.textContent = role === 'Owner' ? 'Chủ Sở Hữu' : role === 'Staff' ? 'Nhân Viên' : 'Quản Trị Viên';
    if (avatarNode) avatarNode.textContent = initials;
}

function getFilteredShifts() {
    if (shiftReportState.statusFilter === 'all') return shiftReportState.shifts;
    return shiftReportState.shifts.filter(s => (s.status || '').toLowerCase() === shiftReportState.statusFilter);
}

function updateKpis(shifts) {
    const titleNodes = document.querySelectorAll('.dash-kpi-grid .dash-kpi-title');
    const valueNodes = document.querySelectorAll('.dash-kpi-grid .dash-kpi-value');

    const openShifts = shifts.filter(s => s.status === 'Open');
    const closedShifts = shifts.filter(s => s.status === 'Closed');
    const openingTotal = shifts.reduce((sum, s) => sum + Number(s.opening || 0), 0);
    const expectedTotal = closedShifts.reduce((sum, s) => sum + Number(s.expected || 0), 0);

    if (titleNodes[0]) titleNodes[0].textContent = 'Ca Đang Mở';
    if (titleNodes[1]) titleNodes[1].textContent = 'Ca Đã Chốt';
    if (titleNodes[2]) titleNodes[2].textContent = 'Tổng Tiền Mở Ca';
    if (titleNodes[3]) titleNodes[3].textContent = 'Tổng Tiền Chốt Ca';

    if (valueNodes[0]) valueNodes[0].textContent = String(openShifts.length);
    if (valueNodes[1]) valueNodes[1].textContent = String(closedShifts.length);
    if (valueNodes[2]) valueNodes[2].textContent = formatVnd(openingTotal);
    if (valueNodes[3]) valueNodes[3].textContent = formatVnd(expectedTotal);

    const badge = document.querySelector('.dash-shift-text');
    if (badge) {
        badge.textContent = openShifts.length > 0
            ? `${openShifts.length} ca đang mở`
            : 'Không có ca đang mở';
    }
}

function renderShiftTable(shifts) {
    const table = document.querySelector('.dash-table.no-margin');
    if (!table) return;

    const headRow = table.querySelector('thead tr');
    if (headRow) {
        headRow.innerHTML = `
          <th>Mã Ca</th>
          <th>Nhân Viên</th>
          <th>Trạng Thái</th>
          <th class="right">Tiền Mở Ca</th>
          <th class="right">Tiền Chốt Ca</th>
          <th class="right">Chênh Lệch</th>
          <th class="right td-actions">Thao Tác</th>`;
    }

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    if (!shifts.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--dash-text-muted)">Không có ca làm việc phù hợp</td></tr>';
        return;
    }

    tbody.innerHTML = shifts.map((shift, index) => {
        const isClosed = shift.status === 'Closed';
        const expected = Number(shift.expected || 0);
        const opening = Number(shift.opening || 0);
        const diff = expected - opening;
        const statusClass = isClosed ? 'in-stock' : 'low-stock';
        const statusTextClass = isClosed ? 'text-success' : 'text-warning';
        const statusText = isClosed ? 'Đã Chốt' : 'Đang Mở';

        return `
            <tr${index === shifts.length - 1 ? ' class="no-border-row"' : ''}>
              <td><span class="dash-product-name">#CA-${String(shift.shiftId).padStart(4, '0')}</span></td>
              <td>
                <div class="dash-flex-col">
                  <span class="dash-product-name">${shift.employeeName || `NV #${shift.employeeId}`}</span>
                  <span class="dash-product-id">ID: ${shift.employeeId}</span>
                </div>
              </td>
              <td>
                <div class="dash-status-indicator">
                  <div class="dash-status-dot ${statusClass}"></div>
                  <span class="${statusTextClass}">${statusText}</span>
                </div>
              </td>
              <td class="right dash-cost">${formatVnd(opening)}</td>
              <td class="right dash-price">${formatVnd(expected)}</td>
              <td class="right ${diff >= 0 ? 'text-success' : 'text-danger'}">${formatVnd(diff)}</td>
              <td class="right td-actions">
                <button class="dash-action-btn" title="Xem chi tiết ca"><i class="fa-solid fa-eye"></i></button>
              </td>
            </tr>`;
    }).join('');
}

function updatePaginationInfo(total) {
    const info = document.querySelector('.dash-pagination-info');
    if (!info) return;
    if (!total) {
        info.textContent = 'Không có dữ liệu ca làm việc';
        return;
    }
    info.textContent = `Đang hiển thị 1 đến ${total} trong số ${total} ca làm việc`;
}

function setupStatusFilter() {
    const select = document.querySelector('.dash-actions-bar .dash-select-box');
    if (!select) return;
    select.innerHTML = `
      <option value="all">Tất cả trạng thái</option>
      <option value="open">Đang mở</option>
      <option value="closed">Đã chốt</option>`;
    select.value = shiftReportState.statusFilter;
    select.addEventListener('change', () => {
        shiftReportState.statusFilter = select.value;
        const filtered = getFilteredShifts();
        renderShiftTable(filtered);
        updatePaginationInfo(filtered.length);
    });
}

function showAmountModal({ title, message, defaultValue, confirmText }) {
    return new Promise((resolve) => {
        const modalId = `shiftAmountModal-${Date.now()}`;
        const markup = `
            <div class="staff-modal-backdrop visible" id="${modalId}">
                <div class="staff-modal" style="max-width:460px;">
                    <div class="staff-modal-header">
                        <h3 class="staff-modal-title">${title}</h3>
                        <button class="staff-modal-close" data-action="cancel"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="staff-modal-body">
                        <p style="margin:0;color:var(--dash-text-muted);font-size:.9rem;">${message}</p>
                        <div class="form-group" style="margin-bottom:0;">
                            <label style="display:block;margin-bottom:8px;">Số tiền (VND)</label>
                            <input type="number" min="0" step="1000" class="staff-input" id="${modalId}-amount" value="${defaultValue}">
                        </div>
                    </div>
                    <div class="staff-modal-footer">
                        <button class="dash-btn-secondary" data-action="cancel">Huỷ</button>
                        <button class="dash-btn-primary" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', markup);
        const modal = document.getElementById(modalId);
        const amountInput = document.getElementById(`${modalId}-amount`);
        const close = (value) => {
            modal?.remove();
            resolve(value);
        };

        modal?.addEventListener('click', (e) => {
            const action = e.target?.closest?.('[data-action]')?.getAttribute('data-action');
            if (e.target === modal || action === 'cancel') {
                close(null);
                return;
            }
            if (action === 'confirm') {
                const value = Number(amountInput?.value ?? '');
                if (Number.isNaN(value) || value < 0) {
                    window.showWarningToast?.('Số tiền không hợp lệ');
                    return;
                }
                close(value);
            }
        });

        setTimeout(() => amountInput?.focus(), 20);
    });
}

async function openNewShift() {
    const openingAmount = await showAmountModal({
        title: '<i class="fa-solid fa-lock-open" style="margin-right:8px;color:var(--primary-color);"></i>Mở Ca',
        message: 'Nhập số tiền đầu ca để bắt đầu ca làm việc mới.',
        defaultValue: 0,
        confirmText: '<i class="fa-solid fa-play"></i> Bắt Đầu'
    });
    if (openingAmount === null) return;

    await shiftReportApiRequest('/shifts/open', 'POST', { openingAmount });
    window.showSuccessToast?.('Mở ca thành công');
    await loadShiftData();
}

async function closeCurrentShift() {
    const current = await shiftReportApiRequest('/shifts/current', 'GET', null, true);
    if (!current) {
        window.showWarningToast?.('Bạn không có ca đang mở để chốt.');
        return;
    }

    const expectedAmount = await showAmountModal({
        title: '<i class="fa-solid fa-lock" style="margin-right:8px;color:var(--primary-color);"></i>Chốt Ca',
        message: `Nhập số tiền thực tế cuối ca cho Shift #${current.shiftId}.`,
        defaultValue: Number(current.expected || current.opening || 0),
        confirmText: '<i class="fa-solid fa-check"></i> Xác Nhận Chốt'
    });
    if (expectedAmount === null) return;

    await shiftReportApiRequest('/shifts/close', 'POST', {
        shiftId: current.shiftId,
        expectedAmount
    });

    window.showSuccessToast?.('Chốt ca thành công');
    await loadShiftData();
}

async function loadShiftData() {
    const shifts = await shiftReportApiRequest('/shifts');
    if (!shifts) return;
    shiftReportState.shifts = shifts;

    updateKpis(shifts);
    const filtered = getFilteredShifts();
    renderShiftTable(filtered);
    updatePaginationInfo(filtered.length);

    const title = document.querySelector('.dash-page-title');
    if (title) title.textContent = `Báo Cáo Chốt Ca (${shifts.length} ca)`;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = window.ensureAuthByRole(['Staff', 'Admin', 'Owner']);
        if (!user) return;

        hydrateUserProfile(user);
        setupSidebar();
        setupStatusFilter();

        const openButton = document.getElementById('btnOpenShiftAction');
        const closeButton = document.getElementById('btnCloseShiftAction');
        if (openButton) {
            openButton.addEventListener('click', async () => {
                try {
                    await openNewShift();
                } catch (error) {
                    window.showErrorToast?.(error.message || 'Không thể mở ca');
                }
            });
        }
        if (closeButton) {
            closeButton.addEventListener('click', async () => {
                try {
                    await closeCurrentShift();
                } catch (error) {
                    window.showErrorToast?.(error.message || 'Không thể chốt ca');
                }
            });
        }

        await loadShiftData();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải báo cáo chốt ca');
    }
});
