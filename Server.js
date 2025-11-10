const express = require("express");
const exphbs = require("express-handlebars");

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine("handlebars", exphbs.engine({ defaultLayout: false }));
app.set("view engine", "handlebars");

app.listen(port, () => {
    console.log(`Servidor em execução: http://localhost:${port}`);
});

let users = [
    { id: 1, nome: "DstoneDev", senha: "Waguri123Teto", idade: 17, pfp: "pfp0" },
    { id: 2, nome: "FortieDev", senha: "johnFortune69", idade: 16, pfp: "pfp0" },
    { id: 3, nome: "CrooslDev", senha: "TwitterUser99", idade: 17, pfp: "pfp0" },
];

app.get("/", (req, res) => {
    const { nome, pfp } = req.query;
    res.render("homePage", { nome: nome, pfp: pfp });
});

app.get("/disconnect", (req, res) => {
    res.render("homePage");
});

app.get("/cadastro", (req, res) => res.render("cadastroPage"));

app.post("/cadastro/novo", (req, res) => {
    const { nome, senha, idade, pfp } = req.body;
    const id = users.length + 1;
    users.push({ id, nome, senha, idade: parseInt(idade), pfp });
    res.redirect(`/?nome=${users[id - 1].nome}&pfp=${users[id - 1].pfp}`);
});

app.get("/user", (req, res) => {
const { nome, pfp } = req.query;
res.render("UserPage", { nome: nome, pfp: pfp })

});
