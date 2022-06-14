/**
 * Created by Alexander Llacho
 */

const Redis = require('ioredis');
let redisWriter = null;
let redisReader = null;

if (process.env.NODE_ENV === 'local') {
    redisWriter = new Redis({
        port: 6379,
        host: '127.0.0.1',
        family: 4,
        password: process.env.REDIS_PASSWORD,
        db: 0,
    });

    redisReader = new Redis({
        port: 6379,
        host: '127.0.0.1',
        family: 4,
        password: process.env.REDIS_PASSWORD,
        db: 0,
    });
} else {
    redisWriter = new Redis({
        port: 6379,
        host: process.env.REDIS_WRITER,
        password: process.env.REDIS_PASSWORD
    });

    redisReader = new Redis({
        port: 6379,
        host: process.env.REDIS_READER,
        password: process.env.REDIS_PASSWORD
    });
}

module.exports = {redisWriter: redisWriter, redisReader: redisReader};