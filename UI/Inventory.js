const INVENTORY_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
let inventoryState = {
    ingredients: [],
    suppliers: [],
    searchKeyword: '',
    category: ''
};

function formatCurrencyVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function resolveStatusClass(stockQty) {
    if (stockQty <= 0) return { dot: 'out-of-stock', textClass: 'text-danger', text: 'Đã hết hàng' };
    if (stockQty <= 10) return { dot: 'low-stock', textClass: 'text-warning', text: 'Sắp hết' };
    return { dot: 'in-stock', textClass: 'text-success', text: 'Còn hàng' };
}

function resolveIconByName(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('cà phê') || n.includes('coffee')) return 'fa-mug-hot';
    if (n.includes('sữa')) return 'fa-bottle-droplet';
    if (n.includes('syrup')) return 'fa-wine-bottle';
    if (n.includes('ly') || n.includes('bao bì')) return 'fa-box-open';
    return 'fa-box';
}

function getFilteredIngredients() {
    let data = [...inventoryState.ingredients];

    if (inventoryState.category) {
        data = data.filter(i => (i.category || 'Nguyên liệu') === inventoryState.category);
    }

    if (inventoryState.searchKeyword) {
        const keyword = inventoryState.searchKeyword.toLowerCase();
        data = data.filter(i => (i.name || '').toLowerCase().includes(keyword));
    }

    return data;
}

async function inventoryApiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${INVENTORY_API_URL}${endpoint}`, options);
    if (response.status === 401) {
        window.showWarningToast?.('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
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

function updateInventoryKpis(ingredients) {
    const kpis = document.querySelectorAll('.dash-kpi-value');
    if (kpis.length < 4) return;

    const total = ingredients.length;
    const lowStock = ingredients.filter(i => Number(i.stockQty ?? 0) > 0 && Number(i.stockQty ?? 0) <= 10).length;
    const outOfStock = ingredients.filter(i => Number(i.stockQty ?? 0) <= 0).length;
    const totalValue = ingredients.reduce((sum, i) => sum + Number(i.stockQty ?? 0), 0);

    kpis[0].textContent = String(total);
    kpis[1].textContent = String(lowStock);
    kpis[2].textContent = String(outOfStock);
    kpis[3].textContent = formatCurrencyVnd(totalValue);
}

function renderInventoryRows(ingredients) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (!ingredients.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 32px; color:#b6a8a2;">Không có dữ liệu kho hàng</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = ingredients.map(i => {
        const id = Number(i.ingredientId ?? 0);
        const name = (i.name || 'Nguyên liệu').trim();
        const category = (i.category || 'Nguyên liệu').trim();
        const stockQty = Number(i.stockQty ?? 0);
        const totalValue = stockQty;
        const status = resolveStatusClass(stockQty);
        const icon = resolveIconByName(name);

        return `
            <tr data-id="${id}">
                <td class="td-checkbox"><input type="checkbox" /></td>
                <td>
                    <div class="dash-product-cell">
                        <div class="dash-product-img icon-cell"><i class="fa-solid ${icon}"></i></div>
                        <div class="dash-product-info">
                            <span class="dash-product-name">${name}</span>
                            <span class="dash-product-id">Mã: NL-${String(id).padStart(3, '0')}</span>
                        </div>
                    </div>
                </td>
                <td><span class="dash-category-badge coffee">${category}</span></td>
                <td>
                    <div class="dash-status-indicator">
                        <div class="dash-status-dot ${status.dot}"></div>
                        <span class="${status.textClass}">${status.text}</span>
                    </div>
                </td>
                <td class="right dash-price">${stockQty}</td>
                <td class="right dash-cost">-</td>
                <td class="right dash-price">${formatCurrencyVnd(totalValue)}</td>
                <td class="right td-actions">
                    <div class="dash-table-actions">
                        <button class="dash-action-btn" data-action="edit" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                        <button class="dash-action-btn text-primary" data-action="stock-in" title="Nhập thêm"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateInventoryPaginationInfo(count) {
    const info = document.getElementById('inventoryPaginationInfo');
    if (!info) return;

    if (count <= 0) {
        info.textContent = 'Không có kết quả';
        return;
    }

    info.textContent = `Đang hiển thị 1 đến ${count} trong số ${count} kết quả`;
}

function redrawInventory() {
    const filtered = getFilteredIngredients();
    renderInventoryRows(filtered);
    updateInventoryKpis(filtered);
    updateInventoryPaginationInfo(filtered.length);
}

function wireInventorySearch() {
    const input = document.getElementById('inventorySearchInput');
    if (!input) return;

    input.addEventListener('input', () => {
        inventoryState.searchKeyword = input.value.trim();
        redrawInventory();
    });
}

function wireCategoryFilter() {
    const select = document.getElementById('inventoryCategoryFilter');
    if (!select) return;

    select.addEventListener('change', () => {
        inventoryState.category = select.value;
        redrawInventory();
    });
}

function fillStockInSelectors() {
    const ingredientSelect = document.getElementById('stockInIngredientSelect');
    const supplierSelect = document.getElementById('stockInSupplierSelect');
    if (!ingredientSelect || !supplierSelect) return;

    if (!inventoryState.ingredients.length) {
        ingredientSelect.innerHTML = '<option value="">Không có nguyên liệu</option>';
    } else {
        ingredientSelect.innerHTML = inventoryState.ingredients
            .map(i => `<option value="${i.ingredientId}">${i.name}</option>`)
            .join('');
    }

    if (!inventoryState.suppliers.length) {
        supplierSelect.innerHTML = '<option value="">Không có nhà cung cấp</option>';
    } else {
        supplierSelect.innerHTML = inventoryState.suppliers
            .map(s => `<option value="${s.supplierId}">${s.name}</option>`)
            .join('');
    }
}

async function ensureStockInMasterData() {
    if (inventoryState.ingredients.length > 0 && inventoryState.suppliers.length > 0) {
        return true;
    }

    try {
        let createdDefaults = false;
        if (inventoryState.suppliers.length === 0) {
            try {
                await inventoryApiRequest('/suppliers', 'POST', {
                    Name: 'Nhà cung cấp mặc định',
                    ContactInfo: '0900000000',
                    Address: 'Địa chỉ mặc định'
                });
                createdDefaults = true;
            } catch {
                // Supplier có thể đã tồn tại bởi người dùng khác, sẽ đồng bộ lại ở bước fetch.
            }
        }

        if (inventoryState.ingredients.length === 0) {
            try {
                await inventoryApiRequest('/ingredients', 'POST', {
                    Name: 'Hạt cà phê mặc định',
                    UoM: 'kg',
                    StockQty: 0
                });
                createdDefaults = true;
            } catch {
                // Ingredient có thể đã tồn tại bởi người dùng khác, sẽ đồng bộ lại ở bước fetch.
            }
        }

        const [ingredients, suppliers] = await Promise.all([
            inventoryApiRequest('/ingredients'),
            inventoryApiRequest('/suppliers')
        ]);

        if (!ingredients || !suppliers) return false;

        inventoryState.ingredients = ingredients;
        inventoryState.suppliers = suppliers;
        redrawInventory();

        const ready = inventoryState.ingredients.length > 0 && inventoryState.suppliers.length > 0;
        if (ready && createdDefaults) {
            window.showSuccessToast?.('Đã khởi tạo dữ liệu mặc định để nhập hàng');
        } else if (!ready) {
            window.showErrorToast?.('Thiếu dữ liệu nguyên liệu hoặc nhà cung cấp để nhập hàng');
        }
        return ready;
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể khởi tạo dữ liệu mặc định');
        return false;
    }
}

function setupStockInModal() {
    const modal = document.getElementById('stockInModal');
    const openBtn = document.getElementById('inventoryAddBtn');
    const closeBtn = document.getElementById('btnCloseStockInModal');
    const cancelBtn = document.getElementById('btnCancelStockInModal');
    const submitBtn = document.getElementById('btnSubmitStockIn');
    const quantityInput = document.getElementById('stockInQuantityInput');
    const totalCostInput = document.getElementById('stockInTotalCostInput');
    const dateInput = document.getElementById('stockInDateInput');
    const ingredientSelect = document.getElementById('stockInIngredientSelect');
    const supplierSelect = document.getElementById('stockInSupplierSelect');

    if (!modal || !openBtn || !closeBtn || !cancelBtn || !submitBtn || !quantityInput || !totalCostInput || !dateInput || !ingredientSelect || !supplierSelect) {
        return;
    }

    const closeModal = () => modal.classList.remove('visible');
    const openModal = async (preferredIngredientId = null) => {
        const ready = await ensureStockInMasterData();
        if (!ready) {
            window.showWarningToast?.('Vui lòng tạo nguyên liệu và nhà cung cấp trước khi nhập hàng');
            return;
        }
        fillStockInSelectors();
        dateInput.value = new Date().toISOString().slice(0, 16);
        quantityInput.value = '';
        totalCostInput.value = '';

        if (preferredIngredientId) {
            ingredientSelect.value = String(preferredIngredientId);
        }

        modal.classList.add('visible');
    };

    openBtn.addEventListener('click', () => { openModal(); });
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    const tableBody = document.getElementById('inventoryTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action="stock-in"]');
            if (!button) return;

            const row = button.closest('tr[data-id]');
            const ingredientId = row ? Number(row.dataset.id) : 0;
            openModal(ingredientId || null);
        });
    }

    submitBtn.addEventListener('click', async () => {
        try {
            const ingredientId = Number(ingredientSelect.value);
            const supplierId = Number(supplierSelect.value);
            const quantity = Number(quantityInput.value);
            const totalCost = Number(totalCostInput.value);
            const parsedImportDate = dateInput.value ? new Date(dateInput.value) : null;
            const importDate = parsedImportDate && !Number.isNaN(parsedImportDate.getTime())
                ? parsedImportDate.toISOString()
                : null;

            if (!ingredientId || !supplierId || !Number.isFinite(quantity) || quantity <= 0) {
                window.showWarningToast?.('Vui lòng nhập đầy đủ thông tin hợp lệ');
                return;
            }

            const result = await inventoryApiRequest('/imports/stock-in', 'POST', {
                SupplierId: supplierId,
                IngredientId: ingredientId,
                Quantity: quantity,
                TotalCost: Number.isNaN(totalCost) ? 0 : totalCost,
                ImportDate: importDate
            });

            if (!result) return;

            const ingredients = await inventoryApiRequest('/ingredients');
            if (ingredients) {
                inventoryState.ingredients = ingredients;
                redrawInventory();
            }

            closeModal();
            quantityInput.value = '';
            totalCostInput.value = '';
            window.showSuccessToast?.('Nhập hàng thành công');
        } catch (error) {
            window.showErrorToast?.(error.message || 'Nhập hàng thất bại');
        }
    });
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

        const [ingredients, suppliers] = await Promise.all([
            inventoryApiRequest('/ingredients'),
            inventoryApiRequest('/suppliers')
        ]);
        if (!ingredients || !suppliers) return;

        inventoryState.ingredients = ingredients;
        inventoryState.suppliers = suppliers;

        redrawInventory();
        wireInventorySearch();
        wireCategoryFilter();
        setupStockInModal();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải dữ liệu kho hàng');
    }
});
