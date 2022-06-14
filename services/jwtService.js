/**
 * Created by Alexander Llacho
 */
const jwt = require('jsonwebtoken');
const logger = require('./../server/logger').logger;
const appConstants = require('./../common/appConstants');
const {redisWriter, redisReader} = require('./../database/redis');

const authTokenTtl = 60 * 60;
const timeTokenRedis = 60 * 60; //60 minutes

const generateAuthToken = async (_id, docType, doc, name, lastname, profile, job_area_code, job_area_name, type) => {
    let data = {
        id: _id,
        docType: docType,
        doc: doc,
        name: name,
        lastname: lastname,
        profile: profile,
        job_area_code: job_area_code,
        job_area_name: job_area_name,
        type: type,
        exp: Math.floor(Date.now() / 1000) + authTokenTtl
    };

    return jwt.sign(data, process.env.AUTH_JWT_HMACKEY);
}

const verifyToken = async (token, profile) => {
    try {
        const user = jwt.verify(token, process.env.AUTH_JWT_HMACKEY);

        if (user.profile === profile) {
            return true;
        }

    } catch (err) {
        logger.error(err);
    }

    return false;
}

const expired = 60 * 60 * 24; // 24 horas

const generateServiceToken = async (_id, user_service) => {
    let data = {
        id: _id,
        user_service: user_service,
        profile: appConstants.PROFILE_SERVICE,
        exp: Math.floor(Date.now() / 1000) + expired
    }

    return jwt.sign(data, process.env.AUTH_JWT_HMACKEY);
}

module.exports = {generateAuthToken, verifyToken, generateServiceToken}