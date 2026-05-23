const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true}));

db.serialize(() => {
   //ユーザー情報のデータベース
   db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT, role DEFAULT "user", fav_member TEXT, bio TEXT)');
   //ニュース管理データベース
   db.run('CREATE TABLE IF NOT EXISTS news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
});

app.use(session({
    secret: 'secret key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 60 * 1000
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
            username: req.session.username,
            role: req.session.role       
        });
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
    const query = "SELECT * FROM users WHERE username = ?";
    db.get(query, [username], (err,row) =>{
        if (err) {
            console.error(err);
            return res.status(500).send('Database Error');
        }
        if (row) {
            bcrypt.compare(password, row.password, (compareErr, isMatch) => {
                if (compareErr) {
                    console.error(compareErr);
                    return res.status(500).send('Compare Error');
                }
                if (isMatch) {
                    req.session.username = row.username;
                    req.session.role = row.role;
                    res.send('Login Success');
                } else {
                    res.send('Login Failed (Incorrect Password)');
                }
            });
            
        } else {
            res.send('Login Failed (Not Found User');
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
const requireAdmin = (req, res, next) => {
    if (req.session.username && req.session.role === 'admin') {
        next();
    } else {
        res.status(403).send('アクセス権限がありません。<a href="/">トップに戻る</a>');
    }
};
app.get('/admin', requireAdmin, (req,res) => {
    res.render('admin');
});
app.post('/admin/news', requireAdmin, (req,res) => {
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
app.post('/admin/news/delete/:id', requireAdmin, (req,res) => {
    const newsId = req.params.id;
    const query = "DELETE FROM news WHERE id = ?";
    db.run(query, [newsId], function(err) {
        if (err) {
            console.error(err);
            res.status(500).send('削除に失敗しました');
        }
        res.redirect('/');
    });
});
app.get('/admin/news/edit/:id', requireAdmin, (req,res) => {
    const newsId = req.params.id;
    const query = "SELECT * FROM news WHERE id = ?";
    db.get(query, [newsId], (err,row) => {
        if (err || !row) {
            res.status(404).send('ニュースが見つかりません');
        }
        res.render('edit', {news: row });
    });
});
app.post('/admin/news/edit/:id', requireAdmin, (req,res) => {
    const newsId = req.params.id;
    const { title, content } = req.body;
    const query = "UPDATE news SET title = ?, content = ? WHERE id = ?";
    db.run(query, [title,content,newsId], function(err) {
        if (err) {
            console.error(err);
            res.status(500).send('更新に失敗しました');
        }
        res.redirect('/');
    });
});
app.get('/register', (req,res) => {
    res.render('register');
});
app.post('/register', (req,res) => {
    const uname = req.body.uname;
    const password = req.body.password;
    let role = 'user';
    if (uname === 'admin'){
        role = 'admin';
    }
    const checkQuery = 'SELECT * FROM users WHERE username =?';

    db.get(checkQuery, [uname], (err,row) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Database Error');
        }
        if (row) {
            return res.send('このユーザー名は既に使用されています。<a href="/register">戻る</a>');
        }
        //パスワードのハッシュ化
        bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
            if (hashErr) {
                console.error(hashErr);
                return res.status(500).send('Hashing Error');
            }
            const insertQuery = 'INSERT INTO users (username, password, role) VALUES (?,?,?)';
            db.run(insertQuery, [uname, hashedPassword, role], function(insertErr) {
            if (insertErr) {
                console.error(insertErr);
                return res.send('user register failed');
            }
            req.session.username = uname;
            res.redirect('/');
        });
        
        });
    });
});

app.get('/profile', (req,res) => {
    const query = "SELECT * FROM users WHERE username = ?";
    db.get(query, [req.session.username], (err,row) => {
        if(err || !row){
            console.error(err);
            return res.status(500).send('ユーザー情報の取得に失敗しました');
        }
        res.render('profile', {user: row });
    });
});
app.post('/profile/edit', requireLogin, (req, res) => {
    const favMember = req.body.fav_member;
    const bio = req.body.bio;
    const username = req.session.username;

    const updateQuery = 'UPDATE users SET fav_member = ?, bio = ?, WHERE username = ?';
    db.run(updateQuery, [favMember, bio, username], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send('プロフィールの更新に失敗しました');
        }
        res.redirect('/profile');

    });
});


app.use((req,res) => {
    res.status(404).send('Not Found');
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
