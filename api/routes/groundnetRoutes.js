const util = require('util');
const assert = require('assert');
const Router = require('express-promise-router')
const fileUpload = require('express-fileupload');
var libxmljs = require('libxmljs');
const fs = require('fs');
const path = require("path")
const sha1File = require('sha1-file')

const airports = require('../airports');

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
	var airport;
	airports.findAirport(icao).then( (result, err) => {
	    if (err) {
		      console.error('Error executing query', err);
	      res.sendStatus(500);
	      return;
	    }
		console.log("Result " + result);
		if (!result.rows) {			
			res.send(JSON.stringify({message:"Airport doesn't exist"}));
			return;
		}
		var currentpath = util.format("/Airports/%s/%s/%s/", icao[0], icao[1], icao[2])
		fs.mkdirSync(currentpath, { recursive: true }, (err) => {
		      console.error('Error creating currentpath', err);
			  res.sendStatus(500);
			  return;
			});
		fs.writeFileSync(currentpath + req.files.groundnet.name, req.files.groundnet.data);
		do{
			buildDirIndex(currentpath);			
		}
		while((currentpath = path.join( currentpath, "..")) != path.sep)
		
		res.send(JSON.stringify({message:"Imported Successfully"}));
	  }).catch((error) => {
		  console.log(error);
		  res.sendStatus(500);
	    });
});
console.log('Mounted groundnet routes');

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
	var absolutePath = path.join(process.cwd(), currentpath);
	var wstream = fs.createWriteStream(path.join( absolutePath, '.dirindex'));
	wstream.write('version:1\n');
	var cleanedPath = currentpath.slice(1).replace(/\\/g,"/");
	wstream.write(`path:${cleanedPath}\n`);
	
	fs.readdirSync(absolutePath, {withFileTypes:true})
	.filter(file => file.name != ".dirindex" )
	.forEach(file => {
		if(file.isFile()){
			  var sha1 = sha1File( path.join(absolutePath, file.name) );
			  var size = fs.statSync( path.join(absolutePath, file.name) ).size;
  			  wstream.write(`f:${file.name}:${sha1}:${size}\n`);
		  }
		if(file.isDirectory()){
			var dirIndexFile = path.join( path.join(absolutePath, file.name), ".dirindex");
			if(fs.existsSync(dirIndexFile)){
			  var sha1 = sha1File( dirIndexFile );
//			  console.log(`d:${file.name}:${sha1}`);
			  wstream.write(`d:${file.name}:${sha1}\n`);
			}
		}
	});
	wstream.end();
	
	}
