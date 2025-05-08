const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Load env vars
dotenv.config();

// Khởi tạo app
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Kết nối MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_default_secret', // Thêm dòng này
    resave: false,
    saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Handlebars middleware
app.engine('handlebars', exphbs.engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Static folder
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', require('./routes/index'));
app.use('/users', require('./routes/users'));
app.use('/chat', require('./routes/chat'));

// Truyền io instance vào app locals để dùng trong router
app.set('io', io);

// Socket.IO
io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', (userId) => {
    if (userId) {
      socket.join(userId.toString());
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });

  // Xử lý tin nhắn
  socket.on('chatMessage', (msg) => {
    io.emit('message', msg);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 