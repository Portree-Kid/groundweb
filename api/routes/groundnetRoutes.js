const assert = require('assert');
const Router = require('express-promise-router')
const fileUpload = require('express-fileupload');
var libxmljs = require('libxmljs');
const fs = require('fs');

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
		res.send(JSON.stringify("No file provided"));
		return;
	}
	if (!req.files.groundnet) {
		res.send(JSON.stringify("No file provided"));
		return;
	}
	if (!req.files.groundnet.name) {
		res.send(JSON.stringify("No Filename provided"));
		return;
	}
	var sitemapDoc;
	var schemaDoc;
	// Parse the sitemap and schema
	try {
		sitemapDoc = libxmljs.parseXml(req.files.groundnet.data);
		schemaDoc = libxmljs.parseXml(schema);
		} catch (e) {
			res.send(JSON.stringify(e, replaceErrors));
			return;
		}

	// Perform validation
	const isValid = sitemapDoc.validate(schemaDoc);
	if (!isValid) {
		res.send(JSON.stringify(sitemapDoc.validationErrors, replaceErrors));
		return;
	}
	console.log(airports.findAirport(req.files.groundnet.name.substr(0, req.files.groundnet.name.indexOf('.')) ));
	var airport;
	airports.findAirport(req.params.icao, (err, result) => {
		console.log("Result " + result);
	    if (err) {
	      return console.error('Error executing query', err.stack)
	    }
		if (!result.rows) {
			console.log(airports.findAirport(req.params.icao));
			res.send(JSON.stringify("Airport doesn't exist " + airports.findAirport(req.params.icao)));
			return;
		}
		res.sendStatus(200);
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
