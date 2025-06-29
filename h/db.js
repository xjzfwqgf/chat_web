// db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, 'chat.db'));

// 初始化表
function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1 TEXT NOT NULL,
      user2 TEXT NOT NULL
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- public/private
      fromUser TEXT NOT NULL,
      toUser TEXT, -- null for public
      content TEXT,
      fileName TEXT,
      fileSize INTEGER,
      fileType TEXT,
      fileUrl TEXT,
      time TEXT NOT NULL,
      revoked INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS friend_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fromUser TEXT NOT NULL,
      toUser TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending/accepted/rejected
      time TEXT NOT NULL
    )`);
  });
}

module.exports = { db, initDB };
