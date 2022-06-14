/**
 * Created by Alexander Llacho
 */
const jwtService = require('./../services/jwtService');
const appConstants = require('./../common/appConstants');
const mongodb = require('./../database/mongodb');
const logger = require('./../server/logger').logger;
const errors = require('./../common/errors');
const utils = require('./../common/utils');
const mongoCollections = require('./../common/mongoCollections');
const CryptoJS = require('crypto-js');

const login = async (docType_, doc_, password_) => {

    try {
        const db = await mongodb.getDb();

        let docType = CryptoJS.AES.decrypt(docType_, appConstants.SECRET_KEY).toString(CryptoJS.enc.Utf8);
        let doc = CryptoJS.AES.decrypt(doc_, appConstants.SECRET_KEY).toString(CryptoJS.enc.Utf8);
        let password = CryptoJS.AES.decrypt(password_, appConstants.SECRET_KEY).toString(CryptoJS.enc.Utf8);

        let user = await db.collection(mongoCollections.USERS).findOne({doc_type: docType, doc: doc, 
            $or: [{profile: appConstants.PROFILE_REGISTER}, {profile: appConstants.PROFILE_NOTIFIER}, {profile: appConstants.PROFILE_ADMIN}]});

        if (!user) {
            logger.error('user ' + doc + '/' + docType + ' (admin) not exist');
            return {success: false, error: errors.LOGIN_INVALID_DATA};
        }

        if(user.password !== utils.passwordHash(password)){
            logger.error('user ' + doc + '/' + docType +' (admin) password not equals');
            return {success: false, error: errors.LOGIN_INVALID_DATA};
        }

        let jwtToken = await jwtService.generateAuthToken(
            user._id,
            docType,
            doc,
            user.name,
            user.lastname,
            user.profile,
            user.job_area_code,
            user.job_area_name,
            appConstants.JWT_TYPE_AUTH
        );

        return {success: true, jwtToken: jwtToken, updated_password: user.updated_password};

    } catch (err) {
        logger.error(err);
        return {success: false};
    }

}

module.exports = {login};
