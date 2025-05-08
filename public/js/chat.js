let currentUser = null;
let currentUserId = null;
let socket = null;
let currentChatUserId = null;

// Lấy thông tin user hiện tại
async function getCurrentUser() {
    try {
        const res = await fetch('/users/me');
        const user = await res.json();
        currentUserId = user._id;
    } catch (error) {
        console.error('Error fetching current user:', error);
    }
}

// Kết nối Socket.IO
function connectSocket() {
    socket = io();
    socket.on('connect', () => {
        socket.emit('joinRoom', currentUserId);
        console.log('Connected to server');
    });

    socket.on('message', (message) => {
        // Nếu đang chat với đúng user, reload lại toàn bộ lịch sử tin nhắn
        if (
            currentUser &&
            (
                (message.sender._id === currentUserId && message.receiver._id === currentUser._id) ||
                (message.sender._id === currentUser._id && message.receiver._id === currentUserId)
            )
        ) {
            // Gọi lại API lấy toàn bộ lịch sử tin nhắn
            fetch(`/chat/messages/${currentUser._id}`)
                .then(res => res.json())
                .then(messages => displayMessages(messages));
        }
    });
}

// Lấy danh sách người dùng online
async function getOnlineUsers() {
    try {
        const res = await fetch('/chat/online-users');
        const users = await res.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Hiển thị danh sách người dùng (loại bỏ user hiện tại)
function displayUsers(users) {
    const userList = document.getElementById('userList');
    const filteredUsers = users.filter(user => user._id !== currentUserId);
    userList.innerHTML = filteredUsers.map(user => `
        <div class="user-item" data-user-id="${user._id}">
            <div class="d-flex align-items-center">
                <span style="position: relative; display: inline-block;">
                  <img src="${user.avatar ? user.avatar : 'https://via.placeholder.com/40'}" onerror="this.src='https://via.placeholder.com/40'" class="rounded-circle me-2" width="40" height="40">
                  <span style="position: absolute; bottom: 2px; right: 6px; width: 12px; height: 12px; background: #28a745; border: 2px solid #fff; border-radius: 50%; display: block;"></span>
                </span>
                <div>
                    <h6 class="mb-0">${user.username}</h6>
                    <small class="text-muted">${user.status || ''}</small>
                </div>
            </div>
        </div>
    `).join('');

    // Thêm sự kiện click cho mỗi user
    document.querySelectorAll('.user-item').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.userId;
            const username = item.querySelector('h6').textContent;
            selectUser(userId, username);
        });
    });
}

// Chọn người dùng để chat
async function selectUser(userId, username) {
    currentUser = { _id: userId, username };
    currentChatUserId = userId;
    document.getElementById('chatHeader').textContent = `Chat với ${username}`;
    document.getElementById('messageInput').disabled = false;
    document.querySelector('#messageForm button').disabled = false;

    // Lấy tin nhắn cũ
    try {
        const res = await fetch(`/chat/messages/${userId}`);
        const messages = await res.json();
        displayMessages(messages);

        // Đánh dấu tin nhắn đã đọc
        await fetch(`/chat/messages/read/${userId}`, {
            method: 'PUT'
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
}

// Hiển thị tin nhắn
function displayMessages(messages) {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = messages.map(message => {
        const isSent = message.sender._id === currentUserId;
        const avatar = message.sender.avatar ? message.sender.avatar : 'https://via.placeholder.com/40';
        const username = message.sender.username;
        return `
            <div class="d-flex flex-column align-items-${isSent ? 'end' : 'start'} mb-2" data-message-id="${message._id}">
                <div class="d-flex align-items-center ${isSent ? 'justify-content-end' : 'justify-content-start'} w-100">
                    ${!isSent ? `<img src="${avatar}" class="rounded-circle me-2" width="32" height="32" onerror="this.src='https://via.placeholder.com/40'">` : ''}
                    <div style="max-width:70%">
                        <div class="small text-muted mb-1 ${isSent ? 'text-end' : 'text-start'}">${username}</div>
                        <div class="message ${isSent ? 'sent' : 'received'}" style="word-break:break-word;">${message.content}</div>
                    </div>
                    ${isSent ? `<img src="${avatar}" class="rounded-circle ms-2" width="32" height="32" onerror="this.src='https://via.placeholder.com/40'">` : ''}
                </div>
            </div>
        `;
    }).join('');
    messageArea.scrollTop = messageArea.scrollHeight;
    addMessageActionEvents();
}

// Tạo context menu sửa/xoá
let chatContextMenu = null;
function createChatContextMenu() {
    if (chatContextMenu) chatContextMenu.remove();
    chatContextMenu = document.createElement('div');
    chatContextMenu.className = 'chat-context-menu';
    chatContextMenu.innerHTML = `
        <button class='btn btn-sm btn-link text-primary context-edit'>Sửa</button>
        <button class='btn btn-sm btn-link text-danger context-delete'>Xoá</button>
    `;
    document.body.appendChild(chatContextMenu);
}

function showChatContextMenu(x, y, messageId) {
    createChatContextMenu();
    chatContextMenu.style.display = 'block';
    chatContextMenu.style.left = x + 'px';
    chatContextMenu.style.top = y + 'px';
    chatContextMenu.dataset.messageId = messageId;
    // Gắn lại sự kiện click cho menu
    chatContextMenu.querySelector('.context-edit').onclick = function() {
        const id = chatContextMenu.dataset.messageId;
        const msgDiv = document.querySelector(`[data-message-id='${id}'] .message`);
        const content = msgDiv.textContent;
        document.getElementById('editMessageId').value = id;
        document.getElementById('editMessageContent').value = content;
        const modal = new bootstrap.Modal(document.getElementById('editMessageModal'));
        modal.show();
        hideChatContextMenu();
    };
    chatContextMenu.querySelector('.context-delete').onclick = async function() {
        const id = chatContextMenu.dataset.messageId;
        if (confirm('Bạn có chắc muốn xoá tin nhắn này?')) {
            try {
                const res = await fetch(`/chat/messages/${id}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) {
                    alert(data.message || 'Xoá tin nhắn thất bại!');
                }
                // Nếu thành công, chỉ chờ socket cập nhật UI
            } catch (err) {
                alert('Lỗi kết nối server khi xoá tin nhắn!');
            }
        }
        hideChatContextMenu();
    };
}

function hideChatContextMenu() {
    if (chatContextMenu) chatContextMenu.style.display = 'none';
}

document.addEventListener('click', function(e) {
    if (chatContextMenu && !chatContextMenu.contains(e.target)) {
        hideChatContextMenu();
    }
});

document.addEventListener('scroll', hideChatContextMenu, true);

function addMessageActionEvents() {
    // Thêm context menu chuột phải cho tin nhắn của mình
    document.querySelectorAll('.message').forEach(msgDiv => {
        const parent = msgDiv.closest('[data-message-id]');
        const messageId = parent ? parent.dataset.messageId : null;
        if (messageId && parent.querySelector('.message.sent')) {
            msgDiv.oncontextmenu = function(e) {
                e.preventDefault();
                showChatContextMenu(e.pageX, e.pageY, messageId);
            };
        } else {
            msgDiv.oncontextmenu = null;
        }
    });
}

// Modal sửa tin nhắn
if (document.getElementById('editMessageForm')) {
    document.getElementById('editMessageForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('editMessageId').value;
        const content = document.getElementById('editMessageContent').value;
        try {
            const res = await fetch(`/chat/messages/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.message || 'Sửa tin nhắn thất bại!');
            } else {
                bootstrap.Modal.getInstance(document.getElementById('editMessageModal')).hide();
                // Nếu thành công, chỉ chờ socket cập nhật UI
            }
        } catch (err) {
            alert('Lỗi kết nối server khi sửa tin nhắn!');
        }
    });
}

// Socket lắng nghe sửa/xoá
function setupSocketRealtime() {
    if (!socket) connectSocket();
    socket.on('message-updated', (message) => {
        // Nếu message thuộc cuộc hội thoại đang mở (giữa currentUserId và currentChatUserId)
        if (
            currentUserId && currentChatUserId &&
            (
                (message.sender._id === currentUserId && message.receiver._id === currentChatUserId) ||
                (message.sender._id === currentChatUserId && message.receiver._id === currentUserId)
            )
        ) {
            fetch(`/chat/messages/${currentChatUserId}`)
                .then(res => res.json())
                .then(messages => displayMessages(messages));
        }
    });
    socket.on('message-deleted', (data) => {
        if (currentChatUserId) {
            fetch(`/chat/messages/${currentChatUserId}`)
                .then(res => res.json())
                .then(messages => displayMessages(messages));
        }
    });
}

// Thêm tin nhắn mới
function appendMessage(message) {
    const messageArea = document.getElementById('messageArea');
    const isSent = message.sender._id === currentUserId;
    const avatar = message.sender.avatar ? message.sender.avatar : 'https://via.placeholder.com/40';
    const username = message.sender.username;
    const messageDiv = document.createElement('div');
    messageDiv.className = `d-flex align-items-center ${isSent ? 'justify-content-end' : 'justify-content-start'} mb-2`;
    messageDiv.innerHTML = `
        ${!isSent ? `<img src="${avatar}" class="rounded-circle me-2" width="32" height="32" onerror="this.src='https://via.placeholder.com/40'">` : ''}
        <div style="max-width:70%">
            <div class="small text-muted mb-1 ${isSent ? 'text-end' : 'text-start'}">${username}</div>
            <div class="message ${isSent ? 'sent' : 'received'}" style="word-break:break-word;">${message.content}</div>
        </div>
        ${isSent ? `<img src="${avatar}" class="rounded-circle ms-2" width="32" height="32" onerror="this.src='https://via.placeholder.com/40'">` : ''}
    `;
    messageArea.appendChild(messageDiv);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// Xử lý upload avatar
const avatarInput = document.getElementById('avatarInput');
const avatarForm = document.getElementById('avatarForm');
const currentAvatar = document.getElementById('currentAvatar');
if (avatarInput) {
    avatarInput.addEventListener('change', async function() {
        if (!avatarInput.files.length) return;
        const formData = new FormData();
        formData.append('avatar', avatarInput.files[0]);
        try {
            const res = await fetch('/users/avatar', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.avatar) {
                currentAvatar.src = data.avatar + '?t=' + Date.now(); // cập nhật avatar mới
                getOnlineUsers();
            } else {
                alert(data.message || 'Lỗi upload avatar');
            }
        } catch (error) {
            alert('Lỗi upload avatar');
        }
    });
}

// Gửi tin nhắn
const messageForm = document.getElementById('messageForm');
if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('messageInput').value;
        if (!content || !currentUser) return;
        try {
            await fetch('/chat/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    receiverId: currentUser._id,
                    content
                })
            });
            document.getElementById('messageInput').value = '';
        } catch (error) {
            console.error('Error sending message:', error);
        }
    });
}

// Đăng xuất
const logoutBtn = document.getElementById('logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch('/users/logout', {
                method: 'POST'
            });
            window.location.href = '/login';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    });
}

// Khởi tạo
// Đảm bảo chỉ chạy khi trang chat đã load xong
if (window.location.pathname === '/chat') {
    document.addEventListener('DOMContentLoaded', async () => {
        await getCurrentUser();
        getOnlineUsers();
        connectSocket();
        setupSocketRealtime();
    });
} 