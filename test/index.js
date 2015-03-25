var TEST_REDIS = true

var assert = require('assert')
var async = require('async')
var knex = require('knex')
var Token = require('../index')

if( TEST_REDIS ){
    var redis = require('redis')
    var client = redis.createClient()

    client.on("error", function (err) {
        console.log("Redis Error: " + err);
    });
}

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

var knex = require('knex')(dbCreds)

var token = new Token({'knex': knex, redisClient: client})

var userId = 1
var tokenValue

async.waterfall([

    // create token
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
                assert((tokenObject.token === tokenValue),
                       'Token value is not correct')
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
                    assert((response === false),
                           'Token should no longer be valid')
                    callback()
                }
            })
        }, 2000)
    },

    // create new token
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
                assert((response === false),
                       'Token should no longer be valid')
                callback()
            }
        })
    }

], function(err){
    if( err ){ console.log(err) }
    else{ console.log('Token test success') }
})