const SUPPLIER_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';

const supplierState = {
    suppliers: [],
    imports: [],
    search: '',
    statusFilter: ''
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

async function supplierApiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${SUPPLIER_API_URL}${endpoint}`, options);
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

function buildImportStatsBySupplier(imports) {
    const map = new Map();
    (imports || []).forEach(record => {
        const supplierId = Number(record.supplierId ?? 0);
        if (!supplierId) return;
        const totalCost = Number(record.totalCost ?? 0);
        const importDate = new Date(record.importDate);

        if (!map.has(supplierId)) {
            map.set(supplierId, { count: 0, totalCost: 0, dates: [] });
        }

        const stats = map.get(supplierId);
        stats.count += 1;
        stats.totalCost += totalCost;
        if (!Number.isNaN(importDate.getTime())) {
            stats.dates.push(importDate);
        }
    });
    return map;
}

function getFilteredSuppliers(importStats) {
    let data = [...supplierState.suppliers];

    if (supplierState.statusFilter === 'has-import') {
        data = data.filter(s => importStats.has(Number(s.supplierId)));
    } else if (supplierState.statusFilter === 'no-import') {
        data = data.filter(s => !importStats.has(Number(s.supplierId)));
    }

    if (supplierState.search) {
        const keyword = supplierState.search.toLowerCase();
        data = data.filter(s =>
            (s.name || '').toLowerCase().includes(keyword) ||
            (s.contactInfo || '').toLowerCase().includes(keyword) ||
            (s.address || '').toLowerCase().includes(keyword)
        );
    }

    return data;
}

function updateKpis(suppliers, importStats) {
    const nodes = document.querySelectorAll('.dash-kpi-value');
    if (nodes.length < 4) return;

    const now = new Date();
    let newThisMonth = 0;
    let missingContact = 0;
    let hasImport = 0;

    suppliers.forEach(supplier => {
        const supplierId = Number(supplier.supplierId);
        const stats = importStats.get(supplierId);
        if (stats) {
            hasImport += 1;
            const firstDate = stats.dates.sort((a, b) => a.getTime() - b.getTime())[0];
            if (firstDate && firstDate.getMonth() === now.getMonth() && firstDate.getFullYear() === now.getFullYear()) {
                newThisMonth += 1;
            }
        }

        if (!String(supplier.contactInfo || '').trim()) {
            missingContact += 1;
        }
    });

    nodes[0].textContent = String(suppliers.length);
    nodes[1].textContent = String(hasImport);
    nodes[2].textContent = String(newThisMonth);
    nodes[3].textContent = String(missingContact);
}

function renderRows(suppliers, importStats) {
    const tbody = document.getElementById('supplierTableBody');
    if (!tbody) return;

    if (!suppliers.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 32px; color:#b6a8a2;">Không có nhà cung cấp phù hợp</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = suppliers.map(supplier => {
        const supplierId = Number(supplier.supplierId);
        const stats = importStats.get(supplierId) || { count: 0, totalCost: 0 };
        const supplierName = escapeHtml(supplier.name || 'Chưa đặt tên');
        const contactInfo = escapeHtml(supplier.contactInfo || '-');
        const address = escapeHtml(supplier.address || '-');
        return `
            <tr>
                <td class="td-checkbox"><input type="checkbox" /></td>
                <td><span class="dash-product-name">#NCC-${String(supplierId).padStart(3, '0')}</span></td>
                <td>
                    <div class="dash-product-cell">
                        <div class="dash-product-img icon-cell"><i class="fa-solid fa-truck-ramp-box"></i></div>
                        <div class="dash-product-info">
                            <span class="dash-product-name">${supplierName}</span>
                            <span class="dash-product-id">${stats.count > 0 ? 'Đang hợp tác' : 'Chưa nhập hàng'}</span>
                        </div>
                    </div>
                </td>
                <td>${contactInfo}</td>
                <td>${address}</td>
                <td class="right">${stats.count}</td>
                <td class="right dash-price">${formatCurrency(stats.totalCost)}</td>
                <td class="right td-actions">
                    <div class="dash-table-actions">
                        <button class="dash-action-btn" onclick="editSupplier(${supplierId})"><i class="fa-solid fa-pen"></i></button>
                        <button class="dash-action-btn delete" onclick="deleteSupplier(${supplierId})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function redraw() {
    const importStats = buildImportStatsBySupplier(supplierState.imports);
    const filtered = getFilteredSuppliers(importStats);
    updateKpis(supplierState.suppliers, importStats);
    renderRows(filtered, importStats);

    const info = document.getElementById('supplierPaginationInfo');
    if (info) {
        info.textContent = filtered.length
            ? `Đang hiển thị 1 đến ${filtered.length} trong số ${filtered.length} nhà cung cấp`
            : 'Không có nhà cung cấp';
    }
}

function openSupplierFormModal(existing = null) {
    return new Promise((resolve) => {
        const modalId = `supplierModal-${Date.now()}`;
        const title = existing ? 'Cập Nhật Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp';
        const markup = `
            <div class="staff-modal-backdrop visible" id="${modalId}">
                <div class="staff-modal" style="max-width:520px;">
                    <div class="staff-modal-header">
                        <h3 class="staff-modal-title"><i class="fa-solid fa-truck-ramp-box" style="margin-right:8px;color:var(--primary-color);"></i>${title}</h3>
                        <button class="staff-modal-close" data-action="cancel"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="staff-modal-body">
                        <div class="form-group">
                            <label>Tên nhà cung cấp <span style="color:var(--color-danger);">*</span></label>
                            <input type="text" id="${modalId}-name" class="staff-input" placeholder="Nhập tên nhà cung cấp..." />
                        </div>
                        <div class="form-group">
                            <label>Thông tin liên hệ</label>
                            <input type="text" id="${modalId}-contact" class="staff-input" placeholder="SĐT, email..." />
                        </div>
                        <div class="form-group">
                            <label>Địa chỉ</label>
                            <input type="text" id="${modalId}-address" class="staff-input" placeholder="Nhập địa chỉ..." />
                        </div>
                    </div>
                    <div class="staff-modal-footer">
                        <button class="dash-btn-secondary" data-action="cancel">Huỷ</button>
                        <button class="dash-btn-primary" data-action="confirm">${existing ? '<i class="fa-solid fa-check"></i> Cập Nhật' : '<i class="fa-solid fa-plus"></i> Thêm Mới'}</button>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', markup);
        const modal = document.getElementById(modalId);
        const nameInput = document.getElementById(`${modalId}-name`);
        const contactInput = document.getElementById(`${modalId}-contact`);
        const addressInput = document.getElementById(`${modalId}-address`);
        if (nameInput) nameInput.value = existing?.name || '';
        if (contactInput) contactInput.value = existing?.contactInfo || '';
        if (addressInput) addressInput.value = existing?.address || '';

        const close = (payload) => {
            modal?.remove();
            resolve(payload);
        };

        modal?.addEventListener('click', (e) => {
            const action = e.target?.closest?.('[data-action]')?.getAttribute('data-action');
            if (e.target === modal || action === 'cancel') {
                close(null);
                return;
            }
            if (action === 'confirm') {
                const name = String(nameInput?.value || '').trim();
                if (!name) {
                    window.showWarningToast?.('Tên nhà cung cấp không được để trống');
                    return;
                }
                close({
                    name,
                    contactInfo: String(contactInput?.value || '').trim(),
                    address: String(addressInput?.value || '').trim()
                });
            }
        });

        setTimeout(() => nameInput?.focus(), 20);
    });
}

function openSupplierDeleteModal(supplierName) {
    return new Promise((resolve) => {
        const modalId = `supplierDeleteModal-${Date.now()}`;
        const safeName = escapeHtml(supplierName);
        const markup = `
            <div class="staff-modal-backdrop visible" id="${modalId}">
                <div class="staff-modal" style="max-width:460px;">
                    <div class="staff-modal-header">
                        <h3 class="staff-modal-title"><i class="fa-solid fa-triangle-exclamation" style="margin-right:8px;color:var(--color-danger);"></i>Xác nhận xoá</h3>
                        <button class="staff-modal-close" data-action="cancel"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="staff-modal-body">
                        <p style="margin:0;color:var(--dash-text-muted);">Bạn có chắc muốn xóa nhà cung cấp <strong style="color:white;">${safeName}</strong>?</p>
                    </div>
                    <div class="staff-modal-footer">
                        <button class="dash-btn-secondary" data-action="cancel">Huỷ</button>
                        <button class="dash-btn-primary" data-action="confirm" style="background:linear-gradient(135deg,var(--color-danger),#dc2626);"><i class="fa-solid fa-trash"></i> Xóa</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', markup);
        const modal = document.getElementById(modalId);
        const close = (value) => {
            modal?.remove();
            resolve(value);
        };
        modal?.addEventListener('click', (e) => {
            const action = e.target?.closest?.('[data-action]')?.getAttribute('data-action');
            if (e.target === modal || action === 'cancel') return close(false);
            if (action === 'confirm') return close(true);
        });
    });
}

async function createSupplierInternal() {
    const payload = await openSupplierFormModal();
    if (!payload) return;

    await supplierApiRequest('/suppliers', 'POST', payload);
    window.showSuccessToast?.('Thêm nhà cung cấp thành công');
    await loadData();
}

async function editSupplierInternal(supplierId) {
    const current = supplierState.suppliers.find(s => Number(s.supplierId) === Number(supplierId));
    if (!current) return;

    const payload = await openSupplierFormModal(current);
    if (!payload) return;

    await supplierApiRequest(`/suppliers/${supplierId}`, 'PUT', payload);
    window.showSuccessToast?.('Cập nhật nhà cung cấp thành công');
    await loadData();
}

async function deleteSupplierInternal(supplierId, supplierName) {
    const accepted = await openSupplierDeleteModal(supplierName);
    if (!accepted) return;
    await supplierApiRequest(`/suppliers/${supplierId}`, 'DELETE');
    window.showSuccessToast?.('Xóa nhà cung cấp thành công');
    await loadData();
}

async function loadData() {
    const [suppliers, imports] = await Promise.all([
        supplierApiRequest('/suppliers'),
        supplierApiRequest('/imports')
    ]);
    if (!suppliers || !imports) return;

    supplierState.suppliers = suppliers;
    supplierState.imports = imports;
    redraw();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = window.ensureAuthByRole(['Admin', 'Owner']);
        if (!user) return;

        hydrateUserProfile(user);
        setupSidebar();

        const searchInput = document.getElementById('supplierSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                supplierState.search = searchInput.value.trim();
                redraw();
            });
        }

        const statusFilter = document.getElementById('supplierStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                supplierState.statusFilter = statusFilter.value;
                redraw();
            });
        }

        const addButton = document.getElementById('btnAddSupplier');
        if (addButton) {
            addButton.addEventListener('click', async () => {
                try {
                    await createSupplierInternal();
                } catch (error) {
                    window.showErrorToast?.(error.message || 'Không thể thêm nhà cung cấp');
                }
            });
        }

        await loadData();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải trang nhà cung cấp');
    }
});

window.editSupplier = async function (supplierId) {
    try {
        await editSupplierInternal(supplierId);
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể cập nhật nhà cung cấp');
    }
};

window.deleteSupplier = async function (supplierId) {
    try {
        const supplier = supplierState.suppliers.find(s => Number(s.supplierId) === Number(supplierId));
        const supplierName = supplier?.name || `#NCC-${String(supplierId).padStart(3, '0')}`;
        await deleteSupplierInternal(supplierId, supplierName);
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể xóa nhà cung cấp');
    }
};
