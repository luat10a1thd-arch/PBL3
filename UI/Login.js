document.addEventListener('DOMContentLoaded', () => {
    const API_URL = window.location.protocol === 'file:' ? 'http://localhost:4000' : '';
    const btnLogin = document.getElementById('btnLoginUser');
    const usernameInput = document.getElementById('login_username');
    const passwordInput = document.getElementById('login_password');

    btnLogin.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            window.showWarningToast?.('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/Users/authenticate`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Username: username,
                    Password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                window.showSuccessToast?.('Đăng nhập thành công');
                
                // Chỉ lưu thông tin user để hiển thị UI, token được lưu bằng HttpOnly cookie
                sessionStorage.setItem('user', JSON.stringify(data));

                // Điều hướng dựa theo role
                if (typeof window.redirectToRoleHome === 'function') {
                    window.redirectToRoleHome(data);
                } else {
                    const normalizedRole = typeof window.normalizeRole === 'function' ? window.normalizeRole(data?.role) : '';
                    if (normalizedRole === 'Staff') {
                        window.location.href = '/app/cashier';
                    } else if (normalizedRole === 'Manager' || normalizedRole === 'Admin') {
                        window.location.href = '/app/dashboard';
                    } else {
                        sessionStorage.removeItem('user');
                        window.showErrorToast?.('Role không hợp lệ. Vui lòng đăng nhập lại.');
                        window.location.href = '/app/login';
                    }
                }
            } else {
                window.showErrorToast?.(data.message || 'Tài khoản hoặc mật khẩu không chính xác!');
            }
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            window.showErrorToast?.('Lỗi kết nối đến server. Vui lòng thử lại sau!');
        }
    });

    // Cho phép ấn Enter để đăng nhập
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnLogin.click();
        }
    });
});

