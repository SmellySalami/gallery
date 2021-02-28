(function () {
    "use strict";     
    window.addEventListener('load', function () {
        // add listener for showing error
        api.onError(function(err){
            let error_box = document.querySelector('#error_box');
            error_box.innerHTML = err;
            error_box.style.visibility = "visible";
        });

        // add listeners for rendering page
        api.onImageUpdate(function (images) {
            document.querySelector('#posts').innerHTML = '';
            // render elements of the post
            if (images.length > 0) {
                let image = images[0];
                document.querySelector('#comment_section').style.display = 'block';
                let elem = document.createElement('div');
                elem.className = "post";
                elem.id = image._id;
                elem.innerHTML = `
                <div class="delete-icon icon"></div>
                <img class="post_image" src="/api/images/${image._id}/file">
                <div class="post_author">Posted By: ${image.author}</div>
                <div class="post_title">Title: ${image.title}</div>
                <div class="navigation">
                    <div class="next-icon icon"></div>
                    <div class="navigation_text">Change Image</div>
                    <div class="prev-icon icon"></div>
                </div>
                `;

                // delete button
                elem.querySelector('.delete-icon.icon').addEventListener('click', function (e) {
                    api.deleteImage(image._id);
                });

                // next button
                elem.querySelector('.next-icon.icon').addEventListener('click', function (e) {
                    api.getNextImage();
                });

                // prev button
                elem.querySelector('.prev-icon.icon').addEventListener('click', function (e) {
                    api.getPrevImage();
                });

                document.querySelector('#posts').prepend(elem);
            } else {
                // don't show comment section if no post is present
                document.querySelector('#comment_section').style.display = 'none';
            }
        });

        // handler for rendering comments, if any
        api.onCommentUpdate(function(comments){
            document.querySelector('#comments').innerHTML='';
            comments.forEach(function(cmt){
                let elem = document.createElement('div');
                elem.className = "comment";
                elem.innerHTML = `
                <div class="comment-meta">
                    <div class="commenter_name">${cmt.author}</div>
                    <div class="comment_date">${cmt.createdAt.substring(0,10)}</div>
                </div>
                <div class="comment_content">${cmt.content}</div>
                <div class="comment_delete delete-icon icon"></div>
                `;

                //delete
                elem.querySelector('.delete-icon.icon').addEventListener('click', function(e){
                    api.deleteComment(cmt._id);
                });

                document.querySelector('#comments').prepend(elem);
            });
        });
    
        // hide/show corresponding elements
        api.onUserUpdate(function(username){
            document.querySelector('#signout').style.display = (username)? 'block': 'none';
            document.querySelector('#comment_section').style.display = (username)? 'block': 'none';
            document.querySelector('#signup').style.display = (username)? 'none': 'block';
            document.querySelector('#signin').style.display = (username)? 'none': 'flex';
            document.querySelector('#image_section').style.display = (username)? 'block': 'none';
        });

        // retrieve and display list of all usernames
        api.onUserUpdate(function(username){
            if (username) {
                // retrieve all usernames
                api.getAllUsers(function(err, usernames){
                    document.querySelector("#select_gallery").innerHTML = '';
                    usernames.forEach(function(user){
                        var elmt = document.createElement('option');
                        elmt.value = user._id;
                        elmt.innerHTML = user._id;
                        document.querySelector("#select_gallery").prepend(elmt);
                    });
                }); 
            } 
        });

        document.querySelector('#select_gallery').addEventListener('change', function(e){
            let gallery = document.querySelector('#select_gallery').value;
            api.getGallery(0, gallery);
        });

        // image form add image event
        document.querySelector('#post_image').addEventListener('submit', function(e){
            e.preventDefault();
            let title = document.querySelector('#image_title').value;
            let file = document.querySelector('#image_file').files[0];
            document.querySelector('#post_image').reset();
            api.addImage(title, file);
        });

        // comment form add comment event
        document.querySelector('#create_comment_form').addEventListener('submit', function(e){
            e.preventDefault();
            let content = document.querySelector('#comment_content').value;
            let imageId = document.querySelector('.post').id;
            document.querySelector('#create_comment_form').reset();
            api.addComment(imageId, content);
        });

        // next page comments 
        document.querySelector('#comment_section .next-icon').addEventListener('click', function(e){
            api.nextCommentPage();
        });

        // prev page comments
        document.querySelector('#comment_section .prev-icon').addEventListener('click', function(e){
            api.prevCommentPage();
        });

        // TODO signin
        document.querySelector('#signin').addEventListener('submit', function(e){
            e.preventDefault();
            let username = document.querySelector("#username").value;
            let password = document.querySelector("#password").value;
            document.querySelector("#signin").reset();
            api.signin(username, password);
        });

        // TODO sigout
        document.querySelector("#signout").addEventListener('click', function(e){
            e.preventDefault();
            api.signout();
        });

        // toggle post form
        let toggle = document.querySelector('#toggle');
        let form = document.querySelector('#post_image');
        toggle.addEventListener('click', function (e) {
            if (form.style.display === "none") {
                form.style.display = 'flex';
            } else {
                form.style.display = 'none';
            }
        });
    });
}());