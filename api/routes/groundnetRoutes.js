const util = require('util');
const assert = require('assert');

const Router = require('express-promise-router')
const fileUpload = require('express-fileupload');
const fs = require('fs');
const GroundnetController = require('./groundnetController');


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
router.post('/upload', GroundnetController.upload);
/**
 * Service to accept a posted file.
 * 
 * @param req
 * @param res
 * @returns
 */

router.get('/:icao', GroundnetController.airportGeoJSON);

console.log('Mounted groundnet routes');



