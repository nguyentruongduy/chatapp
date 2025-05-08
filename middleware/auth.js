const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware xác thực JWT
const auth = async (req, res, next) => {
  try {
    // Lấy token từ header hoặc cookie
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      // Nếu là API request, trả về lỗi JSON
      if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
      }
      // Nếu là request thông thường, chuyển hướng đến trang đăng nhập
      return res.redirect('/login');
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Tìm user theo id từ token
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      if (req.xhr || req.headers.accept.includes('application/json')) {
        return res.status(401).json({ message: 'Không tìm thấy người dùng' });
      }
      return res.redirect('/login');
    }

    // Thêm user vào request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập lại' });
    }
    res.redirect('/login');
  }
};

module.exports = auth; 