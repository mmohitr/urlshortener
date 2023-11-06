const db = require('../models')
const bcrypt = require('bcrypt')
const { sequelize }  = require('../models/index')
const moment = require('moment')
const User = db.users

// POST route to add a new user to database
const addUser = async (req, res) => {
    // checks if request body exists, if not returns a bad request
    if(Object.keys(req.body).length === 0){
        return res.status(400).send('Bad request: Request body is empty') // request body is empty
    }

    // if any of the required fields are empty, return a bad request
    if(!req.body.first_name || !req.body.last_name || !req.body.username || !req.body.password || !req.body.tier){
        return res.status(400).send('Bad request: Required fields are missing') // required fields are missing
    }

    // retrieves attribute values from request body
    var first_name = req.body.first_name
    var last_name = req.body.last_name
    var username = req.body.username
    var password = req.body.password
    var tier = req.body.tier
    var date = moment().tz("America/New_York").format('YYYY-MM-DDTHH:mm:ss.sssZ')

    // regex to check for valid username (email)
    var usernameCheck = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    var checkIfExists = await User.findOne({where: { username: username }})

    // hash the user password with a salt value of 10
    var hash = await bcrypt.hash(password, 10)

    // if username does not exist and all entered values are valid, a new user is created and their details are returned with the corresponding status code
    if(checkIfExists == null && username.match(usernameCheck)){
        // create user info to store into database
        let userInfo = {
            first_name: first_name,
            last_name: last_name,
            username: username,
            password: hash,
            tier: tier,
            requests_made: 0,
            account_created: date
        }

        if(tier == 1){
            userInfo.requests_available = 1000;
        }

        else if(tier == 2){
            userInfo.requests_available = 500;
        }

        else if(tier == 3){
            userInfo.requests_available = 100;
        }

        else if(tier == 4){
            userInfo.requests_available = 50;
        }

        else if(tier == 5){
            userInfo.requests_available = 25;
        }

        else{
            return res.status(400).send('Bad request: Invalid tier')
        }

        // creates new user and returns select details
        await User.create(userInfo)

        // finds newly created user to fetch info
        let response = await User.findOne({where: { username: username },
            attributes: { exclude: [ 'password' ]}})
        return res.status(201).send(response)
    }

    // if above checks fail, a bad request is returned
    return res.status(400).send('Bad request: Error occurred')
}

// GET route to retrieve user details
const getUser = async (req, res) => {
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
        let user = await User.findOne({where: { id: req.params.id },
            attributes: { exclude: [ 'password' ]}})
        if(user != null){
            return res.status(200).send(user)
        }
    }
}

// function to check if server is healthy
const getStatus = (req,res) => {
    sequelize
  .authenticate()
  .then(() => {
    res.send('Server healthy')
  })
  .catch(err => {
    res.send('Server unhealthy', err)
  })
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
    addUser,
    getUser,
    getStatus
}