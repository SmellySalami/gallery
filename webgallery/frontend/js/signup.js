(function(){
    "use strict";
    window.addEventListener('load', function(){

        api.onError(function(err){
            console.error("[error]", err);
        });

        api.onError(function(err){
            var error_box = document.querySelector('#error_box');
            error_box.innerHTML = err;
            error_box.style.visibility = "visible";
        });

        // redirect to main page
        api.onUserUpdate(function(username){
            if (username) window.location.href = '/';
        });

        // signup form
        document.querySelector('#signup_form').addEventListener('submit', function(e){
            e.preventDefault();
            let username = document.querySelector("#username").value;
            let password = document.querySelector("#password").value;
            api.signup(username, password);
        });

    });
}());