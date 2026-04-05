// API Configuration
const API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
const DEFAULT_TABLE_ID = 1;

// Global State
let currentOrder = {
    tableId: DEFAULT_TABLE_ID,
    orderId: null,
    items: [],
    paymentMethod: 'cash'
};

let menuItems = [];
let categories = [];
let currentCategory = 'all';

function normalizeCategoryValue(value) {
    if (value === null || value === undefined) return 'all';
    const raw = String(value).trim();
    if (raw === '' || raw.toLowerCase() === 'all') return 'all';
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? 'all' : parsed;
}

// Check authentication
function checkAuth() {
    return !!window.ensureAuthByRole(['Staff', 'Admin', 'Owner']);
}

// Update user info
function updateUserInfo() {
    const user = window.getCurrentUser();
    if (user.firstName && user.lastName) {
        document.querySelector('.cashier-topbar-user-name').textContent = `${user.firstName} ${user.lastName}`;
        const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        document.querySelector('.cashier-topbar-avatar').textContent = initials;
        
        const role = window.normalizeRole(user.role) === 'Staff' ? 'Thu Ngân' : 'Quản Trị';
        document.querySelector('.cashier-topbar-user-role').textContent = role;
    }
}

// API request helper
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        
        if (response.status === 401) {
            alert('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
            localStorage.removeItem('user');
            window.location.href = 'LoginPage.html';
            return null;
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Có lỗi xảy ra' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cashier Interface Loading...');
    
    if (!checkAuth()) return;
    
    updateUserInfo();
    await loadMenuData();
    setupEventListeners();
    updateOrderHeader();
    
    console.log('Cashier Interface Ready');
});

// Load menu data from API
async function loadMenuData() {
    try {
        const [categoriesData, itemsData] = await Promise.all([
            apiRequest('/categories'),
            apiRequest('/items')
        ]);

        categories = categoriesData || [];
        menuItems = itemsData || [];

        renderCategoryTabs();
        renderMenuItems();
        
        console.log(`Loaded ${menuItems.length} items, ${categories.length} categories`);
    } catch (error) {
        console.error('Error loading menu:', error);
        showError('Không thể tải thực đơn: ' + error.message);
    }
}

// Render category tabs
function renderCategoryTabs() {
    const tabsContainer = document.querySelector('.cashier-category-tabs');
    
    let tabsHTML = `
        <button class="cashier-category-btn ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
            <i class="fa-solid fa-border-all"></i> Tất Cả
        </button>
    `;
    
    categories.forEach(cat => {
        const categoryName = (cat.name ?? cat.Name ?? '').toString().trim();
        const icon = getCategoryIcon(categoryName);
        const categoryId = normalizeCategoryValue(cat.categoryId ?? cat.CategoryId);
        tabsHTML += `
            <button class="cashier-category-btn ${currentCategory === categoryId ? 'active' : ''}" data-category="${categoryId}">
                <i class="fa-solid ${icon}"></i> ${categoryName || 'Danh mục'}
            </button>
        `;
    });
    
    tabsContainer.innerHTML = tabsHTML;
    
    // Attach event listeners
    tabsContainer.querySelectorAll('.cashier-category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentCategory = normalizeCategoryValue(btn.dataset.category);
            tabsContainer.querySelectorAll('.cashier-category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenuItems();
        });
    });
}

// Get icon for category
function getCategoryIcon(categoryName) {
    const icons = {
        'Cà phê': 'fa-coffee',
        'Trà': 'fa-mug-hot',
        'Bánh': 'fa-bread-slice',
        'Ăn sáng': 'fa-sun',
        'Tráng miệng': 'fa-ice-cream',
        'Sinh tố': 'fa-blender',
        'Nước ép': 'fa-glass-water'
    };
    return icons[categoryName] || 'fa-utensils';
}

// Render menu items
function renderMenuItems() {
    try {
        const gridContainer = document.querySelector('.cashier-menu-grid');

        const selectedCategory = normalizeCategoryValue(currentCategory);
        let filteredItems = [...menuItems]; // Create a copy to avoid mutation
        if (selectedCategory !== 'all') {
            filteredItems = menuItems.filter(item => normalizeCategoryValue(item.categoryId ?? item.CategoryId) === selectedCategory);
        }
        
        // Filter out invalid items
        filteredItems = filteredItems.filter(item => {
            const itemId = Number(item.itemId ?? item.ItemId ?? 0);
            const itemName = (item.name ?? item.Name ?? '').toString().trim();
            const itemPrice = Number(item.basePrice ?? item.BasePrice ?? 0);
            return itemId > 0 && itemName.length > 0 && itemPrice >= 0;
        });
        
        console.log(`Rendering ${filteredItems.length} items for category:`, selectedCategory);
        
        if (filteredItems.length === 0) {
            gridContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #b6a8a2;">
                    <i class="fa-solid fa-inbox" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>Không có món nào trong danh mục này</p>
                </div>
            `;
            return;
        }
        
        // Clear existing items
        gridContainer.innerHTML = '';
        
        // Create and append items using DOM manipulation to avoid HTML parsing issues
        filteredItems.forEach(item => {
            const itemId = Number(item.itemId ?? item.ItemId ?? 0);
            const itemName = String(item.name ?? item.Name ?? '').trim() || 'Món chưa đặt tên';
            const itemPrice = Number(item.basePrice ?? item.BasePrice ?? 0);
            
            // Create card
            const card = document.createElement('div');
            card.className = 'cashier-item-card';
            card.dataset.itemId = itemId;
            
            // Create image section
            const imgDiv = document.createElement('div');
            imgDiv.className = 'cashier-item-img';
            // Force aspect ratio with !important
            imgDiv.setAttribute('style', 'background-color: #e3e3e3 !important; width: 100% !important; aspect-ratio: 4/3 !important; position: relative !important; background-size: cover !important; background-position: center !important;');
            
            const overlay = document.createElement('div');
            overlay.className = 'cashier-item-overlay';
            overlay.innerHTML = '<i class="fa-solid fa-plus"></i>';
            imgDiv.appendChild(overlay);
            
            // Create body section
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'cashier-item-body';
            
            const nameP = document.createElement('p');
            nameP.className = 'cashier-item-name';
            nameP.textContent = itemName;
            
            const priceSpan = document.createElement('span');
            priceSpan.className = 'cashier-item-price';
            priceSpan.textContent = formatCurrency(itemPrice);
            
            bodyDiv.appendChild(nameP);
            bodyDiv.appendChild(priceSpan);
            
            // Assemble card
            card.appendChild(imgDiv);
            card.appendChild(bodyDiv);
            
            // Add to grid
            gridContainer.appendChild(card);
            
            // Add click event
            card.addEventListener('click', () => {
                addItemToOrder(itemId);
            });
        });
        
        console.log('Rendered items using DOM manipulation');
    } catch (error) {
        console.error('Error rendering menu items:', error);
        showError('Lỗi hiển thị thực đơn: ' + error.message);
    }
}

// Add item to order
function addItemToOrder(itemId) {
    const item = menuItems.find(i => Number(i.itemId ?? i.ItemId) === itemId);
    if (!item) return;

    const normalizedItemId = Number(item.itemId ?? item.ItemId ?? itemId);
    const normalizedName = (item.name ?? item.Name ?? '').toString().trim() || 'Món chưa đặt tên';
    const normalizedPrice = Number(item.basePrice ?? item.BasePrice ?? 0);
    
    const existingItem = currentOrder.items.find(i => Number(i.itemId) === normalizedItemId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        currentOrder.items.push({
            itemId: normalizedItemId,
            name: normalizedName,
            price: normalizedPrice,
            quantity: 1
        });
    }
    
    renderOrderItems();
    updateOrderTotals();
    
    // Animation effect
    const card = document.querySelector(`[data-item-id="${itemId}"]`);
    if (card) {
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.style.transform = '', 150);
    }
}

// Render order items
function renderOrderItems() {
    const container = document.querySelector('.cashier-order-items');
    
    if (currentOrder.items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #b6a8a2;">
                <i class="fa-solid fa-cart-shopping" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>Chưa có món nào</p>
                <p style="font-size: 0.9rem;">Click vào món để thêm vào đơn hàng</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentOrder.items.map((item, index) => `
        <div class="cashier-order-item" data-index="${index}">
            <div class="cashier-order-item-img" style="background-color: #e3e3e3; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-utensils" style="color: #999; font-size: 20px;"></i>
            </div>
            <div class="cashier-order-item-details">
                <p class="cashier-order-item-name">${item.name}</p>
                <span class="cashier-order-item-price">${formatCurrency(item.price)} / cái</span>
            </div>
            <div class="cashier-qty-control">
                <button class="cashier-qty-btn" data-action="decrease" data-index="${index}">
                    <i class="fa-solid fa-minus"></i>
                </button>
                <span class="cashier-qty-value">${item.quantity}</span>
                <button class="cashier-qty-btn" data-action="increase" data-index="${index}">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
            <span class="cashier-order-item-total">${formatCurrency(item.price * item.quantity)}</span>
        </div>
    `).join('');
    
    // Attach quantity control events
    container.querySelectorAll('.cashier-qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.dataset.index);
            const action = btn.dataset.action;
            
            if (action === 'increase') {
                currentOrder.items[index].quantity++;
            } else if (action === 'decrease') {
                if (currentOrder.items[index].quantity > 1) {
                    currentOrder.items[index].quantity--;
                } else {
                    // Remove item
                    if (confirm(`Xóa "${currentOrder.items[index].name}" khỏi đơn hàng?`)) {
                        currentOrder.items.splice(index, 1);
                    }
                }
            }
            
            renderOrderItems();
            updateOrderTotals();
        });
    });
}

// Update order totals
function updateOrderTotals() {
    const subtotal = currentOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.08;
    const discount = 0; // TODO: Implement discount logic
    const total = subtotal + vat - discount;
    
    document.querySelector('.cashier-total-row:nth-child(1) .value').textContent = formatCurrency(subtotal);
    document.querySelector('.cashier-total-row:nth-child(2) .value').textContent = formatCurrency(vat);
    document.querySelector('.cashier-total-row:nth-child(3) .value').textContent = '- ' + formatCurrency(discount);
    document.querySelector('.cashier-grand-total .amount').textContent = formatCurrency(total);
}

// Setup event listeners
function setupEventListeners() {
    // Clear order button
    document.querySelector('.cashier-order-clear-btn').addEventListener('click', () => {
        if (currentOrder.items.length === 0) return;
        
        if (confirm('Xóa tất cả món trong đơn hàng?')) {
            currentOrder.items = [];
            renderOrderItems();
            updateOrderTotals();
            showSuccess('Đã xóa tất cả món');
        }
    });
    
    // Payment method buttons
    document.querySelectorAll('.cashier-payment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cashier-payment-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const methods = ['cash', 'transfer', 'qr'];
            const index = Array.from(btn.parentElement.children).indexOf(btn);
            currentOrder.paymentMethod = methods[index] || 'cash';
        });
    });
    
    // Pay button
    document.querySelector('.cashier-pay-btn').addEventListener('click', processPayment);
    
    // Cancel button
    document.querySelectorAll('.cashier-icon-btn')[0].addEventListener('click', () => {
        if (currentOrder.items.length === 0) return;
        
        if (confirm('Hủy đơn hàng này?')) {
            currentOrder.items = [];
            renderOrderItems();
            updateOrderTotals();
            showSuccess('Đã hủy đơn hàng');
        }
    });
    
    // Print button
    document.querySelectorAll('.cashier-icon-btn')[1].addEventListener('click', () => {
        if (currentOrder.items.length === 0) {
            showError('Chưa có món nào để in');
            return;
        }
        printReceipt();
    });
    
    // Logout button
    document.querySelector('.cashier-topbar-logout').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Đăng xuất?')) {
            fetch(`${API_URL}/Users/logout`, { method: 'POST', credentials: 'include' })
                .finally(() => {
                    localStorage.removeItem('user');
                    window.location.href = 'LoginPage.html';
                });
        }
    });
}

// Update order header
function updateOrderHeader() {
    const orderNumber = Math.floor(Math.random() * 90000) + 10000;
    document.querySelector('.cashier-order-meta').textContent = `Mã #${orderNumber}`;
}

// Process payment
async function processPayment() {
    if (currentOrder.items.length === 0) {
        showError('Chưa có món nào trong đơn hàng');
        return;
    }
    
    try {
        showLoading('Đang xử lý thanh toán...');
        
        // Create order
        const orderData = {
            tableId: currentOrder.tableId || DEFAULT_TABLE_ID,
            items: currentOrder.items.map(item => ({
                itemId: item.itemId,
                quantity: item.quantity
            })),
            paymentMethod: currentOrder.paymentMethod
        };
        
        const result = await apiRequest('/orders/create-and-checkout', 'POST', orderData);
        
        hideLoading();
        showSuccess('Thanh toán thành công!');
        
        // Print receipt
        if (confirm('In hóa đơn?')) {
            printReceipt();
        }
        
        // Reset order
        currentOrder.items = [];
        renderOrderItems();
        updateOrderTotals();
        
    } catch (error) {
        hideLoading();
        showError('Lỗi thanh toán: ' + error.message);
    }
}

// Print receipt
function printReceipt() {
    const subtotal = currentOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.08;
    const total = subtotal + vat;
    
    const receipt = `
=================================
       CAFE 24/7 - HÓA ĐƠN
=================================
Bàn: ${currentOrder.tableId || '?'}
Thời gian: ${new Date().toLocaleString('vi-VN')}
---------------------------------

${currentOrder.items.map(item => `
${item.name}
  ${item.quantity} x ${formatCurrency(item.price)}
  = ${formatCurrency(item.price * item.quantity)}
`).join('\n')}

---------------------------------
Tạm tính:        ${formatCurrency(subtotal)}
VAT (8%):        ${formatCurrency(vat)}
---------------------------------
TỔNG CỘNG:       ${formatCurrency(total)}
=================================
Phương thức: ${getPaymentMethodName(currentOrder.paymentMethod)}
=================================
   CẢM ƠN QUÝ KHÁCH!
=================================
    `;
    
    console.log(receipt);
    
    // Create print window
    const printWindow = window.open('', '', 'width=300,height=500');
    printWindow.document.write('<html><head><title>Hóa Đơn</title></head><body>');
    printWindow.document.write('<pre style="font-family: monospace; font-size: 12px;">' + receipt + '</pre>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// Get payment method name
function getPaymentMethodName(method) {
    const names = {
        'cash': 'Tiền mặt',
        'transfer': 'Chuyển khoản',
        'qr': 'QR Code'
    };
    return names[method] || 'Tiền mặt';
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
    }).format(amount);
}

function showSuccess(message) {
    showToast(message, 'success');
}

function showError(message) {
    showToast(message, 'error');
}

function showToast(message, type = 'info') {
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    const bgColor = type === 'success' ? 'var(--color-success)' : 
                    type === 'error' ? 'var(--color-danger)' : 
                    'var(--color-info)';
    
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    toast.style.background = `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(message = 'Đang xử lý...') {
    const loading = document.createElement('div');
    loading.id = 'loading-overlay';
    loading.innerHTML = `
        <div style="background: rgba(26, 9, 6, 0.95); padding: 30px 40px; border-radius: 12px; text-align: center;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color); margin-bottom: 16px;"></i>
            <p style="color: white; margin: 0;">${message}</p>
        </div>
    `;
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    document.body.appendChild(loading);
}

function hideLoading() {
    const loading = document.getElementById('loading-overlay');
    if (loading) loading.remove();
}
