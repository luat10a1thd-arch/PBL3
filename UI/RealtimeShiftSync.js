const SHIFT_API_BASE =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";
const SHIFT_HUB_URL = `${SHIFT_API_BASE}/hubs/shifts`;

let latestShiftRows = [];
let cashierBindingsInitialized = false;
let latestRevenueSummary = {
  cashTotal: 0,
  transferTotal: 0,
  cancelledTotal: 0,
  totalRevenue: 0,
  completedOrders: 0,
};

function getCurrentUserForShift() {
  if (typeof window.getCurrentUser === "function") {
    const sessionUser = window.getCurrentUser();
    if (sessionUser?.id) return sessionUser;
  }
  return JSON.parse(sessionStorage.getItem("user") || "{}");
}

function bindCashierUserProfile() {
  const user = getCurrentUserForShift();
  if (!user?.firstName || !user?.lastName) return;
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const nameNode = document.querySelector(".cashier-topbar-user-name");
  const roleNode = document.querySelector(".cashier-topbar-user-role");
  const avatarNode = document.querySelector(".cashier-topbar-avatar");
  if (nameNode) nameNode.textContent = `${user.firstName} ${user.lastName}`;
  if (roleNode)
    roleNode.textContent =
      window.normalizeRole(user.role) === "Manager" ? "Quản lí" : "Nhân Viên";
  if (avatarNode) avatarNode.textContent = initials;
}

function bindCashierLogout() {
  const logoutLink = document.querySelector(".cashier-topbar-logout");
  if (!logoutLink || logoutLink.dataset.boundLogout === "1") return;
  logoutLink.dataset.boundLogout = "1";

  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const ok = await window.showConfirmModal?.("Đăng xuất?");
    if (!ok) return;
    await window.logout();
  });
}

function formatVnd(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
}

function isShiftClosed(shift) {
  const status = String(shift?.status || "").toLowerCase();
  if (status === "closed") return true;
  if (status === "open") return false;
  return Number(shift?.expected || 0) > 0;
}

async function shiftApiRequest(
  endpoint,
  method = "GET",
  body = null,
  allowNotFound = false,
) {
  const userStr = sessionStorage.getItem("user");
  const userId = userStr ? JSON.parse(userStr).id : "";
  const options = {
    method,
    credentials: "include",
    headers: { 
        "Content-Type": "application/json",
        "X-UI-User-Id": userId ? String(userId) : ""
    },
  };

  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${SHIFT_API_BASE}${endpoint}`, options);

  if (response.status === 401) {
    window.showWarningToast?.(
      "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
    );
    sessionStorage.removeItem("user");
    window.location.href = "/app/login";
    return null;
  }
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Có lỗi xảy ra" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

function updateShiftSummary(shift) {
  const title = document.querySelector(".dash-page-title");
  if (title) {
    title.textContent = shift?.shiftId
      ? `Báo Cáo Chốt Ca (Shift #${shift.shiftId})`
      : "Báo Cáo Chốt Ca";
  }
  const subtitle = document.getElementById("cashierReportSubtitle");
  if (subtitle) {
    const user = getCurrentUserForShift();
    const fullname =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Nhân viên";
    subtitle.textContent = shift?.shiftId
      ? `Shift #${shift.shiftId} • Thu ngân: ${fullname}`
      : `Chưa mở ca • Thu ngân: ${fullname}`;
  }
}

function bindRevenueSummary(summary) {
  const normalized = {
    cashTotal: Number(summary?.cashTotal || 0),
    transferTotal: Number(summary?.transferTotal || 0),
    cancelledTotal: Number(summary?.cancelledTotal || 0),
    totalRevenue: Number(summary?.totalRevenue || 0),
    completedOrders: Number(summary?.completedOrders || 0),
  };
  latestRevenueSummary = normalized;

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  setText("cashierKpiCash", formatVnd(normalized.cashTotal));
  setText("cashierKpiTransfer", formatVnd(normalized.transferTotal));
  setText("cashierKpiCancelled", formatVnd(normalized.cancelledTotal));
  setText("cashierKpiRevenue", formatVnd(normalized.totalRevenue));
  setText(
    "cashierKpiCompleted",
    `${normalized.completedOrders} đơn hoàn thành`,
  );
  setText("cashierKpiCashCount", `${normalized.completedOrders} giao dịch`);
  setText("cashierKpiTransferCount", "Theo phương thức chuyển khoản/QR");
  setText("cashierKpiCancelledCount", "Theo dữ liệu hiện có");

  setText("closeShiftCashTotal", formatVnd(normalized.cashTotal));
  setText("closeShiftTransferTotal", formatVnd(normalized.transferTotal));
  setText("closeShiftCancelledTotal", formatVnd(normalized.cancelledTotal));
  setText("closeShiftRevenueTotal", formatVnd(normalized.totalRevenue));
}

async function loadCashierRevenueSummary() {
  try {
    const summary = await shiftApiRequest(
      "/Orders/cashier-summary",
      "GET",
      null,
      true,
    );
    bindRevenueSummary(summary || null);
  } catch {
    bindRevenueSummary(null);
  }
}

async function refreshShiftStatusText() {
  const shiftTextNode = document.getElementById("cashierShiftStatus");
  if (!shiftTextNode) return;

  const current = await shiftApiRequest("/Shifts/current", "GET", null, true);
  shiftTextNode.textContent = current
    ? `Ca đang mở #${current.shiftId}`
    : "Chưa mở ca";
}

function renderCashierShiftRows(shifts) {
  const headRow = document.querySelector(".cashier-page .dash-table thead tr");
  if (headRow) {
    headRow.innerHTML = `
            <th>Mã Ca</th>
            <th>Nhân Viên</th>
            <th>Thời Gian Mở</th>
            <th class="right">Tiền Mở Ca</th>
            <th class="right">Tiền Chốt</th>
            <th>Tình Trạng</th>
            <th class="right td-actions">Thao Tác</th>`;
  }

  const tbody = document.querySelector(".cashier-page .dash-table tbody");
  if (!tbody) return;

  const rows = (shifts || [])
    .slice()
    .sort((a, b) => Number(b.shiftId || 0) - Number(a.shiftId || 0))
    .map((shift) => {
      const shiftId = Number(shift.shiftId || 0);
      const closed = isShiftClosed(shift);
      const statusDot = closed ? "out-of-stock" : "in-stock";
      const statusTextClass = closed ? "text-danger" : "text-success";
      const statusText = closed ? "Đã Chốt" : "Đang Mở";
      const opening = Number(shift.opening || 0);
      const expected = Number(shift.expected || 0);
      
      // Format opening time
      let openTimeStr = "-";
      if (shift.openedAt || shift.createdAt) {
        const dt = new Date(shift.openedAt || shift.createdAt);
        if (!Number.isNaN(dt.getTime())) {
          openTimeStr = dt.toLocaleString("vi-VN", { 
            day: "2-digit", month: "2-digit",
            hour: "2-digit", minute: "2-digit"
          });
        }
      }

      return `
                <tr data-shift-id="${shiftId}">
                    <td><span class="dash-product-name">#CA-${String(shiftId).padStart(4, "0")}</span></td>
                    <td>
                        <div class="dash-flex-col">
                            <span class="dash-product-name">${shift.employeeName || `NV #${shift.employeeId}`}</span>
                            <span class="dash-product-id">ID: ${shift.employeeId}</span>
                        </div>
                    </td>
                    <td><span class="dash-product-id" style="font-size:0.85rem;">${openTimeStr}</span></td>
                    <td class="right dash-cost">${formatVnd(opening)}</td>
                    <td class="right dash-price">${closed ? formatVnd(expected) : '<span class="dash-product-id">—</span>'}</td>
                    <td>
                        <div class="dash-status-indicator">
                            <div class="dash-status-dot ${statusDot}"></div>
                            <span class="${statusTextClass}">${statusText}</span>
                        </div>
                    </td>
                    <td class="right td-actions">
                        <button class="dash-action-btn" title="Xem chi tiết"><i class="fa-solid fa-eye"></i></button>
                    </td>
                </tr>`;
    });

  tbody.innerHTML = rows.length
    ? rows.join("")
    : '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--dash-text-muted)">Chưa có dữ liệu ca</td></tr>';

  const info =
    document.getElementById("cashierShiftPaginationInfo") ||
    document.querySelector(".cashier-page .dash-pagination-info");
  if (info) {
    info.textContent = rows.length
      ? `Đang hiển thị 1 đến ${rows.length} trong số ${rows.length} ca`
      : "Không có dữ liệu ca";
  }
  const controls = document.querySelector(".cashier-page .dash-pagination-controls");
  if (controls) {
    controls.style.display = rows.length ? "flex" : "none";
    controls.innerHTML = `
      <button class="dash-page-btn" disabled><i class="fa-solid fa-chevron-left"></i></button>
      <button class="dash-page-btn active">1</button>
      <button class="dash-page-btn" disabled><i class="fa-solid fa-chevron-right"></i></button>
    `;
  }
}

async function openCurrentShiftFromUi() {
  const current = await shiftApiRequest("/Shifts/current", "GET", null, true);
  if (current) {
    window.showWarningToast?.(
      "Bạn đang có ca mở, hãy chốt ca trước khi mở ca mới.",
    );
    return;
  }

  if (typeof window.showPromptModal !== "function") {
    window.showWarningToast?.("Không thể mở popup nhập số tiền mở ca");
    return;
  }
  const openingInput = await window.showPromptModal("Nhập số tiền mở ca:", "0");
  if (openingInput === null) return;

  const openingAmount = Number(String(openingInput).replace(/,/g, "").trim());
  if (Number.isNaN(openingAmount) || openingAmount < 0) {
    window.showWarningToast?.("Số tiền mở ca không hợp lệ");
    return;
  }

  await shiftApiRequest("/Shifts/open", "POST", { openingAmount });
  window.showSuccessToast?.("Mở ca thành công");
  await loadInitialShiftData();
}

async function closeCurrentShiftFromUi() {
  const current = await shiftApiRequest("/Shifts/current", "GET", null, true);
  if (!current) {
    window.showWarningToast?.("Hiện chưa có ca mở để chốt.");
    return;
  }

  const modalInput = document.getElementById("closeShiftExpectedInput");
  const expectedRaw = modalInput?.value?.trim();
  const expectedAmount = expectedRaw
    ? Number(expectedRaw.replace(/,/g, ""))
    : Number(latestRevenueSummary.totalRevenue || current.expected || current.opening || 0);

  if (Number.isNaN(expectedAmount) || expectedAmount < 0) {
    window.showWarningToast?.("Số tiền không hợp lệ");
    return;
  }

  await shiftApiRequest("/Shifts/close", "POST", {
    shiftId: current.shiftId,
    expectedAmount,
  });

  if (modalInput) modalInput.value = "";
  document.getElementById("closeShiftModal")?.classList.remove("visible");
  window.showSuccessToast?.("Chốt ca thành công");
  await loadInitialShiftData();
}

function wireCashierShiftModal() {
  if (cashierBindingsInitialized) return;
  cashierBindingsInitialized = true;

  const closeShiftModal = document.getElementById("closeShiftModal");
  const closeButton = document.getElementById("btnCloseShift");
  const cancel1 = document.getElementById("btnCancelClose");
  const cancel2 = document.getElementById("btnCancelClose2");
  const confirm = document.getElementById("btnConfirmCloseShift");
  const openButton = document.getElementById("btnOpenShift");
  const printButton = document.getElementById("btnPrintShiftReport");

  if (closeButton && closeShiftModal) {
    closeButton.addEventListener("click", (e) => {
      e.preventDefault();
      closeShiftModal.classList.add("visible");
    });
  }

  if (cancel1 && closeShiftModal) {
    cancel1.addEventListener("click", () =>
      closeShiftModal.classList.remove("visible"),
    );
  }

  if (cancel2 && closeShiftModal) {
    cancel2.addEventListener("click", () =>
      closeShiftModal.classList.remove("visible"),
    );
  }

  if (closeShiftModal) {
    closeShiftModal.addEventListener("click", (e) => {
      if (e.target === closeShiftModal)
        closeShiftModal.classList.remove("visible");
    });
  }

  if (confirm) {
    confirm.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await closeCurrentShiftFromUi();
      } catch (error) {
        window.showErrorToast?.(`Không thể chốt ca: ${error.message}`);
      }
    });
  }

  if (openButton) {
    openButton.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await openCurrentShiftFromUi();
      } catch (error) {
        window.showErrorToast?.(`Không thể mở ca: ${error.message}`);
      }
    });
  }

  if (printButton) {
    printButton.addEventListener("click", (e) => {
      e.preventDefault();
      window.print();
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIFT STATISTICS — Revenue by Period & by Staff
// ─────────────────────────────────────────────────────────────────────────────

const PERIOD_CONFIG = [
  {
    key: "morning",
    label: "Buổi Sáng",
    time: "06:00 – 12:00",
    icon: "fa-sun",
    startHour: 6,
    endHour: 12,
  },
  {
    key: "afternoon",
    label: "Buổi Chiều",
    time: "12:00 – 17:00",
    icon: "fa-cloud-sun",
    startHour: 12,
    endHour: 17,
  },
  {
    key: "evening",
    label: "Buổi Tối",
    time: "17:00 – 23:00",
    icon: "fa-moon",
    startHour: 17,
    endHour: 23,
  },
];

function getPeriodKeyForShift(shift) {
  const raw = shift.openedAt || shift.createdAt;
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  const h = dt.getHours();
  for (const p of PERIOD_CONFIG) {
    if (h >= p.startHour && h < p.endHour) return p.key;
  }
  return null;
}

function renderShiftStatsByPeriod(shifts) {
  const grid = document.getElementById("shiftStatPeriodGrid");
  if (!grid) return;

  // Aggregate: only count CLOSED shifts (expected > 0)
  const acc = {};
  for (const p of PERIOD_CONFIG) acc[p.key] = { revenue: 0, count: 0 };

  for (const shift of shifts) {
    const key = getPeriodKeyForShift(shift);
    if (!key) continue;
    const closed = isShiftClosed(shift);
    const revenue = closed ? Number(shift.expected || 0) : 0;
    acc[key].revenue += revenue;
    acc[key].count += 1;
  }

  grid.innerHTML = PERIOD_CONFIG.map((p) => {
    const { revenue, count } = acc[p.key];
    return `
      <div class="shift-period-card ${p.key}">
        <i class="fa-solid ${p.icon} shift-period-icon"></i>
        <span class="shift-period-label">${p.label}</span>
        <span class="shift-period-time">${p.time}</span>
        <span class="shift-period-revenue">${formatVnd(revenue)}</span>
        <span class="shift-period-count">${count} ca</span>
      </div>`;
  }).join("");
}

function renderShiftStatsByStaff(shifts) {
  const list = document.getElementById("shiftStatStaffList");
  if (!list) return;

  // Aggregate per employee
  const map = new Map();
  for (const shift of shifts) {
    const id = Number(shift.employeeId || 0);
    const name = shift.employeeName || `NV #${id}`;
    const closed = isShiftClosed(shift);
    const revenue = closed ? Number(shift.expected || 0) : 0;

    if (!map.has(id)) {
      map.set(id, { name, revenue: 0, shifts: 0 });
    }
    const entry = map.get(id);
    entry.revenue += revenue;
    entry.shifts += 1;
  }

  const sorted = [...map.values()].sort((a, b) => b.revenue - a.revenue);

  if (!sorted.length) {
    list.innerHTML = `<div class="shift-stat-empty">
      <i class="fa-solid fa-chart-pie" style="margin-right:6px;"></i>Chưa có dữ liệu
    </div>`;
    return;
  }

  list.innerHTML = sorted.map((staff, idx) => {
    const rank = idx + 1;
    const rankClass = rank === 1 ? "top" : "";
    return `
      <div class="shift-staff-row">
        <div class="shift-staff-rank ${rankClass}">#${rank}</div>
        <div class="shift-staff-info">
          <div class="shift-staff-name">${staff.name}</div>
          <div class="shift-staff-meta">${staff.shifts} ca làm việc</div>
        </div>
        <div class="shift-staff-revenue">${formatVnd(staff.revenue)}</div>
      </div>`;
  }).join("");
}

// ─────────────────────────────────────────────────────────────────────────────

async function loadInitialShiftData() {
  try {
    const shifts = await shiftApiRequest("/Shifts");
    if (!shifts) return;
    latestShiftRows = shifts;

    const currentUser = getCurrentUserForShift();
    const currentUserId = Number(currentUser?.id || 0);
    const currentShift = shifts.find(
      (s) => Number(s.employeeId) === currentUserId && !isShiftClosed(s),
    );
    updateShiftSummary(currentShift || null);
    renderCashierShiftRows(shifts);
    renderShiftStatsByPeriod(shifts);
    renderShiftStatsByStaff(shifts);
    await loadCashierRevenueSummary();
    await refreshShiftStatusText();
    wireCashierShiftModal();
  } catch (error) {
    console.error("Shift init error:", error);
  }
}

async function startShiftHub() {
  if (!window.signalR) return;

  const connection = new window.signalR.HubConnectionBuilder()
    .withUrl(SHIFT_HUB_URL, { withCredentials: true })
    .withAutomaticReconnect()
    .build();

  connection.on("ShiftUpdated", async () => {
    try {
      await loadInitialShiftData();
    } catch {
      // no-op
    }
  });

  await connection.start();
}

document.addEventListener("DOMContentLoaded", async () => {
  bindCashierUserProfile();
  bindCashierLogout();
  await loadInitialShiftData();
  await startShiftHub();
});

