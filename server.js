var compression = require('compression');
var helmet = require('helmet');
var serveIndex = require('serve-index')

var express = require('express'), app = express(), port = process.env.PORT || 3001;

var errorHandler = function(err, req, res, next) {
	console.log("Error:" + err.stack);
	res.sendStatus(500);
};

bodyParser = require('body-parser');

const dotenv = require('dotenv');
dotenv.config();

const mountRoutes = require('./api/routes');

app.use(compression());
app.use(helmet());

app.use(bodyParser.urlencoded({
	extended : true
}));
app.use(bodyParser.json());

mountRoutes(app);
//Must be after the content
app.use(express.static('public', {'hidden' :true}), serveIndex('public', {'icons': false, 'hidden' :true}, styleSheet='page.css'));


// app.use(notFound); // your page not found interceptor
app.use(errorHandler);
app.listen(port);
console.log('flightgear airports xml  RESTful API server started on: ' + port);	
