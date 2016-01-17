// var express = require('express');
// var router = express.Router(); // 生成一个路由实例用来捕获访问主页GET请求

// /* GET home page. */
// // 在渲染模版时我们传入一个变量title值为Express的字符串，模版引擎会把所有<%=title %> 替换为Express
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'Express' }); // 渲染views/index.ejs模板并显示到浏览器中
// });

// module.exports = router; // 导出这个路由并在app.js里通过 app.use('/', routes) 加载

// crypto 是node.js的一个核心模块，用它生存散列值来加密密码

var crypto = require('crypto'),
	User = require('../models/user.js'),
	Post = require('../models/post.js'),
	Comment = require('../models/comment.js');

module.exports = function(app) {
	app.get('/', function(req, res) {
		// 判断是否是第一页，并把请求的页数转换成number类型
		var page = req.query.p ? parseInt(req.query.p) : 1;
		// 查询并返回底page页的10篇文章
		Post.getTen(null, page, function(err, posts, total) {
			if (err) {
				posts = [];
			}

			res.render('index', {
				title: '主页',
				page: page,
				isFirstPage: (page - 1) == 0,
				isLastPage: ((page - 1) * 10 + posts.length) == total,
				user: req.session.user,
				posts: posts,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/register', checkNotLogin);
	app.get('/register', function(req, res) {
		res.render('register', {
			title: '注册',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/register', checkNotLogin);
	app.post('/register', function(req, res) {
		var name = req.body.name, // req.body  就说POST请求信息解析后的对象
			password = req.body.password,
			password_re = req.body['password-repeat'];

		// 检测用户两次输入密码是否一致
		if (password_re != password) {
			req.flash('error', '两次输入的密码不一致！');
			return res.redirect('/register'); // 返回注册页
		}

		// 生成密码的md5值
		var md5 = crypto.createHash('md5');
		password = md5.update(req.body.password).digest('hex');
		var newUser = new User({
			name: req.body.name,
			password: password,
			email: req.body.email
		});

		// 检查用户是否已经存在
		User.get(newUser.name, function(err, user) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}

			if (user) {
				req.flash('error', '用户名已存在！');
				return res.redirect('/register');
			}

			// 如果不存在则新增用户
			newUser.save(function(err, user) {
				if (err) {
					req.flash('error', err);
					return res.redirect('/register'); // 注册失败，返回注册页
				}
				req.session.user = user; // 用户信息存入session, 以后可以通过 req.session.user 读取用户信息
				req.flash('success', '注册成功！');
				res.redirect('/'); // 返回主页
			});
		});
	});

	app.get('/login', checkNotLogin);
	app.get('/login', function(req, res) {
		res.render('login', {
			title: '登陆',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/login', checkNotLogin);
	app.post('/login', function(req, res) {
		// 生成密码的 md5值
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');

		// 检查用户是否存在
		User.get(req.body.name, function(err, user) {
			if (!user) {
				req.flash('error', '用户不存在2！');
				return res.redirect('/login'); 
			}

			// 检查密码是否一致
			if (user.password != password) {
				req.flash('error', '密码错误！');
				return res.redirect('/login');
			}

			// 用户名密码都匹配后，将用户信息存入session
			req.session.user = user;
			req.flash('success', '登录成功！');
			res.redirect('/');
		})
	});

	app.get('/post', checkLogin);
	app.get('/post', function(req, res) {
		res.render('post', {
			title: '发表',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/post', checkLogin);
	app.post('/post', function(req, res) {
		var currentUser = req.session.user,
			tags = [req.body.tag1, req.body.tag2, req.body.tag3],
			post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);
		post.save(function(err) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			req.flash('success', '发布成功！');
			res.redirect('/');
		})
	});

	app.get('/logout', checkLogin);
	app.get('/logout', function(req, res) {
		req.session.user = null;
		req.flash('success', '登出成功！');
		res.redirect('/');
		
	});

	app.get('/upload', checkLogin);
	app.get('/upload', function(req, res) {
		res.render('upload', {
			title: '文件上传',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.post('/upload', checkLogin);
	app.post('/upload', function(req, res) {
		req.flash('success', '文件上传成功！');
		res.redirect('/upload');
	});

	app.get('/archive', function (req, res) {
		Post.getArchive(function (err, posts) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('archive', {
				title: '存档',
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/u/:name', function(req, res) { // 用来处理访问用户页的请求
		var page = req.query.p ? parseInt(req.query.p) : 1;
		// 检查用户是否存在
		User.get(req.params.name, function(err, user) {
			if (!user) {
				req.flash('error', '用户不存在1！');
				return res.redirect('/');
			}

			// 查询并返回该用户第page页的10篇文章
			Post.getTen(user.name, page, function(err, posts, total) {
				if (err) {
					req.flash('error', err);
					return res.redirect('/');
				}

				console.log("posts.length: " + posts.length);

				res.render('user', {
					title: user.name,
					posts: posts,
					page: page,
					length: posts.length,
					isFirstPage: (page - 1) == 0,
					isLastPage: ((page - 1) * 10 + posts.length) == total,
					user: req.session.user,
					success: req.flash('success').toString(),
					error: req.flash('error').toString()
				});
			});
		});
	});

	app.get('/u/:name/:day/:title', function(req, res) {
		Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}

			res.render('article', {
				title: req.params.title,
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/edit/u/:name/:day/:title', checkLogin);
	app.get('/edit/u/:name/:day/:title', function(req, res) {
		var currentUser = req.session.user;
		Post.edit(currentUser.name, req.params.day, req.params.title, function (err, post) {
			if (err) {
				req.flash('error', err);
				return res.redirect('back');
			}

			res.render('edit', {
				title: '编辑',
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.post('/edit/u/:name/:day/:title', checkLogin);
	app.post('/edit/u/:name/:day/:title', function (req, res) {
		var currentUser = req.session.user;
		Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
			var url = encodeURI('/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
			if (err) {
				req.flash('error', error);
				return res.redirect(url); // 出错！返回文章页
			}
			req.flash('success', '修改成功');
			res.redirect(url); // 成功！返回文章页
		});
	});

	app.post('/u/:name/:day/:title', function(req, res) {
		var date = new Date(),
			time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
		

		var md5 = crypto.createHash('md5'),
			email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
			head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
		var comment = {
			name: req.body.name,
			head: head,
			email: req.body.email,
			website: req.body.website,
			time: time,
			content: req.body.content
		};

		var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
		newComment.save(function(err) {
			if (err) {
				req.flash('error', err);
				return res.redirect('back');
			}

			req.flash('success', '留言成功！');
			res.redirect('back');
		});
	});

	app.get('/remove/u/:name/:day/:title', checkLogin);
	app.get('/remove/u/:name/:day/:title', function (req, res) {
		var currentUser = req.session.user;
		Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
			if (err) {
				req.flash('error', err);
				return res.redirect('back');
			}
			req.flash('success', '删除成功!');
			res.redirect('/');
		});
	});

	app.get('/tags', function (req, res) {
		Post.getTags(function (err, posts) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/post');
			}
			res.render('tags', {
				title: '标签',
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/tags/:tag', function (req, res) {
		Post.getTag(req.params.tag, function (err, posts) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/post');
			}
			res.render('tag', {
				title: 'TAG:' + req.params.tag,
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.get('/links', function (req, res) {
		res.render('links', {
			title: '友情链接',
			user: req.session.user,
			success: req.flash('success').toString(),
			error: req.flash('error').toString()
		});
	});

	app.get('/search', function (req, res) {
		Post.search(req.query.keyword, function (err, posts) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/');
			}

			res.render('search', {
				title: "SEARCH:" + req.query.keyword,
				posts: posts,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
};



function checkLogin(req, res, next) {
	if (!req.session.user) {
		req.flash('error', '未登录！');
		res.redirect('/login');
	}
	next();
}

function checkNotLogin(req, res, next) {
	if (req.session.user) {
		req.flash('error', '已登录！');
		res.redirect('back');
	}
	next();
}