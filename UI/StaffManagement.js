const STAFF_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
let staffState = {
    employees: [],
    role: '',
    keyword: ''
};

function formatCurrencyVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function parseSalary(salary) {
    const raw = String(salary || '').trim();
    if (!raw) return 0;
    const normalized = raw.replace(/[^\d.,-]/g, '').replace(',', '.');
    const value = Number(normalized);
    return Number.isNaN(value) ? 0 : value;
}

function roleBadgeClass(role) {
    const r = (role || '').toLowerCase();
    if (r.includes('quản')) return 'coffee';
    if (r.includes('pha')) return 'tea';
    if (r.includes('thu')) return 'pastries';
    if (r.includes('phục')) return 'breakfast';
    return 'tea';
}

function initialsFromName(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'NV';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarColorById(id) {
    const colors = ['#c56517', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#0ea5e9'];
    return colors[Math.abs(Number(id || 0)) % colors.length];
}

async function staffApiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${STAFF_API_URL}${endpoint}`, options);
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

function updateStaffKpis(employees) {
    const kpis = document.querySelectorAll('.dash-kpi-value');
    if (kpis.length < 4) return;

    const total = employees.length;
    const active = employees.length;
    const onLeave = 0;
    const salaryTotal = employees.reduce((sum, e) => sum + parseSalary(e.basicSalary), 0);

    kpis[0].textContent = String(total);
    kpis[1].textContent = String(active);
    kpis[2].textContent = String(onLeave);
    kpis[3].textContent = formatCurrencyVnd(salaryTotal);
}

function renderStaffRows(employees) {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    if (!employees.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 32px; color:#b6a8a2;">Không có dữ liệu nhân viên</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = employees.map(e => {
        const id = Number(e.employeeId ?? 0);
        const name = (e.name || 'Nhân viên').trim();
        const role = (e.role || 'Nhân viên').trim();
        const salary = parseSalary(e.basicSalary);
        const initials = initialsFromName(name);
        const avatarColor = avatarColorById(id);

        return `
            <tr data-id="${id}">
                <td class="td-checkbox"><input type="checkbox" /></td>
                <td>
                    <div class="dash-product-cell">
                        <div class="dash-staff-avatar" style="background-color: ${avatarColor};">${initials}</div>
                        <div class="dash-product-info">
                            <span class="dash-product-name">${name}</span>
                            <span class="dash-product-id">Mã: NV-${String(id).padStart(3, '0')}</span>
                        </div>
                    </div>
                </td>
                <td><span class="dash-category-badge ${roleBadgeClass(role)}">${role}</span></td>
                <td>
                    <div class="dash-flex-col">
                        <span class="fw-500" style="color:white;">---</span>
                        <span class="dash-product-id">---</span>
                    </div>
                </td>
                <td>
                    <div class="dash-flex-col">
                        <span style="color:white; font-size:0.85rem;">---</span>
                        <span class="dash-product-id">---</span>
                    </div>
                </td>
                <td class="right dash-price">${formatCurrencyVnd(salary)}</td>
                <td>
                    <div class="dash-status-indicator justify-center">
                        <div class="dash-status-dot in-stock"></div>
                        <span class="text-success">Đang làm</span>
                    </div>
                </td>
                <td class="right td-actions">
                    <div class="dash-table-actions">
                        <button class="dash-action-btn" title="Chi tiết"><i class="fa-solid fa-eye"></i></button>
                        <button class="dash-action-btn" title="Chỉnh sửa"><i class="fa-solid fa-pen"></i></button>
                        <button class="dash-action-btn delete" title="Xoá"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getFilteredEmployees() {
    let data = [...staffState.employees];

    if (staffState.role) {
        data = data.filter(e => (e.role || '').toLowerCase() === staffState.role.toLowerCase());
    }

    if (staffState.keyword) {
        const keyword = staffState.keyword.toLowerCase();
        data = data.filter(e => (e.name || '').toLowerCase().includes(keyword));
    }

    return data;
}

function updateFilterButtonCounts() {
    const buttons = document.querySelectorAll('.dash-filter-btn[data-role]');
    buttons.forEach(btn => {
        const role = btn.dataset.role || '';
        const baseText = btn.textContent.split(' (')[0];
        const count = role
            ? staffState.employees.filter(e => (e.role || '').toLowerCase() === role.toLowerCase()).length
            : staffState.employees.length;
        btn.textContent = `${baseText} (${count})`;
    });
}

function updateStaffPaginationInfo(count) {
    const info = document.querySelector('.dash-pagination-info');
    if (!info) return;
    if (count <= 0) {
        info.textContent = 'Không có dữ liệu nhân viên';
        return;
    }
    info.textContent = `Đang hiển thị 1 đến ${count} trong số ${count} kết quả`;
}

function redrawStaff() {
    const filtered = getFilteredEmployees();
    renderStaffRows(filtered);
    updateStaffKpis(filtered);
    updateStaffPaginationInfo(filtered.length);
    updateFilterButtonCounts();
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

function setupModal() {
    const modal = document.getElementById('staffModal');
    const addBtn = document.getElementById('btnAddStaff');
    const closeBtn = document.getElementById('btnCloseModal');
    const cancelBtn = document.getElementById('btnCancelModal');
    if (!modal || !addBtn || !closeBtn || !cancelBtn) return;

    addBtn.addEventListener('click', () => modal.classList.add('visible'));
    closeBtn.addEventListener('click', () => modal.classList.remove('visible'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
}

function clearStaffForm() {
    const ids = [
        'staffNameInput',
        'staffRoleInput',
        'staffShiftInput',
        'staffPhoneInput',
        'staffEmailInput',
        'staffSalaryInput',
        'staffStatusInput',
        'staffAddressInput',
        'staffStartDateInput',
        'staffIdentityInput'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        } else {
            el.value = '';
        }
    });
}

function setupCreateStaff() {
    const saveBtn = document.getElementById('btnSaveStaff');
    const modal = document.getElementById('staffModal');
    const nameInput = document.getElementById('staffNameInput');
    const roleInput = document.getElementById('staffRoleInput');
    const salaryInput = document.getElementById('staffSalaryInput');
    const codeInput = document.getElementById('staffCodeInput');

    if (!saveBtn || !modal || !nameInput || !roleInput || !salaryInput) return;

    const syncCodePreview = () => {
        if (!codeInput) return;
        const nextId = (staffState.employees.reduce((max, e) => Math.max(max, Number(e.employeeId || 0)), 0) || 0) + 1;
        codeInput.value = `NV-${String(nextId).padStart(3, '0')}`;
    };

    syncCodePreview();
    nameInput.addEventListener('input', syncCodePreview);
    roleInput.addEventListener('change', syncCodePreview);

    saveBtn.addEventListener('click', async () => {
        try {
            const name = nameInput.value.trim();
            const role = roleInput.value.trim();
            const salaryRaw = salaryInput.value.trim();

            if (!name || !role) {
                alert('Vui lòng nhập tên và chức vụ');
                return;
            }

            await staffApiRequest('/employees', 'POST', {
                name,
                role,
                basicSalary: salaryRaw || '0'
            });

            const employees = await staffApiRequest('/employees');
            if (employees) {
                staffState.employees = employees;
                redrawStaff();
            }

            clearStaffForm();
            modal.classList.remove('visible');
            syncCodePreview();
            alert('Thêm nhân viên thành công');
        } catch (error) {
            alert(error.message || 'Thêm nhân viên thất bại');
        }
    });
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
        setupModal();

        const employees = await staffApiRequest('/employees');
        if (!employees) return;
        staffState.employees = employees;
        redrawStaff();
        setupCreateStaff();

        const searchInput = document.getElementById('staffSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                staffState.keyword = searchInput.value.trim();
                redrawStaff();
            });
        }

        document.querySelectorAll('.dash-filter-btn[data-role]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.dash-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                staffState.role = btn.dataset.role || '';
                redrawStaff();
            });
        });
    } catch (error) {
        alert(error.message || 'Không thể tải dữ liệu nhân viên');
    }
});
