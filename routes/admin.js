const express = require('express');
const router = express.Router();
const { getPosts, getPostById, createPost, updatePost, deletePost, verifyUser, changePassword, changeUsername } = require('../database');

// 权限中间件
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/admin/login');
}

// 登录页面
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin-login', { error: null, user: null });
});

// 登录处理
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (verifyUser(username, password)) {
    req.session.user = username;
    return res.redirect('/admin');
  }
  res.render('admin-login', { error: '用户名或密码错误', user: null });
});

// 登出
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// 管理首页 - 文章列表
router.get('/', requireAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const data = getPosts(page, 20);
  res.render('admin-list', { ...data, user: req.session.user });
});

// 新建文章页面
router.get('/new', requireAuth, (req, res) => {
  res.render('admin-edit', { post: null, user: req.session.user });
});

// 编辑文章页面
router.get('/edit/:id', requireAuth, (req, res) => {
  const post = getPostById(parseInt(req.params.id));
  if (!post) return res.status(404).render('404', { user: req.session.user });
  res.render('admin-edit', { post, user: req.session.user });
});

// 保存文章（新建）
router.post('/save', requireAuth, (req, res) => {
  const { title, content } = req.body;
  if (!title || !title.trim()) {
    return res.render('admin-edit', { post: null, error: '标题不能为空', user: req.session.user });
  }
  createPost(title.trim(), content || '');
  res.redirect('/admin');
});

// 更新文章
router.post('/update/:id', requireAuth, (req, res) => {
  const { title, content } = req.body;
  const id = parseInt(req.params.id);
  if (!title || !title.trim()) {
    const post = getPostById(id);
    return res.render('admin-edit', { post, error: '标题不能为空', user: req.session.user });
  }
  updatePost(id, title.trim(), content || '');
  res.redirect('/admin');
});

// 删除文章
router.post('/delete/:id', requireAuth, (req, res) => {
  deletePost(parseInt(req.params.id));
  res.redirect('/admin');
});

// 修改密码页面
router.get('/password', requireAuth, (req, res) => {
  res.render('admin-password', { error: null, success: null, user: req.session.user });
});

// 修改密码和用户名处理
router.post('/password', requireAuth, (req, res) => {
  const { oldPassword, newPassword, confirmPassword, newUsername } = req.body;
  if (!oldPassword) {
    return res.render('admin-password', { error: '请输入原密码', success: null, user: req.session.user });
  }
  if (!verifyUser(req.session.user, oldPassword)) {
    return res.render('admin-password', { error: '原密码错误', success: null, user: req.session.user });
  }

  let messages = [];
  let hasError = false;

  // 修改用户名
  if (newUsername && newUsername.trim() && newUsername.trim() !== req.session.user) {
    const result = changeUsername(req.session.user, newUsername.trim());
    if (result) {
      req.session.user = newUsername.trim();
      messages.push('用户名已修改');
    } else {
      hasError = true;
      messages.push('用户名已被占用');
    }
  }

  // 修改密码
  if (newPassword && confirmPassword) {
    if (newPassword !== confirmPassword) {
      hasError = true;
      messages.push('两次输入的新密码不一致');
    } else {
      changePassword(req.session.user, newPassword);
      messages.push('密码已修改');
    }
  } else if ((newPassword && !confirmPassword) || (!newPassword && confirmPassword)) {
    hasError = true;
    messages.push('请完整填写新密码和确认新密码');
  }

  const success = hasError ? null : (messages.join('，') || '无任何修改');
  const error = hasError ? messages.join('；') : null;
  res.render('admin-password', { error, success, user: req.session.user });
});

module.exports = router;
