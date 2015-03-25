## About
Token is an SQL ([Knex](http://knexjs.org)compatible) token manager with optional Redis backing using [node_redis](https://github.com/mranney/node_redis) client.

## Example

```Javascript
var async = require('async')
var knex = require('knex')
var Token = require('./index')

// redis is optional
var redis = require('redis')
var client = redis.createClient()

client.on("error", function (err) {
    console.log("Redis Error: " + err);
});

var dbCreds = {
    client: 'mysql',
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'token',
        port:  8889
    }
}

// knex is required
var knex = require('knex')(dbCreds)

var token = new Token({'knex': knex, redisClient: client})

var userId = 1
var tokenValue

async.waterfall([

    // create a token
    function(callback){
        var validFor = 2
        token.create(userId, validFor, function(err, tokenValueIn){
            if( err ){ callback(err) }
            else{
                tokenValue = tokenValueIn
                callback()
            }
        })
    },

    // confirm token is valid
    function(callback){
        token.isValid(tokenValue, function(err, tokenObject){
            if( err ){ callback(err) }
            else{
                // tokenObject includes token, user(user Id), expiration
                console.log(tokenObject)
                callback()
            }
        })
    },

    // wait for token to expire
    function(callback){
        setTimeout(function(){
            token.isValid(tokenValue, function(err, response){
                if( err ){ callback(err) }
                else{
                    console.log(reponse) // ~> false
                    callback()
                }
            })
        }, 2000)
    },

    // create new token valid for 10 seconds
    function(callback){
        var validFor = 10
        token.create(userId, validFor, function(err, tokenValueIn){
            if( err ){ callback(err) }
            else{
                tokenValue = tokenValueIn
                callback()
            }
        })
    },

    // invalidate token
    function(callback){
        token.invalidate(tokenValue, callback)
    },

    function(callback){
        token.isValid(tokenValue, function(err, response){
            if( err ){ callback(err) }
            else{
                console.log(respons) // ~> fasle
                callback()
            }
        })
    }

], function(err){
    if( err ){ console.log(err) }
})
```

## Options
See "defaults" in ./index.js. These defaults can be overriden.