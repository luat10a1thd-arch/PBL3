const INVENTORY_API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
let inventoryState = {
    ingredients: [],
    suppliers: [],
    searchKeyword: '',
    category: '',
    editingIngredientId: null
};

function formatCurrencyVnd(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function toLocalDateTimeInputValue(date = new Date()) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseLocalDateTime(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    const [datePart, timePart] = text.split('T');
    if (!datePart || !timePart) return null;

    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day, hour, minute, second);
    return Number.isNaN(date.getTime()) ? null : date;
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

function updateInventoryKpis(ingredients) {
    const kpis = document.querySelectorAll('.dash-kpi-value');
    if (kpis.length < 4) return;

    const total = ingredients.length;
    const lowStock = ingredients.filter(i => Number(i.stockQty ?? 0) > 0 && Number(i.stockQty ?? 0) <= 10).length;
    const outOfStock = ingredients.filter(i => Number(i.stockQty ?? 0) <= 0).length;
    const totalQuantity = ingredients.reduce((sum, i) => sum + Number(i.stockQty ?? 0), 0);

    kpis[0].textContent = String(total);
    kpis[1].textContent = String(lowStock);
    kpis[2].textContent = String(outOfStock);
    kpis[3].textContent = String(totalQuantity);
}

function renderInventoryRows(ingredients) {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    if (!ingredients.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding: 32px; color:#b6a8a2;">Không có dữ liệu kho hàng</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = ingredients.map(i => {
        const id = Number(i.ingredientId ?? 0);
        const name = (i.name || 'Nguyên liệu').trim();
        const uoM = (i.uoM || '-').trim();
        const stockQty = Number(i.stockQty ?? 0);
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
                <td><span class="dash-category-badge coffee">${uoM}</span></td>
                <td>
                    <div class="dash-status-indicator">
                        <div class="dash-status-dot ${status.dot}"></div>
                        <span class="${status.textClass}">${status.text}</span>
                    </div>
                </td>
                <td class="right dash-price">${stockQty}</td>
                <td class="right td-actions">
                    <div class="dash-table-actions">
                        <button class="dash-action-btn" data-action="edit" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                        <button class="dash-action-btn text-primary" data-action="stock-in" title="Nhập thêm"><i class="fa-solid fa-plus"></i></button>
                        <button class="dash-action-btn text-danger" data-action="delete" title="Xóa"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getShiftLabelByNow() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'CA 1: 06:00 - 12:00';
    if (hour >= 12 && hour < 17) return 'CA 2: 12:00 - 17:00';
    if (hour >= 17 && hour < 23) return 'CA 3: 17:00 - 23:00';
    return 'Ngoài giờ ca';
}

function updateShiftBadgeText() {
    const node = document.getElementById('inventoryShiftText');
    if (!node) return;
    node.textContent = getShiftLabelByNow();
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
    const quickRow = document.getElementById('stockInQuickIngredientRow');
    if (!ingredientSelect || !supplierSelect) return;

    if (!inventoryState.ingredients.length) {
        ingredientSelect.innerHTML = '<option value="">+ Tạo nguyên liệu mới ngay trong phiếu nhập</option>';
        if (quickRow) quickRow.style.display = 'grid';
    } else {
        ingredientSelect.innerHTML = ['<option value="">+ Tạo nguyên liệu mới ngay trong phiếu nhập</option>']
            .concat(inventoryState.ingredients.map(i => `<option value="${i.ingredientId}">${i.name}</option>`))
            .join('');
        if (quickRow) quickRow.style.display = 'none';
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
    try {
        const [ingredients, suppliers] = await Promise.all([
            inventoryApiRequest('/ingredients'),
            inventoryApiRequest('/suppliers')
        ]);

        if (!ingredients || !suppliers) return false;

        inventoryState.ingredients = ingredients;
        inventoryState.suppliers = suppliers;
        redrawInventory();
        fillStockInSelectors();

        const hasIngredients = inventoryState.ingredients.length > 0;
        const hasSuppliers = inventoryState.suppliers.length > 0;
        if (!hasIngredients) {
            window.showWarningToast?.('Chưa có nguyên liệu. Vui lòng bấm "Thêm Nguyên Liệu" trước khi nhập hàng.');
        }
        if (!hasSuppliers) {
            window.showWarningToast?.('Chưa có nhà cung cấp. Vui lòng tạo nhà cung cấp trước khi nhập hàng.');
        }
        return hasIngredients && hasSuppliers;
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải dữ liệu nhập hàng');
        return false;
    }
}

async function reloadInventoryData() {
    const ingredients = await inventoryApiRequest('/ingredients');
    if (!ingredients) return false;
    inventoryState.ingredients = ingredients;
    redrawInventory();
    fillStockInSelectors();
    return true;
}

function setupStockInModal() {
    const modal = document.getElementById('stockInModal');
    const closeBtn = document.getElementById('btnCloseStockInModal');
    const cancelBtn = document.getElementById('btnCancelStockInModal');
    const submitBtn = document.getElementById('btnSubmitStockIn');
    const quantityInput = document.getElementById('stockInQuantityInput');
    const unitPriceInput = document.getElementById('stockInUnitPriceInput');
    const autoTotalLabel = document.getElementById('stockInAutoTotalCost');
    const dateInput = document.getElementById('stockInDateInput');
    const ingredientSelect = document.getElementById('stockInIngredientSelect');
    const supplierSelect = document.getElementById('stockInSupplierSelect');
    const openIngredientModalBtn = document.getElementById('stockInOpenIngredientModalBtn');
    const quickRow = document.getElementById('stockInQuickIngredientRow');
    const quickNameInput = document.getElementById('stockInQuickIngredientNameInput');
    const quickUomInput = document.getElementById('stockInQuickIngredientUomInput');

    if (!modal || !closeBtn || !cancelBtn || !submitBtn || !quantityInput || !unitPriceInput || !autoTotalLabel || !dateInput || !ingredientSelect || !supplierSelect || !quickRow || !quickNameInput || !quickUomInput) {
        return;
    }

    const updateAutoTotal = () => {
        const quantity = Number(quantityInput.value);
        const unitPrice = Number(unitPriceInput.value);
        const total = Number.isFinite(quantity) && Number.isFinite(unitPrice) && quantity > 0 && unitPrice >= 0
            ? quantity * unitPrice
            : 0;
        autoTotalLabel.textContent = formatCurrencyVnd(total);
    };

    const toggleQuickIngredientInputs = () => {
        const showQuick = !ingredientSelect.value;
        quickRow.style.display = showQuick ? 'grid' : 'none';
    };

    const closeModal = () => modal.classList.remove('visible');
    const openModal = async (preferredIngredientId = null) => {
        const ready = await ensureStockInMasterData();
        if (!inventoryState.suppliers.length) {
            window.showWarningToast?.('Vui lòng tạo nhà cung cấp trước khi nhập hàng');
            return;
        }
        if (!ready && !inventoryState.ingredients.length) {
            window.showWarningToast?.('Bạn có thể tạo nguyên liệu mới trực tiếp trong phiếu nhập');
        }
        fillStockInSelectors();
        dateInput.value = toLocalDateTimeInputValue(new Date());
        quantityInput.value = '';
        unitPriceInput.value = '';
        updateAutoTotal();
        quickNameInput.value = '';
        quickUomInput.value = '';

        if (preferredIngredientId) {
            ingredientSelect.value = String(preferredIngredientId);
        }
        toggleQuickIngredientInputs();

        modal.classList.add('visible');
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    ingredientSelect.addEventListener('change', toggleQuickIngredientInputs);
    quantityInput.addEventListener('input', updateAutoTotal);
    unitPriceInput.addEventListener('input', updateAutoTotal);
    if (openIngredientModalBtn) {
        openIngredientModalBtn.addEventListener('click', () => {
            closeModal();
            const globalIngredientBtn = document.getElementById('ingredientAddBtn');
            if (globalIngredientBtn) globalIngredientBtn.click();
        });
    }

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
            const selectedIngredientId = Number(ingredientSelect.value);
            const supplierId = Number(supplierSelect.value);
            const quantity = Number(quantityInput.value);
            const unitPrice = Number(unitPriceInput.value);
            const totalCost = Number.isFinite(quantity) && Number.isFinite(unitPrice) ? (quantity * unitPrice) : NaN;
            const parsedImportDate = parseLocalDateTime(dateInput.value);
            const importDate = parsedImportDate && !Number.isNaN(parsedImportDate.getTime())
                ? parsedImportDate.toISOString()
                : null;
            let ingredientId = selectedIngredientId;

            if (!supplierId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
                window.showWarningToast?.('Vui lòng nhập đầy đủ thông tin hợp lệ');
                return;
            }

            if (!ingredientId) {
                const quickName = quickNameInput.value.trim();
                const quickUom = quickUomInput.value.trim();
                if (!quickName || !quickUom) {
                    window.showWarningToast?.('Vui lòng nhập tên và đơn vị cho nguyên liệu mới');
                    return;
                }

                const createdIngredient = await inventoryApiRequest('/ingredients', 'POST', {
                    Name: quickName,
                    UoM: quickUom,
                    StockQty: 0
                });
                if (!createdIngredient || !createdIngredient.ingredientId) {
                    window.showErrorToast?.('Không thể tạo nguyên liệu mới');
                    return;
                }
                ingredientId = Number(createdIngredient.ingredientId);
                await reloadInventoryData();
                ingredientSelect.value = String(ingredientId);
            }

            const result = await inventoryApiRequest('/imports/stock-in', 'POST', {
                SupplierId: supplierId,
                IngredientId: ingredientId,
                Quantity: quantity,
                UnitPrice: unitPrice,
                TotalCost: totalCost,
                ImportDate: importDate
            });

            if (!result) return;

            await reloadInventoryData();

            closeModal();
            quantityInput.value = '';
            unitPriceInput.value = '';
            updateAutoTotal();
            window.showSuccessToast?.('Nhập hàng thành công');
        } catch (error) {
            window.showErrorToast?.(error.message || 'Nhập hàng thất bại');
        }
    });

    updateAutoTotal();
}

function setupIngredientModal() {
    const modal = document.getElementById('ingredientModal');
    const openBtn = document.getElementById('ingredientAddBtn');
    const closeBtn = document.getElementById('btnCloseIngredientModal');
    const cancelBtn = document.getElementById('btnCancelIngredientModal');
    const submitBtn = document.getElementById('btnSubmitIngredient');
    const titleEl = document.getElementById('ingredientModalTitle');
    const nameInput = document.getElementById('ingredientNameInput');
    const uomInput = document.getElementById('ingredientUoMInput');
    const initialQtyInput = document.getElementById('ingredientInitialQtyInput');

    if (!modal || !openBtn || !closeBtn || !cancelBtn || !submitBtn || !titleEl || !nameInput || !uomInput || !initialQtyInput) {
        return;
    }

    const closeModal = () => modal.classList.remove('visible');
    const resetForm = () => {
        inventoryState.editingIngredientId = null;
        titleEl.textContent = 'Thêm Nguyên Liệu';
        nameInput.value = '';
        uomInput.value = '';
        initialQtyInput.value = '0';
    };

    const openCreateModal = () => {
        resetForm();
        modal.classList.add('visible');
    };

    const openEditModal = (ingredientId) => {
        const ingredient = inventoryState.ingredients.find(i => Number(i.ingredientId) === Number(ingredientId));
        if (!ingredient) {
            window.showErrorToast?.('Không tìm thấy nguyên liệu để chỉnh sửa');
            return;
        }

        inventoryState.editingIngredientId = Number(ingredientId);
        titleEl.textContent = 'Cập Nhật Nguyên Liệu';
        nameInput.value = ingredient.name || '';
        uomInput.value = ingredient.uoM || '';
        initialQtyInput.value = String(Number(ingredient.stockQty ?? 0));
        modal.classList.add('visible');
    };

    openBtn.addEventListener('click', openCreateModal);
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    const tableBody = document.getElementById('inventoryTableBody');
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action="edit"]');
            if (!button) return;
            const row = button.closest('tr[data-id]');
            if (!row) return;
            openEditModal(Number(row.dataset.id));
        });

        tableBody.addEventListener('click', async (e) => {
            const button = e.target.closest('button[data-action="delete"]');
            if (!button) return;
            const row = button.closest('tr[data-id]');
            if (!row) return;
            const id = Number(row.dataset.id);
            const confirmed = await window.showConfirmModal?.('Xóa nguyên liệu này?');
            if (!confirmed) return;
            try {
                await inventoryApiRequest(`/ingredients/${id}`, 'DELETE');
                await reloadInventoryData();
                window.showSuccessToast?.('Xóa nguyên liệu thành công');
            } catch (error) {
                window.showErrorToast?.(error.message || 'Không thể xóa nguyên liệu');
            }
        });
    }

    submitBtn.addEventListener('click', async () => {
        try {
            const name = nameInput.value.trim();
            const uoM = uomInput.value.trim();
            const stockQty = Number(initialQtyInput.value);

            if (!name || !uoM || !Number.isFinite(stockQty) || stockQty < 0) {
                window.showWarningToast?.('Vui lòng nhập đầy đủ thông tin nguyên liệu hợp lệ');
                return;
            }

            const payload = {
                Name: name,
                UoM: uoM,
                StockQty: stockQty
            };

            if (inventoryState.editingIngredientId) {
                await inventoryApiRequest(`/ingredients/${inventoryState.editingIngredientId}`, 'PUT', payload);
                window.showSuccessToast?.('Cập nhật nguyên liệu thành công');
            } else {
                await inventoryApiRequest('/ingredients', 'POST', payload);
                window.showSuccessToast?.('Tạo nguyên liệu thành công');
            }

            await reloadInventoryData();
            closeModal();
            resetForm();
        } catch (error) {
            window.showErrorToast?.(error.message || 'Không thể lưu nguyên liệu');
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
        const user = window.ensureAuthByRole(['Manager']);
        if (!user) return;

        window.hydrateAdminUserProfile?.(user);
        updateShiftBadgeText();

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
        fillStockInSelectors();
        setupIngredientModal();
        setupStockInModal();
    } catch (error) {
        window.showErrorToast?.(error.message || 'Không thể tải dữ liệu kho hàng');
    }
});

