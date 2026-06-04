const STAFF_API_URL =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";
let staffState = {
  employees: [],
  role: "",
  keyword: "",
  editingEmployeeId: null,
};
let selectedStaffIds = [];

function formatCurrencyVnd(amount) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount || 0);
}

function parseSalary(salary) {
  const raw = String(salary || "").trim();
  if (!raw) return 0;
  const normalized = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isNaN(value) ? 0 : value;
}

function roleBadgeClass(role) {
  const r = normalizeStaffRole(role);
  if (r === "Manager") return "coffee";
  return "tea";
}

function normalizeStaffRole(role) {
  const r = (role || "").toString().trim().toLowerCase();
  if (
    r === "manager" ||
    r === "admin" ||
    r === "owner" ||
    r === "quản lý" ||
    r === "quan ly" ||
    r === "chủ quán" ||
    r === "chu quan"
  ) {
    return "Manager";
  }
  if (
    r === "staff" ||
    r === "nhân viên" ||
    r === "nhan vien" ||
    r === "pha chế" ||
    r === "pha che" ||
    r === "thu ngân" ||
    r === "thu ngan" ||
    r === "phục vụ" ||
    r === "phuc vu"
  ) {
    return "Staff";
  }
  return "Staff";
}

function getStaffRoleLabel(role) {
  return normalizeStaffRole(role) === "Manager" ? "Quản lí" : "Nhân viên";
}

function initialsFromName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "NV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarColorById(id) {
  const colors = [
    "#c56517",
    "#3b82f6",
    "#a855f7",
    "#22c55e",
    "#ef4444",
    "#0ea5e9",
  ];
  return colors[Math.abs(Number(id || 0)) % colors.length];
}

async function staffApiRequest(endpoint, method = "GET", body = null) {
  const options = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${STAFF_API_URL}${endpoint}`, options);
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

function updateStaffKpis(employees) {
  const kpis = document.querySelectorAll(".dash-kpi-value");
  if (kpis.length < 4) return;

  const total = employees.length;
  const active = employees.length;
  const onLeave = 0;
  const salaryTotal = employees.reduce(
    (sum, e) => sum + parseSalary(e.basicSalary),
    0,
  );

  kpis[0].textContent = String(total);
  kpis[1].textContent = String(active);
  kpis[2].textContent = String(onLeave);
  kpis[3].textContent = formatCurrencyVnd(salaryTotal);
}

function renderStaffRows(employees) {
  const tbody = document.getElementById("staffTableBody");
  if (!tbody) return;

  if (!employees.length) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 32px; color:#b6a8a2;">Không có dữ liệu nhân viên</td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = employees
    .map((e) => {
      const id = Number(e.employeeId ?? 0);
      const name = (e.name || "Nhân viên").trim();
      const role = normalizeStaffRole(e.role);
      const salary = parseSalary(e.basicSalary);
      const initials = initialsFromName(name);
      const avatarColor = avatarColorById(id);

      return `
            <tr data-id="${id}">
                <td class="td-checkbox"><input type="checkbox" class="row-checkbox" value="${id}" ${selectedStaffIds.includes(id) ? "checked" : ""} /></td>
                <td>
                    <div class="dash-product-cell">
                        <div class="dash-staff-avatar" style="background-color: ${avatarColor};">${initials}</div>
                        <div class="dash-product-info">
                            <span class="dash-product-name">${name}</span>
                            <span class="dash-product-id">Mã: NV-${String(id).padStart(3, "0")}</span>
                        </div>
                    </div>
                </td>
                <td><span class="dash-category-badge ${roleBadgeClass(role)}">${getStaffRoleLabel(role)}</span></td>
                <td>
                    <div class="dash-flex-col">
                        <span class="fw-500" style="color:white;">---</span>
                        <span class="dash-product-id">---</span>
                    </div>
                </td>
                <td>
                    <div class="dash-flex-col">
                        <span style="color:white; font-size:0.85rem;">---</span>
                        <span class="dash-product-id">---</span>
                    </div>
                </td>
                <td class="right dash-price">${formatCurrencyVnd(salary)}</td>
                <td>
                    <div class="dash-status-indicator justify-center">
                        <div class="dash-status-dot in-stock"></div>
                        <span class="text-success">Đang làm</span>
                    </div>
                </td>
                <td class="right td-actions">
                    <div class="dash-table-actions">
                        <button class="dash-action-btn" title="Chi tiết"><i class="fa-solid fa-eye"></i></button>
                        <button class="dash-action-btn" title="Chỉnh sửa"><i class="fa-solid fa-pen"></i></button>
                        <button class="dash-action-btn delete" title="Xoá"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");
}

function getFilteredEmployees() {
  let data = [...staffState.employees];

  if (staffState.role) {
    data = data.filter((e) => normalizeStaffRole(e.role) === staffState.role);
  }

  if (staffState.keyword) {
    const keyword = staffState.keyword.toLowerCase();
    data = data.filter((e) => (e.name || "").toLowerCase().includes(keyword));
  }

  return data;
}

function updateFilterButtonCounts() {
  const buttons = document.querySelectorAll(".dash-filter-btn[data-role]");
  buttons.forEach((btn) => {
    const role = btn.dataset.role || "";
    const baseText = btn.textContent.split(" (")[0];
    const count = role
      ? staffState.employees.filter((e) => normalizeStaffRole(e.role) === role)
          .length
      : staffState.employees.length;
    btn.textContent = `${baseText} (${count})`;
  });
}

function updateStaffPaginationInfo(count) {
  const info = document.querySelector(".dash-pagination-info");
  if (!info) return;
  const controls = document.querySelector(".dash-pagination-controls");
  if (count <= 0) {
    info.textContent = "Không có dữ liệu nhân viên";
    if (controls) controls.style.display = "none";
    return;
  }
  if (controls) {
    controls.style.display = "flex";
    controls.innerHTML = `
      <button class="dash-page-btn" disabled><i class="fa-solid fa-chevron-left"></i></button>
      <button class="dash-page-btn active">1</button>
      <button class="dash-page-btn" disabled><i class="fa-solid fa-chevron-right"></i></button>
    `;
  }
  info.textContent = `Đang hiển thị 1 đến ${count} trong số ${count} kết quả`;
}

function redrawStaff() {
  const filtered = getFilteredEmployees();
  renderStaffRows(filtered);
  updateStaffKpis(filtered);
  updateStaffPaginationInfo(filtered.length);
  updateFilterButtonCounts();
}

function updateBulkDeleteButton() {
  const btn = document.getElementById("btnBulkDelete");
  if (btn) {
    btn.style.display = selectedStaffIds.length > 0 ? "inline-block" : "none";
    btn.innerHTML = `<i class="fa-solid fa-trash"></i> Xóa Đã Chọn (${selectedStaffIds.length})`;
  }
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

function setupModal() {
  const modal = document.getElementById("staffModal");
  const addBtn = document.getElementById("btnAddStaff");
  const closeBtn = document.getElementById("btnCloseModal");
  const cancelBtn = document.getElementById("btnCancelModal");
  if (!modal || !addBtn || !closeBtn || !cancelBtn) return;

  addBtn.addEventListener("click", () => {
    clearStaffForm();
    modal.classList.add("visible");
  });
  closeBtn.addEventListener("click", () => {
    modal.classList.remove("visible");
    clearStaffForm();
  });
  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("visible");
    clearStaffForm();
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("visible");
      clearStaffForm();
    }
  });

  const roleInput = document.getElementById("staffRoleInput");
  if (roleInput) {
    const user = window.getCurrentUser();
    const role = window.normalizeRole(user?.role);
    if (role !== "Admin") {
      Array.from(roleInput.options).forEach((opt) => {
        if (opt.value === "Manager") {
          opt.style.display = "none";
          opt.disabled = true;
        }
      });
    }
  }

  const tableBody = document.querySelector(".dash-table tbody");
  if (tableBody) {
    tableBody.addEventListener("change", (e) => {
      if (e.target.classList.contains("row-checkbox")) {
        const id = Number(e.target.value);
        if (e.target.checked) {
          if (!selectedStaffIds.includes(id)) selectedStaffIds.push(id);
        } else {
          selectedStaffIds = selectedStaffIds.filter((x) => x !== id);
        }
        updateBulkDeleteButton();
      }
    });
  }

  const btnBulkDelete = document.getElementById("btnBulkDelete");
  if (btnBulkDelete) {
    btnBulkDelete.addEventListener("click", async () => {
      if (selectedStaffIds.length === 0) return;
      if (typeof window.showConfirmModal !== "function") {
        window.showWarningToast?.("Không thể mở popup xác nhận");
        return;
      }
      const confirmed = await window.showConfirmModal(
        `Bạn có chắc muốn xóa ${selectedStaffIds.length} nhân viên đã chọn?`,
      );
      if (!confirmed) return;

      try {
        for (const id of selectedStaffIds) {
          await fetch(`${STAFF_API_URL}/Users/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
        }
        window.showSuccessToast?.(
          `Xóa ${selectedStaffIds.length} nhân viên thành công`,
        );
      } catch (err) {
        window.showErrorToast?.("Có lỗi xảy ra: " + err.message);
      } finally {
        selectedStaffIds = [];
        updateBulkDeleteButton();
        const employees = await staffApiRequest("/employees");
        if (employees) {
          staffState.employees = employees;
          redrawStaff();
        }
      }
    });
  }
}



function clearStaffForm() {
  const ids = [
    "staffNameInput",
    "staffRoleInput",
    "staffShiftInput",
    "staffPhoneInput",
    "staffEmailInput",
    "staffUsernameInput",
    "staffPasswordInput",
    "staffSalaryInput",
    "staffStatusInput",
    "staffAddressInput",
    "staffStartDateInput",
    "staffIdentityInput",
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else {
      el.value = "";
    }
  });
  staffState.editingEmployeeId = null;
  const title = document.getElementById("modalTitle");
  if (title) title.textContent = "Thêm Nhân Viên Mới";
}

function findRoleOptionValueByLabel(label) {
  const normalized = normalizeStaffRole(label);
  return normalized;
}

function openEditModal(employeeId) {
  const modal = document.getElementById("staffModal");
  if (!modal) return;
  const employee = staffState.employees.find(
    (e) => Number(e.employeeId) === Number(employeeId),
  );
  if (!employee) {
    window.showErrorToast?.("Không tìm thấy nhân viên");
    return;
  }

  staffState.editingEmployeeId = Number(employeeId);
  const title = document.getElementById("modalTitle");
  if (title) title.textContent = "Cập Nhật Nhân Viên";

  const nameInput = document.getElementById("staffNameInput");
  const roleInput = document.getElementById("staffRoleInput");
  const salaryInput = document.getElementById("staffSalaryInput");
  const usernameInput = document.getElementById("staffUsernameInput");
  const passwordInput = document.getElementById("staffPasswordInput");

  if (nameInput) nameInput.value = employee.name || "";
  if (roleInput) roleInput.value = findRoleOptionValueByLabel(employee.role);
  if (salaryInput)
    salaryInput.value = String(parseSalary(employee.basicSalary) || 0);
  if (usernameInput) usernameInput.value = "";
  if (passwordInput) passwordInput.value = "";

  modal.classList.add("visible");
}

async function deleteEmployee(employeeId) {
  const confirmed = await window.showConfirmModal?.(
    "Bạn có chắc muốn xóa nhân viên này?",
  );
  if (!confirmed) return;
  try {
    await staffApiRequest(`/employees/${employeeId}`, "DELETE");
    const employees = await staffApiRequest("/employees");
    if (employees) {
      staffState.employees = employees;
      redrawStaff();
    }
    window.showSuccessToast?.("Xóa nhân viên thành công");
  } catch (error) {
    window.showErrorToast?.(error.message || "Không thể xóa nhân viên");
  }
}

function bindTableActions() {
  const tableBody = document.getElementById("staffTableBody");
  if (!tableBody) return;

  tableBody.addEventListener("click", (e) => {
    const btn = e.target.closest("button.dash-action-btn");
    if (!btn) return;
    const row = btn.closest("tr[data-id]");
    if (!row) return;
    const id = Number(row.dataset.id);

    if (btn.querySelector(".fa-pen")) {
      openEditModal(id);
      return;
    }
    if (btn.querySelector(".fa-trash")) {
      deleteEmployee(id);
      return;
    }
    if (btn.querySelector(".fa-eye")) {
      const employee = staffState.employees.find(
        (e) => Number(e.employeeId) === id,
      );
      if (employee) {
        window.showToast?.(
          `NV-${String(id).padStart(3, "0")} • ${employee.name} • ${getStaffRoleLabel(employee.role)}`,
          "info",
          2600,
        );
      }
    }
  });
}

function setupCreateStaff() {
  const saveBtn = document.getElementById("btnSaveStaff");
  const modal = document.getElementById("staffModal");
  const nameInput = document.getElementById("staffNameInput");
  const roleInput = document.getElementById("staffRoleInput");
  const usernameInput = document.getElementById("staffUsernameInput");
  const passwordInput = document.getElementById("staffPasswordInput");
  const salaryInput = document.getElementById("staffSalaryInput");
  const codeInput = document.getElementById("staffCodeInput");

  if (
    !saveBtn ||
    !modal ||
    !nameInput ||
    !roleInput ||
    !usernameInput ||
    !passwordInput ||
    !salaryInput
  )
    return;

  const syncCodePreview = () => {
    if (!codeInput) return;
    const nextId =
      (staffState.employees.reduce(
        (max, e) => Math.max(max, Number(e.employeeId || 0)),
        0,
      ) || 0) + 1;
    codeInput.value = `NV-${String(nextId).padStart(3, "0")}`;
  };

  syncCodePreview();
  nameInput.addEventListener("input", syncCodePreview);
  roleInput.addEventListener("change", syncCodePreview);
  roleInput.addEventListener("change", () => {
    if (!roleInput.value) return;
    roleInput.value = normalizeStaffRole(roleInput.value);
  });

  saveBtn.addEventListener("click", async () => {
    try {
      const name = nameInput.value.trim();
      const role = roleInput.value.trim();
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();
      const salaryRaw = salaryInput.value.trim();
      const isEditing = !!staffState.editingEmployeeId;

      if (!name || !role) {
        window.showWarningToast?.("Vui lòng nhập tên và chức vụ");
        return;
      }

      if (!isEditing && (!username || !password)) {
        window.showWarningToast?.(
          "Vui lòng nhập tên, chức vụ, tài khoản và mật khẩu",
        );
        return;
      }
      if (!isEditing && password.length < 6) {
        window.showWarningToast?.("Mật khẩu tối thiểu 6 ký tự");
        return;
      }

      const normalizedRole = normalizeStaffRole(role);
      const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);
      const lastName = rest.join(" ") || firstName;
      if (isEditing) {
        await staffApiRequest(
          `/employees/${staffState.editingEmployeeId}`,
          "PUT",
          {
            name,
            role: normalizedRole,
            basicSalary: salaryRaw || "0",
          },
        );
        window.showSuccessToast?.("Cập nhật nhân viên thành công");
      } else {
        await staffApiRequest("/users/register", "POST", {
          FirstName: firstName || "Nhân",
          LastName: lastName || "Viên",
          Username: username,
          Password: password,
          Role: normalizedRole,
        });

        await staffApiRequest("/employees", "POST", {
          name,
          role: normalizedRole,
          basicSalary: salaryRaw || "0",
        });
        window.showSuccessToast?.("Thêm nhân viên thành công");
      }

      const employees = await staffApiRequest("/employees");
      if (employees) {
        staffState.employees = employees;
        redrawStaff();
      }

      clearStaffForm();
      modal.classList.remove("visible");
      syncCodePreview();
    } catch (error) {
      window.showErrorToast?.(error.message || "Thêm nhân viên thất bại");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const user = window.ensureAuthByRole(["Manager"]);
    if (!user) return;

    window.hydrateAdminUserProfile?.(user);

    const isAdmin =
      user.role === 1 ||
      String(user.role).toLowerCase() === "admin" ||
      String(user.role).toLowerCase() === "owner";
    if (!isAdmin) {
      const roleSelect = document.getElementById("staffRoleInput");
      if (roleSelect) {
        const managerOption = Array.from(roleSelect.options).find(
          (opt) => opt.value === "Manager",
        );
        if (managerOption) managerOption.remove();
      }
    }

    setupSidebar();
    setupModal();

    const employees = await staffApiRequest("/employees");
    if (!employees) return;
    staffState.employees = employees;
    redrawStaff();
    setupCreateStaff();
    bindTableActions();

    const searchInput = document.getElementById("staffSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        staffState.keyword = searchInput.value.trim();
        redrawStaff();
      });
    }

    document.querySelectorAll(".dash-filter-btn[data-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".dash-filter-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        staffState.role = btn.dataset.role || "";
        selectedStaffIds = [];
        updateBulkDeleteButton();
        redrawStaff();
      });
    });
  } catch (error) {
    window.showErrorToast?.(error.message || "Không thể tải dữ liệu nhân viên");
  }
});
