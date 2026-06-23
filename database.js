const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, 'blog.db');
let db;

// 初始化数据库
async function initDB() {
  const SQL = await initSqlJs();

  // 如果已有数据库文件，读取；否则创建新的
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 建表
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      summary TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);

  // 创建默认管理员账号
  const result = db.exec('SELECT id FROM users WHERE username = \'日星\'');
  if (!result.length || !result[0].values.length) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync('rixing2024', salt, 10000, 64, 'sha512').toString('hex');
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['日星', salt + ':' + hash]);
    console.log('默认站长账号已创建: 日星 / rixing2024');
  }

  saveDB();
}

// 保存数据库到文件
function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// 辅助：执行查询并返回行对象数组
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

// 文章操作
function getPosts(page = 1, pageSize = 10) {
  const totalRow = queryOne('SELECT COUNT(*) as count FROM posts');
  const total = totalRow ? totalRow.count : 0;
  const offset = (page - 1) * pageSize;
  const posts = queryAll(
    'SELECT id, title, content, created_at, updated_at FROM posts ORDER BY updated_at DESC LIMIT ? OFFSET ?',
    [pageSize, offset]
  );
  return { posts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) || 1 };
}

function getPostById(id) {
  return queryOne('SELECT * FROM posts WHERE id = ?', [id]);
}

function createPost(title, content) {
  db.run("INSERT INTO posts (title, content, created_at, updated_at) VALUES (?, ?, datetime('now', '+8 hours'), datetime('now', '+8 hours'))", [title, content || '']);
  const row = queryOne('SELECT last_insert_rowid() as id');
  const newId = row ? row.id : null;
  saveDB();
  return newId;
}

function updatePost(id, title, content) {
  db.run("UPDATE posts SET title = ?, content = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?",
    [title, content || '', id]);
  saveDB();
}

function deletePost(id) {
  db.run('DELETE FROM posts WHERE id = ?', [id]);
  saveDB();
}

// 搜索文章
function searchPosts(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const k = '%' + keyword.trim() + '%';
  return queryAll(
    'SELECT id, title, content, created_at, updated_at FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC',
    [k, k]
  );
}

// 用户验证
function verifyUser(username, password) {
  const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return false;
  const parts = user.password.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verify;
}

function changePassword(username, newPassword) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 64, 'sha512').toString('hex');
  db.run('UPDATE users SET password = ? WHERE username = ?', [salt + ':' + hash, username]);
  saveDB();
}

function changeUsername(oldUsername, newUsername) {
  // 检查新用户名是否已存在
  const existing = queryOne('SELECT id FROM users WHERE username = ?', [newUsername]);
  if (existing) return false;
  db.run('UPDATE users SET username = ? WHERE username = ?', [newUsername, oldUsername]);
  saveDB();
  return true;
}

module.exports = { initDB, getPosts, getPostById, createPost, updatePost, deletePost, searchPosts, verifyUser, changePassword, changeUsername };
