const IMPORT_API_URL =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";
let importState = {
  imports: [],
  suppliers: [],
  supplierId: "",
  monthValue: "",
  searchKeyword: "",
};

function getShiftLabelByNow() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "CA 1: 06:00 - 12:00";
  if (hour >= 12 && hour < 17) return "CA 2: 12:00 - 17:00";
  if (hour >= 17 && hour < 23) return "CA 3: 17:00 - 23:00";
  return "Ngoài giờ ca";
}

function updateShiftBadgeText() {
  const node = document.getElementById("importHistoryShiftText");
  if (!node) return;
  node.textContent = getShiftLabelByNow();
}

function toLocalParts(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: String(d.getHours()).padStart(2, "0"),
    minute: String(d.getMinutes()).padStart(2, "0"),
  };
}

function formatDateTime(value) {
  const date = toLocalParts(value);
  if (!date) return { date: "-", time: "-" };
  return {
    date: `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
    time: `${date.hour}:${date.minute}`,
  };
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
}

function resolveImportPricing(importRow) {
  const totalCost = Number(importRow?.totalCost ?? 0);
  let quantity = Number(importRow?.quantity ?? 0);
  let unitPrice = Number(importRow?.unitPrice ?? 0);

  if ((!Number.isFinite(quantity) || quantity <= 0) && totalCost > 0) {
    quantity = 1;
  }

  if ((!Number.isFinite(unitPrice) || unitPrice <= 0) && totalCost > 0) {
    unitPrice = quantity > 0 ? totalCost / quantity : totalCost;
  }

  const computedTotal =
    Number.isFinite(quantity) && Number.isFinite(unitPrice)
      ? quantity * unitPrice
      : totalCost;

  return {
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    total: computedTotal > 0 ? computedTotal : totalCost,
  };
}

async function importApiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${IMPORT_API_URL}${endpoint}`, options);
  if (response.status === 401) {
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
  return response.json();
}

function updateImportKpis(imports, suppliers) {
  const kpis = document.querySelectorAll(".dash-kpi-value");
  if (kpis.length < 4) return;

  const now = toLocalParts(new Date());
  if (!now) return;
  const nowMonth = now.month;
  const nowYear = now.year;
  const monthImports = imports.filter((i) => {
    const d = toLocalParts(i.importDate);
    if (!d) return false;
    return d.month === nowMonth && d.year === nowYear;
  });

  const totalCost = monthImports.reduce(
    (sum, i) => sum + Number(i.totalCost ?? 0),
    0,
  );
  const latest = imports[0];
  const latestDate = latest ? toLocalParts(latest.importDate) : null;

  kpis[0].textContent = String(monthImports.length);
  kpis[1].textContent = formatCurrency(totalCost);
  kpis[2].textContent = String((suppliers || []).length);
  kpis[3].textContent = latestDate
    ? `${latestDate.year}-${String(latestDate.month).padStart(2, "0")}-${String(latestDate.day).padStart(2, "0")}`
    : "-";
}

function filterByMonth(imports, monthValue) {
  if (!monthValue) return imports;
  const [yyyy, mm] = monthValue.split("-").map(Number);
  if (!yyyy || !mm) return imports;

  return imports.filter((i) => {
    const d = toLocalParts(i.importDate);
    if (!d) return false;
    return d.year === yyyy && d.month === mm;
  });
}

function getFilteredImports() {
  let data = [...importState.imports];

  if (importState.supplierId) {
    data = data.filter((i) => String(i.supplierId) === importState.supplierId);
  }

  data = filterByMonth(data, importState.monthValue);

  if (importState.searchKeyword) {
    const keyword = importState.searchKeyword.toLowerCase();
    data = data.filter(
      (i) =>
        `#nk-${String(i.importId ?? "").padStart(4, "0")}`.includes(keyword) ||
        (i.supplier?.name || "").toLowerCase().includes(keyword),
    );
  }

  return data;
}

function renderImportRows(imports) {
  const tbody = document.getElementById("importHistoryTableBody");
  if (!tbody) return;

  if (!imports.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center; padding: 32px; color:#b6a8a2;">Không có phiếu nhập nào</td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = imports
    .map((i) => {
      const importId = Number(i.importId ?? 0);
      const supplierName = i.supplier?.name || `NCC-${i.supplierId ?? "-"}`;
      const ingredientName = i.ingredient?.name || "Không rõ";
      const ingredientUom = i.ingredient?.uoM || "-";
      const dt = formatDateTime(i.importDate);
      const pricing = resolveImportPricing(i);

      return `
            <tr>
                <td class="td-checkbox"><input type="checkbox" /></td>
                <td><span class="dash-product-name">#NK-${String(importId).padStart(4, "0")}</span></td>
                <td>
                    <div class="dash-flex-col">
                        <span class="dash-product-name">${dt.date}</span>
                        <span class="dash-product-id">${dt.time}</span>
                    </div>
                </td>
                <td>
                    <div class="dash-flex-col">
                        <span class="dash-product-name">${supplierName}</span>
                        <span class="dash-product-id">NCC-${String(i.supplierId ?? "").padStart(3, "0")}</span>
                    </div>
                </td>
                <td>
                    <div class="dash-product-cell">
                        <div class="dash-product-img icon-cell"><i class="fa-solid fa-boxes-stacked"></i></div>
                        <div class="dash-product-info">
                            <span class="dash-product-name">${ingredientName}</span>
                            <span class="dash-product-id">${ingredientUom}</span>
                        </div>
                    </div>
                </td>
                <td class="right">${pricing.quantity}</td>
                <td class="right dash-cost">${formatCurrency(pricing.unitPrice)}</td>
                <td class="right dash-price">${formatCurrency(pricing.total)}</td>
                <td>
                    <div class="dash-flex-col">
                        <span class="dash-product-name">Hệ thống</span>
                        <span class="dash-product-id">Auto</span>
                    </div>
                </td>
               
            </tr>
        `;
    })
    .join("");
}

function fillSupplierFilter(suppliers) {
  const select = document.getElementById("importSupplierFilter");
  if (!select) return;

  const firstOption = '<option value="">Tất cả nhà cung cấp</option>';
  const options = (suppliers || [])
    .map((s) => `<option value="${s.supplierId}">${s.name}</option>`)
    .join("");
  select.innerHTML = firstOption + options;
}

function fillMonthFilter(imports) {
  const select = document.getElementById("importMonthFilter");
  if (!select) return;

  const unique = new Map();
  imports.forEach((i) => {
    const d = toLocalParts(i.importDate);
    if (!d) return;
    const key = `${d.year}-${String(d.month).padStart(2, "0")}`;
    const label = `Tháng ${d.month} / ${d.year}`;
    unique.set(key, label);
  });

  const options = ['<option value="">Tất cả tháng</option>'].concat(
    Array.from(unique.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([value, label]) => `<option value="${value}">${label}</option>`),
  );
  select.innerHTML = options.join("");
}

function fillCategoryFilter() {
  const select = document.getElementById("importCategoryFilter");
  if (!select) return;
  select.innerHTML = '<option value="">Tất cả danh mục</option>';
  select.value = "";
  select.disabled = true;
  select.title = "Dữ liệu phiếu nhập hiện chưa có chi tiết danh mục";
}

function updatePaginationInfo(count) {
  const info = document.querySelector(".dash-pagination-info");
  if (!info) return;
  if (count <= 0) {
    info.textContent = "Không có phiếu nhập";
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

function exportImportHistoryToCsv(rows) {
  const exportRows = (rows || []).map((i) => {
    const dt = formatDateTime(i.importDate);
    const pricing = resolveImportPricing(i);
    return {
      MaPhieu: `NK-${String(i.importId ?? "").padStart(4, "0")}`,
      NgayNhap: `${dt.date} ${dt.time}`,
      NhaCungCap: i.supplier?.name || "",
      NguyenLieu: i.ingredient?.name || "",
      DonVi: i.ingredient?.uoM || "",
      SoLuong: pricing.quantity,
      DonGia: pricing.unitPrice,
      ThanhTien: pricing.total,
    };
  });
  window.exportRowsToCsv?.(exportRows, "lich-su-nhap-hang.csv");
}

function setupSidebar() {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const sidebar = document.querySelector(".dash-sidebar");
  if (!sidebarToggle || !sidebarOverlay || !sidebar) return;

  const openSidebar = () => {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("visible");
  };
  const closeSidebar = () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("visible");
  };
  sidebarToggle.addEventListener("click", () =>
    sidebar.classList.contains("open") ? closeSidebar() : openSidebar(),
  );
  sidebarOverlay.addEventListener("click", closeSidebar);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = window.ensureAuthByRole(["Manager"]);
    if (!user) return;

    window.hydrateAdminUserProfile?.(user);
    updateShiftBadgeText();

    setupSidebar();

    const [imports, suppliers] = await Promise.all([
      importApiRequest("/imports"),
      importApiRequest("/suppliers"),
    ]);

    if (!imports || !suppliers) return;

    importState.imports = imports;
    importState.suppliers = suppliers;

    fillSupplierFilter(suppliers);
    fillMonthFilter(imports);
    fillCategoryFilter();
    redrawImports();

    const supplierFilter = document.getElementById("importSupplierFilter");
    if (supplierFilter) {
      supplierFilter.addEventListener("change", () => {
        importState.supplierId = supplierFilter.value;
        redrawImports();
      });
    }

    const monthFilter = document.getElementById("importMonthFilter");
    if (monthFilter) {
      monthFilter.addEventListener("change", () => {
        importState.monthValue = monthFilter.value;
        redrawImports();
      });
    }

    const searchInput = document.getElementById("importSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        importState.searchKeyword = searchInput.value.trim();
        redrawImports();
      });
    }

    const exportBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => (b.textContent || "").includes("Xuất Excel"),
    );
    if (exportBtn) {
      exportBtn.dataset.customExport = "1";
      exportBtn.addEventListener("click", (e) => {
        e.preventDefault();
        exportImportHistoryToCsv(getFilteredImports());
      });
    }
  } catch (error) {
    window.showErrorToast?.(error.message || "Không thể tải lịch sử nhập hàng");
  }
});
