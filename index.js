var ERROR_KNEX = 'Token can not be initialized without a Knex object'
var NUMBER_OF_BYTES = 32

var crypto = require('crypto')
var _ = require('underscore')

var defaults = {
    tableName: 'token',
    knex: null,
    redisClient: null,
    redisKeyPrefix: 'token_'
}

module.exports = function(optionsIn){

    var self = this

    if( optionsIn.knex === null ){ throw(new Error(ERROR_KNEX)) }

    /**
    * See "defaults" above for options
    */
    self.init = function(){

        // set options
        _.each(defaults, function(v, k){
            if( typeof(optionsIn[k]) !== 'undefined' ){
                self[k] = optionsIn[k]
            } else {
                self[k] = defaults[k]
            }
        })
        require('./schema').init(self)
    }

    /**
    *   userId is an int
    *   validLength is an int, expressing how long in seconds the token should
    *       be valid for
    *   The token gets passed back as the second argument to the callback
    */
    self.create = function(userId, validLength, callbackIn){
        var expiration = getCurrentTimestamp() + validLength
        var token = crypto.randomBytes(32).toString('hex')

        self.knex(self.tableName)
            .insert({user: userId, expires: expiration, 'token': token})
            .then(function(){
                if( self.redisClient ){
                    self.setCache(token, expiration, userId)
                }
                callbackIn(null, token)
            })
            .catch(callbackIn)
    }

    /**
    * returns token with key prefix prepended
    */
    self.getRedisKey = function(token){ return self.redisKeyPrefix + token }

    /**
    *   If invalid, `false` gets passed back as second argument
    *   If valid, an object with token, user (userId), and expiration gets
    *       passed back
    */
    self.isValid = function(token, callbackIn){
        if( self.redisClient ){
            self.redisClient.hgetall(self.getRedisKey(token),
                                     function(err, response){

                if( response === null ){
                    self.isValidFromDB(token, callbackIn)
                } else {
                    if( response.expiration <= getCurrentTimestamp() ){
                        callbackIn(null, false)
                    } else {
                        response.token = token
                        callbackIn(null, response)
                    }
                }
            })
        } else {
            self.isValidFromDB(token, callbackIn)
        }
    }

    self.isValidFromDB = function(token, callbackIn){

        self.knex(self.tableName)
            .where('token', token)
            .then(function(rows){
                if( rows.length === 0 ||
                    rows[0]['expires'] <= getCurrentTimestamp()
                 ){
                    callbackIn(null, false)
                } else {
                    if( self.redisClient ){
                        self.setCache(token,
                                      rows[0]['expiration'],
                                      rows[0]['user'])
                    }
                    callbackIn(null, rows[0])
                }
            })
            .catch(callbackIn)
    }

    /**
    * Invalidate token passed in
    */
    self.invalidate = function(token, callbackIn){
        if( self.redisClient ){
            self.redisClient.del(self.getRedisKey(token),
                                 function(err){
                                    if( err ){ callbackIn(err) }
                                    else{
                                        self.invalidateFromDB(token, callbackIn)
                                    }
                                 })
        } else {
            self.invalidateFromDB(token, callbackIn)
        }
    }

    self.invalidateFromDB = function(token, callbackIn){
        self.knex(self.tableName)
            .where('token', token)
            .delete()
            .then(function(){ callbackIn() })
            .catch(callbackIn)
    }

    /**
    * Sets token in Reddis cache
    */
    self.setCache = function(token, expiration, userId){
        self.redisClient.hmset(self.getRedisKey(token),
                               {
                                    'expiration': expiration,
                                    user: userId
                                })
    }

    self.init()
}

var getCurrentTimestamp = function(){ return Math.floor(Date.now() / 1000) }