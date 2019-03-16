var compression = require('compression');
var helmet = require('helmet');

var express = require('express'), app = express(), port = process.env.PORT || 3000;

var errorHandler = function(err, req, res, next) {
	console.log("Error:" + err.stack);
	res.sendStatus(500);
};

app.use(express.static('public'));

bodyParser = require('body-parser');

const mountRoutes = require('./api/routes');

app.use(compression());
app.use(helmet());

app.use(bodyParser.urlencoded({
	extended : true
}));
app.use(bodyParser.json());

mountRoutes(app);

// app.use(notFound); // your page not found interceptor
app.use(errorHandler);
app.listen(port);

console.log('flightgear airports xml  RESTful API server started on: ' + port);
