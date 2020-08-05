const terraSyncDir = 'public';

var libxmljs = require('libxmljs');
var lockFile = require('lockfile');
const fs = require('fs');
const path = require("path")

var DB = require('../config/database');
var git = require('../util/git.js');
var dirindex = require('../util/dirindex.js');
var github = require('../util/github.js');
Coordinates = require('coordinate-parser');


function scanSubdir(currentpath) {
	var charList = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';	
		[...charList].forEach(
			c => {
				var subpath = path.resolve(path.join(currentpath, c))
				if (fs.existsSync(subpath)) {
					console.log('Scanning : ' + subpath)
					scanSubdir(subpath)
					dirindex.buildDirIndex(subpath)
				}
			}
		);
	
}


module.exports = {
	rebuild(req, res) {
		res.setHeader('Content-Type', 'application/json');
		var gitPath = path.resolve(path.join(terraSyncDir, "/main/"));
		var currentpath = path.join(gitPath, "/Airports/");
		scanSubdir(currentpath);
		dirindex.buildDirIndex(currentpath)
		console.log(currentpath);
		res.send('OK');
	},
	status(req, res) {
		res.setHeader('Content-Type', 'application/json');
		/**
		 * Callback for all errors
		 * @param {*} err 
		 */
		var errCb = function (err) {
			lockFile.unlock('groundweb.lock', function (er) {
				try {
					var payload = JSON.stringify({ message: "Error", err }, replaceErrors)
					res.send(payload);
				}
				catch (err) {
					console.log(err);
					res.send(JSON.stringify({ message: "Error in Stringify", err }, replaceErrors));
				}
			})
        };
		var okCb = function (result) {
			lockFile.unlock('groundweb.lock', function (er) {
				console.log("Status : " + result + ' Lockstatus ' + lockFile.checkSync('groundweb.lock'));
				res.send(result);
			})
		}
		var opts = { stale: 60000 };
		lockFile.lock('groundweb.lock', opts, function (er) {
			if (!er) {
				var gitPath = path.resolve(path.join(terraSyncDir, "/main/"));
				git.status(gitPath, errCb, okCb, 'https://github.com/terrasync/main.git') 		
     		}
			else {
				res.send(JSON.stringify({ message: "Import running try again shortly" }));
			}
		});
	},
	upload(req, res) {
		res.setHeader('Content-Type', 'application/json');
		if (!req.files) {
			res.send(JSON.stringify({ message: "No file provided" }));
			return;
		}
		if (!req.files.groundnet) {
			res.send(JSON.stringify({ message: "No file provided" }));
			return;
		}
		if (!req.body.gpl) {
			res.send(JSON.stringify({ message: "Please agree to the GPL v2." }));
			return;
		}
		if (!req.body.user_email) {
			res.send(JSON.stringify({ message: "No E-Mail provided" }));
			return;
		}
		var user;
		DB.getUserByEmail(req.body.user_email, function (err, user) {
			if (err) {
				//res.send(JSON.stringify({ message: "Error getting user", err }, replaceErrors));
				//return;
			}
			//TODO User Check in Production
			//		if(!user) {
			//			res.send(JSON.stringify({message:"User unknown", user}));
			//			return;			
			//		}
			//		console.log(user);

			//Check Filename
			var groundnetRegex = '([0-9A-Z]{3,4})\\.(groundnet|ils|threshold|twr|rwyuse)\\.xml';
			var result = req.files.groundnet.name.match(groundnetRegex);
			if (!result) {
				res.send(JSON.stringify({ message: "Filename doesn't match known filename pattern" }, replaceErrors));
				return;
			}
			const type = result[2];
			const schema = fs.readFileSync(`schema/${type}.xsd`);
			var sitemapDoc;
			var schemaDoc;
			// Parse the sitemap and schema
			try {
				sitemapDoc = libxmljs.parseXml(req.files.groundnet.data);
				schemaDoc = libxmljs.parseXml(schema);
			} catch (e) {
				res.send(JSON.stringify({ message: "XML Errors", e }, replaceErrors));
				return;
			}
			// Perform XML validation
			const isValid = sitemapDoc.validate(schemaDoc);
			if (!isValid) {
				var validationErrors = sitemapDoc.validationErrors;
				res.send(JSON.stringify({ message: "XML Errors", validationErrors }, replaceErrors));
				return;
			}
			switch (type) {
				case 'groundnet':
					var gates = sitemapDoc.find('/groundnet/parkingList/Parking[@type="gate"]');
					if (gates.length == 0) {
						res.send(JSON.stringify({ message: "No gates, traffic won't work" }, replaceErrors));
						return;
					}
					break;
				default:
					break;
			}

			//Does Airport exist?
			var icao = result[1];
			DB.GetAirportByIcao(icao, function (err, airport) {
				if (err) {
					//console.error('Error executing query', err);
					//res.sendStatus(500);
					//return;
				}
				console.log("Result Airportdata : " + airport);
				if (!airport) {
					//res.send(JSON.stringify({ message: "Airport doesn't exist" }));
					//return;
				}
				var gitPath = path.resolve(path.join(terraSyncDir, "/main/"));

				/**
				 * Callback for all errors
				 * @param {*} err 
				 */
				var errCb = function (err) {
					if (err) {
						console.error("*************************************");
						console.error(err);
						if (err.errorFunction == 'Branch.create') {
							//git.removeBranch(gitPath, icao);
						}
						lockFile.unlock('groundweb.lock', function (er) {
							try {
								var payload = JSON.stringify({ message: "Error in GIT", err }, replaceErrors)
								res.send(payload);
							}
							catch (err) {
								console.log(err);
								res.send(JSON.stringify({ message: "Error in Stringify", err }, replaceErrors));
							}
						})

					}
				};
				var writecb = function () {
					var currentpath = path.join(gitPath, "/Airports/");
					createPath(currentpath, res);
					currentpath = path.join(currentpath, icao[0]);
					createPath(currentpath, res);
					currentpath = path.join(currentpath, icao[1]);
					createPath(currentpath, res);
					currentpath = path.join(currentpath, icao[2]);
					createPath(currentpath, res);
					var paths = [];
					fs.writeFileSync(currentpath + path.sep + req.files.groundnet.name, req.files.groundnet.data, { flag: 'w' });
					paths.push(currentpath + path.sep + req.files.groundnet.name);
					do {
						paths.push(dirindex.buildDirIndex(currentpath));
					}
					while ((currentpath = path.resolve(currentpath, "..")) != path.resolve(terraSyncDir))
					return paths;
				}

				var okCb = function (branchName) {
					console.log("Opening pull request for " + branchName);
					github.load(branchName, req.body.user_email)
						.then((pullReqResult) => {
							console.log(`statusCode: ${pullReqResult.statusCode}`)
							//console.log(res)
							console.log(icao + " Imported Successfully");
							lockFile.unlock('groundweb.lock', function (er) {
								res.send(JSON.stringify({ message: "" + icao + " Imported Successfully" }));
							})
						})
						.catch(errCb)
				}
				var opts = { stale: 60000 };
				lockFile.lock('groundweb.lock', opts, function (er) {
					if (!er) {
						//https://github.com/terrasync/main.git
						//'git@github.com:terrasync/main.git'
						git.workflow(gitPath, icao, req.body.user_email, writecb, errCb, okCb, 'https://github.com/terrasync/main.git');
					}
					else {
						res.send(JSON.stringify({ message: "Import running try again shortly" }));
					}
				});
			});
		});
	},

	airportGeoJSON(req, res) {
		res.setHeader('Content-Type', 'application/json');
		if (!req.params.icao) {
			res.send(JSON.stringify({ message: "No ICAO" }));
			return;
		}
		var icaoRegex = '([0-9A-Z]{3,4})';
		var result = req.params.icao.match(icaoRegex);
		if (!result) {
			res.send(JSON.stringify({ message: "ICAO wrong (Uppercase 3-4 chars)" }));
			return;
		}
		console.log(req.params.icao);

		var gitPath = path.resolve(path.join(terraSyncDir, "/main/"));
		var currentpath = path.join(gitPath, "/Airports/");
		currentpath = path.join(currentpath, req.params.icao[0]);
		currentpath = path.join(currentpath, req.params.icao[1]);
		currentpath = path.join(currentpath, req.params.icao[2]);
		console.log(currentpath);
		const groundnetData = fs.readFileSync(path.join(currentpath, req.params.icao + '.groundnet.xml'));
		groundnetDoc = libxmljs.parseXml(groundnetData);
		//
		//{
		//	"type": "MultiLineString",
		//	"coordinates": [
		//		[ [100.0, 0.0], [101.0, 1.0] ],
		//		[ [102.0, 2.0], [103.0, 3.0] ]
		//	]
		// }
		var segments = groundnetDoc.find('/groundnet/TaxiWaySegments/arc');
		var lineString = {
			type: "FeatureCollection",
			"features": []
		};
		segments.forEach(function (segment) {

			var feature = { "type": "Feature", "properties": {}, "geometry": { type: "MultiLineString", "coordinates": [] } };
			var beginID = segment.attr('begin').value();
			var beginNode = groundnetDoc.find("/groundnet/TaxiNodes/node[@index='" + beginID + "']");
			if (beginNode.length == 0) {
				beginNode = groundnetDoc.find("/groundnet/parkingList/Parking[@index='" + beginID + "']");
			}
			var endID = segment.attr('end').value();
			var endNode = groundnetDoc.find("/groundnet/TaxiNodes/node[@index='" + endID + "']");
			if (endNode.length == 0) {
				endNode = groundnetDoc.find("/groundnet/parkingList/Parking[@index='" + endID + "']");
			}
			var beginCoords = new Coordinates(beginNode[0].attr('lat').value() + " " + beginNode[0].attr('lon').value());
			var endCoords = new Coordinates(endNode[0].attr('lat').value() + " " + endNode[0].attr('lon').value());

			feature.geometry.coordinates.push([[beginCoords.getLongitude(), beginCoords.getLatitude()], [endCoords.getLongitude(), endCoords.getLatitude()]]);
			if (beginNode.isOnRunway) {
				lineString.features.push({
					"type": "Feature", "properties": {
						"marker-color": "#ff0000",
						"marker-size": "medium",
						"marker-symbol": "circle"
					}, "geometry": { "type": "Point", "coordinates": [beginCoords.getLongitude(), beginCoords.getLatitude()] }
				});
			}
			else {
				lineString.features.push({
					"type": "Feature", "properties": {
						"marker-color": "#0000ff",
						"marker-size": "small",
						"marker-symbol": "circle"
					}, "geometry": { "type": "Point", "coordinates": [beginCoords.getLongitude(), beginCoords.getLatitude()] }
				});
			}
			if (endNode.isOnRunway) {
				lineString.features.push({
					"type": "Feature", "properties": {
						"marker-color": "#ff0000",
						"marker-size": "medium",
						"marker-symbol": "circle"
					}, "geometry": { "type": "Point", "coordinates": [endCoords.getLongitude(), endCoords.getLatitude()] }
				});
			}
			else {
				lineString.features.push({
					"type": "Feature", "properties": {
						"marker-color": "#0000ff",
						"marker-size": "small",
						"marker-symbol": "circle"
					}, "geometry": { "type": "Point", "coordinates": [endCoords.getLongitude(), endCoords.getLatitude()] }
				});
			}
			lineString.features.push(feature);

			//console.log(segment + "" + beginNode);
		});
		fs.writeFileSync(path.join(currentpath, req.params.icao + '.groundnet.json'), JSON.stringify(lineString), { flag: 'w' });
		res.send(JSON.stringify(lineString));
		return;
	}
}

function createPath(currentpath, res) {
	if (fs.existsSync(currentpath))
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

		Object.getOwnPropertyNames(value).forEach(function (key) {
			error[key] = value[key];
		});

		return error;
	}

	return value;
}
