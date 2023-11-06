const db = require('../models')
const bcrypt = require('bcrypt')
const { sequelize }  = require('../models/index')
const moment = require('moment')
const User = db.users
const Url = db.urls

const bodyAllowedList = new Set (['long_url', 'short_url'])

// POST route to add a new url to database
const addCustomUrl = async(req, res) => {
    // if no authorization, return unauthorized
    if(!req.get('Authorization')){
        return res.status(401).send('Unauthorized')
    }

    const authenticated = await authenticateAddUrl(req)
    if(authenticated == true){
        // checks if request body exists, if not returns a bad request
        if(Object.keys(req.body).length === 0){
            return res.status(400).send('Bad request: Request body is empty') // request body is empty
        }

        // if any of the required fields are empty or read only fields are entered, return a bad request
        if(!req.body.long_url){
            return res.status(400).send('Bad request: Long url missing') // required fields are missing
        }

        for (const prop in req.body) {
        if(req.body.hasOwnProperty(prop) && !bodyAllowedList.has(prop)) {
            return res.status(400).send('Bad request: Values for unknown field entered')
            }
        }

        // retrieve username of user
        var username = Buffer.from(req.get('Authorization').split(' ')[1], 'base64').toString().split(':')[0]

        // retrieves attribute values from request body
        var long_url = req.body.long_url
        var short_url = req.body.short_url 
        var owner_user = (await User.findOne({where: { username: username }}))
        var date = moment().tz("America/New_York").format('YYYY-MM-DDTHH:mm:ss.sssZ')
    
        if (owner_user.requests_available == 0){
            return res.status(400).send('You are out of requests')
        }

        var checkIfExists = await Url.findOne({where: { short_url: 'http://short.url/' + short_url }})
    
        if(checkIfExists == null){
            let customShortUrl = {
                user_id: owner_user.id,
                long_url: long_url
            }
        if(short_url == null || short_url == ""){
            customShortUrl.short_url = 'http://short.url/' + (Math.random() + 1).toString(36).substring(7)
        }
        else{
            customShortUrl.short_url = 'http://short.url/' + short_url
        }
            await Url.create(customShortUrl)
            await User.update({requests_available: owner_user.requests_available - 1, requests_made: owner_user.requests_made + 1}, {where: { id: owner_user.id }})
            let response = await Url.findOne({where: { short_url: customShortUrl.short_url }})
            return res.status(201).send(response)
        }
    }

    if(authenticated == false){
        return res.status(401).send('Unauthorized') // user not authenticated
    }

    return res.status(400).send('Bad request: Custom short url already exists') // above checks fail
}

// GET route to retrieve all urls of a user 
const getUrls = async (req, res) => {
    if(isNaN(req.params.id)){
        return res.status(400).send('Bad request: ID cannot be a string') // id cannot be a string
    }
    
    // checks for authorization header
    if(!req.get('Authorization')){
        return res.status(401).send('Unauthorized')
    }

    // authorization check
    const authenticated = await authenticate(req, res)
    if(authenticated == true){
        // retrieve user details on successful authentication
        let urls = await Url.findAll({where: { user_id: req.params.id },
            attributes: { exclude: [ 'password' ]}})
        if(urls != null){
            return res.status(200).send(urls)
        }
    }
}

// GET route to redirect url 
const redirect = async (req, res) => {
    if(isNaN(req.params.id)){
        return res.status(400).send('Bad request: ID cannot be a string') // url cannot be a string
    }
    
    // checks for authorization header
    if(!req.get('Authorization')){
        return res.status(401).send('Unauthorized')
    }

    // authorization check
    const authenticated = await authenticate(req, res)
    if(authenticated == true){
        // retrieve user details on successful authentication
        let url = await Url.findOne({where: { short_url: req.body.short_url },
            attributes: { exclude: [ 'password' ]}})
        if(url != null){
            res.status(301);
            res.header('Location', url.long_url);
            return res.send(url.long_url);
        }
    }
}

// function to authenticate a url while adding 
async function authenticateAddUrl(req) {
    // decodes authorization header to fetch username and password
    var credentials = Buffer.from(req.get('Authorization').split(' ')[1], 'base64').toString().split(':')
    var username = credentials[0]
    var password = credentials[1]

    // finding the user with specified id
    let user = await User.findOne({where: { username: username }})

    if(user){
        // compare user password with stored hash
        const authenticated = await bcrypt.compare(password, user.password)
        if(authenticated) {
            return true
        }
    }
    // if user doesn't exist or unauthenticated
    return false
}

// function to authenticate a user
async function authenticate (req, res) {
    // decodes authorization header to fetch username and password
    var credentials = Buffer.from(req.get('Authorization').split(' ')[1], 'base64').toString().split(':')
    var username = credentials[0]
    var password = credentials[1]

    // finding the user with specified id
    let actualUser = await User.findOne({where: { id: req.params.id }})
    let givenUser = await User.findOne({where: { username: username }})

    if(givenUser && actualUser){
        // compare user password with stored hash
        const authenticated = await bcrypt.compare(password, givenUser.password)
        console.log(authenticated)
        console.log(username)
        // if user is authenticated (credentials are correct), compares username passed to that of username found via id passed (username is correct)
        if(authenticated && username == actualUser.username) {
            return true
        }
        if(authenticated && username != actualUser.username){
            return res.status(403).send('Forbidden')
        }
    }
    // if user doesn't exist
    return res.status(401).send('Unauthorized')
}

module.exports = {
    addCustomUrl,
    getUrls,
    redirect
}