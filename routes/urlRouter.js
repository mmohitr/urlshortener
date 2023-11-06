const urlController = require('../controllers/urlController')

const urlRouter = require('express').Router()

urlRouter.post('/custom', urlController.addCustomUrl)
urlRouter.get('/:id', urlController.getUrls)
urlRouter.get('/:id/redirect', urlController.redirect)

module.exports = urlRouter