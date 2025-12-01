const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Game = sequelize.define('Game', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'idgames' 
    },
    gameName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    gamePrice: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    gameImg: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'Games'
});

module.exports = Game;