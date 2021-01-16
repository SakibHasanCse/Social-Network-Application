import express from 'express'
const app = express()
import jtw from 'jsonwebtoken'
import frombidible from 'express-formidable'
import fileSystem from 'fs'
import bcrypt from 'bcrypt'
const MongoClient = require('mongodb').MongoClient

// const objectId = mongoClint.ObjectId
const http = require('http').createServer(app)

app.use(frombidible())


app.set('view engine', 'ejs')
// app.use(express.static('public'))
app.use('/public', express.static(__dirname + '/public'))


const socket = require('socket.io')(http)

const socketId = "";
var users = [];

var mainurl = 'http://localhost:3000'
socket.on('connection', (socket) => {
    console.log('user connected', socket.id)
    socketId = socket.id

})


const PORT = process.env.PORT || 3000
http.listen(PORT, () => {
    console.log(`Server Running on port ${PORT}`)



    MongoClient.connect('mongodb://localhost:27017', (err, client) => {


        var database = client.db('socialnetworks');


        console.log('database is connected')

        app.get('/', (req, res) => {
            res.render('feed/index')
        })

        app.get('/signup', function (req, res) {
            res.render('auth/signup')
        })
        app.post('/signup', (req, res) => {
            console.log(req.fields)
            const { name, username, email, password, gender } = req.fields

            database.collection("users").findOne({
                $or: [{
                    "email": email
                }, {
                    "username": username
                }]
            }, function (err, user) {
                if (err) {
                    console.log(err)
                    return res.status(400).json({
                        "status": "error",
                        "message": err
                    })
                }
                if (user == null || user == '') {
                    bcrypt.hash(password, 12, function (error, newpassword) {

                        database.collection('users').insertOne({
                            "name": name,
                            "username": username,
                            "email": email,
                            "password": newpassword,
                            "gender": gender,
                            "profileImage": "",
                            "coverImage": "",
                            "dob": "",
                            "city": '',
                            "country": "",
                            "aboutme": "",
                            "friends": [],
                            "pages": [],
                            "notification": [],
                            "groups": [],
                            "posts": []
                        }, function (error, data) {
                            return res.status(201).json({
                                "status": "success",
                                "message": "Signed up Successfully"
                            })

                        })
                    })
                } else {
                    return res.status(404).json({
                        "status": "error",
                        "message": "email and username already exit"
                    })
                }


            })

        })

        app.get('/login', (req, res) => {
            res.render('auth/login')
        })
        app.post('/login', (req, res) => {
            const { email, password } = req.fields
            console.log(email, password)

            database.collection('users').findOne({ "email": email }, (err, user) => {
                if (err || !user) {
                    return res.json({
                        status: "error",
                        message: "Email not Exist"
                    })

                }

                if (user) {
                    console.log(user)
                    bcrypt.compare(password, user.password, (err, isVarify) => {
                        if (isVarify) {
                            var accessToken = jtw.sign({ email: email }, 'secretTokenaa')
                            database.collection('users').findOneAndUpdate({ "email": email }, { $set: { "accessToken": accessToken } }, (err, result) => {
                                if (err) {
                                    return res.json({
                                        status: "error",
                                        message: err
                                    })
                                }

                                return res.json({
                                    status: "success",
                                    message: 'Login Success',
                                    accessToken: accessToken,
                                    profileImage: user.profileImage
                                })

                            })
                        } else {
                            return res.json({
                                status: "success",
                                message: 'Login Success'
                            })
                        }
                    })
                }

            })
        })
        app.get('/updateProfile', (req, res) => {

            res.render('feed/updateProfile')
        })
    })
})