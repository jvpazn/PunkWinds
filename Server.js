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

let games = [
  {idgames : 1, gameName: "JojoLands: All-Star Battle", gamePrice: 44.99, gameImg:"JojoLandsAllStarBattle"},
  {idgames : 2, gameName: "My lovely Furmate", gamePrice: 62.10, gameImg:"MyLovelyFurmate"},
  {idgames : 3, gameName: "Mob psycho 100 showdown", gamePrice: 59.99, gameImg:"Mob100psychicShowdown"},

]

let users = [
  { id: 1, nome: "DstoneDev", senha: "Waguri123Teto", idade: 17, pfp: "pfp4" },
  { id: 2, nome: "FortieDev", senha: "johnFortune69", idade: 16, pfp: "pfp1" },
  { id: 3, nome: "CrooslDev", senha: "TwitterUser99", idade: 17, pfp: "pfp5" },
];

app.get("/", (req, res) => {
  const { nome, pfp } = req.query;
  res.render("homePage", { nome: nome, pfp: pfp });
});

app.get("/disconnect", (req, res) => {
  res.render("homePage");
});

app.get("/user", (req, res) => {
  const { nome, pfp } = req.query;
  res.render("UserPage", { nome: nome, pfp: pfp });
});

app.get("/cadastro", (req, res) => res.render("cadastroPage"));

app.post("/cadastro/novo", (req, res) => {
  const { nome, senha, idade, pfp } = req.body;
  const id = users.length + 1;
  users.push({ id, nome, senha, idade: parseInt(idade), pfp });
  res.redirect(`/?nome=${users[id - 1].nome}&pfp=${users[id - 1].pfp}`);
});

app.get("/user/atualizar", (req, res) => {
  const { nome } = req.query;
  const user = users.find((u) => u.nome === nome);
  if (user) {
    res.render("atualizarPage", {
      nome: user.nome,
      senha: user.senha,
      idade: user.idade,
      pfp: user.pfp,
    });
  } else {
    res.redirect("/");
  }
});

app.post("/user/atualizar", (req, res) => {
  const { nomeOriginal, nome, senha, idade, pfp } = req.body;
  const user = users.find((u) => u.nome === nomeOriginal);
  if (user) {
    user.nome = nome;
    user.senha = senha;
    user.idade = parseInt(idade);
    user.pfp = pfp;
    res.redirect(`/?nome=${user.nome}&pfp=${user.pfp}`);
  } else {
    res.redirect("/");
  }
});

app.get("/login", (req, res) => res.render("LoginUser"));

app.post("/login/logar", (req, res) => {
const { nome, senha } = req.body;
const userLogin = users.find(u => u.nome === nome);

if(userLogin && userLogin.senha === senha){
res.redirect(`/user?nome=${userLogin.nome}&pfp=${userLogin.pfp}`);
}else{
    return res.status(401).json({ 
            sucesso: false, 
            erro: "Login ou Senha Incorretos!"
          });
}
}
);

app.get("/game", (req, res) => {
  const { idgames, nome, pfp } = req.query;
  const jogo = games.find((u) => u.idgames === Number(idgames));
  const gameName = jogo.gameName;
  const gamePrice = jogo.gamePrice;
  const gameImg = jogo.gameImg;

  res.render("gamePage", { gameName, gamePrice, gameImg });
});
