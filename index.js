const express = require('express');
const app = express();
const path = require('path');

app.use(express.static(path.join(__dirname,'public')));

app.set('view engine', 'ejs');
app.get('/', (req,res) => {
    res.render('index');
});
app.get('/about', (req,res) => {
    res.render('about');
});
app.use((req,res) => {
    res.status(404),send('Not Found');
});
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
