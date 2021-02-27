const express = require('express');
const app = express();
const Datastore = require('nedb');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('frontend'));
app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

let Image = (function(){
    return function image(image, picture){
        this.title = image.title;
        this.author = image.author;
        this.picture = picture;
        //_id: autogen by nedb
        //date: autogen by nedb
    };
}());

let Comment = (function(){
    return function comment(comment){
        this.imageId = comment.imageId;
        this.author = comment.author;
        this.content = comment.content;
        // _id: autogen by nedb
        // date: autogen by nedb
    };
}());

let imageDB = new Datastore({ filename:'db/images.db', autoload:true, timestampData:true});
let commentDB = new Datastore({filename:'db/comments.db', autoload:true, timestampData:true});

let upload = multer({dest: 'uploads/'});

// CREATE 
// create image
app.post('/api/images/', upload.single("file"), function (req, res, next) {
    imageDB.insert(new Image(req.body, req.file), function(err, user){
        if (err) return res.status(500).end(err);
        else return res.json({imageId:user._id});
    });
});

// create comment
app.post('/api/comments/', function (req, res, next) {
    // make sure imageId exists
    imageDB.findOne({_id:req.body.imageId}, function(err, image){
        if (err) return res.status(500).end(err);
        else if (!image) return res.status(404).end("image id:" + req.body.imageId + " does not exists");
        else {
            // insert when exist
            commentDB.insert(new Comment(req.body), function(err, comment) {
                if (err) return res.status(500).end(err);
                else return res.json(comment); 
            });
        }
    });
});

// READ 
// the first image and all its metadata.
// returns first image in an array, empty array if no image
app.get('/api/images/', function (req, res, next) {
    let page = req.query.page;
    imageDB.find({})
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

// READ returns only the picture of image with :id
app.get('/api/images/:id/picture', function (req, res, next) {
    imageDB.findOne({_id: req.params.id}, function(err, image){
        if (err) return res.status(500).end(err);
        else if (!image) res.status(404).end("Image: " + req.params.id + " does not exists");
        else {
            let meta = image.picture;
            res.setHeader('Content-Type', meta.mimetype);
            res.sendFile(__dirname + '/' + meta.path);
        }
    });
});

// Returns the following image of :id in an array
// Returns itself if :id is tail
app.get('/api/images/:id/next', function (req, res, next) {
    imageDB.findOne({_id: req.params.id}, function(err, currImage){
        if (err) return res.status(500).end(err);
        else if (!currImage) res.status(404).end("Image: " + req.params.id + " does not exists");
        else {
            imageDB.find({createdAt: {$gt:currImage.createdAt}}).sort({createdAt:1}).limit(1).exec(function (err, nextImage) {
                if (err) return res.status(500).end(err);

                // return itself if there is no next image
                if (nextImage.length == 0) return [currImage];
                else return res.json(nextImage);
            });
        }
    });
});

// Returns the preceeding image of :id in an array. 
// Returns itself if :id is head
app.get('/api/images/:id/prev', function (req, res, next) {
    imageDB.findOne({_id: req.params.id}, function(err, currImage){
        if (err) return res.status(500).end(err);
        else if (!currImage) res.status(404).end("Image: " + req.params.id + " does not exists");
        else {
            imageDB.find({createdAt: {$lt:currImage.createdAt}}).sort({createdAt:-1}).limit(1).exec(function (err, prevImage) {
                if (err) return res.status(500).end(err);

                // return itself if there is no prev image
                if (prevImage.length == 0) return [currImage];
                else return res.json(prevImage);
            });
        }
    });
});

// Returns comments with pagelimit=10 and page
app.get('/api/comments/', function(req, res, next){
    let page = req.query.page;
    commentDB.find({imageId:req.query.imageId})
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

// Delete
// deletes all images and comments with :id
// returns the latest image in database
// returns empty array if no more images in db
app.delete('/api/images/:id/', function (req, res, next) {
    // Look for the image
    imageDB.findOne({_id:req.params.id}, function(err, image){
        if (err) return res.status(500).end(err);
        if (!image) return res.status(404).end("Image id:" + req.params.id + " does not exists");

        let meta = image.picture;
        fs.unlink(__dirname + '/' + meta.path, function(err){
            if (err) console.log(err);
        });

        imageDB.remove({_id: image._id}, {}, function(err, num){
            if (err) return res.status(500).end(err);
            else {
                commentDB.remove({imageId: image._id}, {}, function(err, num){
                    if (err) return res.status(500).end(err);
                    // return the first image
                    imageDB.find({}).sort({createdAt:-1}).limit(1).exec(function (err, image) {
                        if (err) return res.status(500).end(err);
                        else {
                            return res.json(image);
                        }
                    });

                });
            }


        });


    });
});

// deletes comment with :id
app.delete('/api/comments/:id', function(req, res, next){
    // look for comment
    commentDB.findOne({_id:req.params.id}, function(err, comment){
        if (err) return res.status(500).end(err);
        if (!comment) return res.status(404).end("Comment id:" + req.params.id + " does not exists");
        // delete the found comment
        commentDB.remove({_id: comment._id}, {}, function(err, num){
            if (err) return res.status(500).end(err);
            else return res.json(comment);
        });
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