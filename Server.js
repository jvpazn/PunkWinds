const express = require('express');
const exphbs = require('express-handlebars');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.engine('handlebars', exphbs.engine({defaultLayout: false}));
app.set('view engine', 'handlebars');

app.listen(port, () => {
    console.log(`Servidor em execução: http://localhost:${port}`);
})

let users = [
    { id: 1, nome: 'DstoneDev', senha:"Waguri123Teto", idade: 17},
    { id: 2, nome: 'FortieDev', senha:"johnFortune69", idade: 16},
    { id: 3, nome: 'CrosslDev', senha:"TwitterUser99", idade: 17}
]

app.get('/', (req,res) => res.render('homePage'));
