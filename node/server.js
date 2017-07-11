// modules =================================================
var express        = require('express');
var app            = express();
var mongoose       = require('mongoose');
var bodyParser     = require('body-parser');
var methodOverride = require('method-override');

// configuration ===========================================


var port = process.env.PORT || 8000; // set our port
var db = require('./config/db');

connectionsubject = mongoose.createConnection(db.urlSubjectViews);




app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(methodOverride('X-HTTP-Method-Override'));
app.use(express.static(__dirname + '/public'));

// Routes ==================================================
require('./app/routes')(app);

// start the Application ===============================================
app.listen(port);
console.log('Login to ' + port);
exports = module.exports = app;