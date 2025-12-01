const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const fs = require('fs');

const { User, Game, UserGame, Friendship, sequelize } = require('./models/Associations');
const { Op } = require('sequelize'); 

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.engine("handlebars", exphbs.engine({ defaultLayout: false }));
app.set("view engine", "handlebars");

const gamesFilePath = path.join(__dirname, "data", "games.json");
const usersFilePath = path.join(__dirname, "data", "users.json");

async function populateDatabase() {
    try {
        if (!await Game.count()) {
            const gamesData = JSON.parse(fs.readFileSync(gamesFilePath, 'utf8'));
            await Game.bulkCreate(gamesData.map(g => ({
                id: g.idgames,
                gameName: g.gameName,
                gamePrice: g.gamePrice,
                gameImg: g.gameImg
            })));
            console.log("Jogos populados com sucesso.");
        }

        if (!await User.count()) {
            const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
            for (const userData of usersData) {
                const user = await User.create({
                    id: userData.id,
                    nome: userData.nome,
                    senha: userData.senha,
                    idade: userData.idade,
                    pfp: userData.pfp
                });

                for (const item of userData.biblioteca) {
                    await UserGame.create({
                        UserId: user.id,
                        GameId: item.idgames,
                        nickname: item.nickname || ''
                    });
                }
            }
            
            for (const userData of usersData) {
                const user = await User.findByPk(userData.id);
                if (user) {
                    for (const friendRel of userData.amigos) {
                        const existingFriendship = await Friendship.findOne({
                            where: {
                                UserId: user.id,
                                FriendId: friendRel.id
                            }
                        });
                        
                        if (!existingFriendship) {
                            await Friendship.create({
                                UserId: user.id,
                                FriendId: friendRel.id,
                                nickname: friendRel.nickname || ''
                            });
                        }
                    }
                }
            }
            console.log("Usuários, Bibliotecas e Amizades populados com sucesso.");
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
        res.status(500).render("cadastroPage", { erro: "Erro ao tentar cadastrar." });
    }
});

app.get("/user", async (req, res) => {
    const { id } = req.query;
    try {
        const user = await User.findByPk(Number(id), {
            include: [
                { model: Game, as: 'Biblioteca', through: { attributes: ['nickname'] } },
                { model: User, as: 'Amigos', through: { attributes: ['nickname'] } }
            ]
        }); 

        if (!user) return res.redirect("/");

        const bibliotecaDetalhada = user.Biblioteca.map(game => ({
            idgames: game.id,
            gameName: game.gameName,
            gameImg: game.gameImg,
            gamePrice: game.gamePrice,
            nickname: game.UserGame.nickname
        }));
        
        const listaAmigosDetalhada = user.Amigos.map((amigo) => ({
            idAmigo: amigo.id,
            nomeOriginal: amigo.nome,
            pfp: amigo.pfp,
            nickname: amigo.Friendship ? amigo.Friendship.nickname : '',
        }));

        res.render("UserPage", {
            nome: user.nome,
            pfp: user.pfp,
            id: user.id,
            biblioteca: bibliotecaDetalhada,
            amigos: listaAmigosDetalhada,
            maisde0amg: listaAmigosDetalhada.length > 0,
            maisde0Jogos: bibliotecaDetalhada.length > 0,
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
            include: [{ model: User, as: 'Amigos', through: { attributes: ['nickname'] } }]
        }); 

        if (!user) return res.redirect("/");


        const listaAmigosDetalhada = user.Amigos.map((amigo) => ({
            idAmigo: amigo.id,
            nomeOriginal: amigo.nome,
            pfp: amigo.pfp,
            nickname: amigo.Friendship ? amigo.Friendship.nickname : '',
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
            where: { nome: { [Op.iLike]: nomeAmigo } }
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
            defaults: { nickname: "" }
        });

        if (!created) {
            return res.redirect(
                `/user/amigos?id=${id}&erro=Esse usuário já está na sua lista!`
            );
        }

        await Friendship.findOrCreate({
            where: { UserId: amigoEncontrado.id, FriendId: userId },
            defaults: { nickname: "" }
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
                    FriendId: Number(idAmigo)
                } 
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
            id, nome, senha, idade, pfp,
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
        const jogo = await Game.findByPk(Number(idgames));
        const user = await User.findByPk(Number(id));

        if (jogo) {
            res.render("gamePage", {
                idgames: jogo.id,
                gameName: jogo.gameName,
                gamePrice: jogo.gamePrice,
                gameImg: jogo.gameImg,
                id: id,
                nome: user ? user.nome : null,
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
            Game.findByPk(gameId)
        ]);

        if (!user || !jogo) {
            return res.status(404).send({ message: "Usuário ou Jogo não encontrado." });
        }

        const jatem = await UserGame.findOne({ where: { UserId: userId, GameId: gameId } });

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
            include: [{ model: Game, as: 'Biblioteca', through: { attributes: ['nickname'] } }]
        }); 

        if (!user) return res.redirect("/");

        const jogosNaBiblioteca = user.Biblioteca.map(game => ({
            idgames: game.id,
            gameName: game.gameName,
            gamePrice: game.gamePrice,
            gameImg: game.gameImg,
            nickname: game.UserGame.nickname
        }));

        res.render("yourGamePage", {
            id: user.id,
            nome: user.nome,
            jogos: jogosNaBiblioteca,
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
        const deletedCount = await UserGame.destroy({ where: { UserId: userId, GameId: gameId } });

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

sequelize.sync()
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
        console.error("Falha ao inicializar o servidor ou o banco de dados:", error);
    });