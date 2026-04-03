const SHIFT_API_BASE = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
const SHIFT_HUB_URL = `${SHIFT_API_BASE}/hubs/shifts`;

function getCurrentUserForShift() {
    return JSON.parse(localStorage.getItem('user') || '{}');
}

function formatVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

async function shiftApiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };

    if (body) options.body = JSON.stringify(body);
    const response = await fetch(`${SHIFT_API_BASE}${endpoint}`, options);
    if (response.status === 401) throw new Error('Unauthorized');
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
        const current = await shiftApiRequest('/Shifts/current');
        const expectedText = window.prompt('Nhập số tiền chốt ca (Expected):', `${current.expected || current.opening || 0}`);
        if (expectedText === null) return;
        const expectedAmount = Number(expectedText);
        if (Number.isNaN(expectedAmount) || expectedAmount < 0) {
            alert('Số tiền không hợp lệ');
            return;
        }
        await shiftApiRequest('/Shifts/close', 'POST', { shiftId: current.shiftId, expectedAmount });
        alert('Chốt ca thành công');
    } catch (error) {
        alert(`Không thể chốt ca: ${error.message}`);
    }
}

function wireCloseShiftButtons() {
    const confirmButton = document.getElementById('btnConfirmCloseShift');
    const fallbackButton = document.getElementById('btnCloseShift');
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

