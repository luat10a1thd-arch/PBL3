const ORDERS_API_URL =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";

const ordersState = {
  rows: [],
  search: "",
  status: "all",
};

function formatVnd(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
}

function formatOrderTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { time: "-", dateText: "-" };
  return {
    time: date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    dateText: date.toLocaleDateString("vi-VN"),
  };
}

async function ordersApiRequest(endpoint) {
  const response = await fetch(`${ORDERS_API_URL}${endpoint}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

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

  return response.json();
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

function hydrateUserProfile(user) {
  window.hydrateAdminUserProfile?.(user);
}

function getFilteredRows() {
  let rows = [...ordersState.rows];

  if (ordersState.status !== "all") {
    rows = rows.filter(
      (x) => String(x.status || "").toLowerCase() === ordersState.status,
    );
  }

  if (ordersState.search) {
    const keyword = ordersState.search.toLowerCase();
    rows = rows.filter(
      (x) =>
        String(x.orderId).includes(keyword) ||
        String(x.tableLabel || "")
          .toLowerCase()
          .includes(keyword) ||
        String(x.itemSummary || "")
          .toLowerCase()
          .includes(keyword),
    );
  }

  return rows;
}

function renderKpis(summary) {
  const today = document.getElementById("ordersTodayValue");
  const open = document.getElementById("ordersOpenValue");
  const completed = document.getElementById("ordersCompletedValue");
  const total = document.getElementById("ordersTotalValue");

  if (today) today.textContent = String(summary.todayOrders || 0);
  if (open) open.textContent = String(summary.openOrders || 0);
  if (completed) completed.textContent = String(summary.completedOrders || 0);
  if (total) total.textContent = String(summary.totalOrders || 0);

  const allBtn = document.getElementById("ordersFilterAll");
  const openBtn = document.getElementById("ordersFilterOpen");
  const completedBtn = document.getElementById("ordersFilterCompleted");
  if (allBtn) allBtn.textContent = `Tất cả đơn (${summary.totalOrders || 0})`;
  if (openBtn) openBtn.textContent = `Chờ xử lý (${summary.openOrders || 0})`;
  if (completedBtn)
    completedBtn.textContent = `Hoàn thành (${summary.completedOrders || 0})`;
}

function renderRows() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  const rows = getFilteredRows();
  if (!rows.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:32px; color:#b6a8a2;">Không có đơn hàng phù hợp</td>
            </tr>`;
    const info = document.getElementById("ordersPaginationInfo");
    if (info) info.textContent = "Không có dữ liệu";
    return;
  }

  tbody.innerHTML = rows
    .map((row, index) => {
      const time = formatOrderTime(row.dateTime || row.paidAt || row.createdAt);
      const isCompleted =
        String(row.status || "").toLowerCase() === "completed";
      const isCancelled =
        String(row.status || "").toLowerCase() === "cancelled";
      const statusDotClass = isCompleted ? "in-stock" : (isCancelled ? "critical" : "warning");
      const statusTextClass = isCompleted ? "text-success" : (isCancelled ? "text-danger" : "text-warning");
      const statusText = isCompleted ? "Hoàn Thành" : (isCancelled ? "Đã Hủy" : "Chờ xử lý");
      const paymentLabel = isCompleted
        ? String(row.paymentMethod || "")
            .toLowerCase()
            .includes("cash")
          ? "Tiền mặt"
          : String(row.paymentMethod || "").toLowerCase().includes("qr")
            ? "Mã QR"
            : "Chuyển khoản"
        : "Đang mở";
      const tableIcon = "fa-bag-shopping";

      return `
            <tr${index === rows.length - 1 ? ' class="no-border-row"' : ""}>
                <td class="td-checkbox"><input type="checkbox" /></td>
                <td><span class="dash-product-name">#${row.orderId}</span></td>
                <td>
                    <div class="dash-flex-col">
                        <span class="text-white fw-500">${time.time}</span>
                        <span class="dash-product-id">${time.dateText}</span>
                    </div>
                </td>
                <td><span class="dash-category-badge coffee"><i class="fa-solid ${tableIcon}"></i> ${row.tableLabel || "-"}</span></td>
                <td>
                    <div class="dash-flex-col">
                        <span class="dash-product-name">${row.itemSummary || "Không có món"}</span>
                        <span class="dash-product-id">${paymentLabel}</span>
                    </div>
                </td>
                <td class="right dash-price">${formatVnd(row.total)}</td>
                <td>
                    <div class="dash-status-indicator justify-center">
                        <div class="dash-status-dot ${statusDotClass}"></div>
                        <span class="${statusTextClass}">${statusText}</span>
                    </div>
                </td>
            </tr>`;
    })
    .join("");

  const info = document.getElementById("ordersPaginationInfo");
  if (info)
    info.textContent = `Đang hiển thị 1 đến ${rows.length} trong số ${rows.length} kết quả`;
  const controls = document.querySelector(".dash-pagination-controls");
  if (controls) {
    controls.innerHTML = `
            <button class="dash-page-btn" disabled><i class="fa-solid fa-chevron-left"></i></button>
            <button class="dash-page-btn active">1</button>
            <button class="dash-page-btn" disabled><i class="fa-solid fa-chevron-right"></i></button>
        `;
  }
}

function wireFilters() {
  document
    .querySelectorAll(".dash-order-filter-tabs .dash-filter-btn")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".dash-order-filter-tabs .dash-filter-btn")
          .forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        ordersState.status = btn.dataset.status || "all";
        renderRows();
      });
    });

  const searchInput = document.getElementById("ordersSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      ordersState.search = searchInput.value.trim();
      renderRows();
    });
  }
}

window.onEditOrder = function onEditOrder(orderId) {
  window.showToast?.(
    `Đơn #${orderId}: chức năng Sửa sẽ bổ sung ở bước tiếp theo.`,
    "info",
  );
};

window.onDeleteOrder = function onDeleteOrder(orderId) {
  window.showToast?.(
    `Đơn #${orderId}: chưa hỗ trợ xóa mềm từ màn hình này.`,
    "warning",
  );
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = window.ensureAuthByRole(["Manager"]);
    if (!user) return;
    hydrateUserProfile(user);
    setupSidebar();
    wireFilters();

    const result = await ordersApiRequest("/orders/admin-list");
    if (!result) return;

    ordersState.rows = result.rows || [];
    renderKpis(result);
    renderRows();
  } catch (error) {
    window.showErrorToast?.(
      error.message || "Không thể tải danh sách đơn hàng",
    );
  }
});
