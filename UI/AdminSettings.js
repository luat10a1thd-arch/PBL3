const SETTINGS_API_URL =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";

let settingsState = {
  config: null,
  activityLogs: [],
};

async function settingsApiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${SETTINGS_API_URL}${endpoint}`, {
    ...options,
  });

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

function summarizeUsers(users) {
  const rows = Array.isArray(users) ? users : [];
  const isRole = (value, role) =>
    window.isRoleAllowed?.(value, role) || window.normalizeRole(value) === role;

  const total = rows.length;
  const adminCount = rows.filter((u) => isRole(u.role, "Admin")).length;
  const managerCount = rows.filter(
    (u) => window.normalizeRole(u.role) === "Manager",
  ).length;
  const staffCount = rows.filter(
    (u) => window.normalizeRole(u.role) === "Staff",
  ).length;

  const totalNode = document.getElementById("settingsTotalUsers");
  const adminNode = document.getElementById("settingsAdminCount");
  const managerNode = document.getElementById("settingsManagerCount");
  const staffNode = document.getElementById("settingsStaffCount");

  if (totalNode) totalNode.textContent = String(total);
  if (adminNode) adminNode.textContent = String(adminCount);
  if (managerNode) managerNode.textContent = String(managerCount);
  if (staffNode) staffNode.textContent = String(staffCount);
}

function bindConfigToForm(config) {
  const setValue = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.value = value ?? "";
  };
  const setChecked = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.checked = !!value;
  };

  setValue("cfgStoreName", config.storeName);
  setValue("cfgStoreAddress", config.storeAddress);
  setValue("cfgStorePhone", config.storePhone);
  setValue("cfgStoreEmail", config.storeEmail);
  setValue("cfgTimeZoneId", config.timeZoneId);
  setValue("cfgVatRatePercent", config.vatRatePercent);
  setValue("cfgOpenTime", config.openTime);
  setValue("cfgCloseTime", config.closeTime);
  setValue("cfgSessionTimeoutMinutes", config.sessionTimeoutMinutes);
  setValue("cfgMinPasswordLength", config.minPasswordLength);
  setValue("cfgCloudinaryCloudName", config.cloudinaryCloudName);
  setValue("cfgCloudinaryApiKey", config.cloudinaryApiKey);
  setValue("cfgCloudinaryApiSecret", config.cloudinaryApiSecret);
  setValue("cfgCloudinaryFolder", config.cloudinaryFolder);
  setValue("cfgUpdatedAt", config.updatedAtUtc || "");
  setChecked("cfgEnableRealtimeSync", config.enableRealtimeSync);
  setChecked("cfgAllowManualShiftOpen", config.allowManualShiftOpen);
}

function readConfigFromForm() {
  const byId = (id) => document.getElementById(id);
  return {
    storeName: String(byId("cfgStoreName")?.value || "").trim(),
    storeAddress: String(byId("cfgStoreAddress")?.value || "").trim(),
    storePhone: String(byId("cfgStorePhone")?.value || "").trim(),
    storeEmail: String(byId("cfgStoreEmail")?.value || "").trim(),
    timeZoneId: String(byId("cfgTimeZoneId")?.value || "").trim(),
    vatRatePercent: Number(byId("cfgVatRatePercent")?.value || 0),
    openTime: String(byId("cfgOpenTime")?.value || "").trim(),
    closeTime: String(byId("cfgCloseTime")?.value || "").trim(),
    sessionTimeoutMinutes: Number(byId("cfgSessionTimeoutMinutes")?.value || 0),
    minPasswordLength: Number(byId("cfgMinPasswordLength")?.value || 0),
    cloudinaryCloudName: String(
      byId("cfgCloudinaryCloudName")?.value || "",
    ).trim(),
    cloudinaryApiKey: String(byId("cfgCloudinaryApiKey")?.value || "").trim(),
    cloudinaryApiSecret: String(
      byId("cfgCloudinaryApiSecret")?.value || "",
    ).trim(),
    cloudinaryFolder: String(byId("cfgCloudinaryFolder")?.value || "").trim(),
    enableRealtimeSync: !!byId("cfgEnableRealtimeSync")?.checked,
    allowManualShiftOpen: !!byId("cfgAllowManualShiftOpen")?.checked,
  };
}

async function loadSystemConfig() {
  const config = await settingsApiRequest("/systemconfig");
  if (!config) return;
  settingsState.config = config;
  bindConfigToForm(config);
}

async function saveSystemConfig() {
  const payload = readConfigFromForm();
  if (!payload.storeName) {
    window.showWarningToast?.("Tên cửa hàng không được để trống");
    return;
  }
  if (!payload.timeZoneId) {
    window.showWarningToast?.("Vui lòng chọn múi giờ");
    return;
  }
  if (!payload.openTime || !payload.closeTime) {
    window.showWarningToast?.("Vui lòng nhập giờ mở cửa và đóng cửa");
    return;
  }
  if (
    Number.isNaN(payload.vatRatePercent) ||
    payload.vatRatePercent < 0 ||
    payload.vatRatePercent > 100
  ) {
    window.showWarningToast?.("VAT phải từ 0 đến 100");
    return;
  }
  if (
    Number.isNaN(payload.sessionTimeoutMinutes) ||
    payload.sessionTimeoutMinutes < 15 ||
    payload.sessionTimeoutMinutes > 1440
  ) {
    window.showWarningToast?.("Timeout phiên phải từ 15 đến 1440 phút");
    return;
  }
  if (
    Number.isNaN(payload.minPasswordLength) ||
    payload.minPasswordLength < 6 ||
    payload.minPasswordLength > 64
  ) {
    window.showWarningToast?.("Độ dài mật khẩu tối thiểu phải từ 6 đến 64");
    return;
  }
  const hasAnyCloudinary =
    !!payload.cloudinaryCloudName ||
    !!payload.cloudinaryApiKey ||
    !!payload.cloudinaryApiSecret;
  if (
    hasAnyCloudinary &&
    (!payload.cloudinaryCloudName ||
      !payload.cloudinaryApiKey ||
      !payload.cloudinaryApiSecret)
  ) {
    window.showWarningToast?.(
      "Cloudinary yêu cầu nhập đủ CloudName, ApiKey và ApiSecret",
    );
    return;
  }

  const saved = await settingsApiRequest("/systemconfig", "PUT", payload);
  if (!saved) return;
  settingsState.config = saved;
  bindConfigToForm(saved);
  window.showSuccessToast?.("Lưu cài đặt thành công");
}

function formatLocalDateTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.toLocaleDateString("vi-VN")} ${d.toLocaleTimeString("vi-VN", { hour12: false })}`;
}

function renderActivityLogs(rows) {
  const tbody = document.getElementById("activityLogTableBody");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--dash-text-muted)">Không có dữ liệu log phù hợp</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(
      (log) => `
        <tr>
            <td><span class="dash-product-name">${formatLocalDateTime(log.createdAtUtc)}</span></td>
            <td><span class="dash-product-name">${log.actorDisplayName || "Hệ thống"}</span></td>
            <td><span class="dash-category-badge coffee">${log.actionType || "-"}</span></td>
            <td><span class="dash-product-name">${log.description || "-"}</span></td>
            <td><span class="dash-status-indicator"><span class="${String(log.severity || "").toLowerCase() === "warning" ? "text-warning" : "text-success"}">${log.severity || "Info"}</span></span></td>
        </tr>
    `,
    )
    .join("");
}

async function loadActivityLogs() {
  const actionType = String(
    document.getElementById("activityActionFilter")?.value || "",
  ).trim();
  const keyword = String(
    document.getElementById("activityKeywordInput")?.value || "",
  ).trim();
  const query = new URLSearchParams();
  query.set("limit", "120");
  if (actionType) query.set("actionType", actionType);
  if (keyword) query.set("keyword", keyword);

  const rows = await settingsApiRequest(
    `/systemactivitylogs?${query.toString()}`,
  );
  settingsState.activityLogs = Array.isArray(rows) ? rows : [];
  renderActivityLogs(settingsState.activityLogs);
}

function setupSettingsActions() {
  const btnReload = document.getElementById("btnReloadSettings");
  const btnSave = document.getElementById("btnSaveSettings");
  if (btnReload) {
    btnReload.addEventListener("click", async () => {
      try {
        await loadSystemConfig();
        window.showToast?.("Đã tải lại cài đặt", "info");
      } catch (error) {
        window.showErrorToast?.(error.message || "Không thể tải lại cài đặt");
      }
    });
  }
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      try {
        await saveSystemConfig();
      } catch (error) {
        window.showErrorToast?.(error.message || "Không thể lưu cài đặt");
      }
    });
  }

  const reloadActivityBtn = document.getElementById("btnReloadActivity");
  if (reloadActivityBtn) {
    reloadActivityBtn.addEventListener("click", async () => {
      try {
        await loadActivityLogs();
        window.showToast?.("Đã tải lại nhật ký hệ thống", "info");
      } catch (error) {
        window.showErrorToast?.(
          error.message || "Không thể tải nhật ký hệ thống",
        );
      }
    });
  }

  const actionFilter = document.getElementById("activityActionFilter");
  if (actionFilter) {
    actionFilter.addEventListener("change", () => {
      loadActivityLogs().catch(() => {});
    });
  }

  const keywordInput = document.getElementById("activityKeywordInput");
  if (keywordInput) {
    let keywordDebounce = null;
    keywordInput.addEventListener("input", () => {
      clearTimeout(keywordDebounce);
      keywordDebounce = setTimeout(() => {
        loadActivityLogs().catch(() => {});
      }, 400);
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = window.ensureAuthByRole(["Admin"]);
    if (!user) return;

    window.hydrateAdminUserProfile?.(user);
    setupSidebar();

    const users = await settingsApiRequest("/users");
    if (users) summarizeUsers(users);
    await loadSystemConfig();
    await loadActivityLogs();
    setupSettingsActions();
  } catch (error) {
    window.showErrorToast?.(error.message || "Không thể tải dữ liệu cài đặt");
  }
});

