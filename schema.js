var _ = require('underscore')

var schema = {}

var defaults = {
    tableName: 'token',
    knex: null
}

schema.definition = function(table){
    table.integer('user').default(0).index(),
    table.string('token', 64).default('').index(),
    table.integer('expires').default(0)
}

// options: knex(required), tableName(optional)
schema.init = function(options){

    options.knex.schema.hasTable(options.tableName)
        .then(function(exists) {
            if( !exists ){
                // create the table
                options.knex.schema.createTable(options.tableName,
                                                schema.definition)
                    .then(function(){})
                    .catch(function(err){ throw(err); })
            }
        })
        .catch(function(err){ throw(err); })
}

module.exports = schema