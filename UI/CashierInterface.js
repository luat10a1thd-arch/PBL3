// API Configuration
const API_URL =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";

// Global State
let currentOrder = {
  tableId: null,
  orderId: null,
  items: [],
  paymentMethod: "cash",
  voucherCode: "",
  voucherDiscount: 0,
};

let menuItems = [];
let categories = [];
let currentCategory = "all";

function formatLocalDateTime(dateValue = new Date()) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function normalizeCategoryValue(value) {
  if (value === null || value === undefined) return "all";
  const raw = String(value).trim();
  if (raw === "" || raw.toLowerCase() === "all") return "all";
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? "all" : parsed;
}

function normalizeImageUrl(value) {
  const url = String(value ?? "").trim();
  return url || "";
}

function getCategoryImage(categoryId) {
  const category = categories.find(
    (c) => Number(c.categoryId ?? c.CategoryId) === Number(categoryId),
  );
  return normalizeImageUrl(category?.imageUrl ?? category?.ImageUrl);
}

function resolveItemImage(item) {
  const itemImage = normalizeImageUrl(item?.imageUrl ?? item?.ImageUrl);
  if (itemImage) return itemImage;

  const nestedCategoryImage = normalizeImageUrl(
    item?.category?.imageUrl ??
      item?.category?.ImageUrl ??
      item?.Category?.imageUrl ??
      item?.Category?.ImageUrl,
  );
  if (nestedCategoryImage) return nestedCategoryImage;

  return getCategoryImage(item?.categoryId ?? item?.CategoryId);
}

// Check authentication
function checkAuth() {
  return !!window.ensureAuthByRole(["Staff", "Manager"]);
}

// Update user info
function updateUserInfo() {
  const user = window.getCurrentUser();
  if (user.firstName && user.lastName) {
    document.querySelector(".cashier-topbar-user-name").textContent =
      `${user.firstName} ${user.lastName}`;
    const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    document.querySelector(".cashier-topbar-avatar").textContent = initials;

    const role =
      window.normalizeRole(user.role) === "Staff" ? "Nhân Viên" : "Quản lí";
    document.querySelector(".cashier-topbar-user-role").textContent = role;
  }
}

function showConfirmDialog(message) {
  if (typeof window.showConfirmModal !== "function") {
    window.showWarningToast?.("Không thể mở hộp thoại xác nhận");
    return Promise.resolve(false);
  }
  return window.showConfirmModal(message);
}

// API request helper
async function apiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (response.status === 401) {
      window.showWarningToast?.(
        "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
      );
      sessionStorage.removeItem("user");
      window.location.href = "/app/login";
      return null;
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Có lỗi xảy ra" }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Cashier Interface Loading...");

  if (!checkAuth()) return;

  updateUserInfo();
  await loadMenuData();
  setupEventListeners();
  initRealtimeShiftStatus();
  renderOrderItems();
  updateOrderTotals();
  updateOrderHeader();

  console.log("Cashier Interface Ready");
});

// Load menu data from API
async function loadMenuData() {
  try {
    const [categoriesData, itemsData] = await Promise.all([
      apiRequest("/categories"),
      apiRequest("/items"),
    ]);

    categories = categoriesData || [];
    menuItems = itemsData || [];

    renderCategoryTabs();
    renderMenuItems();

    console.log(
      `Loaded ${menuItems.length} items, ${categories.length} categories`,
    );
  } catch (error) {
    console.error("Error loading menu:", error);
    showError("Không thể tải thực đơn: " + error.message);
  }
}

function normalizeVoucherRecord(voucher) {
  return {
    voucherId: Number(voucher?.voucherId ?? voucher?.VoucherId ?? 0),
    code: String(voucher?.code ?? voucher?.Code ?? "")
      .trim()
      .toUpperCase(),
    discountAmount: Number(
      voucher?.discountAmount ?? voucher?.DiscountAmount ?? 0,
    ),
    expiryDate: voucher?.expiryDate ?? voucher?.ExpiryDate,
    applicableCategoryId: Number(
      voucher?.applicableCategoryId ?? voucher?.ApplicableCategoryId ?? 0,
    ),
  };
}

function orderMatchesVoucherCategory(voucher) {
  const applicableCategoryId = Number(voucher?.applicableCategoryId || 0);
  if (!Number.isFinite(applicableCategoryId) || applicableCategoryId <= 0)
    return true;
  if (!Array.isArray(currentOrder.items) || currentOrder.items.length === 0)
    return false;

  return currentOrder.items.some((orderItem) => {
    const menuItem = menuItems.find(
      (i) => Number(i.itemId ?? i.ItemId) === Number(orderItem.itemId),
    );
    const menuCategoryId = Number(
      menuItem?.categoryId ?? menuItem?.CategoryId ?? 0,
    );
    return menuCategoryId === applicableCategoryId;
  });
}

async function applyVoucherCode() {
  const input = document.getElementById("cashierVoucherInput");
  const code = String(input?.value || "")
    .trim()
    .toUpperCase();
  if (!code) {
    window.showWarningToast?.("Vui lòng nhập mã giảm giá");
    return;
  }

  const vouchers = await apiRequest("/vouchers");
  if (!Array.isArray(vouchers)) {
    window.showErrorToast?.("Không thể tải danh sách mã giảm giá");
    return;
  }

  const normalizedVouchers = vouchers.map(normalizeVoucherRecord);
  const matched = normalizedVouchers.find((v) => v.code === code);
  if (!matched) {
    currentOrder.voucherCode = "";
    currentOrder.voucherDiscount = 0;
    updateOrderTotals();
    window.showErrorToast?.("Mã giảm giá không tồn tại");
    return;
  }

  const expiry = new Date(matched.expiryDate);
  if (Number.isNaN(expiry.getTime()) || expiry < new Date()) {
    currentOrder.voucherCode = "";
    currentOrder.voucherDiscount = 0;
    updateOrderTotals();
    window.showWarningToast?.("Mã giảm giá đã hết hạn");
    return;
  }

  if (!orderMatchesVoucherCategory(matched)) {
    currentOrder.voucherCode = "";
    currentOrder.voucherDiscount = 0;
    updateOrderTotals();
    window.showWarningToast?.(
      "Mã giảm giá không áp dụng cho danh mục món trong đơn hiện tại",
    );
    return;
  }

  currentOrder.voucherCode = matched.code;
  currentOrder.voucherDiscount = Math.max(0, matched.discountAmount);
  updateOrderTotals();
  window.showSuccessToast?.(`Đã áp mã ${matched.code}`);
}

// Render category tabs
function renderCategoryTabs() {
  const tabsContainer = document.querySelector(".cashier-category-tabs");

  let tabsHTML = `
        <button class="cashier-category-btn ${currentCategory === "all" ? "active" : ""}" data-category="all">
            <i class="fa-solid fa-border-all"></i> Tất Cả
        </button>
    `;

  categories.forEach((cat) => {
    const categoryName = (cat.name ?? cat.Name ?? "").toString().trim();
    const icon = getCategoryIcon(categoryName);
    const categoryId = normalizeCategoryValue(cat.categoryId ?? cat.CategoryId);
    tabsHTML += `
            <button class="cashier-category-btn ${currentCategory === categoryId ? "active" : ""}" data-category="${categoryId}">
                <i class="fa-solid ${icon}"></i> ${categoryName || "Danh mục"}
            </button>
        `;
  });

  tabsContainer.innerHTML = tabsHTML;

  // Attach event listeners
  tabsContainer.querySelectorAll(".cashier-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentCategory = normalizeCategoryValue(btn.dataset.category);
      tabsContainer
        .querySelectorAll(".cashier-category-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderMenuItems();
    });
  });
}

// Get icon for category
function getCategoryIcon(categoryName) {
  const icons = {
    "Cà phê": "fa-coffee",
    Trà: "fa-mug-hot",
    Bánh: "fa-bread-slice",
    "Ăn sáng": "fa-sun",
    "Tráng miệng": "fa-ice-cream",
    "Sinh tố": "fa-blender",
    "Nước ép": "fa-glass-water",
  };
  return icons[categoryName] || "fa-utensils";
}

// Render menu items
function renderMenuItems() {
  try {
    const gridContainer = document.querySelector(".cashier-menu-grid");

    const selectedCategory = normalizeCategoryValue(currentCategory);
    let filteredItems = [...menuItems]; // Create a copy to avoid mutation
    if (selectedCategory !== "all") {
      filteredItems = menuItems.filter(
        (item) =>
          normalizeCategoryValue(item.categoryId ?? item.CategoryId) ===
          selectedCategory,
      );
    }

    // Filter out invalid items
    filteredItems = filteredItems.filter((item) => {
      const itemId = Number(item.itemId ?? item.ItemId ?? 0);
      const itemName = (item.name ?? item.Name ?? "").toString().trim();
      const itemPrice = Number(item.basePrice ?? item.BasePrice ?? 0);
      return itemId > 0 && itemName.length > 0 && itemPrice >= 0;
    });

    console.log(
      `Rendering ${filteredItems.length} items for category:`,
      selectedCategory,
    );

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
    gridContainer.innerHTML = "";

    // Create and append items using DOM manipulation to avoid HTML parsing issues
    filteredItems.forEach((item) => {
      const itemId = Number(item.itemId ?? item.ItemId ?? 0);
      const itemName =
        String(item.name ?? item.Name ?? "").trim() || "Món chưa đặt tên";
      const itemPrice = Number(item.basePrice ?? item.BasePrice ?? 0);
      const itemImage = resolveItemImage(item);

      // Create card
      const card = document.createElement("div");
      card.className = "cashier-item-card";
      card.dataset.itemId = itemId;

      // Create image section
      const imgDiv = document.createElement("div");
      imgDiv.className = "cashier-item-img";
      imgDiv.style.width = "100%";
      imgDiv.style.aspectRatio = "4/3";
      imgDiv.style.position = "relative";
      imgDiv.style.backgroundSize = "cover";
      imgDiv.style.backgroundPosition = "center";
      if (itemImage) {
        imgDiv.style.backgroundImage = `url("${itemImage}")`;
      } else {
        imgDiv.style.backgroundColor = "#e3e3e3";
      }
      if (!itemImage) {
        imgDiv.innerHTML =
          '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#999;"><i class="fa-solid fa-utensils" style="font-size:24px;"></i></div>';
      }

      const overlay = document.createElement("div");
      overlay.className = "cashier-item-overlay";
      overlay.innerHTML = '<i class="fa-solid fa-plus"></i>';
      imgDiv.appendChild(overlay);

      // Create body section
      const bodyDiv = document.createElement("div");
      bodyDiv.className = "cashier-item-body";

      const nameP = document.createElement("p");
      nameP.className = "cashier-item-name";
      nameP.textContent = itemName;

      const priceSpan = document.createElement("span");
      priceSpan.className = "cashier-item-price";
      priceSpan.textContent = formatCurrency(itemPrice);

      bodyDiv.appendChild(nameP);
      bodyDiv.appendChild(priceSpan);

      // Assemble card
      card.appendChild(imgDiv);
      card.appendChild(bodyDiv);

      // Add to grid
      gridContainer.appendChild(card);

      // Add click event
      card.addEventListener("click", () => {
        addItemToOrder(itemId);
      });
    });

    console.log("Rendered items using DOM manipulation");
  } catch (error) {
    console.error("Error rendering menu items:", error);
    showError("Lỗi hiển thị thực đơn: " + error.message);
  }
}

// Add item to order
function addItemToOrder(itemId) {
  const item = menuItems.find((i) => Number(i.itemId ?? i.ItemId) === itemId);
  if (!item) return;

  const normalizedItemId = Number(item.itemId ?? item.ItemId ?? itemId);
  const normalizedName =
    (item.name ?? item.Name ?? "").toString().trim() || "Món chưa đặt tên";
  const normalizedPrice = Number(item.basePrice ?? item.BasePrice ?? 0);

  const existingItem = currentOrder.items.find(
    (i) => Number(i.itemId) === normalizedItemId,
  );

  if (existingItem) {
    existingItem.quantity++;
  } else {
    currentOrder.items.push({
      itemId: normalizedItemId,
      name: normalizedName,
      price: normalizedPrice,
      quantity: 1,
    });
  }

  renderOrderItems();
  updateOrderTotals();

  // Animation effect
  const card = document.querySelector(`[data-item-id="${itemId}"]`);
  if (card) {
    card.style.transform = "scale(0.95)";
    setTimeout(() => (card.style.transform = ""), 150);
  }
}

// Render order items
function renderOrderItems() {
  const container = document.querySelector(".cashier-order-items");

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

  container.innerHTML = currentOrder.items
    .map(
      (item, index) => `
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
    `,
    )
    .join("");

  // Attach quantity control events
  container.querySelectorAll(".cashier-qty-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const action = btn.dataset.action;

      if (action === "increase") {
        currentOrder.items[index].quantity++;
      } else if (action === "decrease") {
        if (currentOrder.items[index].quantity > 1) {
          currentOrder.items[index].quantity--;
        } else {
          showConfirmDialog(
            `Xóa "${currentOrder.items[index].name}" khỏi đơn hàng?`,
          ).then((ok) => {
            if (!ok) return;
            currentOrder.items.splice(index, 1);
            renderOrderItems();
            updateOrderTotals();
          });
          return;
        }
      }

      renderOrderItems();
      updateOrderTotals();
    });
  });
}

// Update order totals
function updateOrderTotals() {
  const subtotal = currentOrder.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const vat = subtotal * 0.08;
  const discount = Math.min(currentOrder.voucherDiscount || 0, subtotal + vat);
  const total = subtotal + vat - discount;

  const subtotalNode =
    document.getElementById("cashierSubtotalValue") ||
    document.querySelector(".cashier-total-row:nth-child(1) .value");
  const vatNode =
    document.getElementById("cashierVatValue") ||
    document.querySelector(".cashier-total-row:nth-child(2) .value");
  const discountNode =
    document.getElementById("cashierDiscountValue") ||
    document.querySelector(".cashier-total-row:nth-child(3) .value");
  const grandTotalNode =
    document.getElementById("cashierGrandTotalValue") ||
    document.querySelector(".cashier-grand-total .amount");
  if (subtotalNode) subtotalNode.textContent = formatCurrency(subtotal);
  if (vatNode) vatNode.textContent = formatCurrency(vat);
  if (discountNode) discountNode.textContent = "- " + formatCurrency(discount);
  if (grandTotalNode) grandTotalNode.textContent = formatCurrency(total);

  const voucherNote = document.querySelector(".cashier-voucher-note");
  if (voucherNote) {
    voucherNote.textContent = currentOrder.voucherCode
      ? `Đang áp mã: ${currentOrder.voucherCode}`
      : "Chưa áp mã giảm giá";
  }
}

// Setup event listeners
function setupEventListeners() {
  // Clear order button
  document
    .querySelector(".cashier-order-clear-btn")
    .addEventListener("click", () => {
      if (currentOrder.items.length === 0) return;

      showConfirmDialog("Xóa tất cả món trong đơn hàng?").then((ok) => {
        if (!ok) return;
        currentOrder.items = [];
        currentOrder.voucherCode = "";
        currentOrder.voucherDiscount = 0;
        renderOrderItems();
        updateOrderTotals();
        showSuccess("Đã xóa tất cả món");
      });
    });

  // Payment method buttons
  document.querySelectorAll(".cashier-payment-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".cashier-payment-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const methods = ["cash", "transfer", "qr"];
      const index = Array.from(btn.parentElement.children).indexOf(btn);
      currentOrder.paymentMethod = methods[index] || "cash";
    });
  });

  // Pay button
  document
    .querySelector(".cashier-pay-btn")
    .addEventListener("click", processPayment);

  const voucherApplyBtn = document.getElementById("cashierApplyVoucherBtn");
  if (voucherApplyBtn) {
    voucherApplyBtn.addEventListener("click", async () => {
      try {
        await applyVoucherCode();
      } catch (error) {
        window.showErrorToast?.(error.message || "Không thể áp mã giảm giá");
      }
    });
  }

  // Cancel button
  document
    .querySelectorAll(".cashier-icon-btn")[0]
    .addEventListener("click", () => {
      if (currentOrder.items.length === 0) return;

      showConfirmDialog("Hủy đơn hàng này?").then((ok) => {
        if (!ok) return;
        currentOrder.items = [];
        currentOrder.voucherCode = "";
        currentOrder.voucherDiscount = 0;
        renderOrderItems();
        updateOrderTotals();
        showSuccess("Đã hủy đơn hàng");
      });
    });

  // Print button
  document
    .querySelectorAll(".cashier-icon-btn")[1]
    .addEventListener("click", () => {
      if (currentOrder.items.length === 0) {
        showError("Chưa có món nào để in");
        return;
      }
      printReceipt();
    });

  // Logout button
  document
    .querySelector(".cashier-topbar-logout")
    .addEventListener("click", (e) => {
      e.preventDefault();

      showConfirmDialog("Đăng xuất?").then((ok) => {
        if (!ok) return;
        fetch(`${API_URL}/Users/logout`, {
          method: "POST",
          credentials: "include",
        }).finally(() => {
          sessionStorage.removeItem("user");
          window.location.href = "/app/login";
        });
      });
    });
}

// Update order header
function updateOrderHeader() {
  const orderNumber = Math.floor(Math.random() * 90000) + 10000;
  document.querySelector(".cashier-order-meta").textContent =
    `Mã #${orderNumber} • Tại quầy`;
}

// Process payment
async function processPayment() {
  if (currentOrder.items.length === 0) {
    showError("Chưa có món nào trong đơn hàng");
    return;
  }

  try {
    showLoading("Đang xử lý thanh toán...");

    // Create order
    const orderData = {
      tableId: 0,
      items: currentOrder.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
      })),
      paymentMethod: currentOrder.paymentMethod,
      discountAmount: Math.max(0, currentOrder.voucherDiscount || 0),
    };

    const result = await apiRequest(
      "/orders/create-and-checkout",
      "POST",
      orderData,
    );
    const receiptOrder = {
      ...currentOrder,
      items: currentOrder.items.map((item) => ({ ...item })),
    };

    hideLoading();
    showSuccess("Thanh toán thành công!");

    // Print receipt
    showConfirmDialog("In hóa đơn?").then((ok) => {
      if (ok) printReceipt(receiptOrder);
    });

    // Reset order
    currentOrder.items = [];
    currentOrder.voucherCode = "";
    currentOrder.voucherDiscount = 0;
    renderOrderItems();
    updateOrderTotals();
  } catch (error) {
    hideLoading();
    showError("Lỗi thanh toán: " + error.message);
  }
}

// Print receipt
function printReceipt(order = currentOrder) {
  if (!order?.items?.length) {
    showError("Chưa có món nào để in");
    return;
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const vat = subtotal * 0.08;
  const discount = Math.min(order.voucherDiscount || 0, subtotal + vat);
  const total = subtotal + vat - discount;

  const receiptHTML = `
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 14px; margin: 0; padding: 15px; color: #000; }
      .header { text-align: center; margin-bottom: 15px; }
      .header h2 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
      .header p { margin: 5px 0; font-size: 12px; color: #555; }
      .divider { border-top: 1px dashed #000; margin: 15px 0; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      th, td { text-align: left; padding: 8px 0; font-size: 13px; border-bottom: 1px solid #eee; }
      th.right, td.right { text-align: right; }
      th.center, td.center { text-align: center; }
      th { font-weight: bold; border-bottom: 1px dashed #000; }
      .totals { width: 100%; margin-top: 10px; }
      .totals td { padding: 6px 0; border: none; font-size: 13px; }
      .totals .grand-total td { font-weight: bold; font-size: 16px; border-top: 1px dashed #000; padding-top: 10px; }
      .footer { text-align: center; margin-top: 25px; font-size: 14px; font-weight: bold; }
    </style>
    <div class="header">
      <h2>CAFE 24/7 - HÓA ĐƠN</h2>
      <p>Phục vụ: Tại quầy</p>
      <p>Thời gian: ${formatLocalDateTime(new Date())}</p>
    </div>
    <div class="divider"></div>
    <table>
      <thead>
        <tr>
          <th>Món</th>
          <th class="center">SL</th>
          <th class="right">Đơn giá</th>
          <th class="right">T.Tiền</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map(item => `
          <tr>
            <td>${item.name}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${Number(item.price || 0).toLocaleString("vi-VN")}</td>
            <td class="right">${Number((item.price || 0) * (item.quantity || 0)).toLocaleString("vi-VN")}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="divider"></div>
    <table class="totals">
      <tr>
        <td>Tạm tính:</td>
        <td class="right">${formatCurrency(subtotal)}</td>
      </tr>
      <tr>
        <td>VAT (8%):</td>
        <td class="right">${formatCurrency(vat)}</td>
      </tr>
      <tr>
        <td>Giảm giá:</td>
        <td class="right">-${formatCurrency(discount)}</td>
      </tr>
      <tr class="grand-total">
        <td>TỔNG CỘNG:</td>
        <td class="right">${formatCurrency(total)}</td>
      </tr>
    </table>
    <div class="divider"></div>
    <p style="font-size: 13px; margin: 5px 0;">Phương thức: <b>${getPaymentMethodName(order.paymentMethod)}</b></p>
    <div class="footer">
      CẢM ƠN QUÝ KHÁCH!
    </div>
  `;

  // Create print window
  const printWindow = window.open("", "", "width=400,height=600");
  if (!printWindow) {
    showError(
      "Không mở được cửa sổ in. Vui lòng cho phép popup trên trình duyệt.",
    );
    return;
  }

  const printAndClose = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  printWindow.document.write("<html><head><title>Hóa Đơn</title></head><body>");
  printWindow.document.write(receiptHTML);
  printWindow.document.write("</body></html>");
  printWindow.document.close();
  setTimeout(printAndClose, 250);
}

// Get payment method name
function getPaymentMethodName(method) {
  const names = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    qr: "QR Code",
  };
  return names[method] || "Tiền mặt";
}

// Utility functions
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function showSuccess(message) {
  if (window.showSuccessToast) return window.showSuccessToast(message);
  if (window.showToast) return window.showToast(message, "success");
  showLocalToast(message, "success");
}

function showError(message) {
  if (window.showErrorToast) return window.showErrorToast(message);
  if (window.showToast) return window.showToast(message, "error");
  showLocalToast(message, "error");
}

function showLocalToast(message, type = "info") {
  const icon =
    type === "success"
      ? "fa-check-circle"
      : type === "error"
        ? "fa-exclamation-circle"
        : "fa-info-circle";

  const bgColor =
    type === "success"
      ? "var(--color-success)"
      : type === "error"
        ? "var(--color-danger)"
        : "var(--color-info)";

  const toast = document.createElement("div");
  toast.className = "custom-toast";
  toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
  toast.style.background = `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showLoading(message = "Đang xử lý...") {
  const loading = document.createElement("div");
  loading.id = "loading-overlay";
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
  const loading = document.getElementById("loading-overlay");
  if (loading) loading.remove();
}

async function refreshShiftStatusText() {
  const shiftTextNode = document.getElementById("cashierShiftStatus");
  if (!shiftTextNode) return;

  try {
    const current = await apiRequest("/shifts/current");
    if (current) {
      shiftTextNode.textContent = `Ca đang mở #${current.shiftId}`;
      return;
    }
  } catch (error) {
    if (!String(error?.message || "").includes("404")) {
      shiftTextNode.textContent = "Không thể tải trạng thái ca";
      return;
    }
  }
  shiftTextNode.textContent = "Chưa mở ca";
}

async function initRealtimeShiftStatus() {
  await refreshShiftStatusText();

  if (!window.signalR) return;
  const hubUrl = `${API_URL}/hubs/shifts`;
  const connection = new window.signalR.HubConnectionBuilder()
    .withUrl(hubUrl, { withCredentials: true })
    .withAutomaticReconnect()
    .build();

  connection.on("ShiftUpdated", async () => {
    await refreshShiftStatusText();
  });

  try {
    await connection.start();
  } catch {
    // no-op: realtime is optional, manual shift remains available.
  }
}

