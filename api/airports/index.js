const db = require('../../db')

module.exports = {	
	  findAirport: (icao, cb) => db.query("SELECT * FROM apt_airfield WHERE icao = '" + icao + "'", cb)
	}