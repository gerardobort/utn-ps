/**
 * Module dependencies.
 */

var express = require('express'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    mongoose = require('mongoose'),
    mongooseWhen = require('mongoose-when'),
    gridfs = require('gridfs-stream'),
    _ = require('underscore'),
    moment = require('moment'),
    authRoute = require('./routes/auth'),
    appRoute = require('./routes/app');


var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('html', require('uinexpress').__express);
app.engine('js', require('uinexpress').__express);
app.set('view engine', 'html')
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.limit('15mb'));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var configFile = process.env.NODE_ENV ? 
    './config/' + process.env.NODE_ENV + '.json'
    : './config/default.json';

require('./lib/config').loadConfig(configFile, function (config) {
    global.config = config;

    /*
    // mongo and models
    var dbConnString = global.config.MONGO_URL || process.env.MONGO_URL;
    console.log('Connecting to ' + dbConnString.replace(/^.*@/, '') + ' ...');
    app.set('db', mongoose.connect(dbConnString, { db: { safe: true }}));
    // this sucks
    app.set('gfs', gridfs(app.get('db').connections[0].db, mongoose.mongo));
    */

    var models_path = __dirname + '/models'
    fs.readdirSync(models_path).forEach(function (file) {
        if (file.match(/\.js$/)) {
            require(models_path+'/'+file);
        }
    });

    // inlcude helpers module
    global.helpers = require('./lib/helpers');
    global.moment = moment;

    // routes
    app.get('/', authRoute.bootstrap, appRoute.index);

    app.post('/user/login', authRoute.login);
    app.get('/user/logout', authRoute.logout);

    app.locals(global.config);

    http.createServer(app).listen(app.get('port'), function(){
        console.log('Site server listening on port ' + app.get('port') + ' on ' + app.get('env') + ' env.');
    });

});
