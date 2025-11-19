const express = require("express");
const exphbs = require("express-handlebars");
const fs = require("fs");
const path = require("path");

const usersFilePath = path.join(__dirname, "data", "users.json");
const gamesFilePath = path.join(__dirname, "data", "games.json");

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

function getUsers() {
  if (!fs.existsSync(usersFilePath)) return [];
  const data = fs.readFileSync(usersFilePath);
  return JSON.parse(data);
}

function saveUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

function getGames() {
  if (!fs.existsSync(gamesFilePath)) return [];
  const data = fs.readFileSync(gamesFilePath);
  return JSON.parse(data);
}

function getUserById(id) {
  const users = getUsers();
  return users.find((u) => u.id == id);
}

// Função para obter detalhes dos amigos
function getFriendsDetails(userAmigos, allUsers) {
  return userAmigos
    .map((amigoRelacao) => {
      const dadosAmigo = allUsers.find((u) => u.id === amigoRelacao.id);
      if (dadosAmigo) {
        return {
          idAmigo: dadosAmigo.id,
          nomeOriginal: dadosAmigo.nome,
          pfp: dadosAmigo.pfp,
          nickname: amigoRelacao.nickname,
        };
      }
    })
    .filter((a) => a !== undefined);
}

app.get("/", (req, res) => {
  const { id } = req.query;
  const user = getUserById(id);

  if (user) {
    res.render("homePage", { nome: user.nome, pfp: user.pfp, id: user.id });
  } else {
    res.render("homePage");
  }
});

app.get("/cadastro", (req, res) => res.render("cadastroPage"));

app.post("/cadastro/novo", (req, res) => {
  const { nome, senha, idade, pfp } = req.body;

  const users = getUsers();
  const id = users.length + 1;
  const newUser = {
    id,
    nome,
    senha,
    idade: parseInt(idade),
    pfp,
    biblioteca: [],
    amigos: [],
  };
  users.push(newUser);
  saveUsers(users);

  res.redirect(`/?id=${newUser.id}`);
});

app.get("/user", (req, res) => {
  const { id } = req.query;
  const users = getUsers();
  const user = users.find((u) => u.id == id);

  if (user) {
    const maisde0Jogos = user.biblioteca.length > 0;

    const listaAmigosDetalhada = getFriendsDetails(user.amigos, users);
    const maisde0amg = listaAmigosDetalhada.length > 0;

    res.render("UserPage", {
      nome: user.nome,
      pfp: user.pfp,
      id: user.id,
      biblioteca: user.biblioteca,
      amigos: listaAmigosDetalhada,
      maisde0amg,
      maisde0Jogos,
    });
  } else {
    res.redirect("/");
  }
});

app.get("/disconnect", (req, res) => {
  res.render("homePage");
});

app.get("/user/amigos", (req, res) => {
  const { id, erro } = req.query;
  const users = getUsers();
  const user = users.find((u) => u.id == id);

  if (user) {
    const listaAmigosDetalhada = getFriendsDetails(user.amigos, users);

    res.render("amigosPage", {
      id: user.id,
      nome: user.nome,
      pfp: user.pfp,
      amigos: listaAmigosDetalhada,
      erro: erro, // Passa o erro para o Handlebars
    });
  } else {
    res.redirect("/");
  }
});

app.post("/user/amigos/adicionar", (req, res) => {
  const { id, nomeAmigo } = req.body;
  const users = getUsers();

  const userIndex = users.findIndex((u) => u.id == id);
  const amigoEncontrado = users.find(
    (u) => u.nome.toLowerCase() === nomeAmigo.toLowerCase()
  );

  if (userIndex === -1) return res.redirect("/");

  if (!amigoEncontrado) {
    return res.redirect(
      `/user/amigos?id=${id}&erro=Usuário não encontrado! Verifique o nome.`
    );
  }

  if (amigoEncontrado.id == id) {
    return res.redirect(
      `/user/amigos?id=${id}&erro=Você não pode adicionar a si mesmo!`
    );
  }

  const jaEhAmigo = users[userIndex].amigos.find(
    (a) => a.id === amigoEncontrado.id
  );
  if (jaEhAmigo) {
    return res.redirect(
      `/user/amigos?id=${id}&erro=Esse usuário já está na sua lista!`
    );
  }

  users[userIndex].amigos.push({
    id: amigoEncontrado.id,
    nickname: "",
  });

  saveUsers(users);
  res.redirect(`/user/amigos?id=${id}`);
});

app.post("/user/amigos/apelido", (req, res) => {
  const { id, idAmigo, nickname } = req.body;
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id == id);

  if (userIndex !== -1) {
    const amigoIndex = users[userIndex].amigos.findIndex(
      (a) => a.id == idAmigo
    );
    if (amigoIndex !== -1) {
      users[userIndex].amigos[amigoIndex].nickname = nickname;
      saveUsers(users);
    }
  }
  res.redirect(`/user/amigos?id=${id}`);
});

app.post("/user/amigos/remover", (req, res) => {
  const { id, idAmigo } = req.body;
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id == id);

  if (userIndex !== -1) {
    users[userIndex].amigos = users[userIndex].amigos.filter(
      (a) => a.id != idAmigo
    );
    saveUsers(users);
  }
  res.redirect(`/user/amigos?id=${id}`);
});

app.get("/user/atualizar", (req, res) => {
  const { id } = req.query;
  const user = getUserById(id);

  if (user) {
    res.render("atualizarPage", {
      id: user.id,
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
  const { id, nome, senha, idade, pfp } = req.body;
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id == id);

  if (userIndex !== -1) {
    users[userIndex].nome = nome;
    users[userIndex].senha = senha;
    users[userIndex].idade = parseInt(idade);
    users[userIndex].pfp = pfp;

    saveUsers(users);

    res.redirect(`/?id=${users[userIndex].id}`);
  } else {
    res.redirect("/");
  }
});

app.get("/user/deletar", (req, res) => {
  const { id } = req.query;
  const users = getUsers();
  const index = users.findIndex((u) => u.id === Number(id));
  if (index !== -1) {
    users.splice(index, 1);
    saveUsers(users);
    res.redirect("/login");
  } else {
    res.redirect("/");
  }
});

app.get("/login", (req, res) => res.render("LoginUser"));

app.post("/login/logar", (req, res) => {
  const { nome, senha } = req.body;
  const users = getUsers();
  const userLogin = users.find((u) => u.nome === nome);

  if (userLogin && userLogin.senha === senha) {
    res.redirect(`/?id=${userLogin.id}`);
  } else {
    res.render("LoginUser", {
      erro: "Login ou Senha Incorretos!",
    });
  }
});

app.get("/game", (req, res) => {
  const { idgames, id } = req.query;
  const games = getGames();
  const user = getUserById(id);
  const jogo = games.find((u) => u.idgames === Number(idgames));

  if (jogo) {
    res.render("gamePage", {
      idgames: jogo.idgames,
      gameName: jogo.gameName,
      gamePrice: jogo.gamePrice,
      gameImg: jogo.gameImg,
      id: id,
      nome: user ? user.nome : null,
    });
  } else {
    res.redirect(`/?id=${id}`);
  }
});

app.post("/game/comprar", (req, res) => {
  const { idgames, id } = req.body;

  const games = getGames();
  const users = getUsers();

  const userIndex = users.findIndex((u) => u.id == id);
  if (userIndex === -1) {
    return res.status(404).send({ message: "Usuário não encontrado." });
  }

  const user = users[userIndex];

  const jogo = games.find((g) => g.idgames === Number(idgames));
  if (!jogo) {
    return res.status(404).send({ message: "Jogo não encontrado." });
  }

  const jatem = user.biblioteca.find((j) => j.idgames === Number(idgames));
  if (jatem) {
    return res.status(400).send({ message: "Jogo já comprado." });
  }

  user.biblioteca.push({
    idgames: jogo.idgames,
    gameName: jogo.gameName,
    gamePrice: jogo.gamePrice,
    gameImg: jogo.gameImg,
  });

  saveUsers(users);

  res.redirect(`/?id=${id}`);
});
