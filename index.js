const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true}));

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
    res.render('index');
});
app.get('/about', (req,res) => {
    res.render('about');
});
app.get('/login', (req,res) =>{
    res.render('login');
});

app.post('/login', (req,res) => {
    const { username, password } = req.body;
    if(username === 'user' && password ==='password'){
        req.session.username = username;
        res.send('Login success');
    } else {
        res.send('Login failed');
    }
});

app.use((req,res) => {
    res.status(404).send('Not Found');
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
