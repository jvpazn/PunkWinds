const { DataTypes } = require('sequelize')
const db = require('../config/db')

const Review = db.define('Review', {
    rating: {
        type: DataTypes.ENUM('Bom', 'Mediano', 'Ruim'),
        allowNull: false
    }
})

module.exports = Review