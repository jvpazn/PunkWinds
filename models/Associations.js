const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");
const Game = require("./Game");
const Comment = require("./Comment");
const PaymentMethod = require("./PaymentMethod");
const CustomGame = require("./CustomGame");
const Review = require("./Review");

const UserGame = sequelize.define(
  "UserGame",
  {
    nickname: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
  },
  { tableName: "UserGames" }
);

User.belongsToMany(Game, {
  through: UserGame,
  foreignKey: "UserId",
  as: "Biblioteca",
});
Game.belongsToMany(User, { through: UserGame, foreignKey: "GameId" });
UserGame.belongsTo(User, { foreignKey: "UserId" });
UserGame.belongsTo(Game, { foreignKey: "GameId" });

const Friendship = sequelize.define(
  "Friendship",
  {
    nickname: { type: DataTypes.STRING, defaultValue: "" },
  },
  { tableName: "Friendships" }
);

User.belongsToMany(User, {
  through: Friendship,
  as: "Amigos",
  foreignKey: "UserId",
  otherKey: "FriendId",
});

User.hasMany(Comment, { foreignKey: "UserId" });
Comment.belongsTo(User, { foreignKey: "UserId" });

Game.hasMany(Comment, { foreignKey: "GameId" });
Comment.belongsTo(Game, { foreignKey: "GameId" });

User.hasMany(PaymentMethod, { foreignKey: "UserId" });
PaymentMethod.belongsTo(User, { foreignKey: "UserId" });

User.hasMany(CustomGame, { foreignKey: "UserId" });
CustomGame.belongsTo(User, { foreignKey: "UserId" });

User.hasMany(Review, { foreignKey: "UserId" });
Review.belongsTo(User, { foreignKey: "UserId" });

Game.hasMany(Review, { foreignKey: "GameId" }); 
Review.belongsTo(Game, { foreignKey: "GameId" });

module.exports = {
  User,
  Game,
  UserGame,
  Friendship,
  Comment,
  PaymentMethod,
  CustomGame,
  Review,
  sequelize,
};