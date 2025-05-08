const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Trang chủ
router.get('/', (req, res) => {
  res.render('home', {
    title: 'Chat App - Home'
  });
});

// Trang đăng ký
router.get('/register', (req, res) => {
  res.render('register', {
    title: 'Chat App - Đăng ký'
  });
});

// Trang đăng nhập
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Chat App - Đăng nhập'
  });
});

// Trang chat (yêu cầu đăng nhập)
router.get('/chat', auth, (req, res) => {
  res.render('chat', {
    title: 'Chat App - Chat Room',
    user: req.user ? req.user.toObject() : null
  });
});

module.exports = router; 