const util = require('util');
const assert = require('assert');
const Router = require('express-promise-router')
const fileUpload = require('express-fileupload');
var libxmljs = require('libxmljs');
const fs = require('fs');
const path = require("path")
// const sha1File = require('sha1-file')
const sha1Hash = require('js-sha1')


var DB = require('../config/database');

const terraSyncDir = 'public';

const schema = fs.readFileSync('schema/groundnet.xsd');

// create a new express-promise-router
// this has the same API as the normal express router except
// it allows you to use async functions as route handlers
// Not async yet
const router = new Router();

router.use(fileUpload())
// export our router to be mounted by the parent application
module.exports = router;

/**
 * Service to accept a posted file.
 * 
 * @param req
 * @param res
 * @returns
 */

router.post('/upload', function(req, res) {
	res.setHeader('Content-Type', 'application/json');
	if (!req.files) {
		res.send(JSON.stringify({message:"No file provided"}));
		return;
	}
	if (!req.files.groundnet) {
		res.send(JSON.stringify({message:"No file provided"}));
		return;
	}
	if (!req.files.groundnet.name) {
		res.send(JSON.stringify({message:"No Filename provided"}));
		return;
	}
	var user;
	DB.getUserByEmail(req.body.user_email, function(err,user) {
		if(err)	{
			res.send(JSON.stringify({message:"Error getting user", err}, replaceErrors));
			return;
        }
//		if(!user) {
//			res.send(JSON.stringify({message:"User unknown", user}));
//			return;			
//		}
//		console.log(user);
		var sitemapDoc;
		var schemaDoc;
		// Parse the sitemap and schema
		try {
			sitemapDoc = libxmljs.parseXml(req.files.groundnet.data);
			schemaDoc = libxmljs.parseXml(schema);
			} catch (e) {
				res.send(JSON.stringify({message:"XML Errors", e}, replaceErrors));
				return;
			}

		// Perform validation
		const isValid = sitemapDoc.validate(schemaDoc);
		if (!isValid) {
			var validationErrors = sitemapDoc.validationErrors;
			res.send(JSON.stringify( {message:"XML Errors", validationErrors}, replaceErrors));
			return;
		}
		var icao = req.files.groundnet.name.substring(0,4);
		DB.GetAirportByIcao(icao, function(err,airport) {
		    if (err) {
			  console.error('Error executing query', err);
		      res.sendStatus(500);
		      return;
		    }
			console.log("Result " + airport);
			if (!airport) {			
				res.send(JSON.stringify({message:"Airport doesn't exist"}));
				return;
			}
			var currentpath = path.join(terraSyncDir, "/Airports/");
			createPath(currentpath, res);
			currentpath = path.join(currentpath,icao[0]);
			createPath(currentpath, res);
			currentpath = path.join(currentpath,icao[1]);
			createPath(currentpath, res);
			currentpath = path.join(currentpath,icao[2]);
			createPath(currentpath, res);
			fs.writeFileSync(currentpath + req.files.groundnet.name, req.files.groundnet.data);
			do{
				buildDirIndex(currentpath);						
			}
			while((currentpath = path.resolve( currentpath, "..")) != path.resolve(terraSyncDir))
			
			res.write(JSON.stringify({message:"Imported Successfully"}));
			res.end();
			return;
		  });
	});
});
console.log('Mounted groundnet routes');

function createPath(currentpath, res){
	if( fs.exist(currenpath))
		return;
	fs.mkdirSync(currentpath, { recursive: true }, (err) => {
	      console.error('Error creating path', err);
		  res.sendStatus(500);
		  return;
		});
}


/**
 * Error objects are not correctly processed by stringify
 * 
 * @param key
 * @param value
 * @returns
 */
function replaceErrors(key, value) {
	if (key === 'stack') { // 
		return undefined; // remove from result
	}
	if (value instanceof Error) {
		var error = {};

		Object.getOwnPropertyNames(value).forEach(function(key) {
			error[key] = value[key];
		});

		return error;
	}

	return value;
}

function buildDirIndex(currentpath) {
	console.log(`writing .dirindex to ${currentpath}`);
	var absolutePath = path.resolve(currentpath);
	
	var wstream = fs.openSync(path.join( absolutePath, '.dirindex'), "a+");
	fs.writeSync(wstream,'version:1\n');
	var cleanedPath = currentpath.slice(1).replace(/\\/g,"/");
	fs.writeSync(wstream,`path:${cleanedPath}\n`);
	
	fs.readdirSync(absolutePath, {withFileTypes:true})
	.filter(file => file.name != ".dirindex" )
	.forEach(file => {
		if(file.isFile()){
			  var sha1 = sha1Hash( fs.readFileSync(path.join(absolutePath, file.name)) );
			  var size = fs.statSync(path.join(absolutePath, file.name) ).size;
  			  fs.writeSync(wstream,`f:${file.name}:${sha1}:${size}\n`);
		  }
		if(file.isDirectory()){
			var subDir = path.join(absolutePath, file.name);
			fs.readdirSync(subDir, {withFileTypes:true})
			.filter(subfile => subfile.name == ".dirindex" )
			.forEach(subfile => {
				if(subfile.isFile()){
					console.log(`Building hash for ${subDir}`);
					var fileContent = fs.readFileSync(path.join(subDir, subfile.name), {encoding:'ascii'});
					if(!fileContent.startsWith("version:1")){
						console.log(fileContent);
						throw new Error();
					}
 				    sha1 = sha1Hash( fileContent );
					  console.log( path.join(subDir, subfile.name));
					  console.log(sha1);
				}
				})			
	   		    fs.writeSync(wstream,`d:${file.name}:${sha1}\n`);
		    }		    
		})
	console.log(`wrote .dirindex to ${currentpath}`);
	}
