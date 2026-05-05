// API Configuration
const API_URL =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";

// Check authentication
function checkAuth() {
  return !!window.ensureAuthByRole(["Manager"]);
}

// Update user info in sidebar
function updateUserInfo() {
  const user = window.getCurrentUser();
  if (user.firstName && user.lastName) {
    document.querySelector(".dash-user-name").textContent =
      `${user.firstName} ${user.lastName}`;
    document.querySelector(".dash-user-role").textContent = getRoleDisplay(
      window.normalizeRole(user.role),
    );
    const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    document.querySelector(".dash-user-avatar").textContent = initials;
  }
}

function getRoleDisplay(role) {
  const roles = {
    Admin: "Admin",
    Manager: "Quản lí",
    Staff: "Nhân Viên",
    Warehouse_manager: "Quản Kho",
  };
  return roles[role] || role;
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

function escapeHtmlAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeImageUrl(value) {
  const url = String(value ?? "").trim();
  return url || "";
}

function getCategoryById(categoryId) {
  return categories.find(
    (c) => Number(c.categoryId ?? c.CategoryId) === Number(categoryId),
  );
}

function resolveCategoryImage(category) {
  return normalizeImageUrl(category?.imageUrl ?? category?.ImageUrl);
}

function resolveItemImage(item) {
  const itemImage = normalizeImageUrl(item?.imageUrl ?? item?.ImageUrl);
  if (itemImage) return itemImage;

  const nestedCategoryImage = resolveCategoryImage(
    item?.category ?? item?.Category,
  );
  if (nestedCategoryImage) return nestedCategoryImage;

  const category = getCategoryById(item?.categoryId ?? item?.CategoryId);
  return resolveCategoryImage(category);
}

function renderProductImage(imageUrl, iconClass) {
  if (imageUrl) {
    return `<div class="dash-product-img" style="background-image: url('${escapeHtmlAttribute(imageUrl)}'); background-size: cover; background-position: center;"></div>`;
  }
  return `
        <div class="dash-product-img" style="background-color: #e3e3e3;">
            <i class="fa-solid ${iconClass}" style="color: #999; font-size: 24px;"></i>
        </div>
    `;
}

async function uploadImageFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload/image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    sessionStorage.removeItem("user");
    window.location.href = "/app/login";
    return null;
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Tải ảnh thất bại" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const result = await response.json();
  return normalizeImageUrl(result?.imageUrl);
}

function renderImageUploadPreview(
  containerId,
  imageUrl,
  iconClass = "fa-image",
) {
  const preview = document.getElementById(containerId);
  if (!preview) return;

  const normalizedUrl = normalizeImageUrl(imageUrl);
  if (normalizedUrl) {
    preview.innerHTML = `<img src="${escapeHtmlAttribute(normalizedUrl)}" alt="preview" class="form-image-preview" />`;
    return;
  }

  preview.innerHTML = `
        <div class="form-image-placeholder">
            <i class="fa-solid ${iconClass}"></i>
            <span>Chưa có ảnh</span>
        </div>
    `;
}

function setupImageUploadInput({
  inputId,
  hiddenInputSelector,
  previewId,
  iconClass = "fa-image",
  fallbackResolver = null,
}) {
  const fileInput = document.getElementById(inputId);
  const hiddenInput = document.querySelector(hiddenInputSelector);
  if (!fileInput || !hiddenInput) return;

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Find the closest form submit button to disable it during upload
    const form = hiddenInput.closest("form");
    const submitBtn = form ? form.querySelector("button[type='submit']") : null;
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : "";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải ảnh...';
      submitBtn.style.opacity = "0.7";
      submitBtn.style.cursor = "not-allowed";
    }

    try {
      // Optional visual feedback on the preview box
      const previewBox = document.getElementById(previewId);
      if (previewBox) {
        previewBox.style.opacity = "0.5";
      }

      const uploadedUrl = await uploadImageFile(file);
      if (!uploadedUrl) return;
      hiddenInput.value = uploadedUrl;
      renderImageUploadPreview(previewId, uploadedUrl, iconClass);
      showSuccess("Tải ảnh lên thành công");
    } catch (error) {
      showError(error.message || "Không thể tải ảnh lên");
      if (typeof fallbackResolver === "function") {
        renderImageUploadPreview(previewId, fallbackResolver(), iconClass);
      }
    } finally {
      fileInput.value = "";
      
      const previewBox = document.getElementById(previewId);
      if (previewBox) {
        previewBox.style.opacity = "1";
      }

      // Re-enable the submit button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
    }
  });
}

// Global state
let categories = [];
let items = [];
let toppings = [];
let currentView = "items"; // 'items', 'categories', 'toppings'
let currentFilter = "all";
let selectedIds = [];

function normalizeCategoryRecord(category) {
  return {
    categoryId: Number(category?.categoryId ?? category?.CategoryId ?? 0),
    name: String(category?.name ?? category?.Name ?? "").trim(),
    description: String(
      category?.description ?? category?.Description ?? "",
    ).trim(),
    imageUrl: normalizeImageUrl(category?.imageUrl ?? category?.ImageUrl),
  };
}

function normalizeItemRecord(item) {
  const normalizedCategory = item?.category ?? item?.Category;
  return {
    itemId: Number(item?.itemId ?? item?.ItemId ?? 0),
    categoryId: Number(
      item?.categoryId ??
        item?.CategoryId ??
        normalizedCategory?.categoryId ??
        normalizedCategory?.CategoryId ??
        0,
    ),
    name: String(item?.name ?? item?.Name ?? "").trim(),
    basePrice: Number(item?.basePrice ?? item?.BasePrice ?? 0),
    imageUrl: normalizeImageUrl(item?.imageUrl ?? item?.ImageUrl),
    category: normalizedCategory
      ? normalizeCategoryRecord(normalizedCategory)
      : null,
  };
}

function normalizeToppingRecord(topping) {
  return {
    toppingId: Number(topping?.toppingId ?? topping?.ToppingId ?? 0),
    name: String(topping?.name ?? topping?.Name ?? "").trim(),
    price: Number(topping?.price ?? topping?.Price ?? 0),
  };
}

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM Content Loaded");
  console.log("Checking authentication...");

  if (!checkAuth()) {
    console.log("Not authenticated, redirecting to login");
    return;
  }

  console.log("Authenticated, initializing page");
  updateUserInfo();

  console.log("Loading data from API...");
  await loadAllData();

  console.log("Setting up event listeners...");
  setupEventListeners();

  console.log("Rendering initial view...");
  renderView();

  console.log("Page initialization complete");
});

// Load all data from API
async function loadAllData() {
  try {
    showLoading();

    const [categoriesData, itemsData, toppingsData] = await Promise.all([
      apiRequest("/categories"),
      apiRequest("/items"),
      apiRequest("/toppings"),
    ]);

    categories = (categoriesData || [])
      .map(normalizeCategoryRecord)
      .filter((c) => c.categoryId >= 0);
    items = (itemsData || [])
      .map(normalizeItemRecord)
      .filter((i) => i.itemId > 0);
    toppings = (toppingsData || [])
      .map(normalizeToppingRecord)
      .filter((t) => t.toppingId > 0);

    updateKPIs();
    populateCategoryFilter();
    hideLoading();
  } catch (error) {
    hideLoading();
    showError("Không thể tải dữ liệu: " + (error.message || "Có lỗi xảy ra"));
  }
}

// Update KPI cards
function updateKPIs() {
  const kpiValues = document.querySelectorAll(".dash-kpi-value");
  if (kpiValues.length >= 4) {
    kpiValues[0].textContent = items.length;
    kpiValues[1].textContent = categories.length;
    kpiValues[2].textContent = "0"; // Out of stock - would need stock tracking
    kpiValues[3].textContent = "0"; // Low stock - would need stock tracking
  }
}

// Populate category filter dropdown
function populateCategoryFilter() {
  const select = document.querySelector(".dash-select-box");
  select.innerHTML = '<option value="all">Tất cả danh mục</option>';

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.categoryId;
    option.textContent = cat.name;
    select.appendChild(option);
  });
}

// Setup event listeners
function setupEventListeners() {
  console.log("Setting up event listeners...");

  // Add new item button
  const addButton = document.querySelector(".dash-btn-primary");
  if (addButton) {
    console.log("Add button found, attaching click event");
    addButton.addEventListener("click", () => {
      console.log("Add button clicked, current view:", currentView);
      if (currentView === "items") {
        showItemModal();
      } else if (currentView === "categories") {
        showCategoryModal();
      } else if (currentView === "toppings") {
        showToppingModal();
      }
    });
  } else {
    console.error("Add button (.dash-btn-primary) not found!");
  }

  // Category filter
  const filterSelect = document.querySelector(".dash-select-box");
  if (filterSelect) {
    console.log("Filter select found");
    filterSelect.addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderView();
    });
  } else {
    console.error("Filter select (.dash-select-box) not found!");
  }

  // Search
  const searchInput = document.querySelector(".dash-search-input");
  if (searchInput) {
    console.log("Search input found");
    searchInput.addEventListener(
      "input",
      debounce((e) => {
        renderView(e.target.value);
      }, 300),
    );
  } else {
    console.error("Search input (.dash-search-input) not found!");
  }

  // View switcher (add tabs for switching views)
  addViewTabs();

  // Table checkbox listener
  const tableBody = document.querySelector(".dash-table tbody");
  if (tableBody) {
    tableBody.addEventListener("change", (e) => {
      if (e.target.classList.contains("row-checkbox")) {
        const id = Number(e.target.value);
        if (e.target.checked) {
          if (!selectedIds.includes(id)) selectedIds.push(id);
        } else {
          selectedIds = selectedIds.filter((x) => x !== id);
        }
        updateBulkDeleteButton();
      }
    });
  }

  // Bulk Delete Button
  const bulkDeleteBtn = document.getElementById("btnBulkDelete");
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener("click", async () => {
      if (selectedIds.length === 0) return;
      if (typeof window.showConfirmModal !== "function") {
        window.showWarningToast?.("Không thể mở popup xác nhận");
        return;
      }
      const confirmed = await window.showConfirmModal(
        `Bạn có chắc muốn xóa ${selectedIds.length} mục đã chọn?`,
      );
      if (!confirmed) return;

      showLoading();
      try {
        for (const id of selectedIds) {
          if (currentView === "items") {
            await apiRequest(`/items/${id}`, "DELETE");
          } else if (currentView === "categories") {
            await apiRequest(`/categories/${id}`, "DELETE");
          } else if (currentView === "toppings") {
            await apiRequest(`/toppings/${id}`, "DELETE");
          }
        }
        showSuccess(`Đã xóa ${selectedIds.length} mục thành công`);
      } catch (err) {
        showError("Lưu ý: Có lỗi khi xóa một số mục. " + err.message);
      } finally {
        selectedIds = [];
        updateBulkDeleteButton();
        await loadAllData();
        renderView();
        hideLoading();
      }
    });
  }

  console.log("Event listeners setup complete");
}

function updateBulkDeleteButton() {
  const btn = document.getElementById("btnBulkDelete");
  if (btn) {
    btn.style.display = selectedIds.length > 0 ? "inline-block" : "none";
    btn.innerHTML = `<i class="fa-solid fa-trash"></i> Xóa Đã Chọn (${selectedIds.length})`;
  }
}

// Update button text based on view
function updateAddButtonText() {
  const addButton = document.querySelector(".dash-btn-primary");
  if (!addButton) return;

  const buttonTexts = {
    items: '<i class="fa-solid fa-plus"></i> Thêm Món Mới',
    categories: '<i class="fa-solid fa-plus"></i> Thêm Danh Mục',
    toppings: '<i class="fa-solid fa-plus"></i> Thêm Topping',
  };

  addButton.innerHTML = buttonTexts[currentView] || buttonTexts["items"];
}

// Add view tabs
function addViewTabs() {
  console.log("Attaching tab event listeners...");

  const tabButtons = document.querySelectorAll(".tab-btn");
  console.log(`Found ${tabButtons.length} tab buttons`);

  if (tabButtons.length === 0) {
    console.error("No tab buttons found!");
    return;
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      console.log("Tab clicked:", btn.dataset.view);
      currentView = btn.dataset.view;
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = "all";
      selectedIds = [];
      updateBulkDeleteButton();
      const filterSelect = document.querySelector(".dash-select-box");
      if (filterSelect) filterSelect.value = "all";
      updateAddButtonText();
      renderView();
    });
  });

  console.log("Tab event listeners attached");
}

// Render current view
function renderView(searchTerm = "") {
  // Update table title
  updateTableTitle();

  if (currentView === "items") {
    renderItemsTable(searchTerm);
  } else if (currentView === "categories") {
    renderCategoriesTable(searchTerm);
  } else if (currentView === "toppings") {
    renderToppingsTable(searchTerm);
  }
}

// Update table title based on view
function updateTableTitle() {
  const titleElement = document.querySelector(".dash-table-title");
  if (!titleElement) return;

  const titles = {
    items: '<i class="fa-solid fa-utensils"></i> Danh Sách Món',
    categories: '<i class="fa-solid fa-list"></i> Danh Mục',
    toppings: '<i class="fa-solid fa-cheese"></i> Topping',
  };

  titleElement.innerHTML = titles[currentView] || titles["items"];
}

// Render items table
function renderItemsTable(searchTerm = "") {
  let filteredItems = items;

  // Filter by category
  if (currentFilter !== "all") {
    filteredItems = filteredItems.filter(
      (item) => Number(item.categoryId) === Number(currentFilter),
    );
  }

  // Filter by search term
  if (searchTerm) {
    filteredItems = filteredItems.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }

  const tbody = document.querySelector(".dash-table tbody");
  tbody.innerHTML = filteredItems
    .map(
      (item) => `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-checkbox" value="${item.itemId}" ${selectedIds.includes(item.itemId) ? "checked" : ""} /></td>
            <td>
                <div class="dash-product-cell">
                    ${renderProductImage(resolveItemImage(item), "fa-utensils")}
                    <div class="dash-product-info">
                        <span class="dash-product-name">${item.name || "Món chưa đặt tên"}</span>
                        <span class="dash-product-id">ID: #${item.itemId}</span>
                    </div>
                </div>
            </td>
            <td><span class="dash-category-badge">${getCategoryName(item.categoryId)}</span></td>
            <td class="right dash-cost">-</td>
            <td class="right dash-price">${formatCurrency(item.basePrice)}</td>
            <td>
                <div class="dash-status-indicator">
                    <div class="dash-status-dot in-stock"></div>
                    <span>Còn hàng</span>
                </div>
            </td>
            <td class="right td-actions">
                <div class="dash-table-actions">
                    <button class="dash-action-btn" onclick="editItem(${item.itemId})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="dash-action-btn delete" onclick="deleteItem(${item.itemId}, '${item.name}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("");

  updatePagination(filteredItems.length);
}

// Render categories table
function renderCategoriesTable(searchTerm = "") {
  let filteredCategories = categories;

  if (searchTerm) {
    filteredCategories = filteredCategories.filter((cat) =>
      String(cat.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }

  const tbody = document.querySelector(".dash-table tbody");
  tbody.innerHTML = filteredCategories
    .map((cat) => {
      const itemCount = items.filter(
        (i) => Number(i.categoryId) === Number(cat.categoryId),
      ).length;
      return `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-checkbox" value="${cat.categoryId}" ${selectedIds.includes(cat.categoryId) ? "checked" : ""} /></td>
            <td colspan="2">
                <div class="dash-product-cell">
                    ${renderProductImage(resolveCategoryImage(cat), "fa-list")}
                    <div class="dash-product-info">
                        <span class="dash-product-name">${cat.name || "Danh mục chưa đặt tên"}</span>
                        <span class="dash-product-id">${cat.description || "Không có mô tả"}</span>
                    </div>
                </div>
            </td>
            <td colspan="2">
                <span class="dash-category-badge">${itemCount} món</span>
            </td>
            <td>
                <div class="dash-status-indicator">
                    <div class="dash-status-dot in-stock"></div>
                    <span>Hoạt động</span>
                </div>
            </td>
            <td class="right td-actions">
                <div class="dash-table-actions">
                    <button class="dash-action-btn" onclick="editCategory(${cat.categoryId})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="dash-action-btn delete" onclick="deleteCategory(${cat.categoryId}, '${cat.name}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    })
    .join("");

  updatePagination(filteredCategories.length);
}

// Render toppings table
function renderToppingsTable(searchTerm = "") {
  let filteredToppings = toppings;

  if (searchTerm) {
    filteredToppings = filteredToppings.filter((top) =>
      String(top.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
  }

  const tbody = document.querySelector(".dash-table tbody");
  tbody.innerHTML = filteredToppings
    .map(
      (top) => `
        <tr>
            <td class="td-checkbox"><input type="checkbox" class="row-checkbox" value="${top.toppingId}" ${selectedIds.includes(top.toppingId) ? "checked" : ""} /></td>
            <td colspan="2">
                <div class="dash-product-cell">
                    <div class="dash-product-img" style="background-color: #e3e3e3;">
                        <i class="fa-solid fa-cheese" style="color: #999; font-size: 24px;"></i>
                    </div>
                    <div class="dash-product-info">
                        <span class="dash-product-name">${top.name}</span>
                        <span class="dash-product-id">ID: #T${top.toppingId}</span>
                    </div>
                </div>
            </td>
            <td class="right dash-cost">-</td>
            <td class="right dash-price">${formatCurrency(top.price)}</td>
            <td>
                <div class="dash-status-indicator">
                    <div class="dash-status-dot in-stock"></div>
                    <span>Có sẵn</span>
                </div>
            </td>
            <td class="right td-actions">
                <div class="dash-table-actions">
                    <button class="dash-action-btn" onclick="editTopping(${top.toppingId})">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="dash-action-btn delete" onclick="deleteTopping(${top.toppingId}, '${top.name}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("");

  updatePagination(filteredToppings.length);
}

// Helper functions
function getCategoryName(categoryId) {
  const category = categories.find(
    (c) => Number(c.categoryId) === Number(categoryId),
  );
  return category ? category.name : "N/A";
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function updatePagination(totalItems) {
  const paginationInfo = document.querySelector(".dash-pagination-info");
  paginationInfo.innerHTML = `Đang hiển thị <span>1</span> đến <span>${totalItems}</span> trong số <span>${totalItems}</span> kết quả`;
}

// Modal functions
function showItemModal(itemId = null) {
  const item = itemId ? items.find((i) => i.itemId === itemId) : null;
  const title = item
    ? '<i class="fa-solid fa-pen"></i> Chỉnh Sửa Món'
    : '<i class="fa-solid fa-plus"></i> Thêm Món Mới';
  const initialImageUrl = resolveItemImage(item);

  const categoriesOptions = categories
    .map(
      (cat) =>
        `<option value="${cat.categoryId}" ${item && item.categoryId === cat.categoryId ? "selected" : ""}>
            ${cat.name}
        </option>`,
    )
    .join("");

  showModal(
    title,
    `
        <form id="itemForm">
            <div class="form-group">
                <label>Tên món <span>*</span></label>
                <input type="text" name="name" class="form-control" value="${item?.name || ""}" placeholder="Nhập tên món..." required>
            </div>
            <div class="form-group">
                <label>Danh mục <span>*</span></label>
                <select name="categoryId" class="form-control" required>
                    <option value="">-- Chọn danh mục --</option>
                    ${categoriesOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Giá bán <span>*</span></label>
                <input type="number" name="basePrice" class="form-control" value="${item?.basePrice || ""}" min="0" step="1000" placeholder="0" required>
            </div>
            <div class="form-group">
                <label>Ảnh món</label>
                <input type="hidden" name="imageUrl" value="${escapeHtmlAttribute(initialImageUrl)}">
                <input type="file" id="itemImageFile" class="form-control" accept="image/*">
                <small class="form-hint">Nếu không tải ảnh, hệ thống sẽ tự lấy ảnh của danh mục.</small>
                <div id="itemImagePreview" class="form-image-preview-box"></div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i> Hủy
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fa-solid fa-${item ? "check" : "plus"}"></i> ${item ? "Cập Nhật" : "Thêm Mới"}
                </button>
            </div>
        </form>
    `,
  );

  const categorySelect = document.querySelector(
    '#itemForm select[name="categoryId"]',
  );
  const itemImageUrlInput = document.querySelector(
    '#itemForm input[name="imageUrl"]',
  );
  const resolveCategoryFallbackImage = () => {
    const selectedCategoryId = Number(categorySelect?.value || 0);
    const selectedCategory = getCategoryById(selectedCategoryId);
    return resolveCategoryImage(selectedCategory);
  };

  renderImageUploadPreview(
    "itemImagePreview",
    initialImageUrl || resolveCategoryFallbackImage(),
    "fa-utensils",
  );
  setupImageUploadInput({
    inputId: "itemImageFile",
    hiddenInputSelector: '#itemForm input[name="imageUrl"]',
    previewId: "itemImagePreview",
    iconClass: "fa-utensils",
    fallbackResolver: resolveCategoryFallbackImage,
  });

  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      if (!itemImageUrlInput || normalizeImageUrl(itemImageUrlInput.value))
        return;
      renderImageUploadPreview(
        "itemImagePreview",
        resolveCategoryFallbackImage(),
        "fa-utensils",
      );
    });
  }

  document.getElementById("itemForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      categoryId: parseInt(formData.get("categoryId")),
      basePrice: parseFloat(formData.get("basePrice")),
      imageUrl: normalizeImageUrl(formData.get("imageUrl")),
    };

    try {
      if (item) {
        await apiRequest(`/items/${itemId}`, "PUT", data);
        showSuccess("Cập nhật món thành công!");
      } else {
        await apiRequest("/items", "POST", data);
        showSuccess("Thêm món mới thành công!");
      }
      closeModal();
      await loadAllData();
      renderView();
    } catch (error) {
      showError("Lỗi: " + error.message);
    }
  });
}

function showCategoryModal(categoryId = null) {
  const category = categoryId
    ? categories.find((c) => c.categoryId === categoryId)
    : null;
  const title = category
    ? '<i class="fa-solid fa-pen"></i> Chỉnh Sửa Danh Mục'
    : '<i class="fa-solid fa-plus"></i> Thêm Danh Mục Mới';
  const initialImageUrl = resolveCategoryImage(category);

  showModal(
    title,
    `
        <form id="categoryForm">
            <div class="form-group">
                <label>Tên danh mục <span>*</span></label>
                <input type="text" name="name" class="form-control" value="${category?.name || ""}" placeholder="Nhập tên danh mục..." required>
            </div>
            <div class="form-group">
                <label>Mô tả</label>
                <textarea name="description" class="form-control" rows="3" placeholder="Nhập mô tả (không bắt buộc)...">${category?.description || ""}</textarea>
            </div>
            <div class="form-group">
                <label>Ảnh danh mục</label>
                <input type="hidden" name="imageUrl" value="${escapeHtmlAttribute(initialImageUrl)}">
                <input type="file" id="categoryImageFile" class="form-control" accept="image/*">
                <small class="form-hint">Ảnh này sẽ được dùng mặc định cho món chưa có ảnh riêng.</small>
                <div id="categoryImagePreview" class="form-image-preview-box"></div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i> Hủy
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fa-solid fa-${category ? "check" : "plus"}"></i> ${category ? "Cập Nhật" : "Thêm Mới"}
                </button>
            </div>
        </form>
    `,
  );

  renderImageUploadPreview("categoryImagePreview", initialImageUrl, "fa-list");
  setupImageUploadInput({
    inputId: "categoryImageFile",
    hiddenInputSelector: '#categoryForm input[name="imageUrl"]',
    previewId: "categoryImagePreview",
    iconClass: "fa-list",
  });

  document
    .getElementById("categoryForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        name: formData.get("name"),
        description: formData.get("description"),
        imageUrl: normalizeImageUrl(formData.get("imageUrl")),
      };

      try {
        if (category) {
          await apiRequest(`/categories/${categoryId}`, "PUT", data);
          showSuccess("Cập nhật danh mục thành công!");
        } else {
          await apiRequest("/categories", "POST", data);
          showSuccess("Thêm danh mục mới thành công!");
        }
        closeModal();
        await loadAllData();
        renderView();
      } catch (error) {
        showError("Lỗi: " + error.message);
      }
    });
}

function showToppingModal(toppingId = null) {
  const topping = toppingId
    ? toppings.find((t) => t.toppingId === toppingId)
    : null;
  const title = topping
    ? '<i class="fa-solid fa-pen"></i> Chỉnh Sửa Topping'
    : '<i class="fa-solid fa-plus"></i> Thêm Topping Mới';

  showModal(
    title,
    `
        <form id="toppingForm">
            <div class="form-group">
                <label>Tên topping <span>*</span></label>
                <input type="text" name="name" class="form-control" value="${topping?.name || ""}" placeholder="Nhập tên topping..." required>
            </div>
            <div class="form-group">
                <label>Giá <span>*</span></label>
                <input type="number" name="price" class="form-control" value="${topping?.price || ""}" min="0" step="1000" placeholder="0" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="closeModal()">
                    <i class="fa-solid fa-times"></i> Hủy
                </button>
                <button type="submit" class="btn-primary">
                    <i class="fa-solid fa-${topping ? "check" : "plus"}"></i> ${topping ? "Cập Nhật" : "Thêm Mới"}
                </button>
            </div>
        </form>
    `,
  );

  document
    .getElementById("toppingForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = {
        name: formData.get("name"),
        price: parseFloat(formData.get("price")),
      };

      try {
        if (topping) {
          await apiRequest(`/toppings/${toppingId}`, "PUT", data);
          showSuccess("Cập nhật topping thành công!");
        } else {
          await apiRequest("/toppings", "POST", data);
          showSuccess("Thêm topping mới thành công!");
        }
        closeModal();
        await loadAllData();
        renderView();
      } catch (error) {
        showError("Lỗi: " + error.message);
      }
    });
}

// Generic modal
function showModal(title, content) {
  const modalHTML = `
        <div class="modal-overlay" id="modalOverlay">
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        </div>
    `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closeModal() {
  const modal = document.getElementById("modalOverlay");
  if (modal) modal.remove();
}

// Delete functions with styled confirm dialog
async function deleteItem(itemId, itemName) {
  const confirmed = await showConfirm(
    `Bạn có chắc muốn xóa món "${itemName}"?`,
    "Món này sẽ bị xóa vĩnh viễn!",
  );
  if (!confirmed) return;

  try {
    await apiRequest(`/items/${itemId}`, "DELETE");
    showSuccess("Xóa món thành công!");
    await loadAllData();
    renderView();
  } catch (error) {
    showError("Lỗi khi xóa: " + error.message);
  }
}

async function deleteCategory(categoryId, categoryName) {
  const confirmed = await showConfirm(
    `Bạn có chắc muốn xóa danh mục "${categoryName}"?`,
    "Danh mục này sẽ bị xóa vĩnh viễn!",
  );
  if (!confirmed) return;

  try {
    await apiRequest(`/categories/${categoryId}`, "DELETE");
    showSuccess("Xóa danh mục thành công!");
    await loadAllData();
    renderView();
  } catch (error) {
    showError("Lỗi khi xóa: " + error.message);
  }
}

async function deleteTopping(toppingId, toppingName) {
  const confirmed = await showConfirm(
    `Bạn có chắc muốn xóa topping "${toppingName}"?`,
    "Topping này sẽ bị xóa vĩnh viễn!",
  );
  if (!confirmed) return;

  try {
    await apiRequest(`/toppings/${toppingId}`, "DELETE");
    showSuccess("Xóa topping thành công!");
    await loadAllData();
    renderView();
  } catch (error) {
    showError("Lỗi khi xóa: " + error.message);
  }
}

// Edit functions
function editItem(itemId) {
  showItemModal(itemId);
}

function editCategory(categoryId) {
  showCategoryModal(categoryId);
}

function editTopping(toppingId) {
  showToppingModal(toppingId);
}

// Notification functions
function showSuccess(message) {
  if (window.showSuccessToast) {
    window.showSuccessToast(message);
    return;
  }
  window.showToast?.(message, "success");
}

function showError(message) {
  if (window.showErrorToast) {
    window.showErrorToast(message);
    return;
  }
  window.showToast?.(message, "error");
}

function showConfirm(message, detail = "") {
  const fullMessage = [message, detail].filter(Boolean).join("\n");
  if (typeof window.showConfirmModal !== "function") {
    window.showWarningToast?.("Không thể mở hộp thoại xác nhận");
    return Promise.resolve(false);
  }
  return window.showConfirmModal(fullMessage || "Xác nhận thao tác?");
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showLoading() {
  const tbody = document.querySelector(".dash-table tbody");
  tbody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-row">
                <i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu...
            </td>
        </tr>
    `;
}

function hideLoading() {
  // Loading will be replaced by actual data
}
