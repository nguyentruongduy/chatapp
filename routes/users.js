const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Cấu hình multer để lưu file vào thư mục public/avatars
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/avatars'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user._id + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// Đăng ký
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Kiểm tra user đã tồn tại
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Tạo user mới
    user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Tạo token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Lưu token vào cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 giờ
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email không tồn tại' });
    }

    // Kiểm tra mật khẩu
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mật khẩu không đúng' });
    }

    // Tạo token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Cập nhật trạng thái online
    user.status = 'online';
    user.lastSeen = Date.now();
    await user.save();

    // Lưu token vào cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 giờ
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy thông tin user
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

// Đăng xuất
router.post('/logout', auth, async (req, res) => {
  try {
    req.user.status = 'offline';
    req.user.lastSeen = Date.now();
    await req.user.save();

    // Xóa token khỏi cookie
    res.clearCookie('token');
    
    res.json({ message: 'Đăng xuất thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy danh sách user online và offline
router.get('/list', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'username avatar email status');
    const online = users.filter(u => u.status === 'online');
    const offline = users.filter(u => u.status !== 'online');
    res.json({ online, offline });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Upload avatar
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn file ảnh' });
    }
    // Lưu đường dẫn avatar vào user
    req.user.avatar = '/avatars/' + req.file.filename;
    await req.user.save();
    res.json({ avatar: req.user.avatar, message: 'Cập nhật avatar thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Đổi tên user
router.put('/profile', auth, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Tên không được để trống' });
    }
    req.user.username = username;
    await req.user.save();
    res.json({ username: req.user.username, message: 'Cập nhật tên thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

module.exports = router; 