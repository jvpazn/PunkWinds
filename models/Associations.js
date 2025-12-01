const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Game = require('./Game');

const UserGame = sequelize.define('UserGame', {
    nickname: { 
        type: DataTypes.STRING,
        defaultValue: ''
    }
}, {
    tableName: 'UserGames'
});

User.belongsToMany(Game, { through: UserGame, foreignKey: 'UserId', as: 'Biblioteca' });
Game.belongsToMany(User, { through: UserGame, foreignKey: 'GameId' });

UserGame.belongsTo(User, { foreignKey: 'UserId' });
UserGame.belongsTo(Game, { foreignKey: 'GameId' });

const Friendship = sequelize.define('Friendship', {
    nickname: {
        type: DataTypes.STRING,
        defaultValue: ''
    }
}, {
    tableName: 'Friendships'
});

User.belongsToMany(User, { 
    through: Friendship, 
    as: 'Amigos', 
    foreignKey: 'UserId', 
    otherKey: 'FriendId'
});

module.exports = { 
    User, 
    Game, 
    UserGame, 
    Friendship, 
    sequelize 
};