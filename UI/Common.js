window.normalizeRole = function normalizeRole(role) {
  if (role === null || role === undefined) return "";

  const resolveByNumber = (value) => {
    const roleMap = {
      0: "Manager",
      1: "Admin",
      2: "Staff",
    };
    return roleMap[value] || "";
  };

  if (typeof role === "number") {
    return resolveByNumber(role);
  }

  if (typeof role === "string") {
    const trimmed = role.trim();
    if (trimmed === "") return "";

    if (/^\d+$/.test(trimmed)) {
      return resolveByNumber(Number(trimmed));
    }

    const lowered = trimmed.toLowerCase();
    if (lowered === "admin" || lowered === "owner") return "Admin";
    if (
      lowered === "manager" ||
      lowered === "chủ quán" ||
      lowered === "chu quan" ||
      lowered === "quản lí" ||
      lowered === "quan li" ||
      lowered === "quản lý" ||
      lowered === "quan ly"
    )
      return "Manager";
    if (
      lowered === "staff" ||
      lowered === "nhân viên" ||
      lowered === "nhan vien" ||
      lowered === "pha chế" ||
      lowered === "pha che" ||
      lowered === "thu ngân" ||
      lowered === "thu ngan" ||
      lowered === "phục vụ" ||
      lowered === "phuc vu"
    )
      return "Staff";
  }

  return "";
};

window.getRoleDisplayName = function getRoleDisplayName(role) {
  const normalized = window.normalizeRole(role);
  if (normalized === "Admin") return "Admin";
  if (normalized === "Manager") return "Quản lí";
  if (normalized === "Staff") return "Nhân Viên";
  return "";
};

window.getCurrentUser = function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem("user") || "{}");
};

window.getRoleHomePage = function getRoleHomePage(role) {
  const normalized = window.normalizeRole(role);
  if (normalized === "Admin") return "/app/dashboard";
  if (normalized === "Staff") return "/app/cashier";
  if (normalized === "Manager") return "/app/dashboard";
  return null;
};

window.isRoleAllowed = function isRoleAllowed(actualRole, expectedRole) {
  const actual = window.normalizeRole(actualRole);
  const expected = window.normalizeRole(expectedRole);
  if (!actual || !expected) return false;
  if (actual === expected) return true;
  // Admin has full manager capabilities on admin pages.
  if (actual === "Admin" && expected === "Manager") return true;
  return false;
};

window.redirectToRoleHome = function redirectToRoleHome(user) {
  const target = window.getRoleHomePage(user?.role);
  if (!target) {
    sessionStorage.removeItem("user");
    window.location.href = "/app/login";
    return;
  }

  const path = window.location.pathname || "";
  if (!path.includes(`/${target}`) && !path.endsWith(target)) {
    window.location.href = target;
  }
};

window.ensureAuthByRole = function ensureAuthByRole(allowedRoles = []) {
  const user = window.getCurrentUser();
  if (!user || !user.id) {
    window.location.href = "/app/login";
    return null;
  }

  const role = window.normalizeRole(user.role);
  if (!role) {
    sessionStorage.removeItem("user");
    window.location.href = "/app/login";
    return null;
  }

  const normalizedAllowedRoles = (allowedRoles || [])
    .map(window.normalizeRole)
    .filter(Boolean);

  if (
    normalizedAllowedRoles.length > 0 &&
    !normalizedAllowedRoles.some((allowed) =>
      window.isRoleAllowed(role, allowed),
    )
  ) {
    window.redirectToRoleHome(user);
    return null;
  }

  return user;
};

window.logout = async function logout() {
  const API_URL =
    window.location.protocol === "file:" ? "http://localhost:4000" : "";
  try {
    await fetch(`${API_URL}/Users/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    // ignore and continue clearing local state
  }
  sessionStorage.removeItem("user");
  window.location.href = "/app/login";
};

function ensureToastStyles() {
  if (document.getElementById("globalToastStyles")) return;
  const style = document.createElement("style");
  style.id = "globalToastStyles";
  style.textContent = `
        .global-toast-container{position:fixed;top:80px;right:16px;z-index:100000;display:flex;flex-direction:column;gap:10px;pointer-events:none}
        .global-toast{min-width:260px;max-width:360px;padding:12px 14px;border-radius:10px;color:#fff;font-weight:600;font-size:.9rem;display:flex;align-items:flex-start;gap:10px;box-shadow:0 12px 28px rgba(0,0,0,.35);opacity:0;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease}
        .global-toast.show{opacity:1;transform:translateY(0)}
        .global-toast.info{background:linear-gradient(135deg,#3b82f6,#2563eb)}
        .global-toast.success{background:linear-gradient(135deg,#16a34a,#15803d)}
        .global-toast.warning{background:linear-gradient(135deg,#f59e0b,#d97706)}
        .global-toast.error{background:linear-gradient(135deg,#ef4444,#dc2626)}
        .global-toast i{margin-top:1px}
        .dash-topbar-logout{display:flex;align-items:center;gap:6px;padding:7px 12px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);border-radius:8px;color:#f87171;font-size:.82rem;font-weight:600;cursor:pointer;text-decoration:none;transition:all .2s ease}
        .dash-topbar-logout:hover{background:rgba(239,68,68,.2);color:#fca5a5}
        .topbar-realtime-chip{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:8px;border:1px solid rgba(56,189,248,.28);background:rgba(14,165,233,.15);color:#bae6fd;font-size:.78rem;font-weight:600;line-height:1}
        .topbar-realtime-dot{width:8px;height:8px;border-radius:999px;background:#22d3ee;box-shadow:0 0 0 0 rgba(34,211,238,.55);animation:realtimePulse 1.8s infinite}
        .dash-notification-popover{position:fixed;top:74px;right:18px;width:min(420px,calc(100vw - 24px));max-height:68vh;overflow:auto;background:rgba(21,13,10,.96);border:1px solid rgba(203,213,225,.22);border-radius:12px;z-index:100001;box-shadow:0 14px 34px rgba(0,0,0,.35);display:none}
        .dash-notification-popover.open{display:block}
        .dash-notification-popover-header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(203,213,225,.18);color:#fff;font-weight:700}
        .dash-notification-popover-close{background:transparent;border:none;color:#cbd5e1;cursor:pointer;font-size:1rem}
        .dash-notification-list{display:flex;flex-direction:column;padding:6px}
        .dash-notification-item{padding:10px 10px;border-radius:8px;border:1px solid rgba(203,213,225,.12);background:rgba(255,255,255,.02);margin-bottom:8px}
        .dash-notification-item-title{font-size:.82rem;color:#fff;font-weight:600;line-height:1.35}
        .dash-notification-item-meta{font-size:.73rem;color:#b6a8a2;margin-top:4px}
        @keyframes realtimePulse{0%{box-shadow:0 0 0 0 rgba(34,211,238,.55)}70%{box-shadow:0 0 0 8px rgba(34,211,238,0)}100%{box-shadow:0 0 0 0 rgba(34,211,238,0)}}
    `;
  document.head.appendChild(style);
}

window.showToast = function showToast(message, type = "info", duration = 3000) {
  const safeMessage = String(message || "").trim();
  if (!safeMessage) return;
  ensureToastStyles();

  let container = document.getElementById("globalToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "globalToastContainer";
    container.className = "global-toast-container";
    document.body.appendChild(container);
  }

  const iconByType = {
    success: "fa-circle-check",
    error: "fa-circle-exclamation",
    warning: "fa-triangle-exclamation",
    info: "fa-circle-info",
  };
  const normalizedType = iconByType[type] ? type : "info";
  const toast = document.createElement("div");
  toast.className = `global-toast ${normalizedType}`;
  toast.innerHTML = `<i class="fa-solid ${iconByType[normalizedType]}"></i><span>${safeMessage}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(
    () => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 220);
    },
    Math.max(1200, Number(duration) || 3000),
  );
};

window.showSuccessToast = function showSuccessToast(message, duration = 2600) {
  window.showToast(message, "success", duration);
};

window.showErrorToast = function showErrorToast(message, duration = 3600) {
  window.showToast(message, "error", duration);
};

window.showWarningToast = function showWarningToast(message, duration = 3200) {
  window.showToast(message, "warning", duration);
};

window.showConfirmModal = function showConfirmModal(message) {
  return new Promise((resolve) => {
    const modalId = `globalConfirmModal-${Date.now()}`;
    const markup = `
            <div class="staff-modal-backdrop visible" id="${modalId}">
                <div class="staff-modal" style="max-width:460px;">
                    <div class="staff-modal-header">
                        <h3 class="staff-modal-title"><i class="fa-solid fa-circle-question" style="margin-right:8px;color:var(--primary-color);"></i>Xác nhận thao tác</h3>
                        <button class="staff-modal-close" data-action="cancel"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="staff-modal-body">
                        <p style="margin:0;color:var(--dash-text-muted);font-size:.92rem;line-height:1.5;">${String(message || "Xác nhận thao tác?")}</p>
                    </div>
                    <div class="staff-modal-footer">
                        <button class="dash-btn-secondary" data-action="cancel">Hủy</button>
                        <button class="dash-btn-primary" data-action="confirm"><i class="fa-solid fa-check"></i> Xác nhận</button>
                    </div>
                </div>
            </div>`;
    document.body.insertAdjacentHTML("beforeend", markup);
    const modal = document.getElementById(modalId);
    const close = (value) => {
      modal?.remove();
      resolve(value);
    };

    modal?.addEventListener("click", (e) => {
      const action = e.target
        ?.closest?.("[data-action]")
        ?.getAttribute("data-action");
      if (e.target === modal || action === "cancel") {
        close(false);
        return;
      }
      if (action === "confirm") {
        close(true);
      }
    });
  });
};

window.showPromptModal = function showPromptModal(message, defaultValue = "") {
  return new Promise((resolve) => {
    const modalId = `globalPromptModal-${Date.now()}`;
    const markup = `
            <div class="staff-modal-backdrop visible" id="${modalId}">
                <div class="staff-modal" style="max-width:460px;">
                    <div class="staff-modal-header">
                        <h3 class="staff-modal-title"><i class="fa-solid fa-circle-question" style="margin-right:8px;color:var(--primary-color);"></i>Nhập thông tin</h3>
                        <button class="staff-modal-close" data-action="cancel"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="staff-modal-body">
                        <p style="margin-bottom:12px;color:var(--dash-text-muted);font-size:.92rem;line-height:1.5;">${String(message || "Nhập thông tin:")}</p>
                        <input type="text" id="${modalId}-input" class="staff-input" style="width:100%;" value="${defaultValue}" />
                    </div>
                    <div class="staff-modal-footer">
                        <button class="dash-btn-secondary" data-action="cancel">Hủy</button>
                        <button class="dash-btn-primary" data-action="confirm"><i class="fa-solid fa-check"></i> Xác nhận</button>
                    </div>
                </div>
            </div>`;
    document.body.insertAdjacentHTML("beforeend", markup);
    const modal = document.getElementById(modalId);
    const input = document.getElementById(`${modalId}-input`);

    setTimeout(() => {
      if (input) input.focus();
    }, 50);

    const close = (value) => {
      modal?.remove();
      resolve(value);
    };

    modal?.addEventListener("click", (e) => {
      const action = e.target
        ?.closest?.("[data-action]")
        ?.getAttribute("data-action");
      if (e.target === modal || action === "cancel") {
        close(null);
        return;
      }
      if (action === "confirm") {
        close(input ? input.value : null);
      }
    });

    if (input) {
      input.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
          close(input.value);
        }
      });
    }
  });
};

window.escapeHtml = function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

window.exportRowsToCsv = function exportRowsToCsv(
  rows,
  filename = "export.csv",
) {
  if (!Array.isArray(rows) || rows.length === 0) {
    window.showWarningToast("Không có dữ liệu để xuất");
    return;
  }

  const headers = Object.keys(rows[0] || {});
  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(",")),
  ];
  const csvContent = `\ufeff${csvLines.join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  window.showSuccessToast("Xuất file thành công");
};

window.exportTableToCsv = function exportTableToCsv(
  tableOrSelector,
  filename = "export.csv",
) {
  const table =
    typeof tableOrSelector === "string"
      ? document.querySelector(tableOrSelector)
      : tableOrSelector;
  if (!table) {
    window.showWarningToast("Không tìm thấy bảng để xuất");
    return;
  }

  const rows = Array.from(table.querySelectorAll("tr"));
  if (!rows.length) {
    window.showWarningToast("Không có dữ liệu để xuất");
    return;
  }

  const csvLines = rows.map((row) => {
    const cells = Array.from(row.querySelectorAll("th,td")).map((cell) =>
      escapeCsvValue(cell.innerText.replace(/\s+/g, " ").trim()),
    );
    return cells.join(",");
  });
  const csvContent = `\ufeff${csvLines.join("\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  window.showSuccessToast("Xuất Excel thành công");
};

function ensureAdminHeaderLogout() {
  if (!document.body.classList.contains("admin-dashboard")) return;
  const headerRight = document.querySelector(".dash-header-right");
  if (!headerRight || headerRight.querySelector(".dash-topbar-logout")) return;

  const btn = document.createElement("a");
  btn.href = "#";
  btn.className = "dash-topbar-logout";
  btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Đăng Xuất';
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    await window.logout();
  });
  headerRight.appendChild(btn);
}

window.hydrateAdminUserProfile = function hydrateAdminUserProfile(user) {
  if (!user?.firstName || !user?.lastName) return;
  const name = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const nameNode = document.querySelector(".dash-user-name");
  const roleNode = document.querySelector(".dash-user-role");
  const avatarNode = document.querySelector(".dash-user-avatar");
  if (nameNode) nameNode.textContent = name;
  if (roleNode)
    roleNode.textContent = window.getRoleDisplayName(user.role) || "Nhân Viên";
  if (avatarNode) avatarNode.textContent = initials;
};

function getOrCreateActionsBar(searchBox) {
  const contentContainer = document.querySelector(".dash-content-container");
  if (!contentContainer) return null;

  let actionsBar = contentContainer.querySelector(".dash-actions-bar");
  if (!actionsBar) {
    actionsBar = document.createElement("div");
    actionsBar.className = "dash-actions-bar";
    const filterGroup = document.createElement("div");
    filterGroup.className = "dash-filter-group";
    actionsBar.appendChild(filterGroup);

    const kpiGrid = contentContainer.querySelector(".dash-kpi-grid");
    if (kpiGrid && kpiGrid.nextSibling) {
      contentContainer.insertBefore(actionsBar, kpiGrid.nextSibling);
    } else {
      contentContainer.prepend(actionsBar);
    }
  }

  let filterGroup = actionsBar.querySelector(".dash-filter-group");
  if (!filterGroup) {
    filterGroup = document.createElement("div");
    filterGroup.className = "dash-filter-group";
    actionsBar.prepend(filterGroup);
  }

  if (searchBox && !filterGroup.contains(searchBox)) {
    filterGroup.prepend(searchBox);
  }

  return actionsBar;
}

function moveHeaderSearchToActionsBar() {
  if (!document.body.classList.contains("admin-dashboard")) return;
  const headerSearchBoxes = document.querySelectorAll(
    ".dash-header .dash-search-box",
  );
  headerSearchBoxes.forEach((searchBox) => {
    if (searchBox.closest(".dash-actions-bar")) return;
    getOrCreateActionsBar(searchBox);
  });
}

let ownerAlertPollTimer = null;
let ownerAlertRows = [];

function formatRealtimeClockNow() {
  const now = new Date();
  const date = now.toLocaleDateString("vi-VN");
  const time = now.toLocaleTimeString("vi-VN", { hour12: false });
  return `${time} • ${date}`;
}

function ensureRealtimeChip(container) {
  if (!container || container.querySelector(".topbar-realtime-chip")) return;
  const chip = document.createElement("div");
  chip.className = "topbar-realtime-chip";
  chip.innerHTML =
    '<span class="topbar-realtime-dot"></span><span class="topbar-realtime-text"></span>';
  container.prepend(chip);
}

function startTopbarRealtimeClock() {
  const adminHeaderRight = document.querySelector(".dash-header-right");
  const cashierTopbarRight = document.querySelector(".cashier-topbar-right");
  if (adminHeaderRight) ensureRealtimeChip(adminHeaderRight);
  if (cashierTopbarRight) ensureRealtimeChip(cashierTopbarRight);

  const render = () => {
    document.querySelectorAll(".topbar-realtime-text").forEach((node) => {
      node.textContent = formatRealtimeClockNow();
    });
  };
  render();
  setInterval(render, 1000);
}

function setOwnerAlertBadge(count) {
  const safeCount = Math.max(0, Number(count) || 0);
  document.querySelectorAll(".dash-notification-btn").forEach((btn) => {
    let dot = btn.querySelector(".dash-notification-dot");
    if (!dot) {
      dot = document.createElement("span");
      dot.className = "dash-notification-dot";
      btn.appendChild(dot);
    }
    dot.textContent = safeCount > 0 ? String(Math.min(99, safeCount)) : "";
    dot.style.display = safeCount > 0 ? "inline-flex" : "";
    dot.style.alignItems = safeCount > 0 ? "center" : "";
    dot.style.justifyContent = safeCount > 0 ? "center" : "";
    dot.style.minWidth = safeCount > 0 ? "16px" : "";
    dot.style.height = safeCount > 0 ? "16px" : "";
    dot.style.fontSize = safeCount > 0 ? "10px" : "";
    dot.style.borderRadius = safeCount > 0 ? "999px" : "";
  });
}

function closeNotificationPopover() {
  document.getElementById("dashNotificationPopover")?.classList.remove("open");
}

function ensureNotificationPopover() {
  let popover = document.getElementById("dashNotificationPopover");
  if (popover) return popover;

  const wrapper = document.createElement("div");
  wrapper.id = "dashNotificationPopover";
  wrapper.className = "dash-notification-popover";
  wrapper.innerHTML = `
    <div class="dash-notification-popover-header">
      <span>Thông báo hệ thống</span>
      <button type="button" class="dash-notification-popover-close" id="dashNotificationPopoverClose">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="dash-notification-list" id="dashNotificationList"></div>
  `;
  document.body.appendChild(wrapper);
  popover = wrapper;

  document
    .getElementById("dashNotificationPopoverClose")
    ?.addEventListener("click", () => {
      closeNotificationPopover();
    });

  document.addEventListener("click", (e) => {
    const isInsidePopover = e.target?.closest?.("#dashNotificationPopover");
    const isBellButton = e.target?.closest?.(".dash-notification-btn");
    if (!isInsidePopover && !isBellButton) {
      closeNotificationPopover();
    }
  });

  return popover;
}

function renderNotificationList(rows) {
  const listNode = document.getElementById("dashNotificationList");
  if (!listNode) return;
  if (!Array.isArray(rows) || rows.length === 0) {
    listNode.innerHTML = `<div class="dash-notification-item"><div class="dash-notification-item-title">Hiện chưa có thông báo mới</div></div>`;
    return;
  }

  listNode.innerHTML = rows
    .slice(0, 20)
    .map((entry) => {
      const created = entry?.createdAtUtc
        ? new Date(entry.createdAtUtc).toLocaleString("vi-VN", {
            hour12: false,
          })
        : "-";
      return `
        <div class="dash-notification-item">
          <div class="dash-notification-item-title">${entry.description || "Thông báo hệ thống"}</div>
          <div class="dash-notification-item-meta">${entry.actionType || "SYSTEM"} • ${created}</div>
        </div>
      `;
    })
    .join("");
}

async function pollOwnerAlerts() {
  const user = window.getCurrentUser();
  if (window.normalizeRole(user?.role) !== "Admin") {
    ownerAlertRows = [];
    setOwnerAlertBadge(0);
    return;
  }

  try {
    const response = await fetch("/systemactivitylogs?limit=20", {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      ownerAlertRows = [];
      setOwnerAlertBadge(0);
      return;
    }
    ownerAlertRows = rows;

    const latestId = Number(rows[0]?.activityLogId || 0);
    const seenId = Number(
      sessionStorage.getItem("ownerSeenActivityLogId") || 0,
    );
    const unseenRows = rows.filter(
      (x) => Number(x.activityLogId || 0) > seenId,
    );
    setOwnerAlertBadge(unseenRows.length);

    if (seenId > 0 && unseenRows.length > 0) {
      unseenRows
        .slice(0, 2)
        .reverse()
        .forEach((entry) => {
          window.showToast(
            `${entry.description || "Có hoạt động mới"} (${entry.actionType || "SYSTEM"})`,
            "warning",
            3200,
          );
        });
    }

    if (seenId <= 0) {
      sessionStorage.setItem("ownerSeenActivityLogId", String(latestId));
    }
  } catch {
    // no-op
  }
}

function bindNotificationButtons() {
  document.querySelectorAll(".dash-notification-btn").forEach((btn) => {
    if (btn.dataset.boundNotification === "1") return;
    btn.dataset.boundNotification = "1";
    btn.addEventListener("click", async () => {
      const role = window.normalizeRole(window.getCurrentUser()?.role);
      if (role !== "Admin") {
        window.showToast("Hiện không có thông báo mới", "info");
        return;
      }
      await pollOwnerAlerts();
      const popover = ensureNotificationPopover();
      renderNotificationList(ownerAlertRows);
      popover?.classList.toggle("open");
      if (Array.isArray(ownerAlertRows) && ownerAlertRows.length > 0) {
        const latestId = Number(ownerAlertRows[0]?.activityLogId || 0);
        sessionStorage.setItem("ownerSeenActivityLogId", String(latestId));
      }
      setOwnerAlertBadge(0);
    });
  });
}

function startOwnerAlertPolling() {
  if (ownerAlertPollTimer) clearInterval(ownerAlertPollTimer);
  pollOwnerAlerts();
  ownerAlertPollTimer = setInterval(pollOwnerAlerts, 15000);
}

function bindSettingsLinks() {
  const role = window.normalizeRole(window.getCurrentUser()?.role);
  document.querySelectorAll(".dash-settings-link").forEach((link) => {
    if (role === "Admin") {
      link.href = "/app/settings";
      link.removeAttribute("aria-disabled");
      return;
    }

    link.href = "#";
    link.setAttribute("aria-disabled", "true");
    if (link.dataset.boundSettingsGuard === "1") return;
    link.dataset.boundSettingsGuard = "1";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      window.showWarningToast?.("Chỉ Admin mới có quyền truy cập Cài đặt");
    });
  });
}

function bindExportButtons() {
  const exportButtons = Array.from(
    document.querySelectorAll("button, a"),
  ).filter((btn) => {
    const text = String(btn.textContent || "").toLowerCase();
    return (
      btn.classList.contains("dash-export-btn") ||
      text.includes("xuất excel") ||
      text.includes("xuất file")
    );
  });

  exportButtons.forEach((btn) => {
    if (btn.dataset.boundExport === "1") return;
    btn.dataset.boundExport = "1";
    btn.addEventListener("click", (e) => {
      if (btn.dataset.customExport === "1") return;
      e.preventDefault();
      const table = document.querySelector(".dash-table");
      if (table) {
        const title = String(document.title || "export")
          .toLowerCase()
          .replace(/[^\w]+/g, "-")
          .replace(/^-|-$/g, "");
        window.exportTableToCsv(table, `${title || "export"}.csv`);
        return;
      }
      window.showWarningToast("Không có dữ liệu bảng để xuất");
    });
  });
}

function ensureSidebarLink(nav, href, iconClass, text, beforeHref = "") {
  if (!nav) return;
  const existing = nav.querySelector(`a[href="${href}"]`);
  if (existing) return;

  const link = document.createElement("a");
  link.href = href;
  link.className = "dash-nav-item";
  link.innerHTML = `<i class="fa-solid ${iconClass} dash-nav-icon"></i><span class="dash-nav-text">${text}</span>`;

  if (beforeHref) {
    const beforeNode = nav.querySelector(`a[href="${beforeHref}"]`);
    if (beforeNode) {
      nav.insertBefore(link, beforeNode);
      return;
    }
  }

  nav.appendChild(link);
}

function enhanceAdminSidebarNav() {
  if (!document.body.classList.contains("admin-dashboard")) return;
  const nav = document.querySelector(".dash-sidebar .dash-nav");
  if (!nav) return;

  const inventoryLink = nav.querySelector('a[href="/app/inventory"]');
  if (inventoryLink) {
    const iconNode = inventoryLink.querySelector(".dash-nav-icon");
    const textNode = inventoryLink.querySelector(".dash-nav-text");
    if (iconNode) iconNode.className = "fa-solid fa-box dash-nav-icon";
    if (textNode) textNode.textContent = "Kho Hàng";
  }

  nav.querySelectorAll('a[href="TablesManagement.html"]').forEach((node) => {
    node.remove();
  });
  nav.querySelectorAll(".dash-nav-item .dash-nav-text").forEach((textNode) => {
    const normalized = String(textNode.textContent || "")
      .trim()
      .toLowerCase();
    if (normalized === "quản lý bàn" || normalized === "quản lí bàn") {
      textNode.closest(".dash-nav-item")?.remove();
    }
  });
  ensureSidebarLink(
    nav,
    "/app/vouchers",
    "fa-ticket",
    "Mã Giảm Giá",
    "/app/reports",
  );
}

function highlightActiveNavItem() {
  const currentPath = window.location.pathname.replace(/\/$/, "");

  // Highlight sidebar nav items
  document.querySelectorAll(".dash-sidebar .dash-nav-item, .dash-bottom-actions .dash-nav-item").forEach((link) => {
    link.classList.remove("active");
    const href = (link.getAttribute("href") || "").replace(/\/$/, "");
    if (!href || href === "#") return;
    if (currentPath === href || currentPath.startsWith(href + "/")) {
      link.classList.add("active");
    }
  });

  // Highlight cashier topbar nav items if present
  document.querySelectorAll(".cashier-topbar-nav .cashier-topbar-nav-item, .cashier-topbar-tabs .cashier-topbar-tab").forEach((link) => {
    link.classList.remove("active");
    const href = (link.getAttribute("href") || "").replace(/\/$/, "");
    if (!href || href === "#") return;
    if (currentPath === href) {
      link.classList.add("active");
    }
  });
}

function removeHeaderCheckboxes() {
  document
    .querySelectorAll(".dash-table thead input[type='checkbox']")
    .forEach((checkbox) => {
      const th = checkbox.closest("th");
      checkbox.remove();
      if (th) th.classList.remove("td-checkbox");
    });
}

document.addEventListener("DOMContentLoaded", () => {
  ensureToastStyles();
  startTopbarRealtimeClock();
  enhanceAdminSidebarNav();
  highlightActiveNavItem(); // Must run AFTER enhanceAdminSidebarNav so dynamic links are present
  bindSettingsLinks();
  ensureAdminHeaderLogout();
  moveHeaderSearchToActionsBar();
  bindNotificationButtons();
  startOwnerAlertPolling();
  bindExportButtons();
  removeHeaderCheckboxes();
});
