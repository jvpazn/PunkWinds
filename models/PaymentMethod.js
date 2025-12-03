const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PaymentMethod = sequelize.define(
  "PaymentMethod",
  {
    tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    apelido: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    detalhes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "PaymentMethods",
  }
);

module.exports = PaymentMethod;
