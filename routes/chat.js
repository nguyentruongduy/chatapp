const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Lấy danh sách tin nhắn với một người dùng
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Gửi tin nhắn
router.post('/messages', auth, async (req, res) => {
  try {
    const { receiverId, content, attachments } = req.body;

    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content,
      attachments
    });

    await message.save();

    // Populate thông tin người gửi và người nhận
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    // Phát sự kiện Socket.IO cho cả người gửi và người nhận
    if (req.app.get('io')) {
      req.app.get('io').to(receiverId.toString()).emit('message', message);
      req.app.get('io').to(req.user._id.toString()).emit('message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Lấy danh sách người dùng online
router.get('/online-users', auth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      status: 'online'
    }).select('username avatar status lastSeen');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Đánh dấu tin nhắn đã đọc
router.put('/messages/read/:senderId', auth, async (req, res) => {
  try {
    await Message.updateMany(
      {
        sender: req.params.senderId,
        receiver: req.user._id,
        read: false
      },
      { read: true }
    );

    res.json({ message: 'Đã cập nhật trạng thái đọc' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Sửa tin nhắn
router.put('/messages/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Bạn chỉ có thể sửa tin nhắn của mình' });
    }
    message.content = req.body.content;
    await message.save();
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');
    // Phát socket
    if (req.app.get('io')) {
      req.app.get('io').to(message.receiver.toString()).emit('message-updated', message);
      req.app.get('io').to(req.user._id.toString()).emit('message-updated', message);
    }
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xoá tin nhắn
router.delete('/messages/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      console.log('Không tìm thấy tin nhắn:', req.params.id);
      return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    }
    if (message.sender.toString() !== req.user._id.toString()) {
      console.log('Không có quyền xoá tin nhắn:', req.user._id, '!=', message.sender.toString());
      return res.status(403).json({ message: 'Bạn chỉ có thể xoá tin nhắn của mình' });
    }
    const receiverId = message.receiver;
    await message.deleteOne(); // Sử dụng deleteOne thay cho remove để tránh lỗi
    // Phát socket
    if (req.app.get('io')) {
      req.app.get('io').to(receiverId.toString()).emit('message-deleted', { _id: req.params.id });
      req.app.get('io').to(req.user._id.toString()).emit('message-deleted', { _id: req.params.id });
    }
    res.json({ message: 'Đã xoá tin nhắn', _id: req.params.id });
  } catch (error) {
    console.error('Lỗi xoá tin nhắn:', error);
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
});

module.exports = router; 