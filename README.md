# Ứng dụng Chat Real-time

Ứng dụng chat thời gian thực được xây dựng bằng Node.js, Express, Socket.IO và MongoDB.

## Cấu trúc thư mục

```
chatapp/
├── config/             # Cấu hình database và các biến môi trường
├── controllers/        # Xử lý logic nghiệp vụ
├── middleware/         # Các middleware như authentication
├── models/            # Schema MongoDB
├── public/            # Static files (CSS, JS, images)
├── routes/            # Định nghĩa routes
├── views/             # Templates Handlebars
├── .env              # Biến môi trường
├── .gitignore        # Git ignore file
├── app.js            # File chính của ứng dụng
└── package.json      # Dependencies và scripts
```

## Cài đặt

1. Clone repository
2. Cài đặt dependencies:
```bash
npm install
```
3. Tạo file .env và cấu hình các biến môi trường:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_jwt_secret
```
4. Chạy ứng dụng:
```bash
npm start
```

## Tính năng

- Đăng ký và đăng nhập người dùng
- Chat real-time với Socket.IO
- Lưu trữ tin nhắn trong MongoDB
- Giao diện người dùng hiện đại với Bootstrap 5
- Bảo mật với JWT 