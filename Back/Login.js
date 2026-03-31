document.addEventListener('DOMContentLoaded', () => {
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
            // Thay đổi domain và port phù hợp với .NET Web API của bạn
            const response = await fetch('http://localhost:4000/Users/authenticate', {
                method: 'POST',
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
                
                // Lưu token và thông tin user vào localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data));

                // Điều hướng dựa theo role
                if (data.role === 0 || data.role === 3) {
                    window.location.href = 'AdminDashboard.html';
                } else {
                    window.location.href = 'CashierInterface.html';
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
