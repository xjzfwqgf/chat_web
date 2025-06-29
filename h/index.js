// server/index.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { db, initDB } = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 初始化数据库
initDB();

// 确保 uploads 目录存在
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// 注册
app.post('/api/register', (req, res) => {
  const { username, password, nickname, avatar } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (row) return res.status(400).json({ message: '用户名已存在' });
    db.run('INSERT INTO users (username, password, nickname, avatar) VALUES (?, ?, ?, ?)', [username, password, nickname, avatar || ''], (err) => {
      if (err) return res.status(500).json({ message: err });
      res.json({ message: '注册成功' });
    });
  });
});

// 登录
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
    if (!row || row.password !== password) return res.status(400).json({ message: '用户名或密码错误' });
    res.json({ message: '登录成功', nickname: row.nickname, avatar: row.avatar });
  });
});

// 获取所有用户（仅用于显示在线人数头像等）
app.get('/api/users', (req, res) => {
  db.all('SELECT username, nickname, avatar FROM users', (err, rows) => {
    res.json(rows || []);
  });
});

// 获取公共消息（带用户头像和昵称）
app.get('/api/messages/public', (req, res) => {
  db.all('SELECT * FROM messages WHERE type = ? ORDER BY id ASC', ['public'], async (err, rows) => {
    if (!rows || rows.length === 0) return res.json([]);
    // 批量查用户信息
    const usernames = [...new Set(rows.map(r => r.fromUser))];
    db.all('SELECT username, nickname, avatar FROM users WHERE username IN (' + usernames.map(() => '?').join(',') + ')', usernames, (e, userRows) => {
      const userMap = {};
      (userRows || []).forEach(u => { userMap[u.username] = u; });
      const result = rows.map(msg => ({
        ...msg,
        nickname: msg.nickname || (userMap[msg.fromUser]?.nickname) || msg.fromUser,
        avatar: msg.avatar || (userMap[msg.fromUser]?.avatar) || ''
      }));
      res.json(result);
    });
  });
});

// 图片上传配置
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = Date.now() + '-' + Math.random().toString(36).slice(2) + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  }
});

// 图片上传接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: '未上传文件' });
  if (!req.file.mimetype.startsWith('image/')) {
    const fs = require('fs');
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: '只允许上传图片文件' });
  }
  const url = '/uploads/' + req.file.filename;
  res.json({ url });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.IO 事件
io.on('connection', (socket) => {
  let currentUser = null;

  socket.on('login', (username) => {
    if (!currentUser) {
      currentUser = username;
    }
    io.emit('online-users', []); // 仅做在线人数演示
  });

  socket.on('public-message', (msg) => {
    db.run('INSERT INTO messages (type, fromUser, content, time, fileName, fileSize, fileType, fileUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['public', currentUser, msg.text || '', msg.time, msg.file?.name || null, msg.file?.size || null, msg.file?.type || null, msg.file?.url || null],
      function (err) {
        if (!err) {
          db.get('SELECT * FROM users WHERE username = ?', [currentUser], (errUser, userRow) => {
            db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (e, row) => {
              row.nickname = userRow?.nickname || currentUser;
              row.avatar = userRow?.avatar || '';
              io.emit('public-message', row);
            });
          });
        }
      }
    );
  });

  socket.on('revoke-message', ({ type, index }) => {
    if (type === 'public') {
      db.all('SELECT id FROM messages WHERE type = ? ORDER BY id ASC', ['public'], (err, rows) => {
        const msgRow = rows[index];
        if (msgRow) {
          db.run('DELETE FROM messages WHERE id = ?', [msgRow.id], () => {
            io.emit('revoke-message', { type: 'public', index });
          });
        }
      });
    }
  });

  socket.on('disconnect', () => {
    // 不再维护在线用户列表
  });
});
// ...existing code...
// 提供前端静态资源
app.use('/', express.static(path.join(__dirname, 'public')));
// ...existing code...
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
