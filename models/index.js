const dbConfig = require('../config/dbConfig')
const { Sequelize, DataTypes } = require('sequelize')

// instantiating sequelize object
const sequelize = new Sequelize(
    dbConfig.DB,
    dbConfig.USER,
    dbConfig.PASSWORD, {
        host: dbConfig.HOST,
        dialect: dbConfig.dialect,
        operatorsAliases: 0,

        pool: {
            max: dbConfig.pool.max,
            min: dbConfig.pool.min,
            acquire: dbConfig.pool.acquire,
            idle: dbConfig.pool.idle
        },
        logging: false
    }
)

sequelize.authenticate()
.then(() => {
    console.log('connected')
})
.catch(error => {
    console.log('Error: ' + error)
})

const db = {}

db.sequelize = Sequelize // constructor
db.sequelize = sequelize // object

db.users = require('./userModel')(sequelize, DataTypes)
db.urls = require('./urlModel')(sequelize, DataTypes)

db.sequelize.sync({ force: false })
.then(() => {
    console.log('yes re-sync done!')
    console.log('Database established successfully')
})

module.exports = db