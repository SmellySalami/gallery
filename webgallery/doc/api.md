# Web Gallary 2 REST API Documentation

## Image API

### Create

#### Create new image
- description: create a new image
- request: `POST /api/images/`
    - content-type: `multipart/form-data`
    - body: object
      - title: (string) title of image
      - picture: (binary) picture and metadata of image
- response: 200
    - content-type: `application/json`
    - body: object
      - imageId: (string) the image id
- response: 400
    - body: (string) "Bad request. No file."
- response: 401
    - body: access denied
- response: 500
    - body: (string) description of the error

``` 
curl -b cookie.txt -X POST -H "Content-type: multipart/form-data" -F title=alicepost -F file=@./pic.png http://localhost:3000/api/images/
```
### Read

#### Query image
- description: Queries for an image based on page and gallery owner 
- request: `GET /api/images/?page=__&gallery=__`   
- response: 200
    - content-type: `application/json`
    - body: list of 1 or 0 objects
      - _id: (string) the image id
      - author: (string) the author of the image
      - title: (string) the title of the image
- response: 401
    - body: (string) access denied
- response: 500
    - body: (string) description of the error
 
``` 
curl -b cookie.txt http://localhost:3000/api/images/?page=0&gallery=alice
``` 
#### Retrieve image
- description: retrieve the picture of image object with _id :id
- request: `GET /api/images/:id/picture`
- response: 200
    - content-type: `image/png`
    - body: the picture
- response: 401
    - body: (string) access denied
- response: 404
    - body: Image: :id does not exists
- response: 500
    - body: (string) description of the error

``` 
curl -b cookie.txt http://localhost:3000/api/images/jed5672jd90xg4awo789/picture
``` 
### Delete

#### Delete image
- description: delete the image object with :id and all comments with imageId :id. Response is the latest image obj added. 
- request: `DELETE /api/images/:id/`
- response: 200
    - content-type: `application/json`
    - body: list of 1 image object
      - _id: (string) the image id
      - author: (string) the author of the image
      - title: (string) the title of the image
- response: 401
    - body: (string) access denied
- response: 404
    - body: (string) "message :id does not exists"
- response: 500
    - body: (string) description of error

``` 
$ curl -X DELETE http://localhost:3000/api/images/jed5672jd90xg4awo789/
``` 

## Comment API

### Create
#### Create new comment
- description: create a new comment
- request: `POST /api/comments/`
    - content-type: `application/json`
    - body: object
      - imageId: (string) imageId of image being commented on
      - content: (string) content of comment
- response: 200
    - content-type: `application/json`
    - body: comment object
      - _id: (string) the comment id
      - author: (string) the author of the comment
      - content: (string) the contents of the comment
      - imageId: (object) the imageId of image comment is for
- response: 401
    - body: (string) access denied
- response: 404
    - body: image id: :id does not exists
- response: 500
    - body: (string) description of the error

``` 
curl -b cookie.txt -X POST -H "Content-Type: application/json" -d '{"content":"hello world", "imageId":"jed5672jd90xg4awo789"}' http://localhost:3000/api/comments/
```

### Read
#### retrieve list of comments
- description: retrieves the comments of imageId according to page. 10 comments per page 
- request: `GET /api/comments/?page=__&imageId=__`   
- response: 200
    - content-type: `application/json`
    - body: list of comment objects
      - _id: (string) the comment id
      - author: (string) the author of the comment
      - content: (string) the contents of the comment
      - imageId: (object) the imageId of image comment is for
- response: 401
    - body: (string) access denied
- response: 404
    - body: image id: :id does not exists
- response: 500
    - body: (string) description of the error

``` 
curl -b cookie.txt http://localhost:3000/api/comments/?page=0&imageId=jed5672jd90xg4awo789
```

### Delete
#### Delete a comment
- description: deletes comment of :id. 
- request: `DELETE /api/comments/:id`   
- response: 200
    - content-type: `application/json`
    - body: object
      - _id: (string) the comment id
      - author: (string) the author of the comment
      - content: (string) the contents of the comment
      - imageId: (object) the imageId of image comment is for
- response: 401
    - body: (string) access denied
- response: 404
    - body: comment id: :id does not exists
- response: 500
    - body: (string) description of the error

``` 
curl -b cookie.txt -X DELETE http://localhost:3000/api/comments/jed5672jd90xg4awo789/
```

## User API

### Create

#### Signup
- description: Gets list of all users. 
- request: `POST /api/users/`
    - content-type: `application/json`
    - body: object
      - username: (string) new username
      - password: (string) new password
- response: 200
    - content-type: `application/json`
    - body: (string) "user `username` signed up"
- response: 400
    - content-type: `application/json`
    - body: "Bad request."
- response: 409
    - content-type: `application/json`
    - body: string) "user `username` already exists"
- response: 500 
    - body: (string) description of the error

``` 
curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/api/users/signup
```

#### Signin
- description: Gets list of all users. 
- request: `GET /api/users/`   
    - content-type: `application/json`
    - body: object
      - username: (string) new username
      - password: (string) new password
- response: 200
    - content-type: `application/json`
    - body: (string) "user `username` has signed in"
- response: 400
    - content-type: `application/json`
    - body: "Bad request."
- response: 401
    - content-type: `application/json`
    - body: (string) "No such user"
    - body: (string) "Wrong password"
- response: 500 
    - body: (string) description of the error

``` 
curl -H "Content-Type: application/json" -X POST -d '{"username":"alice","password":"alice"}' -c cookie.txt localhost:3000/api/users/signin
```

### Read

#### Get Users
- description: Gets list of all users. 
- request: `GET /api/users/`   
- response: 200
    - content-type: `application/json`
    - body: list of users 
      - _id: (string) the username  
- response: 401
    - body: (string) "access denied"
- response: 500 
    - body: (string) description of the error

``` 
curl -b cookie.txt http://localhost:3000/api/users/
```

#### Signout
- description: Gets list of all users. 
- request: `GET /api/users/signout`   
- response: 200
    - content-type: `application/json`
    - body: "user `username` signed out"
- response: 400
    - content-type: `application/json`
    - body: "Bad request."
- response: 401
    - body: (string) "access denied"
- response: 500 
    - body: (string) description of the error

``` 
curl -b cookie.txt http://localhost:3000/api/users/signout
```