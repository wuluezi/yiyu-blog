const express = require('express');
const router = express.Router();
const { getPosts, getPostById, searchPosts } = require('../database');
const marked = require('marked');

// 首页 - 文章列表（直接展示全文）
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const data = getPosts(page, 10);
  // 为每篇文章预渲染 Markdown
  data.posts = data.posts.map(post => ({
    ...post,
    contentHtml: marked.parse(post.content || '')
  }));
  res.render('index', { ...data, user: req.session.user });
});

// 搜索
router.get('/search', (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.redirect('/');
  }
  const posts = searchPosts(query);
  const results = posts.map(post => ({
    ...post,
    contentHtml: marked.parse(post.content || '')
  }));
  res.render('search', { results, query, total: results.length, user: req.session.user });
});

// 文章详情
router.get('/post/:id', (req, res) => {
  const post = getPostById(parseInt(req.params.id));
  if (!post) {
    return res.status(404).render('404', { user: req.session.user });
  }
  const contentHtml = marked.parse(post.content || '');
  res.render('post', { post, contentHtml, user: req.session.user });
});

module.exports = router;
