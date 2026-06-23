const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./database');
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');

const app = express();
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
