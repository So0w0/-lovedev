const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true}));

db.serialize(() => {
   //ユーザー情報のデータベース
   db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)');
   const insertQuery = `
   INSERT INTO users (username, password)
   SELECT 'user', 'password'
   WHERE NOT EXISTS(SELECT 1 FROM users WHERE username ='user')
   `;
   db.run(insertQuery);
   //ニュース管理データベース
   db.run('CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
　 const insertnewsQuery =`
   INSERT INTO news (title, content)
   SELECT '=LOVE 非公式ファンサイト開設！', 'サイトがオープンしました。最新情報をお届けします！'
   WHERE NOT EXISTS(SELECT 1 FROM news WHERE id = 1)
   `;
   db.run(insertnewsQuery);
});

app.use(session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 1000
    }
}));

app.set('view engine', 'ejs');

app.get('/', (req,res) => {
    const query = 'SELECT * FROM news ORDER BY created_at DESC';
    db.all(query, [], (err,rows) => {
        if (err) {
            console.error(err)
            res.status(500).send('Database Error');
        }
        res.render('index', {
            newsList: rows,
            username: req.session.username} );
    });
});
app.get('/about', (req,res) => {
    res.render('about');
});
app.get('/login', (req,res) =>{
    res.render('login');
});

app.post('/login', (req,res) => {
    const username = req.body.uname;
    const password = req.body.password;
    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.get(query, [username,password], (err,row) =>{
        if (err) {
            console.error(err);
            res.status(500).send('Database Error');
        }
        if (row) {
            req.session.username = row.username;
            res.send('Login Success');
        } else {
            res.send('Login Failed')
        }
    });
});

const requireLogin = (req, res, next) => {
    if (req.session.username) {
        next();
    } else {
        res.redirect('/login');
    }
};

app.get('/admin', requireLogin, (req,res) => {
    res.render('admin');
});
app.post('/admin/news', requireLogin, (req,res) => {
    const { title, content} = req.body;
    const query = 'INSERT INTO news (title, content) VALUES (?,?)';
    db.run(query, [title,content], function(err) {
        if (err) {
            console.error(err);
            res.status(500).send('データベースへの保存に失敗しました');
        }
        res.redirect('/');
    });
});

app.post('/admin/news/delete/:id', requireLogin, (req,res) => {
    const newsId = req.params.id;
    const query = "DELETE FROM news WHERE id = ?";
    db.run(query, function(err) {
        if (err) {
            console.error(err);
            req.status(500).send('編集に失敗しました');
        }
        res.redirect('/');
    });
});
app.get('/admin/news/edit/:id', requireLogin, (req,res) => {
    const newsId = req.params.id;
    const query = "SELECT * FROM news WHERE id = ?";
    db.run(query, [newsId], (err,row) => {
        if (err || !row) {
            res.status(404).send('ニュースが見つかりません');
        }
        res.render('edit', {news: row });
    });
});
app.post('/admin/news/edit/:id', requireLogin, (req,res) => {
    const newsId = req.params.id;
    const { title, content } = req.body;
    const query = "IPDATE news SET title = ?, content = ? WHERE id = ?";
    db.run(query, [title,content,newsId], function(err) {
        if (err) {
            console.error(err);
            res.status(500).send('更新に失敗しました');
        }
        res.redirect('/');
    });
});

app.use((req,res) => {
    res.status(404).send('Not Found');
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
