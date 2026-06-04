const VOUCHER_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';

const voucherState = {
    vouchers: [],
    categories: [],
    search: '',
    status: ''
};

function formatCurrencyVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function normalizeVoucher(voucher) {
    return {
        voucherId: Number(voucher?.voucherId ?? voucher?.VoucherId ?? 0),
        code: String(voucher?.code ?? voucher?.Code ?? '').trim().toUpperCase(),
        discountAmount: Number(voucher?.discountAmount ?? voucher?.DiscountAmount ?? 0),
        expiryDate: voucher?.expiryDate ?? voucher?.ExpiryDate ?? null,
        applicableCategoryId: Number(voucher?.applicableCategoryId ?? voucher?.ApplicableCategoryId ?? 0)
    };
}

function isVoucherExpired(voucher) {
    const expiry = new Date(voucher.expiryDate);
    if (Number.isNaN(expiry.getTime())) return true;
    return expiry < new Date();
}

function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('vi-VN');
}

async function voucherApiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${VOUCHER_API_URL}${endpoint}`, options);
    if (response.status === 401) {
        window.showWarningToast?.('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
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

function getFilteredVouchers() {
    let rows = [...voucherState.vouchers];
    if (voucherState.status) {
        rows = rows.filter(v => voucherState.status === 'expired' ? isVoucherExpired(v) : !isVoucherExpired(v));
    }
    if (voucherState.search) {
        const keyword = voucherState.search.toLowerCase();
        rows = rows.filter(v => v.code.toLowerCase().includes(keyword));
    }
    return rows;
}

function renderKpis() {
    const values = document.querySelectorAll('.dash-kpi-value');
    if (values.length < 4) return;

    const total = voucherState.vouchers.length;
    const active = voucherState.vouchers.filter(v => !isVoucherExpired(v)).length;
    const expired = total - active;
    const average = total
        ? voucherState.vouchers.reduce((sum, v) => sum + Number(v.discountAmount || 0), 0) / total
        : 0;

    values[0].textContent = String(total);
    values[1].textContent = String(active);
    values[2].textContent = String(expired);
    values[3].textContent = formatCurrencyVnd(average);
}

function renderRows() {
    const tbody = document.getElementById('voucherTableBody');
    if (!tbody) return;

    const rows = getFilteredVouchers();
    renderKpis();

    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--dash-text-muted)">Không có mã giảm giá phù hợp</td></tr>';
        const info = document.getElementById('voucherPaginationInfo');
        if (info) info.textContent = 'Không có dữ liệu';
        return;
    }

    tbody.innerHTML = rows.map(v => {
        const expired = isVoucherExpired(v);
        return `
            <tr>
                <td class="td-checkbox"><input type="checkbox" /></td>
                <td><span class="dash-product-name">${v.code}</span></td>
                <td class="right dash-price">${formatCurrencyVnd(v.discountAmount)}</td>
                <td>${formatDate(v.expiryDate)}</td>
                <td>
                    <div class="dash-status-indicator">
                        <div class="dash-status-dot ${expired ? 'out-of-stock' : 'in-stock'}"></div>
                        <span class="${expired ? 'text-danger' : 'text-success'}">${expired ? 'Hết hạn' : 'Còn hạn'}</span>
                    </div>
                </td>
                <td class="right td-actions">
                    <div class="dash-table-actions">
                        <button class="dash-action-btn" onclick="window.editVoucher(${v.voucherId})"><i class="fa-solid fa-pen"></i></button>
                        <button class="dash-action-btn delete" onclick="window.deleteVoucher(${v.voucherId})"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    const info = document.getElementById('voucherPaginationInfo');
    if (info) info.textContent = `Đang hiển thị 1 đến ${rows.length} trong số ${rows.length} mã`;
}

function openVoucherFormModal(existing = null) {
    return new Promise((resolve) => {
        const modalId = `voucherModal-${Date.now()}`;
        const title = existing ? 'Cập Nhật Mã Giảm Giá' : 'Thêm Mã Giảm Giá';
        const expiryValue = existing?.expiryDate
            ? new Date(existing.expiryDate).toLocaleDateString('en-CA')
            : '';
        const categoryOptions = `<option value="0">Áp dụng tất cả</option>` + voucherState.categories.map(c => 
            `<option value="${c.categoryId ?? c.CategoryId}" ${existing?.applicableCategoryId === Number(c.categoryId ?? c.CategoryId) ? 'selected' : ''}>${c.name ?? c.Name}</option>`
        ).join('');

        const markup = `
            <div class="staff-modal-backdrop visible" id="${modalId}">
                <div class="staff-modal" style="max-width:460px;">
                    <div class="staff-modal-header">
                        <h3 class="staff-modal-title">${title}</h3>
                        <button class="staff-modal-close" data-action="cancel"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="staff-modal-body">
                        <div class="form-group">
                            <label>Mã <span style="color:#ef4444">*</span></label>
                            <input type="text" class="staff-input" id="${modalId}-code" value="${existing?.code ?? ''}" />
                        </div>
                        <div class="form-group">
                            <label>Giá trị giảm (VND) <span style="color:#ef4444">*</span></label>
                            <input type="number" min="1000" step="1000" class="staff-input" id="${modalId}-discount" value="${existing?.discountAmount ?? ''}" />
                        </div>
                        <div class="form-group">
                            <label>Danh mục áp dụng</label>
                            <select class="staff-input" id="${modalId}-category">
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Hạn sử dụng <span style="color:#ef4444">*</span></label>
                            <input type="date" class="staff-input" id="${modalId}-expiry" value="${expiryValue}" />
                        </div>
                    </div>
                    <div class="staff-modal-footer">
                        <button class="dash-btn-secondary" data-action="cancel">Huỷ</button>
                        <button class="dash-btn-primary" data-action="confirm">${existing ? 'Cập nhật' : 'Thêm mới'}</button>
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
            if (e.target === modal || action === 'cancel') return close(null);
            if (action === 'confirm') {
                const code = String(document.getElementById(`${modalId}-code`)?.value || '').trim().toUpperCase();
                const discountAmount = Number(document.getElementById(`${modalId}-discount`)?.value);
                const expiryDateRaw = String(document.getElementById(`${modalId}-expiry`)?.value || '').trim();
                if (!code || !discountAmount || !expiryDateRaw) {
                    window.showWarningToast?.('Vui lòng nhập đầy đủ thông tin mã giảm giá');
                    return;
                }
                const expiryDate = new Date(`${expiryDateRaw}T16:59:59.000Z`);
                if (Number.isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
                    window.showWarningToast?.('Hạn sử dụng phải lớn hơn thời điểm hiện tại');
                    return;
                }
                const applicableCategoryId = Number(document.getElementById(`${modalId}-category`)?.value) || 0;
                
                const payload = {
                    code,
                    discountAmount,
                    expiryDate: expiryDate.toISOString()
                };
                if (applicableCategoryId > 0) {
                    payload.applicableCategoryId = applicableCategoryId;
                }
                close(payload);
            }
        });
    });
}

async function loadData() {
    const [rows, cats] = await Promise.all([
        voucherApiRequest('/vouchers'),
        voucherApiRequest('/categories')
    ]);
    if (rows) voucherState.vouchers = rows.map(normalizeVoucher);
    if (cats) voucherState.categories = cats;
    renderRows();
}

window.editVoucher = async function editVoucher(voucherId) {
    try {
        const row = voucherState.vouchers.find(v => v.voucherId === Number(voucherId));
        if (!row) return;
        const payload = await openVoucherFormModal(row);
        if (!payload) return;
        await voucherApiRequest(`/vouchers/${voucherId}`, 'PUT', payload);
        window.showSuccessToast?.('Cập nhật mã giảm giá thành công');
        await loadData();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể cập nhật mã giảm giá');
    }
};

window.deleteVoucher = async function deleteVoucher(voucherId) {
    try {
        if (typeof window.showConfirmModal !== 'function') {
            window.showWarningToast?.('Không thể mở hộp thoại xác nhận');
            return;
        }
        const confirmed = await window.showConfirmModal('Bạn có chắc muốn xóa mã giảm giá này?');
        if (!confirmed) return;
        await voucherApiRequest(`/vouchers/${voucherId}`, 'DELETE');
        window.showSuccessToast?.('Xóa mã giảm giá thành công');
        await loadData();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể xóa mã giảm giá');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = window.ensureAuthByRole(['Manager']);
        if (!user) return;
        window.hydrateAdminUserProfile?.(user);
        setupSidebar();

        const searchInput = document.getElementById('voucherSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                voucherState.search = searchInput.value.trim();
                renderRows();
            });
        }

        const statusFilter = document.getElementById('voucherStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                voucherState.status = statusFilter.value;
                renderRows();
            });
        }

        const addBtn = document.getElementById('btnAddVoucher');
        if (addBtn) {
            addBtn.addEventListener('click', async () => {
                const payload = await openVoucherFormModal();
                if (!payload) return;
                await voucherApiRequest('/vouchers', 'POST', payload);
                window.showSuccessToast?.('Thêm mã giảm giá thành công');
                await loadData();
            });
        }

        await loadData();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải dữ liệu mã giảm giá');
    }
});

