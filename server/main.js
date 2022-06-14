/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */

const cookieSession = require('cookie-session');
const helmet = require('helmet');
const express = require('express');
const loggers = require('./logger.js');
const cors = require('cors');
const logMiddleware = loggers.middleware;
const bodyParser = require('body-parser');
const app = express();
const server = require('http').Server(app);
const router = require('../controller/_index')();
const appConstants = require('../common/appConstants');

app.use(helmet());
app.use(cookieSession({
    name: 'session',
    keys: [appConstants.COOKIE_KEY],
    maxAge: 24 * 60 * 60 * 1000, //Cookie Options - 24 hours
    sameSite: 'strict',
    httpOnly: true
  }));
app.set('trust proxy', '127.0.0.1');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cors({
    exposedHeaders: [appConstants.ERROR_HANDLER],
}));
app.use(logMiddleware);
app.use(router);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});


// error handler
app.use(function (err, req, res, next) {
    res.locals.baseUrl = process.env.BASE_URL;

    if (err.name === 'IpDeniedError') {
        err.stack = null;
        res.locals.error = err;
        return res.status(403);
    } else {
        res.locals.message = err.message;
        res.locals.error = process.env.NODE_ENV === 'local' || 'dev' ? err : {};

        // render the error page
        return res.status(err.status || 500);
    }
});

//module.exports = app;
module.exports = {app: app, server: server};
