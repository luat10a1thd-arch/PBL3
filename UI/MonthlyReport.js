const MONTHLY_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';

const monthlyState = {
    month: null,
    year: null,
    data: null
};

function formatVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatPercent(value) {
    return `${Number(value || 0).toFixed(1)}%`;
}

async function monthlyApiRequest(endpoint) {
    const response = await fetch(`${MONTHLY_API_URL}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 401) {
        window.showWarningToast?.('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
        sessionStorage.removeItem('user');
        window.location.href = '/app/login';
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
    window.hydrateAdminUserProfile?.(user);
}

function initializeMonthYearSelectors() {
    const monthSelect = document.getElementById('selectMonth');
    const yearSelect = document.getElementById('selectYear');
    if (!monthSelect || !yearSelect) return;

    Array.from(monthSelect.options).forEach((option, index) => {
        option.value = String(index + 1);
    });
    Array.from(yearSelect.options).forEach(option => {
        option.value = option.textContent.trim();
    });

    const now = new Date();
    monthSelect.value = String(now.getMonth() + 1);
    if (!Array.from(yearSelect.options).some(x => x.value === String(now.getFullYear()))) {
        const extraOption = document.createElement('option');
        extraOption.value = String(now.getFullYear());
        extraOption.textContent = String(now.getFullYear());
        yearSelect.prepend(extraOption);
    }
    yearSelect.value = String(now.getFullYear());
}

function getSelectedMonthYear() {
    const monthSelect = document.getElementById('selectMonth');
    const yearSelect = document.getElementById('selectYear');
    const now = new Date();
    return {
        month: Number(monthSelect?.value || now.getMonth() + 1),
        year: Number(yearSelect?.value || now.getFullYear())
    };
}

function renderKpis(data) {
    const revenueNode = document.getElementById('monthlyKpiRevenue');
    const importNode = document.getElementById('monthlyKpiImport');
    const expenseNode = document.getElementById('monthlyKpiExpense');
    const profitNode = document.getElementById('monthlyKpiProfit');

    if (revenueNode) revenueNode.textContent = formatVnd(data.totalRevenue);
    if (importNode) importNode.textContent = formatVnd(data.totalImportCost);
    if (expenseNode) expenseNode.textContent = formatVnd(data.totalExpense);
    if (profitNode) profitNode.textContent = formatVnd(data.netProfit);

    const revenueSub = document.getElementById('monthlyKpiRevenueSub');
    const importSub = document.getElementById('monthlyKpiImportSub');
    const expenseSub = document.getElementById('monthlyKpiExpenseSub');
    const profitSub = document.getElementById('monthlyKpiProfitSub');

    if (revenueSub) revenueSub.textContent = `Tổng ${data.paymentCount || 0} giao dịch thanh toán`;
    if (importSub) importSub.textContent = `NCC hoạt động: ${data.supplierCount || 0}`;
    if (expenseSub) expenseSub.textContent = 'Chi phí ngoài nhập hàng';
    if (profitSub) {
        const margin = data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue) * 100 : 0;
        profitSub.textContent = `Biên lợi nhuận: ${formatPercent(margin)}`;
    }
}

function renderChart(data) {
    const barsEl = document.getElementById('chartBars');
    const labelsEl = document.getElementById('chartLabels');
    const title = document.getElementById('monthlyChartTitle');
    const subtitle = document.getElementById('monthlyChartSubtitle');
    if (!barsEl || !labelsEl) return;

    const rows = data.daily || [];
    const maxRevenue = Math.max(...rows.map(x => Number(x.revenue || 0)), 1);
    const maxCost = Math.max(...rows.map(x => Number(x.importCost || 0) + Number(x.expenseCost || 0)), 1);

    barsEl.innerHTML = rows.map(row => {
        const revenue = Number(row.revenue || 0);
        const cost = Number(row.importCost || 0) + Number(row.expenseCost || 0);
        const revenueHeight = Math.max(4, Math.round((revenue / maxRevenue) * 100));
        const costHeight = Math.max(4, Math.round((cost / maxCost) * 100));
        return `
            <div class="monthly-chart-col" title="Ngày ${row.day}: DT ${formatVnd(revenue)} | CP ${formatVnd(cost)}">
                <div class="monthly-bar-wrap">
                    <div class="monthly-bar cost" style="height:${costHeight}%"></div>
                    <div class="monthly-bar rev" style="height:${revenueHeight}%"></div>
                </div>
            </div>`;
    }).join('');

    labelsEl.innerHTML = rows.map(row => `<div class="monthly-chart-label">${row.day}</div>`).join('');

    if (title) title.textContent = 'Doanh Thu vs Chi Phí Theo Ngày';
    if (subtitle) subtitle.textContent = `Tháng ${data.month}/${data.year} · Dữ liệu theo ngày thanh toán/nhập hàng`;
}

function renderSupplierSummary(data) {
    const title = document.getElementById('monthlySupplierTitle');
    const thead = document.getElementById('monthlySupplierHead');
    const tbody = document.getElementById('monthlySupplierBody');
    if (!tbody) return;

    if (title) title.textContent = 'Chi Phí Theo Nhà Cung Cấp';
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Nhà Cung Cấp</th>
                <th class="right">Số Phiếu</th>
                <th class="right">Tổng Chi Phí</th>
                <th class="right">Tỉ Lệ</th>
            </tr>`;
    }

    const supplierRows = [...(data.supplierSummary || [])].sort((a, b) => Number(b.totalCost) - Number(a.totalCost));
    const total = supplierRows.reduce((sum, x) => sum + Number(x.totalCost || 0), 0);

    if (!supplierRows.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--dash-text-muted)">Không có dữ liệu nhà cung cấp</td></tr>';
        return;
    }

    tbody.innerHTML = supplierRows.map((row, index) => {
        const ratio = total > 0 ? (Number(row.totalCost || 0) / total) * 100 : 0;
        return `
            <tr${index === supplierRows.length - 1 ? ' class="no-border-row"' : ''}>
                <td><span class="dash-product-name">${row.supplierName}</span></td>
                <td class="right">${row.importCount}</td>
                <td class="right dash-cost">${formatVnd(row.totalCost)}</td>
                <td class="right"><span class="dash-category-badge tea">${formatPercent(ratio)}</span></td>
            </tr>`;
    }).join('');
}

function renderPaymentMethodSummary(data) {
    const title = document.getElementById('monthlyPaymentTitle');
    const thead = document.getElementById('monthlyPaymentHead');
    const tbody = document.getElementById('monthlyPaymentBody');
    if (!tbody) return;

    if (title) title.textContent = 'Doanh Thu Theo Phương Thức Thanh Toán';
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Phương thức</th>
                <th class="right">Số GD</th>
                <th class="right">Tổng Thu</th>
                <th class="right">Tỉ Lệ</th>
            </tr>`;
    }

    const rows = [...(data.paymentMethodSummary || [])].sort((a, b) => Number(b.total) - Number(a.total));
    const total = rows.reduce((sum, x) => sum + Number(x.total || 0), 0);

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--dash-text-muted)">Không có dữ liệu thanh toán</td></tr>';
        return;
    }

    const labelMethod = (method) => {
        const lower = String(method || '').toLowerCase();
        if (lower.includes('cash')) return 'Tiền mặt';
        if (lower.includes('transfer') || lower.includes('bank')) return 'Chuyển khoản';
        if (lower.includes('qr')) return 'QR';
        return method || 'Khác';
    };

    tbody.innerHTML = rows.map((row, index) => {
        const ratio = total > 0 ? (Number(row.total || 0) / total) * 100 : 0;
        return `
            <tr${index === rows.length - 1 ? ' class="no-border-row"' : ''}>
                <td><span class="dash-product-name">${labelMethod(row.method)}</span></td>
                <td class="right">${row.count}</td>
                <td class="right dash-price">${formatVnd(row.total)}</td>
                <td class="right"><span class="dash-category-badge coffee">${formatPercent(ratio)}</span></td>
            </tr>`;
    }).join('');
}

function renderDailyTable(data) {
    const title = document.getElementById('monthlyDailyTitle');
    const sub = document.getElementById('monthlyDailySub');
    const head = document.getElementById('monthlyDailyHead');
    const body = document.getElementById('monthlyDailyBody');
    const pagination = document.getElementById('monthlyDailyPaginationInfo');
    if (!body) return;

    if (title) title.textContent = 'Tổng Hợp Theo Ngày';
    if (sub) sub.textContent = `Tháng ${data.month} / ${data.year}`;
    if (head) {
        head.innerHTML = `
            <tr>
                <th>Ngày</th>
                <th class="right">Số GD</th>
                <th class="right">Doanh Thu</th>
                <th class="right">Nhập Hàng</th>
                <th class="right">Chi Phí Khác</th>
                <th class="right">Lợi Nhuận</th>
            </tr>`;
    }

    const rows = [...(data.daily || [])].sort((a, b) => Number(b.day) - Number(a.day));
    const activeRows = rows.filter(r => Number(r.revenue || 0) > 0 || Number(r.importCost || 0) > 0 || Number(r.expenseCost || 0) > 0);
    const sourceRows = activeRows.length ? activeRows : rows.slice(0, 10);

    body.innerHTML = sourceRows.length ? sourceRows.map((row, index) => {
        const profit = Number(row.revenue || 0) - Number(row.importCost || 0) - Number(row.expenseCost || 0);
        return `
            <tr${index === sourceRows.length - 1 ? ' class="no-border-row"' : ''}>
                <td><strong>${String(row.day).padStart(2, '0')}/${String(data.month).padStart(2, '0')}/${data.year}</strong></td>
                <td class="right">${row.orderCount || 0}</td>
                <td class="right dash-price">${formatVnd(row.revenue)}</td>
                <td class="right dash-cost">${formatVnd(row.importCost)}</td>
                <td class="right dash-cost">${formatVnd(row.expenseCost)}</td>
                <td class="right ${profit >= 0 ? 'text-success' : 'text-danger'}">${formatVnd(profit)}</td>
            </tr>`;
    }).join('') : '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--dash-text-muted)">Không có dữ liệu trong tháng đã chọn</td></tr>';

    if (pagination) {
        pagination.textContent = sourceRows.length
            ? `Đang hiển thị 1 đến ${sourceRows.length} trong số ${sourceRows.length} ngày có dữ liệu`
            : 'Không có dữ liệu';
    }
}

async function loadMonthlyData() {
    const { month, year } = getSelectedMonthYear();
    monthlyState.month = month;
    monthlyState.year = year;

    const data = await monthlyApiRequest(`/orders/monthly-report?month=${month}&year=${year}`);
    if (!data) return;
    monthlyState.data = data;

    renderKpis(data);
    renderChart(data);
    renderSupplierSummary(data);
    renderPaymentMethodSummary(data);
    renderDailyTable(data);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = window.ensureAuthByRole(['Manager']);
        if (!user) return;

        hydrateUserProfile(user);
        setupSidebar();
        initializeMonthYearSelectors();

        const monthSelect = document.getElementById('selectMonth');
        const yearSelect = document.getElementById('selectYear');
        if (monthSelect) monthSelect.addEventListener('change', loadMonthlyData);
        if (yearSelect) yearSelect.addEventListener('change', loadMonthlyData);

        await loadMonthlyData();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải báo cáo tháng');
    }
});

