/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */

let winston = require('winston');
let expressWinston = require('winston-express-middleware');

let logConfig = {
    transports: [
        new (winston.transports.Console)({json: false, timestamp: true})
    ],
    exceptionHandlers: [
        new (winston.transports.Console)({json: false, timestamp: true})
    ],
    exitOnError: false
};

let middleware = new (expressWinston.logger)(logConfig);
let logger = new (winston.Logger)(logConfig);

module.exports = {middleware: middleware, logger: logger};
