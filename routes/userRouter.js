const userController = require('../controllers/userController')

const userRouter = require('express').Router()

userRouter.get('/healthz', userController.getStatus)
userRouter.post('/user', userController.addUser)
userRouter.get('/user/:id', userController.getUser)

module.exports = userRouter