const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./database');
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

const app = express();
const DATA_DIR = process.env.DATA_DIR || __dirname;
const PORT = process.env.PORT || 3000;

// 中间件
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'rixing-blog-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24小时
}));

// 临时：数据库导入接口（上传完成后删除此路由）
app.post('/import-db', express.raw({ type: 'application/octet-stream', limit: '50mb' }), (req, res) => {
  const token = req.query.token;
  if (token !== 'rixing-import-2024') {
    return res.status(403).send('Forbidden');
  }
  const dbPath = path.join(DATA_DIR, 'blog.db');
  fs.writeFileSync(dbPath, req.body);
  res.send(`OK: ${req.body.length} bytes written to ${dbPath}`);
});

// 路由
app.use('/', indexRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { user: req.session.user });
});

// 异步初始化数据库并启动
(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`日星小站已启动: http://localhost:${PORT}`);
  });
})();
