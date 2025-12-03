const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const fs = require("fs");

const {
  User,
  Game,
  UserGame,
  Friendship,
  Comment,
  PaymentMethod,
  CustomGame,
  sequelize,
} = require("./models/Associations");
const { Op } = require("sequelize");

const gamesData = require("./config/seeds/gamesData");

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.engine("handlebars", exphbs.engine({ defaultLayout: false }));
app.set("view engine", "handlebars");

async function populateDatabase() {
  try {
    if (!(await Game.count())) {
      await Game.bulkCreate(
        gamesData.map((g) => ({
          id: g.idgames,
          gameName: g.gameName,
          gamePrice: g.gamePrice,
          gameImg: g.gameImg,
        }))
      );

      console.log("Jogos populados com sucesso.");
    }
  } catch (error) {
    console.error("Erro ao popular o banco de dados:", error);
  }
}

app.get("/", async (req, res) => {
  try {
    const { id } = req.query;
    const user = await User.findByPk(id);

    if (user) {
      res.render("homePage", { nome: user.nome, pfp: user.pfp, id: user.id });
    } else {
      res.render("homePage");
    }
  } catch (error) {
    console.error("Erro na rota /:", error);
    res.status(500).send("Erro interno do servidor.");
  }
});

app.get("/cadastro", (req, res) => res.render("cadastroPage"));

app.post("/cadastro/novo", async (req, res) => {
  const { nome, senha, idade, pfp } = req.body;
  const idadeNum = parseInt(idade);

  if (idadeNum < 18) {
    return res.render("cadastroPage", {
      erro: "Você deve ser maior de 18 anos para se cadastrar!",
    });
  }

  try {
    const existingUser = await User.findOne({ where: { nome: nome } });
    if (existingUser) {
      return res.render("cadastroPage", {
        erro: "Nome de usuário já está em uso.",
      });
    }

    const newUser = await User.create({ nome, senha, idade: idadeNum, pfp });

    res.redirect(`/?id=${newUser.id}`);
  } catch (error) {
    console.error("Erro ao cadastrar novo usuário:", error);
    res
      .status(500)
      .render("cadastroPage", { erro: "Erro ao tentar cadastrar." });
  }
});

app.get("/user", async (req, res) => {
  const { id } = req.query;
  try {
    const user = await User.findByPk(Number(id), {
      include: [
        {
          model: Game,
          as: "Biblioteca",
          through: { attributes: ["nickname"] },
        },
        { model: User, as: "Amigos", through: { attributes: ["nickname"] } },
        { model: PaymentMethod },
        { model: CustomGame },
      ],
    });

    if (!user) return res.redirect("/");

    const bibliotecaDetalhada = user.Biblioteca.map((game) => ({
      idgames: game.id,
      gameName: game.gameName,
      gameImg: game.gameImg,
      gamePrice: game.gamePrice,
      nickname: game.UserGame.nickname,
    }));

    const listaAmigosDetalhada = user.Amigos.map((amigo) => ({
      idAmigo: amigo.id,
      nomeOriginal: amigo.nome,
      pfp: amigo.pfp,
      nickname: amigo.Friendship ? amigo.Friendship.nickname : "",
    }));

    const metodosPagamento = user.PaymentMethods.map((pm) => ({
      id: pm.id,
      tipo: pm.tipo,
      apelido: pm.apelido,
      detalhes: pm.detalhes,
    }));

    const jogosCustomizados = user.CustomGames.map((cg) => ({
      id: cg.id,
      gameName: cg.gameName,
      gameImg: cg.gameImg,
    }));

    res.render("UserPage", {
      nome: user.nome,
      pfp: user.pfp,
      id: user.id,
      biblioteca: bibliotecaDetalhada,
      amigos: listaAmigosDetalhada,
      metodosPagamento: metodosPagamento,
      customGames: jogosCustomizados,
      maisde0amg: listaAmigosDetalhada.length > 0,
      maisde0Jogos: bibliotecaDetalhada.length > 0,
      maisde0Custom: jogosCustomizados.length > 0,
    });
  } catch (error) {
    console.error("Erro na rota /user:", error);
    res.status(500).send("Erro interno do servidor.");
  }
});

app.get("/disconnect", (req, res) => {
  res.render("homePage");
});

app.get("/login", (req, res) => res.render("LoginUser"));

app.post("/login/logar", async (req, res) => {
  const { nome, senha } = req.body;

  try {
    const userLogin = await User.findOne({ where: { nome } });

    if (userLogin && userLogin.senha === senha) {
      res.redirect(`/?id=${userLogin.id}`);
    } else {
      res.render("LoginUser", {
        erro: "Login ou Senha Incorretos!",
      });
    }
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).render("LoginUser", { erro: "Erro ao tentar logar." });
  }
});

app.get("/user/amigos", async (req, res) => {
  const { id, erro } = req.query;
  try {
    const user = await User.findByPk(Number(id), {
      include: [
        { model: User, as: "Amigos", through: { attributes: ["nickname"] } },
      ],
    });

    if (!user) return res.redirect("/");

    const listaAmigosDetalhada = user.Amigos.map((amigo) => ({
      idAmigo: amigo.id,
      nomeOriginal: amigo.nome,
      pfp: amigo.pfp,
      nickname: amigo.Friendship ? amigo.Friendship.nickname : "",
    }));

    res.render("amigosPage", {
      id: user.id,
      nome: user.nome,
      pfp: user.pfp,
      amigos: listaAmigosDetalhada,
      erro: erro,
    });
  } catch (error) {
    console.error("Erro na rota /user/amigos:", error);
    res.status(500).send("Erro interno do servidor.");
  }
});

app.post("/user/amigos/adicionar", async (req, res) => {
  const { id, nomeAmigo } = req.body;
  const userId = Number(id);

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.redirect("/");

    const amigoEncontrado = await User.findOne({
      where: { nome: { [Op.iLike]: nomeAmigo } },
    });

    if (!amigoEncontrado) {
      return res.redirect(
        `/user/amigos?id=${id}&erro=Usuário não encontrado! Verifique o nome.`
      );
    }

    if (amigoEncontrado.id === userId) {
      return res.redirect(
        `/user/amigos?id=${id}&erro=Você não pode adicionar a si mesmo!`
      );
    }

    const [amizadeAdicionada, created] = await Friendship.findOrCreate({
      where: { UserId: userId, FriendId: amigoEncontrado.id },
      defaults: { nickname: "" },
    });

    if (!created) {
      return res.redirect(
        `/user/amigos?id=${id}&erro=Esse usuário já está na sua lista!`
      );
    }

    await Friendship.findOrCreate({
      where: { UserId: amigoEncontrado.id, FriendId: userId },
      defaults: { nickname: "" },
    });

    res.redirect(`/user/amigos?id=${id}`);
  } catch (error) {
    console.error("Erro ao adicionar amigo:", error);
    res.status(500).send("Erro interno ao tentar adicionar amigo.");
  }
});

app.post("/user/amigos/apelido", async (req, res) => {
  const { id, idAmigo, nickname } = req.body;

  try {
    await Friendship.update(
      { nickname },
      {
        where: {
          UserId: Number(id),
          FriendId: Number(idAmigo),
        },
      }
    );

    res.redirect(`/user/amigos?id=${id}`);
  } catch (error) {
    console.error("Erro ao definir apelido de amigo:", error);
    res.status(500).send("Erro interno ao tentar salvar apelido.");
  }
});

app.post("/user/amigos/remover", async (req, res) => {
  const { id, idAmigo } = req.body;
  const userId = Number(id);
  const friendId = Number(idAmigo);

  try {
    await Friendship.destroy({ where: { UserId: userId, FriendId: friendId } });

    await Friendship.destroy({ where: { UserId: friendId, FriendId: userId } });

    res.redirect(`/user/amigos?id=${id}`);
  } catch (error) {
    console.error("Erro ao remover amigo:", error);
    res.status(500).send("Erro interno ao tentar remover amigo.");
  }
});

app.get("/user/atualizar", async (req, res) => {
  const { id } = req.query;
  try {
    const user = await User.findByPk(Number(id));

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
  } catch (error) {
    console.error("Erro na rota /user/atualizar (GET):", error);
    res.status(500).send("Erro interno do servidor.");
  }
});

app.post("/user/atualizar", async (req, res) => {
  const { id, nome, senha, idade, pfp } = req.body;
  const userId = Number(id);
  const idadeNum = parseInt(idade);

  if (idadeNum < 18) {
    return res.render("atualizarPage", {
      erro: "Você deve ser maior de 18 anos para estar cadastrado!",
      id,
      nome,
      senha,
      idade,
      pfp,
    });
  }

  try {
    const [updatedRows] = await User.update(
      { nome, senha, idade: idadeNum, pfp },
      { where: { id: userId } }
    );

    if (updatedRows > 0) {
      res.redirect(`/?id=${userId}`);
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).send("Erro interno ao tentar atualizar.");
  }
});

app.get("/user/deletar", async (req, res) => {
  const { id } = req.query;
  try {
    const deletedCount = await User.destroy({ where: { id: Number(id) } });

    if (deletedCount > 0) {
      res.redirect("/login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    console.error("Erro ao deletar usuário:", error);
    res.status(500).send("Erro interno ao tentar deletar.");
  }
});

app.get("/game", async (req, res) => {
  const { idgames, id } = req.query;
  try {
    const jogo = await Game.findByPk(Number(idgames), {
      include: [
        {
          model: Comment,
          include: [{ model: User, attributes: ["nome", "pfp"] }],
        },
      ],
    });

    const user = await User.findByPk(Number(id));

    if (jogo) {
      const comentariosFormatados = jogo.Comments.map((c) => ({
        idComentario: c.id,
        texto: c.texto,
        nomeAutor: c.User.nome,
        pfpAutor: c.User.pfp,
        eDono: user ? c.UserId === user.id : false,
      }));

      res.render("gamePage", {
        idgames: jogo.id,
        gameName: jogo.gameName,
        gamePrice: jogo.gamePrice,
        gameImg: jogo.gameImg,
        id: id,
        nome: user ? user.nome : null,
        comentarios: comentariosFormatados,
      });
    } else {
      res.redirect(`/?id=${id}`);
    }
  } catch (error) {
    console.error("Erro na rota /game:", error);
    res.status(500).send("Erro interno do servidor.");
  }
});

app.post("/game/comprar", async (req, res) => {
  const { idgames, id } = req.body;
  const userId = Number(id);
  const gameId = Number(idgames);

  try {
    const [user, jogo] = await Promise.all([
      User.findByPk(userId),
      Game.findByPk(gameId),
    ]);

    if (!user || !jogo) {
      return res
        .status(404)
        .send({ message: "Usuário ou Jogo não encontrado." });
    }

    const jatem = await UserGame.findOne({
      where: { UserId: userId, GameId: gameId },
    });

    if (jatem) {
      return res.redirect(`/?id=${id}`);
    }

    await UserGame.create({ UserId: userId, GameId: gameId, nickname: "" });

    res.redirect(`/?id=${id}`);
  } catch (error) {
    console.error("Erro ao comprar jogo:", error);
    res.status(500).send("Erro interno ao tentar comprar jogo.");
  }
});

app.get("/user/yourGamePage", async (req, res) => {
  const { id, erro, sucesso } = req.query;
  try {
    const user = await User.findByPk(Number(id), {
      include: [
        {
          model: Game,
          as: "Biblioteca",
          through: { attributes: ["nickname"] },
        },
        { model: CustomGame },
      ],
    });

    if (!user) return res.redirect("/");

    const jogosNaBiblioteca = user.Biblioteca.map((game) => ({
      idgames: game.id,
      gameName: game.gameName,
      gamePrice: game.gamePrice,
      gameImg: game.gameImg,
      nickname: game.UserGame.nickname,
    }));

    const jogosCustomizados = user.CustomGames.map((cg) => ({
      id: cg.id,
      gameName: cg.gameName,
      gameImg: cg.gameImg,
    }));

    res.render("yourGamePage", {
      id: user.id,
      nome: user.nome,
      jogos: jogosNaBiblioteca,
      customGames: jogosCustomizados,
      erro: erro,
      sucesso: sucesso,
    });
  } catch (error) {
    console.error("Erro na rota /user/yourGamePage:", error);
    res.status(500).send("Erro interno do servidor.");
  }
});

app.post("/user/games/apelidar", async (req, res) => {
  const { id, idJogo, nickname } = req.body;
  const userId = Number(id);
  const gameId = Number(idJogo);

  try {
    const [updatedRows] = await UserGame.update(
      { nickname },
      { where: { UserId: userId, GameId: gameId } }
    );

    if (updatedRows > 0) {
      return res.redirect(
        `/user/yourGamePage?id=${id}&sucesso=Apelido salvo com sucesso!`
      );
    }
  } catch (error) {
    console.error("Erro ao apelidar jogo:", error);
  }

  res.redirect(
    `/user/yourGamePage?id=${id}&erro=Jogo ou usuário não encontrado!`
  );
});

app.post("/user/games/remover", async (req, res) => {
  const { id, idJogo } = req.body;
  const userId = Number(id);
  const gameId = Number(idJogo);

  try {
    const deletedCount = await UserGame.destroy({
      where: { UserId: userId, GameId: gameId },
    });

    if (deletedCount > 0) {
      return res.redirect(
        `/user/yourGamePage?id=${id}&sucesso=Jogo reembolsado com sucesso!`
      );
    }
  } catch (error) {
    console.error("Erro ao remover jogo:", error);
  }

  res.redirect(
    `/user/yourGamePage?id=${id}&erro=Jogo não encontrado na sua biblioteca!`
  );
});

app.post("/game/comentar", async (req, res) => {
  const { id, idgames, texto } = req.body;
  try {
    await Comment.create({
      texto: texto,
      UserId: Number(id),
      GameId: Number(idgames),
    });
    res.redirect(`/game?idgames=${idgames}&id=${id}`);
  } catch (error) {
    console.error("Erro ao comentar:", error);
    res.redirect(`/game?idgames=${idgames}&id=${id}`);
  }
});

app.post("/game/comentar/deletar", async (req, res) => {
  const { id, idgames, idComentario } = req.body;
  try {
    await Comment.destroy({
      where: { id: idComentario, UserId: Number(id) },
    });
    res.redirect(`/game?idgames=${idgames}&id=${id}`);
  } catch (error) {
    console.error("Erro ao deletar comentário:", error);
    res.redirect(`/game?idgames=${idgames}&id=${id}`);
  }
});

app.post("/game/comentar/editar", async (req, res) => {
  const { id, idgames, idComentario, novoTexto } = req.body;
  try {
    await Comment.update(
      { texto: novoTexto },
      { where: { id: idComentario, UserId: Number(id) } }
    );
    res.redirect(`/game?idgames=${idgames}&id=${id}`);
  } catch (error) {
    console.error("Erro ao editar comentário:", error);
    res.redirect(`/game?idgames=${idgames}&id=${id}`);
  }
});

app.get("/comprar", async (req, res) => {
  const { id, idgames } = req.query;

  try {
    const user = await User.findByPk(Number(id), {
      include: [{ model: PaymentMethod }],
    });
    const game = await Game.findByPk(Number(idgames));

    if (!user || !game) return res.redirect("/");

    const metodos = user.PaymentMethods.map((pm) => ({
      id: pm.id,
      tipo: pm.tipo,
      apelido: pm.apelido,
      detalhes: pm.detalhes,
    }));

    res.render("comprarPage", {
      id: user.id,
      nome: user.nome,
      game: game.toJSON(),
      metodos: metodos,
      temMetodos: metodos.length > 0,
    });
  } catch (error) {
    console.error("Erro ao carregar tela de compra:", error);
    res.redirect(`/?id=${id}`);
  }
});

app.post("/comprar/finalizar", async (req, res) => {
  const { id, idgames } = req.body;

  try {
    const jatem = await UserGame.findOne({
      where: { UserId: Number(id), GameId: Number(idgames) },
    });

    if (!jatem) {
      await UserGame.create({
        UserId: Number(id),
        GameId: Number(idgames),
        nickname: "",
      });
    }

    res.redirect(
      `/user/yourGamePage?id=${id}&sucesso=Compra realizada com sucesso!`
    );
  } catch (error) {
    console.error("Erro na compra:", error);
    res.redirect(`/game?idgames=${idgames}&id=${id}`);
  }
});

app.post("/user/pagamento/adicionar", async (req, res) => {
  const { id, tipo, apelido, detalhes, origem, idgames } = req.body;

  try {
    await PaymentMethod.create({
      tipo,
      apelido,
      detalhes,
      UserId: Number(id),
    });

    if (origem === "comprar") {
      res.redirect(`/comprar?id=${id}&idgames=${idgames}`);
    } else {
      res.redirect(`/user?id=${id}`);
    }
  } catch (error) {
    console.error("Erro ao adicionar pagamento:", error);
    res.redirect(`/user?id=${id}`);
  }
});

app.post("/user/pagamento/remover", async (req, res) => {
  const { id, idPagamento, origem, idgames } = req.body;

  try {
    await PaymentMethod.destroy({
      where: { id: idPagamento, UserId: Number(id) },
    });

    if (origem === "comprar") {
      res.redirect(`/comprar?id=${id}&idgames=${idgames}`);
    } else {
      res.redirect(`/user?id=${id}`);
    }
  } catch (error) {
    console.error("Erro ao remover pagamento:", error);
    res.redirect(`/user?id=${id}`);
  }
});

app.post("/user/pagamento/editar", async (req, res) => {
  const { id, idPagamento, novoApelido, origem } = req.body;

  try {
    await PaymentMethod.update(
      { apelido: novoApelido },
      { where: { id: idPagamento, UserId: Number(id) } }
    );
    res.redirect(`/user?id=${id}`);
  } catch (error) {
    console.error("Erro ao editar pagamento:", error);
    res.redirect(`/user?id=${id}`);
  }
});

app.get("/user/addGame", (req, res) => {
  const { id } = req.query;
  res.render("addGamePage", { id });
});

app.post("/user/addGame/novo", async (req, res) => {
  const { id, gameName, gameImgData } = req.body;

  try {
    await CustomGame.create({
      gameName,
      gameImg: gameImgData,
      UserId: Number(id),
    });
    res.redirect(`/user?id=${id}`);
  } catch (error) {
    console.error("Erro ao adicionar jogo customizado:", error);
    res.redirect(`/user/addGame?id=${id}&erro=Erro ao salvar jogo`);
  }
});

app.post("/user/customGame/editar", async (req, res) => {
  const { id, idCustomGame, novoNome } = req.body;

  try {
    await CustomGame.update(
      { gameName: novoNome },
      { where: { id: idCustomGame, UserId: Number(id) } }
    );
    res.redirect(`/user?id=${id}`);
  } catch (error) {
    console.error("Erro ao editar jogo customizado:", error);
    res.redirect(`/user?id=${id}`);
  }
});

app.post("/user/customGame/remover", async (req, res) => {
  const { id, idCustomGame } = req.body;

  try {
    await CustomGame.destroy({
      where: { id: idCustomGame, UserId: Number(id) },
    });
    res.redirect(`/user?id=${id}`);
  } catch (error) {
    console.error("Erro ao remover jogo customizado:", error);
    res.redirect(`/user?id=${id}`);
  }
});

sequelize
  .sync()
  .then(() => {
    console.log("Banco de dados sincronizado.");
    return populateDatabase();
  })
  .then(() => {
    app.listen(port, () => {
      console.log(`Servidor em execução: http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(
      "Falha ao inicializar o servidor ou o banco de dados:",
      error
    );
  });
