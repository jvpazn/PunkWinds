const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    nome: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true 
    },
    senha: {
        type: DataTypes.STRING,
        allowNull: false
    },
    idade: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    pfp: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'Users'
});

module.exports = User;