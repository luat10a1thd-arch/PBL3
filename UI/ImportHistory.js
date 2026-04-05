const IMPORT_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
let importState = {
    imports: [],
    suppliers: [],
    supplierId: '',
    monthValue: '',
    searchKeyword: ''
};

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: '-', time: '-' };
    return {
        date: date.toLocaleDateString('vi-VN'),
        time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

async function importApiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${IMPORT_API_URL}${endpoint}`, options);
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

function updateImportKpis(imports, suppliers) {
    const kpis = document.querySelectorAll('.dash-kpi-value');
    if (kpis.length < 4) return;

    const now = new Date();
    const monthImports = imports.filter(i => {
        const d = new Date(i.importDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalCost = monthImports.reduce((sum, i) => sum + Number(i.totalCost ?? 0), 0);
    const latest = imports[0];
    const latestDate = latest ? new Date(latest.importDate) : null;

    kpis[0].textContent = String(monthImports.length);
    kpis[1].textContent = formatCurrency(totalCost);
    kpis[2].textContent = String((suppliers || []).length);
    kpis[3].textContent = latestDate ? latestDate.toLocaleDateString('vi-VN') : '-';
}

function filterByMonth(imports, monthValue) {
    if (!monthValue) return imports;
    const [yyyy, mm] = monthValue.split('-').map(Number);
    if (!yyyy || !mm) return imports;

    return imports.filter(i => {
        const d = new Date(i.importDate);
        return d.getFullYear() === yyyy && (d.getMonth() + 1) === mm;
    });
}

function getFilteredImports() {
    let data = [...importState.imports];

    if (importState.supplierId) {
        data = data.filter(i => String(i.supplierId) === importState.supplierId);
    }

    data = filterByMonth(data, importState.monthValue);

    if (importState.searchKeyword) {
        const keyword = importState.searchKeyword.toLowerCase();
        data = data.filter(i =>
            (`#nk-${String(i.importId ?? '').padStart(4, '0')}`).includes(keyword) ||
            (i.supplier?.name || '').toLowerCase().includes(keyword)
        );
    }

    return data;
}

function renderImportRows(imports) {
    const tbody = document.getElementById('importHistoryTableBody');
    if (!tbody) return;

    if (!imports.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding: 32px; color:#b6a8a2;">Không có phiếu nhập nào</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = imports.map(i => {
        const importId = Number(i.importId ?? 0);
        const supplierName = i.supplier?.name || `NCC-${i.supplierId ?? '-'}`;
        const dt = formatDateTime(i.importDate);
        const totalCost = Number(i.totalCost ?? 0);

        return `
            <tr>
                <td class="td-checkbox"><input type="checkbox" /></td>
                <td><span class="dash-product-name">#NK-${String(importId).padStart(4, '0')}</span></td>
                <td>
                    <div class="dash-flex-col">
                        <span class="dash-product-name">${dt.date}</span>
                        <span class="dash-product-id">${dt.time}</span>
                    </div>
                </td>
                <td>
                    <div class="dash-flex-col">
                        <span class="dash-product-name">${supplierName}</span>
                        <span class="dash-product-id">NCC-${String(i.supplierId ?? '').padStart(3, '0')}</span>
                    </div>
                </td>
                <td>
                    <div class="dash-product-cell">
                        <div class="dash-product-img icon-cell"><i class="fa-solid fa-boxes-stacked"></i></div>
                        <div class="dash-product-info">
                            <span class="dash-product-name">Phiếu nhập tổng hợp</span>
                            <span class="dash-product-id">Từ hệ thống</span>
                        </div>
                    </div>
                </td>
                <td class="right">-</td>
                <td class="right dash-cost">-</td>
                <td class="right dash-price">${formatCurrency(totalCost)}</td>
                <td>
                    <div class="dash-flex-col">
                        <span class="dash-product-name">Hệ thống</span>
                        <span class="dash-product-id">Auto</span>
                    </div>
                </td>
                <td class="right td-actions">
                    <div class="dash-table-actions">
                        <button class="dash-action-btn"><i class="fa-solid fa-eye"></i></button>
                        <button class="dash-action-btn"><i class="fa-solid fa-print"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function fillSupplierFilter(suppliers) {
    const select = document.getElementById('importSupplierFilter');
    if (!select) return;

    const firstOption = '<option value="">Tất cả nhà cung cấp</option>';
    const options = (suppliers || []).map(s => `<option value="${s.supplierId}">${s.name}</option>`).join('');
    select.innerHTML = firstOption + options;
}

function fillMonthFilter(imports) {
    const select = document.getElementById('importMonthFilter');
    if (!select) return;

    const unique = new Map();
    imports.forEach(i => {
        const d = new Date(i.importDate);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`;
        unique.set(key, label);
    });

    const options = ['<option value="">Tất cả tháng</option>']
        .concat(Array.from(unique.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([value, label]) => `<option value="${value}">${label}</option>`));
    select.innerHTML = options.join('');
}

function fillCategoryFilter() {
    const select = document.getElementById('importCategoryFilter');
    if (!select) return;
    select.innerHTML = '<option value="">Tất cả danh mục</option>';
    select.value = '';
    select.disabled = true;
    select.title = 'Dữ liệu phiếu nhập hiện chưa có chi tiết danh mục';
}

function updatePaginationInfo(count) {
    const info = document.querySelector('.dash-pagination-info');
    if (!info) return;
    if (count <= 0) {
        info.textContent = 'Không có phiếu nhập';
        return;
    }
    info.textContent = `Đang hiển thị 1 đến ${count} trong số ${count} phiếu nhập`;
}

function redrawImports() {
    const filtered = getFilteredImports();
    renderImportRows(filtered);
    updateImportKpis(filtered, importState.suppliers);
    updatePaginationInfo(filtered.length);
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = window.ensureAuthByRole(['Admin', 'Owner']);
        if (!user) return;

        if (user.firstName && user.lastName) {
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

        setupSidebar();

        const [imports, suppliers] = await Promise.all([
            importApiRequest('/imports'),
            importApiRequest('/suppliers')
        ]);

        if (!imports || !suppliers) return;

        importState.imports = imports;
        importState.suppliers = suppliers;

        fillSupplierFilter(suppliers);
        fillMonthFilter(imports);
        fillCategoryFilter();
        redrawImports();

        const supplierFilter = document.getElementById('importSupplierFilter');
        if (supplierFilter) {
            supplierFilter.addEventListener('change', () => {
                importState.supplierId = supplierFilter.value;
                redrawImports();
            });
        }

        const monthFilter = document.getElementById('importMonthFilter');
        if (monthFilter) {
            monthFilter.addEventListener('change', () => {
                importState.monthValue = monthFilter.value;
                redrawImports();
            });
        }

        const searchInput = document.getElementById('importSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                importState.searchKeyword = searchInput.value.trim();
                redrawImports();
            });
        }
    } catch (error) {
        alert(error.message || 'Không thể tải lịch sử nhập hàng');
    }
});
