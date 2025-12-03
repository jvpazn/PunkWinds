const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Comment = sequelize.define(
  "Comment",
  {
    texto: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "Comments",
  }
);

module.exports = Comment;
