const express = require('express');
const app = express();
const Datastore = require('nedb');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cookie = require('cookie');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('frontend'));
app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));
app.use(function (req, res, next){
    // set username from the session as a convenience
    req.username = (req.session.user)? req.session.user : null;
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

let isAuthenticated = function(req, res, next){
    if (!req.username) return res.status(401).end("access denied")
    next();
}

// Structure of file system
let Image = function image(username, title, file){
    this.author = username;
    this.title = title;
    this.file = file;
}

let Comment = function comment(imageId, author, content){
    this.imageId = imageId;
    this.author = author;
    this.content = content;
}

let User = function user(username, hash){
    this.username = username;
    this.hash = hash;
}

let imageDB = new Datastore({ filename:'db/images.db', autoload:true, timestampData:true});
let commentDB = new Datastore({filename:'db/comments.db', autoload:true, timestampData:true});
let userDB = new Datastore({filename:'db/users.db', autoload:true, timestampData:false});
let upload = multer({dest: 'uploads/'});

// IMAGES
// create image
app.post('/api/images/', [isAuthenticated, upload.single("file")], function (req, res, next) {
    let username = req.username;
    let title = req.body.title;
    let file = req.file;
    let image = new Image(username, title, file);
    console.log("received image", image);
    
    if(!file) return res.status(400).end("Bad request. No file.");
    imageDB.insert(image, function(err, image){
        if (err) return res.status(500).end(err);
        else return res.json({imageId:image._id});
    });
});

// Gets the first image of gallery and all its metadata, empty array if no image
app.get('/api/images/', isAuthenticated, function (req, res, next) {
    let page = req.query.page;
    let gallery = req.query.gallery;
    imageDB.find({author: gallery}, {file:0, createdAt:0, updatedAt:0})
           .sort({createdAt:-1})
           .skip(page)
           .limit(1)
           .exec(function (err, image) {
        if (err) return res.status(500).end(err);
        else {
            if (page != 0 && image.length == 0){
                return res.status(404).end("No more images. Try going the other way.")
            } else {
                return res.json(image);
            }
        }
    });
});

// READ returns only the file of image with :id
app.get('/api/images/:id/file', isAuthenticated, function (req, res, next) {
    imageDB.findOne({_id: req.params.id}, function(err, image){
        if (err) return res.status(500).end(err);
        else if (!image) res.status(404).end("Image: " + req.params.id + " does not exists");
        else {
            let meta = image.file;
            res.setHeader('Content-Type', meta.mimetype);
            res.sendFile(__dirname + '/' + meta.path);
        }
    });
});

// deletes all images and comments with :id, res with deleted image
app.delete('/api/images/:id/', isAuthenticated, function (req, res, next) {
    let username = req.username;
    // Look for the image
    imageDB.findOne({_id:req.params.id}, function(err, image){
        if (err) return res.status(500).end(err);
        if (!image) return res.status(404).end("Image id:" + req.params.id + " does not exists");
        if (image.author !== username) return res.status(401).end("access denied");

        // delete the file from fs
        let meta = image.file;
        fs.unlink(__dirname + '/' + meta.path, function(err){
            if (err) console.log(err);
        });

        // remove the file from db
        imageDB.remove({_id: image._id}, {}, function(err, num){
            if (err) return res.status(500).end(err);
            else {
                commentDB.remove({imageId: image._id}, {}, function(err, num){
                    if (err) return res.status(500).end(err);
                    // return info of the deleted image
                    let body = {}
                    body._id = image._id;
                    body.author = image.author;
                    body.title = image.title;
                    return res.json(body);
   
                });
            }
        });
    });
});

// COMMENTS
// create comment
app.post('/api/comments/', isAuthenticated, function (req, res, next) {
    let imageId = req.body.imageId;
    let author = req.username;
    let content = req.body.content;
    let comment = new Comment(imageId, author, content);
    // make sure imageId exists
    imageDB.findOne({_id:imageId}, function(err, image){
        if (err) return res.status(500).end(err);
        else if (!image) return res.status(404).end("image id:" + imageId + " does not exists");
        else {
            // insert when exist
            commentDB.insert(comment, function(err, comment) {
                if (err) return res.status(500).end(err);
                else return res.json(comment); 
            });
        }
    });
});

// Returns comments with pagelimit=10 and page
app.get('/api/comments/', isAuthenticated, function(req, res, next){
    let page = req.query.page;
    let imageId = req.query.imageId;
    commentDB.find({imageId:imageId})
             .sort({createdAt:-1})
             .skip(page*10)
             .limit(10)
             .exec(function (err, comments){
        if (err) return res.status(500).end(err);
        else {
            if (page != 0 && comments.length == 0){
                return res.status(404).end("No more comments. Try going the other way.")
            } else {
                return res.json(comments.reverse());
            }
            
        }
    });
});

// deletes comment with :id
app.delete('/api/comments/:id', function(req, res, next){
    let username = req.username;
    let commentId = req.params.id;
    // look for comment
    commentDB.findOne({_id:commentId}, function(err, comment){
        if (err) return res.status(500).end(err);
        else if (!comment) return res.status(404).end("Comment id:" + commentId + " does not exist");
        else {
            // look for coressponding image
            imageDB.findOne({_id:comment.imageId}, function(err, image){
                if (err) return res.status(500).end(err);
                else if (!image) return res.status(404).end("Image id: " + comment.imageId + " does not exist");
                else {
                    // if conditions are satisfied then delete
                    if (comment.author == image.author || username == comment.author){
                        commentDB.remove({_id:commentId}, {}, function(err, num){
                            if (err) return res.status(500).end(err);
                            else return res.json(comment);
                        });
                    } else {
                        // 401 access denied if conditions are not met
                        return res.status(401).end("access denied");
                    }
                }
            });
        }
    })
});

// create user
app.post('/api/users/signup', function(req, res, next){
    let username = req.body.username;
    let password = req.body.password;

    // make sure username and password exists
    if(!username || !password) return res.status(400).end("Bad request.");

    // check if user exists
    userDB.findOne({_id:username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("user " + username + " already exists");
        // generate salt and hash password 
        bcrypt.genSalt(10, function(err, salt){
            bcrypt.hash(password, salt, function(err, hash){
                userDB.update({_id:username}, {_id:username, hash:hash}, {upsert: true}, function(err){
                    if (err) return res.status(500).end(err);
                    // start a session, only store username
                    req.session.user = username;
                    // initialize cookie to start a session
                    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                        path : '/', 
                        maxAge: 60 * 60 * 24 * 7
                    }));
                    return res.json("user " + username + " signed up")
                });
            });
        });
    });
});

// signin user
app.post('/api/users/signin', function(req, res, next){
    let username = req.body.username;
    let password = req.body.password;

    // make sure username and password exists
    if(!username || !password) return res.status(400).end("Bad request.");

    userDB.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("No such user.");
        // verify password here
        bcrypt.compare(password, user.hash, function(err, valid) {
            if (err) return res.status(500).end(err);
            if (!valid) return res.status(401).end("Wrong password.");
            // start a session
            req.session.user = username;
            // initialize session cookie
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                path : '/', 
                maxAge: 60 * 60 * 24 * 7
            }));
            return res.json("user " + username + " signed in");
        }); 
    });
});

// Ends the user's session
app.get('/api/users/signout', isAuthenticated, function(req, res, next){
    // TODO this needs to be authenticated and the same user as session
    let username = req.username;
    // make sure username and password exists
    if(!username) return res.status(400).end("Bad request.");

    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
        path : '/', 
        maxAge: 0 // expires now
    }));
    return res.json("user " + username + " signed out");
});

// gets list of all users
app.get('/api/users/', isAuthenticated, function(req, res, next){
    userDB.find({}, {hash:0}, function(err, users){
        console.log(users);
        if (err) return res.status(500).end(err);
        else {
            return res.json(users);
        }
    });
});

const http = require('http');
const { json } = require('body-parser');
const { INSPECT_MAX_BYTES } = require('buffer');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});