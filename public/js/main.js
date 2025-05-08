// Kiểm tra xác thực
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Thêm token vào header cho mọi request
function addAuthHeader(headers = {}) {
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Xử lý lỗi
function handleError(error) {
    console.error('Error:', error);
    if (error.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
}

// Kiểm tra xác thực khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const publicPages = ['/login', '/register'];
    const currentPage = window.location.pathname;
    
    if (!publicPages.includes(currentPage)) {
        checkAuth();
    }
}); 