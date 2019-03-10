const assert = require('assert');
const Router = require('express-promise-router')
const fileUpload = require('express-fileupload');
var libxmljs = require('libxmljs');
const fs = require('fs');
const schema = fs.readFileSync('api/schema/groundnet.xsd');
// var xsd = require("groundnet");

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

router
		.post(
				'/upload',
				function(req, res) {
					
					console.log(req.params.icao);
					// Parse the sitemap and schema
					const sitemapDoc = libxmljs.parseXml(req.files.groundnet.data);
					const schemaDoc = libxmljs.parseXml(schema);

					// Perform validation
					const isValid = sitemapDoc.validate(schemaDoc);
					if (!isValid) {
						res.setHeader('Content-Type', 'application/json');
						res.send(JSON.stringify(sitemapDoc.validationErrors,
								replaceErrors));
					} else {
						
						res.sendStatus(200);
					}
				});
console.log('Mounted groundnet routes');

/**
 * Error objects are not correctly processed by stringify
 * @param key
 * @param value
 * @returns
 */
function replaceErrors(key, value) {
	if ( key === 'stack' ) { // 
        return undefined; // remove from result
    }
    if (value instanceof Error) {
        var error = {};

        Object.getOwnPropertyNames(value).forEach(function (key) {
            error[key] = value[key];
        });

        return error;
    }

    return value;
}
