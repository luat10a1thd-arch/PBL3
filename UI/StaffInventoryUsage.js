const STAFF_USAGE_API_URL =
  window.location.protocol === "file:" ? "http://localhost:4000" : "";
const STAFF_USAGE_HUB_URL = `${STAFF_USAGE_API_URL}/hubs/shifts`;

const usageState = {
  ingredients: [],
  keyword: "",
  selectedIngredient: null,
};

async function usageApiRequest(
  endpoint,
  method = "GET",
  body = null,
  allowNotFound = false,
) {
  const options = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${STAFF_USAGE_API_URL}${endpoint}`, options);
  if (response.status === 401) {
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

function formatQuantity(value) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(
    Number(value || 0),
  );
}

function getFilteredIngredients() {
  let rows = [...usageState.ingredients];
  if (usageState.keyword) {
    const keyword = usageState.keyword.toLowerCase();
    rows = rows.filter((x) =>
      String(x.name || "")
        .toLowerCase()
        .includes(keyword),
    );
  }
  return rows;
}

function renderRows() {
  const tbody = document.getElementById("usageTableBody");
  if (!tbody) return;

  const rows = getFilteredIngredients();
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--dash-text-muted)">Không có nguyên liệu phù hợp</td></tr>';
    return;
  }

  tbody.innerHTML = rows
    .map(
      (x) => `
        <tr data-id="${x.ingredientId}">
            <td><span class="dash-product-name">${x.name || "-"}</span></td>
            <td><span class="dash-category-badge coffee">${x.uoM || "-"}</span></td>
            <td class="right dash-price">${formatQuantity(x.stockQty)}</td>
            <td class="right td-actions">
                <button class="dash-action-btn" data-action="consume" title="Xuất kho"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
            </td>
        </tr>
    `,
    )
    .join("");
}

function bindUser() {
  const user = window.getCurrentUser();
  if (!user?.firstName || !user?.lastName) return;
  const name = `${user.firstName} ${user.lastName}`;
  const role =
    window.normalizeRole(user.role) === "Manager" ? "Quản lí" : "Nhân Viên";
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  const nameNode = document.querySelector(".cashier-topbar-user-name");
  const roleNode = document.querySelector(".cashier-topbar-user-role");
  const avatarNode = document.querySelector(".cashier-topbar-avatar");
  if (nameNode) nameNode.textContent = name;
  if (roleNode) roleNode.textContent = role;
  if (avatarNode) avatarNode.textContent = initials;
}

async function refreshShiftStatusText() {
  const shiftTextNode = document.getElementById("cashierShiftStatus");
  if (!shiftTextNode) return;
  try {
    const current = await usageApiRequest("/shifts/current", "GET", null, true);
    shiftTextNode.textContent = current
      ? `Ca đang mở #${current.shiftId}`
      : "Chưa mở ca";
  } catch {
    shiftTextNode.textContent = "Không thể tải trạng thái ca";
  }
}

async function startShiftHub() {
  if (!window.signalR) return;
  const connection = new window.signalR.HubConnectionBuilder()
    .withUrl(STAFF_USAGE_HUB_URL, { withCredentials: true })
    .withAutomaticReconnect()
    .build();

  connection.on("ShiftUpdated", async () => {
    await refreshShiftStatusText();
  });

  try {
    await connection.start();
  } catch {
    // no-op
  }
}

function openModal(ingredient) {
  usageState.selectedIngredient = ingredient;
  const modal = document.getElementById("usageModal");
  const nameInput = document.getElementById("usageIngredientName");
  const quantityInput = document.getElementById("usageQuantityInput");
  const noteInput = document.getElementById("usageNoteInput");

  if (nameInput)
    nameInput.value = `${ingredient.name || ""} (${formatQuantity(ingredient.stockQty)} ${ingredient.uoM || ""})`;
  if (quantityInput) quantityInput.value = "";
  if (noteInput) noteInput.value = "";
  modal?.classList.add("visible");
}

function closeModal() {
  usageState.selectedIngredient = null;
  document.getElementById("usageModal")?.classList.remove("visible");
}

async function loadIngredients() {
  const rows = await usageApiRequest("/ingredients");
  if (!rows) return;
  usageState.ingredients = rows;
  renderRows();
}

function bindEvents() {
  document
    .querySelector(".cashier-topbar-logout")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      const ok = await window.showConfirmModal?.("Đăng xuất?");
      if (!ok) return;
      await window.logout();
    });

  const searchInput = document.getElementById("usageSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      usageState.keyword = searchInput.value.trim();
      renderRows();
    });
  }

  document
    .getElementById("usageCloseBtn")
    ?.addEventListener("click", closeModal);
  document
    .getElementById("usageCancelBtn")
    ?.addEventListener("click", closeModal);
  document.getElementById("usageModal")?.addEventListener("click", (e) => {
    if (e.target?.id === "usageModal") closeModal();
  });

  document.getElementById("usageTableBody")?.addEventListener("click", (e) => {
    const btn = e.target.closest('button[data-action="consume"]');
    if (!btn) return;
    const row = btn.closest("tr[data-id]");
    if (!row) return;
    const ingredient = usageState.ingredients.find(
      (x) => Number(x.ingredientId) === Number(row.dataset.id),
    );
    if (!ingredient) return;
    openModal(ingredient);
  });

  document
    .getElementById("usageSubmitBtn")
    ?.addEventListener("click", async () => {
      const ingredient = usageState.selectedIngredient;
      if (!ingredient) return;

      const quantityInput = document.getElementById("usageQuantityInput");
      const noteInput = document.getElementById("usageNoteInput");
      const quantity = Number(quantityInput?.value || 0);
      const note = String(noteInput?.value || "").trim();
      if (!Number.isFinite(quantity) || quantity <= 0) {
        window.showWarningToast?.("Số lượng xuất không hợp lệ");
        return;
      }

      try {
        await usageApiRequest(
          `/ingredients/${ingredient.ingredientId}/consume`,
          "POST",
          {
            quantity,
            note,
          },
        );
        window.showSuccessToast?.("Xuất kho thành công");
        closeModal();
        await loadIngredients();
      } catch (error) {
        window.showErrorToast?.(error.message || "Không thể xuất kho");
      }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  const user = window.ensureAuthByRole(["Staff", "Manager"]);
  if (!user) return;
  bindUser();
  bindEvents();
  await refreshShiftStatusText();
  await loadIngredients();
  await startShiftHub();
});

