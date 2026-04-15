const SHIFT_API_BASE = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
const SHIFT_HUB_URL = `${SHIFT_API_BASE}/hubs/shifts`;

function getCurrentUserForShift() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

function formatVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

async function shiftApiRequest(endpoint, method = 'GET', body = null, allowNotFound = false) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };

    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${SHIFT_API_BASE}${endpoint}`, options);
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

function updateShiftSummary(shift) {
    const title = document.querySelector('.dash-page-title');
    if (title && shift?.shiftId) {
        title.textContent = `Báo Cáo Chốt Ca (Shift #${shift.shiftId})`;
    }

    const kpis = document.querySelectorAll('.dash-kpi-value');
    if (kpis.length >= 4 && shift) {
        kpis[0].textContent = formatVnd(shift.opening);
        kpis[1].textContent = formatVnd(shift.expected || 0);
        kpis[3].textContent = formatVnd((shift.opening || 0) + (shift.expected || 0));
    }
}

function updateStaffRealtime(shifts) {
    const statusNodes = document.querySelectorAll('.dash-status-indicator span');
    const openByEmployee = new Map((shifts || []).filter(s => s.status === 'Open').map(s => [s.employeeName, s]));
    statusNodes.forEach(node => {
        const row = node.closest('tr');
        const nameNode = row?.querySelector('.dash-product-name');
        if (!nameNode) return;
        const shift = openByEmployee.get(nameNode.textContent.trim());
        node.textContent = shift ? 'Đang làm' : 'Nghỉ';
        node.className = shift ? 'text-success' : 'text-warning';
    });
}

async function loadInitialShiftData() {
    try {
        const shifts = await shiftApiRequest('/Shifts');
        if (!shifts) return;
        const currentUser = getCurrentUserForShift();
        const currentShift = shifts.find(s => s.employeeId === currentUser.id && s.status === 'Open');
        if (currentShift) updateShiftSummary(currentShift);
        updateStaffRealtime(shifts);
    } catch (error) {
        console.error('Shift init error:', error);
    }
}

async function closeCurrentShiftFromUi() {
    try {
        const current = await shiftApiRequest('/Shifts/current', 'GET', null, true);
        if (!current) {
            window.showWarningToast?.('Hiện chưa có ca mở để chốt.');
            return;
        }
        const modalInput = document.getElementById('closeShiftExpectedInput');
        const expectedRaw = modalInput?.value?.trim();
        const expectedAmount = expectedRaw
            ? Number(expectedRaw.replace(/,/g, ''))
            : Number(current.expected || current.opening || 0);
        if (Number.isNaN(expectedAmount) || expectedAmount < 0) {
            window.showWarningToast?.('Số tiền không hợp lệ');
            return;
        }
        await shiftApiRequest('/Shifts/close', 'POST', { shiftId: current.shiftId, expectedAmount });
        window.showSuccessToast?.('Chốt ca thành công');
        if (modalInput) modalInput.value = '';
        document.getElementById('closeShiftModal')?.classList.remove('visible');
        const shifts = await shiftApiRequest('/Shifts');
        if (shifts) {
            updateShiftSummary({
                ...current,
                expected: expectedAmount
            });
            updateStaffRealtime(shifts);
        }
    } catch (error) {
        window.showErrorToast?.(`Không thể chốt ca: ${error.message}`);
    }
}

async function openCurrentShiftFromUi() {
    try {
        const current = await shiftApiRequest('/Shifts/current', 'GET', null, true);
        if (current) {
            window.showWarningToast?.('Bạn đang có ca mở, hãy chốt ca trước khi mở ca mới.');
            return;
        }

        const openingInput = window.prompt('Nhập số tiền mở ca:', '0');
        if (openingInput === null) return;
        const openingAmount = Number(String(openingInput).replace(/,/g, '').trim());
        if (Number.isNaN(openingAmount) || openingAmount < 0) {
            window.showWarningToast?.('Số tiền mở ca không hợp lệ');
            return;
        }

        await shiftApiRequest('/Shifts/open', 'POST', { openingAmount });
        window.showSuccessToast?.('Mở ca thành công');
        const shifts = await shiftApiRequest('/Shifts');
        if (!shifts) return;
        const currentUser = getCurrentUserForShift();
        const opened = shifts.find(s => s.employeeId === currentUser.id && s.status === 'Open');
        if (opened) updateShiftSummary(opened);
        updateStaffRealtime(shifts);
    } catch (error) {
        window.showErrorToast?.(`Không thể mở ca: ${error.message}`);
    }
}

function wireCloseShiftButtons() {
    const confirmButton = document.getElementById('btnConfirmCloseShift');
    const fallbackButton = document.getElementById('btnCloseShift');
    const openButton = document.getElementById('btnOpenShift');
    const buttons = [];

    if (confirmButton) {
        buttons.push(confirmButton);
    } else if (fallbackButton) {
        buttons.push(fallbackButton);
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeCurrentShiftFromUi();
        });
    });

    if (openButton) {
        openButton.addEventListener('click', (e) => {
            e.preventDefault();
            openCurrentShiftFromUi();
        });
    }
}

async function startShiftHub() {
    if (!window.signalR) return;
    const connection = new window.signalR.HubConnectionBuilder()
        .withUrl(SHIFT_HUB_URL, { withCredentials: true })
        .withAutomaticReconnect()
        .build();

    connection.on('ShiftUpdated', async (shift) => {
        updateShiftSummary(shift);
        try {
            const shifts = await shiftApiRequest('/Shifts');
            if (!shifts) return;
            updateStaffRealtime(shifts);
        } catch {
            // no-op
        }
    });

    await connection.start();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialShiftData();
    wireCloseShiftButtons();
    await startShiftHub();
});

