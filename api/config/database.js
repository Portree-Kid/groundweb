var pg = require('pg');

var EXT_AUTHORITY = {
  'unknown': 0,
  'github': 1,
  'google': 2,
  'facebook': 3,
}

var pool = new pg.Pool({
	  user: 'groundnet',
	//  host: '192.168.178.58',
	  host: 'localhost',
	  database: 'groundnet',
	  password: 'groundnet',
	  port: 5432, 
	  max: 10, // max number of clients in the pool 
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed 
});

pool.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool 
  // the pool itself will emit an error event with both the error and 
  // the client which emitted the original error 
  // this is a rare occurrence but can happen if there is a network partition 
  // between your application and the database, the database restarts, etc. 
  // and so you might want to handle it and at least log it out 
  console.error('idle client error', err.message, err.stack)
});

function QueryAndReturnOne( queryParams, cb )
{
  pool.connect(function(err, client, done) {

    if(err) {
      console.error('error fetching client from pool', err);
      return cb(err);
    }
    console.log(queryParams);
    client.query(queryParams, function(err, result) {
      //call `done()` to release the client back to the pool 
      done();
 
      if(err) {
        console.error('error running query', err);
        return cb(err);
      }
      cb(null,result.rows && result.rows.length > 0 ? result.rows[0] : null );
    });
  });
}

module.exports.GetAuthorById = function( id, cb )
{
  return QueryAndReturnOne({
      name: 'GetAuthorById',
      text: "SELECT * from fgs_authors where au_id=$1",
      values: [ id ]
  }, function(err,result) {
    if( err ) return cb(err);
    var User = {
      author: {
        id: result.au_id,
        name: result.au_name,
        email: result.au_email,
        notes: result.au_notes,
      },
    };
    return cb(null,User);
  });
}

module.exports.GetAuthorByExternalId = function( authority, id, cb )
{
//console.log("GetAuthorByExternalId(1)", authority,id);
    return QueryAndReturnOne({
      name: 'GetUserByExternalAuthId',
      text: 'select * from fgs_extuserids left join fgs_authors on (eu_author_id = au_id) where eu_authority=$1 and eu_external_id=$2',
      values: [ authority, id ]
    }, function(err,result) {
//console.log("GetAuthorByExternalId(2)", err,result);
      if( err ) return cb(err);
      if( !result ) return cb(null,null);
      var User = {
        authorities: [{
          id: result.eu_authority,
          user_id: result.eu_external_id,
        }],
        author: {
          id: result.au_id,
          name: result.au_name,
          email: result.au_email,
          notes: result.au_notes,
        },
      };
      return cb(null,User);
    });
}

module.exports.getUserByEmail = function(id,cb) {
  QueryAndReturnOne({
      name: 'GetUserByEmail',
      text: "SELECT * FROM fgs_users WHERE lower(us_email) = lower($1)",
      values: [ id ]
  } ,cb);
};

module.exports.getUserById = function(id,cb) {
  QueryAndReturnOne({
      name: 'GetUserById',
      text: "SELECT * FROM fgs_users WHERE lower(us_name) = lower($1)", 
      values: [ id ]
  } ,cb);
};

module.exports.getOrCreateUserByExternalId = function(externalauth,id,cb) {
  var externalauth_id = EXT_AUTHORITY[externalauth];

//console.log("getOrCreateUserByExternalId(1)", externalauth, externalauth_id,id);
  module.exports.GetAuthorByExternalId(externalauth_id,id,function(err,author) {
//console.log("getOrCreateUserByExternalId(2)", err,author);
    if( err ) return cb(err);
    if( author ) return cb(null,author);

    return QueryAndReturnOne({
      name: 'InsertIntoExternalAuthId',
      text: "INSERT into fgs_extuserids (eu_authority,eu_external_id,eu_author_id) VALUES ($1,$2,NULL)",
      values: [ externalauth_id, id ]
    }, function(err,eu) {
      if( err ) return cb(err);
      // call recursive, should find the user next time
      return module.exports.getOrCreateUserByExternalId(externalauth,id,cb);
    });
  });
};

module.exports.insertUser = function(user,cb) {
  QueryAndReturnOne({
      name: 'InsertUser',
      text: "INSERT into fgs_users (us_name,us_email,us_password) VALUES($1,$2,$3)", 
      values: [ user.us_name, user.us_email, user.us_password  ]
  }, cb );
};

module.exports.GetAirportByIcao = function( icao, cb )
{
  return QueryAndReturnOne({
      name: 'GetAirportByIcao',
      text: "SELECT * FROM apt_airfield WHERE icao = $1",
      values: [ icao ]
  }, function(err,result) {
    if( err ) return cb(err);
    if( !result ) return cb(null,null);
    var Airport = {
      icao : result.icao
    };
    return cb(null,Airport);
  });
}

