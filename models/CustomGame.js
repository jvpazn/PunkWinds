const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CustomGame = sequelize.define(
  "CustomGame",
  {
    gameName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gameImg: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "CustomGames",
  }
);

module.exports = CustomGame;
