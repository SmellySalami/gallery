var api = (function(){
    "use strict";
    var module = {};
    
    /*  ******* Data types *******
        image objects must have at least the following attributes:
            - (String) _id 
            - (String) title
            - (String) author
            - (Date) date
    
        comment objects must have the following attributes
            - (String) _id
            - (String) imageId
            - (String) author
            - (String) content
            - (Date) date
    
    ****************************** */ 
    let imagePageNum = 0;
    let commentPageNum = 0;
    let galleryPageNum = '';

    function sendFiles(method, url, data, callback){
        // create multiform data for each key:val pair in data.
        let formdata = new FormData();
        Object.keys(data).forEach(function(key){
            let value = data[key];
            formdata.append(key, value);
        });

        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "] " + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        xhr.send(formdata);
    }

    // sends an ajax request
    // callback should take (err, res). One of err or res is null
    function send(method, url, data, callback){
        let xhr = new XMLHttpRequest();
        // handle the callback function
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "] " + xhr.responseText, null);
            else {
                callback(null, JSON.parse(xhr.responseText));
            }
        };

        // open the method, async = true should always be there
        xhr.open(method, url, true);

        // send the request
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    module.signup = function(username, password){
        send("POST", "/api/users/signup", {username: username, password:password}, function (err, res){
            if(err) return notifyErrorListeners (err);
            else {
                galleryPageNum = module.getCurrentUser();
                notifyImageListeners();
                notifyUserListeners();
            }
        });
    };
    
    module.signin = function(username, password){
        send("POST", "/api/users/signin", {username: username, password:password},function (err, res){
            if (err) notifyErrorListeners(err);
            else {
                galleryPageNum = module.getCurrentUser();
                notifyImageListeners();
                notifyUserListeners();
            }
        });
    };
    
    module.signout = function(){
        send("GET", "/api/users/signout", null, function(err, res){
            // This should just return success code and nothing 
            if (err) notifyErrorListeners(err);
            else {
                notifyUserListeners();
            }
        });
    };

    module.getAllUsers = function(callback){
        send("GET", "/api/users", null, callback);
    };
    
    // add an image to the gallery
    module.addImage = function(title, file){
        sendFiles("POST", "/api/images/", {title: title, author:'alice', file:file}, function(err, res) {
            if (err) return notifyErrorListeners(err);
            else {
                // go to latest page
                imagePageNum = 0;
                return notifyImageListeners();
            }
        });
    };
    
    // delete an image from the gallery given its imageId
    module.deleteImage = function(imageId){
        send("DELETE", "/api/images/"+imageId+"/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            else {
                imagePageNum = 0;
                return notifyImageListeners();
            }
        });
    };

    // Gets the image added after imageId
    module.getNextImage = function(){
        getImage(imagePageNum - 1, galleryPageNum, function(err, image){
            if (err) notifyErrorListeners(err);
            else{
                imagePageNum--;
                notifyImageListeners();
            }
        });
    };

    // Gets the image added before imageId
    module.getPrevImage = function(){
        getImage(imagePageNum + 1, galleryPageNum, function(err, image){
            if (err) notifyErrorListeners(err);
            else{
                imagePageNum++;
                notifyImageListeners();
            }
        });
    };
    
    // add a comment to an image
    module.addComment = function(imageId, content){
        send("POST", "/api/comments/", {imageId: imageId, author:'alice', content: content}, function(err, res){
            if (err) return notifyErrorListeners(err);
            else return notifyCommentListeners(imageId);
        });
    };
    
    // delete a comment to an image
    module.deleteComment = function(commentId){
        send("DELETE", "/api/comments/"+commentId+"/", null, function(err, res){
            if (err) return notifyErrorListeners(err);
            else return notifyCommentListeners();
        }); 
    };

    // page changing for comments
    module.nextCommentPage = function(){
        commentPageNum++;
        notifyCommentListeners();
    };

    module.prevCommentPage = function(){
        commentPageNum--;
        notifyCommentListeners();
    };
    
    let imageListeners = [];

    // gets any image, happens to be the first one
    let getImage = function(imgPage, gallery, callback){
        send("GET", "/api/images/?page="+imgPage+"&gallery="+gallery, null, callback);
    };

    module.getGallery = function(imgPage, gallery){
        imagePageNum = imgPage;
        galleryPageNum = gallery;
        notifyImageListeners();
    };

    // call listener when an image is added or deleted from the gallery
    module.onImageUpdate = function(listener){
        imageListeners.push(listener);
        notifyImageListeners();
    };

    // Notify image listeners. Runs all image listeners
    function notifyImageListeners(){
        // make sure the gallery is set 
        if (galleryPageNum !=='' ){
            // give all image listeners the image they're expecting
            imageListeners.forEach(function(listener){
                getImage(imagePageNum, galleryPageNum, function(err, image){
                    if (err) notifyErrorListeners(err);
                    else {
                        listener(image);
                        notifyCommentListeners();
                    }
                });
            });
        }
    }

    let commentListeners = [];

    // gets the comments depending on the page
    let getComments = function(imageId, page, callback){
        send("GET", `/api/comments/?page=${page}&imageId=${imageId}`, null, callback);
    };
    
    // call handler when a comment is added or deleted to an image
    module.onCommentUpdate = function(handler){
        commentListeners.push(handler);
        notifyCommentListeners();
    };

    // Notify comment listeners. Runs all comment listeners
    function notifyCommentListeners(){
        // make sure the gallery is set 
        if (galleryPageNum !=='' ){

            // get the current image
            getImage(imagePageNum, galleryPageNum, function(err, images){
                if (err) notifyErrorListeners (err);
                else{
                    let image = images[0];
                    // get the comments of curr image using page and id
                    if (image){
                        getComments(image._id, commentPageNum, function(err, comments){
                            if (err){
                                (commentPageNum < 0)? commentPageNum = 0: commentPageNum--; // jshint ignore:line
                                notifyErrorListeners(err);
                            }else{
                                commentListeners.forEach(function(listener){
                                    listener(comments);
                                });
                            }
                        });
                    }
                }
            });
        }
    }

    let userListeners = [];

    module.getCurrentUser = function(){
        var username = document.cookie.split("username=")[1];
        if (!username || username.length == 0) return null;
        return username;
    };

    // call handler when user is changed
    module.onUserUpdate = function(handler){
        userListeners.push(handler);
        handler(module.getCurrentUser());
    };

    function notifyUserListeners(){
        userListeners.forEach(function(handler){
            handler(module.getCurrentUser());
        });
    }

    // Error handling
    let errorListeners = [];
    function notifyErrorListeners(err){
        errorListeners.forEach(function(listener){
            listener(err);
        });
    }

    module.onError = function(handler){
        errorListeners.push(handler);
    };

    return module;
})();