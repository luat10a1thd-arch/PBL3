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
            alert('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
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
                // Đăng nhập thành công
                alert('Đăng nhập thành công!');
                
                // Chỉ lưu thông tin user để hiển thị UI, token được lưu bằng HttpOnly cookie
                localStorage.setItem('user', JSON.stringify(data));

                // Điều hướng dựa theo role
                if (typeof window.redirectToRoleHome === 'function') {
                    window.redirectToRoleHome(data);
                } else {
                    const normalizedRole = typeof window.normalizeRole === 'function' ? window.normalizeRole(data?.role) : '';
                    if (normalizedRole === 'Staff') {
                        window.location.href = 'CashierInterface.html';
                    } else if (normalizedRole === 'Admin' || normalizedRole === 'Owner') {
                        window.location.href = 'AdminDashboard.html';
                    } else {
                        localStorage.removeItem('user');
                        alert('Role không hợp lệ. Vui lòng đăng nhập lại.');
                        window.location.href = 'LoginPage.html';
                    }
                }
            } else {
                // Đăng nhập thất bại
                alert(data.message || 'Tài khoản hoặc mật khẩu không chính xác!');
            }
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            alert('Lỗi kết nối đến server. Vui lòng thử lại sau!');
        }
    });

    // Cho phép ấn Enter để đăng nhập
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnLogin.click();
        }
    });
});
