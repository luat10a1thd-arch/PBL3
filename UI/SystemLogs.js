const API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';

async function fetchLogs() {
    try {
        const keyword = document.getElementById('logKeyword').value.trim();
        const actionType = document.getElementById('logActionType').value;
        const severity = document.getElementById('logSeverity').value;
        const fromDate = document.getElementById('logFromDate').value;
        const toDate = document.getElementById('logToDate').value;

        const params = new URLSearchParams();
        if (keyword) params.append('keyword', keyword);
        if (actionType) params.append('actionType', actionType);
        if (severity) params.append('severity', severity);
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);

        const response = await fetch(`${API_URL}/SystemActivityLogs?${params.toString()}`, {
            method: 'GET',
            credentials: 'include'
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = '/app/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Không thể lấy dữ liệu logs');
        }

        const logs = await response.json();
        renderLogs(logs);
    } catch (error) {
        window.showErrorToast?.(error.message);
    }
}

function renderLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: #b6a8a2;">Không tìm thấy kết quả</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const time = new Date(log.createdAtUtc).toLocaleString('vi-VN');
        const badgeClass = log.severity === 'Critical' ? 'dash-category-badge breakfast' : (log.severity === 'Warning' ? 'dash-category-badge pastries' : 'dash-category-badge coffee');
        const badgeLabel = log.severity || 'Info';
        const actionMap = {
            'USER_REGISTER': 'Thêm Tài Khoản',
            'SHIFT_OPENED': 'Mở Ca',
            'INGREDIENT_REDUCED': 'Trừ Nguyên Liệu'
        };
        const actionLabel = actionMap[log.actionType] || log.actionType;

        return `
            <tr>
                <td style="color:#b6a8a2;">${time}</td>
                <td style="font-weight:600; color:white;">${actionLabel}</td>
                <td>${log.actorDisplayName}</td>
                <td style="color:#b6a8a2; font-size: 0.9em; max-width:300px;">${log.description}</td>
                <td><span class="${badgeClass}">${badgeLabel}</span></td>
            </tr>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const user = window.ensureAuthByRole(['Admin', 'Owner']);
    if (!user) return;
    window.hydrateAdminUserProfile?.(user);

    fetchLogs();

    document.getElementById('filterLogsForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        fetchLogs();
    });

    document.getElementById('btnRefreshLogs')?.addEventListener('click', () => {
        fetchLogs();
    });

    // Setup sidebar
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebar = document.querySelector('.dash-sidebar');
    
    if (sidebarToggle && sidebarOverlay && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('visible');
        });
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('visible');
        });
    }
});

