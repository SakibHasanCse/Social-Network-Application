import express from 'express'
const app = express()
import jtw from 'jsonwebtoken'
import frombidible from 'express-formidable'
import fileSystem from 'fs'
import bcrypt from 'bcrypt'
import mongodb from 'mongodb'
const MongoClient = mongodb.MongoClient

const ObjectId = mongodb.ObjectId
const http = require('http').createServer(app)
import mongoose from 'mongoose'
app.use(frombidible())


app.set('view engine', 'ejs')
// app.use(express.static('public'))
app.use('/public', express.static(__dirname + '/public'))


const socket = require('socket.io')(http)

const socketId = "";
var users = [];

var mainurl = 'http://localhost:3000'
socket.on('connection', function (socket) {
    console.log('user connected', socket.id)
    socketId = socket.id

})

import dotenv from 'dotenv'
dotenv.config({ path: './config/config.env' })

const PORT = process.env.PORT || 3000
http.listen(PORT, () => {
    console.log(`Server Running on port ${PORT}`)


    const mongoURL = process.env.MONGOURL || 'mongodb:/localhost:27017'

    MongoClient.connect(mongoURL, (err, client) => {


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
                            "coverPhoto": "",
                            "dob": "",
                            "city": '',
                            "country": "",
                            "aboutme": "",
                            "friends": [],
                            "pages": [],
                            "notifications": [],
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
        app.post('/getuser', (req, res) => {
            const { accessToken } = req.fields
            database.collection('users').findOne({ "accessToken": accessToken }, (err, user) => {
                if (user == null) {
                    res.json({
                        "status": "error",
                        "message": "User hase beeen Loged out . please login agin"
                    })
                } else {
                    res.json({
                        status: 'success',
                        message: "User Finderd",
                        data: user
                    })
                }
            })
        })
        app.get('/logout', (req, res) => {
            res.redirect('/login')
        })
        app.post('/uploadcoverImage', (req, res) => {
            const { accessToken } = req.fields
            var coverPhoto = ''
            database.collection('users').findOne({ "accessToken": accessToken }, (err, result) => {
                if (err || result == null) {
                    return res.json({
                        static: "error",
                        message: 'User Not Found , Try agin'
                    })

                } else {
                    console.log(req.files)
                    if (req.files.coverPhoto.size > 0 && req.files.coverPhoto.type.includes('image')) {
                        if (result.coverPhoto != '') {
                            fileSystem.unlink(result.coverPhoto, (error) => {
                                console.log(error)
                                // 
                            })
                        }
                        coverPhoto = 'public/images/' + new Date().getTime() + "_" + req.files.coverPhoto.name
                        fileSystem.rename(req.files.coverPhoto.path, coverPhoto, (error) => {
                            console.log(error)
                            // 
                        })
                        // fileSystem.writeFile(coverPhoto, req.files.coverPhoto.path, function (error) {
                        //     console.log(error)

                        // })
                        database.collection('users').updateOne({ 'accessToken': accessToken }, { $set: { "coverPhoto": coverPhoto } }, (err, data) => {
                            if (err) {

                            } else {

                                res.status(201).json({
                                    data: mainurl + "/" + coverPhoto,
                                    status: 'success',
                                    message: 'Cover Photo is updated'
                                })
                            }

                        })
                    } else {
                        console.log('hello')
                        return res.json({
                            message: "Pleasse Select a valid Image",
                            status: 'error'
                        })
                    }
                }



            })
        })
        app.post('/uploadprofleImage', (req, res) => {
            const { accessToken } = req.fields
            var profileImage = ''
            database.collection('users').findOne({ "accessToken": accessToken }, (err, user) => {
                if (err || user == null) {
                    return res.json({
                        message: 'User not Found',
                        status: 'error'
                    })
                } else {

                    if (req.files.profileImage.size > 0 && req.files.profileImage.type.includes('image')) {
                        if (user.profileImage != '') {
                            fileSystem.unlink(user.profileImage, (error) => {
                                console.log(error)
                            })
                        }
                        profileImage = "public/images/" + new Date().getTime() + "_"
                        fileSystem.rename(req.files.profileImage.path, profileImage, (error) => {
                            console.log(err)
                        })

                        database.collection('users').updateOne({ "accessToken": accessToken }, { $set: { "profileImage": profileImage } }, (err, result) => {
                            return res.json({
                                message: 'Profile Photo is Uploaded',
                                data: mainurl + "/" + profileImage,
                                status: 'success'
                            })
                        })

                    } else {
                        return res.json({
                            message: 'Select Only Image',
                            status: 'error'
                        })
                    }
                }
            })
        })

        app.post('/updateProfile', (req, res) => {
            const { accessToken, name, dob, city, country, aboutMe } = req.fields
            console.log(req.fields)

            database.collection('users').findOne({ "accessToken": accessToken }, (err, user) => {
                if (err || user == null) {
                    return res.json({
                        status: 'error',
                        message: 'User Not Found'
                    })

                } else {
                    database.collection('users').updateOne({ "accessToken": accessToken },
                        { $set: { "name": name, "dob": dob, "city": city, "country": country, "aboutMe": aboutMe } }, (err, result) => {

                            if (err) {
                                return res.json({
                                    status: 'error',
                                    message: 'User Not updated'
                                })
                            } else {
                                // console.log(result)
                                return res.json({
                                    status: 'success',
                                    message: 'User updated Successfully'
                                })
                            }



                        })

                }
            })
        })
        app.post('/addPost', (req, res) => {
            const { accessToken, caption, _id } = req.fields
            var image = ''
            var video = ''
            const type = req.fields.type
            const createdAt = new Date().getTime()

            database.collection('users').findOne({ "accessToken": accessToken }, (err, user) => {
                if (err || user == null) {
                    console.log(err)

                    return res.json({
                        status: 'error',
                        message: 'User Not found'
                    })
                } else {
                    if (req.files.image.size > 0 && req.files.image.type.includes('image')) {
                        image = 'public/images/' + new Date().getTime() + '_' + req.files.image.name
                        // image = 'public/images/' + new Date().getTime() + '_' + new Date().getSeconds()

                        fileSystem.rename(req.files.image.path, image, (err) => {
                            if (err) {
                                // 
                            }
                        })
                    }
                    if (req.files.video.size > 0 && req.files.video.type.includes('video')) {
                        video = 'public/videos/' + new Date().getTime() + "_" + req.files.video.name
                        // image = 'public/images/' + new Date().getTime() + '_' + new Date().getSeconds()

                        fileSystem.rename(req.files.video.path, video, (err) => {
                            if (err) {

                            }
                        })
                    }

                    database.collection('posts').insertOne({
                        "caption": caption,
                        "video": video,
                        "image": image,
                        "createdAt": createdAt,
                        "type": type,
                        "likers": [],
                        "comments": [],
                        "groups": [],
                        "shares": [],
                        "users": {
                            "_id": user._id,
                            "name": user.name,
                            "profileImage": user.profileImage,

                        }
                    }, (err, data) => {
                        // console.log(data)
                        if (err) {
                            console.log(err)
                        } else {
                            database.collection('users').updateOne({ "accessToken": accessToken }, {
                                $push: {
                                    "posts": {
                                        "_id": data.insertedId,
                                        "caption": caption,
                                        "video": video,
                                        "image": image,
                                        "createdAt": createdAt,
                                        "type": type,
                                        "likers": [],
                                        "comments": [],

                                        "groups": [],
                                        "shares": [],
                                    }
                                }
                            }, (err, result) => {
                                // console.log(result)

                                if (err) {
                                    console.log(err)

                                } else {
                                    return res.json({
                                        message: "Post created successfully",
                                        status: "success",
                                    })
                                }
                            })

                        }
                    })
                }
            })

        })
        app.post('/getNewsFeedPost', (req, res) => {
            const accessToken = req.fields.accessToken
            database.collection('users').findOne({ "accessToken": accessToken }, (err, user) => {
                if (err || user == null) {
                    return res.json({
                        message: "User Not Found , Try agin",
                        status: "error"
                    })

                } else {
                    var id = []
                    id.push(user._id)

                    database.collection('posts').find({ "users._id": { $in: id } })
                        .sort({ "createdAt": -1 })
                        .limit(5)
                        .toArray((err, data) => {
                            if (err) {
                                console.log(err)
                                return res.json({
                                    message: "Posts fatch Fields",
                                    status: "error"

                                })
                            } else {
                                return res.json({
                                    message: "Posts fatch success",
                                    status: "success",
                                    data: data
                                })

                            }
                        })

                }
            })
        })
        app.post('/togoleLikePost', (req, res) => {
            const { _id, accessToken } = req.fields

            database.collection('users').findOne({ 'accessToken': accessToken }, (err, user) => {
                if (err || !user) {
                    return res.json({
                        message: 'User not found',
                        status: 'error'
                    })
                }
                else {

                    database.collection('posts').findOne({ "_id": ObjectId(_id) }, (err, post) => {
                        console.log(err)

                        if (err) {
                            return res.json({
                                message: 'Somthing went wrong',
                                status: 'error'
                            })
                        }

                        if (post == null) {
                            return res.json({
                                message: 'Posts not Exist',
                                status: 'error'
                            })
                        } else {

                            var isLiked = false;
                            console.log('user' + user._id.toString())
                            console.log('postl' + post.likers.length)
                            for (var i = 0; i < post.likers.length; i++) {
                                var liker = post.likers[i]
                                console.log('post.likers' + liker)


                                if (liker._id.toString() === user._id.toString()) {
                                    isLiked = true;
                                    break;
                                }
                            }
                            if (isLiked) {
                                console.log('post.likers1')

                                database.collection('posts').updateOne({ "_id": ObjectId(_id) }, {
                                    $pull: {
                                        "likers": { "_id": user._id }

                                    }
                                }, (err, result) => {
                                    if (err) {
                                        console.log(err)
                                        return res.json({
                                            message: 'Posts not Updated',
                                            status: 'error'
                                        })
                                    } else {
                                        console.log('post.likers2')

                                        database.collection('users').updateOne({
                                            $and: [
                                                { "_id": post.users._id },
                                                { "posts._id": post._id }]
                                        }, {
                                            $pull: {
                                                "posts.$[].likers": {
                                                    "_id": user._id

                                                }
                                            }
                                        })

                                        return res.json({
                                            message: 'Post hase been unliked',
                                            status: 'unliked'
                                        })

                                    }

                                })
                            } else {

                                console.log('post.likers3')


                                database.collection('users').updateOne({ "_id": post.users._id }, {
                                    $push: {
                                        "notifications": {
                                            "type": "Photo_liked",
                                            "_id": ObjectId(),
                                            "content": user.name + "hase liked your photo",
                                            "profileImage": user.profileImage,
                                            "createdAt": new Date().getTime()
                                        }
                                    }
                                })


                                database.collection('posts').updateOne({ "_id": ObjectId(_id) }, {
                                    $push: {
                                        "likers": {
                                            "_id": user._id,
                                            "profileImage": user.profileImage,
                                            "name": user.name

                                        }
                                    }
                                }, (err, result) => {

                                    if (err) {
                                        console.log(err)

                                    } else {
                                        database.collection('users').updateOne({
                                            $and:
                                                [{ "_id": user._id },
                                                { "posts._id": post._id }]
                                        },
                                            {
                                                $push:
                                                {
                                                    "posts.$[].likers":
                                                        { "_id": user._id, "profileImage": user.profileImage, "name": user.name }
                                                }
                                            })
                                        console.log('post.likers4')


                                        return res.json({ message: 'Post Liked Success', status: 'success' })
                                    }
                                })
                            }


                        }
                    })
                }
            })
        })
        app.post('/postComment', (req, res, next) => {
            const { accessToken, comment, _id, } = req.fields
            console.log(req.fields.comment)
            const createdAt = new Date().getTime()
            database.collection('users')
                .findOne({ "accessToken": accessToken }, (err, user) => {

                    if (err || !user) {
                        return res.json({
                            message: 'User Not Found , Try agin',
                            status: 'error'
                        })
                    } else {

                        database.collection('posts')
                            .findOne({ "_id": ObjectId(_id) }, (err, post) => {
                                if (err || post == null) {
                                    return res.json({
                                        message: 'Post not found , Try agin',
                                        status: 'error'
                                    })
                                } else {
                                    var commetId = ObjectId()
                                    database.collection('posts')
                                        .updateOne({ "_id": _id }, {
                                            $push: {
                                                comments: {
                                                    "_id": commetId,
                                                    "user": {
                                                        "name": user.name,
                                                        "profileImage": user.profileImage,
                                                        "_id": user._id

                                                    },
                                                    "createdAt": createdAt,
                                                    "comment": comment,
                                                    "replyers": [],


                                                }
                                            }
                                        }, (err, result) => {
                                            if (err) {
                                                return res.json({
                                                    message: 'Comment not created , Try agin',
                                                    status: 'error'
                                                })
                                            } else {
                                                if (user._id.toString() != post.users._id.toString()) {
                                                    database.collection('users').updateOne({ "_id": post.users._id }, {
                                                        $push: {
                                                            "notifications": {
                                                                "_id": ObjectId(),
                                                                "type": "new_comment",
                                                                "content": user.name + "Commented On Your Post",
                                                                "createdAt": new Date().getTime(),
                                                                "profileImage": user.profileImage,



                                                            }
                                                        }
                                                    })
                                                }
                                                database.collection('users').updateOne({
                                                    $and:
                                                        [
                                                            { "_id": post.users._id },
                                                            { "posts._id": post._id }
                                                        ]
                                                }, {
                                                    $push: {
                                                        "posts.$[].comments": {
                                                            "_id": commetId,
                                                            "user": {
                                                                "_id": user._id,
                                                                "name": user.name,
                                                                "profileImage": user.profileImage,


                                                            },
                                                            "comment": comment,
                                                            "createdAt": createdAt,
                                                            "replyers": []
                                                        }

                                                    }
                                                })

                                                return res.json({
                                                    message: 'Comment Created Successfully',
                                                    status: 'success '
                                                })
                                            }
                                        })


                                }
                            })
                    }
                })
        })
    })
})