/**
 * Created by Cesar Bernaola
 */

const mongodb = require('./../database/mongodb');
const logger = require('./../server/logger').logger;
const appConstants = require('./../common/appConstants');
const mongoCollections = require('./../common/mongoCollections');
const utils = require('./../common/utils');
const jwtService = require('./../services/jwtService');

const validateUserService = async (user_service) => {
    try {
        const db = await mongodb.getDb();
        let filter = {
            user_service: user_service
        }
        let user = await db.collection(mongoCollections.TOKENS_SERVICE).findOne(filter);
        return user;
    } catch(error) {
        logger.error(err);
        return false;
    }
}

const updateTokenService = async (user_service, password) => {
    let result = {};
    try {
        const db = await mongodb.getDb();
        let filter = {
            user_service: user_service
        }
        let user = await db.collection(mongoCollections.TOKENS_SERVICE).findOne(filter);
        if(!user) {
            result.success = false;
            result.message = "Servicio no registrado";
            return result;
        }
        let update_token = {};
        if(!user.updated_password) {
            update_token.password = utils.passwordHash(password);
            update_token.updated_password = true;
        }
        else if(user.password !== utils.passwordHash(password)) {
            result.success =  false;
            result.message = "Los datos ingresados no son válidos";
            return result;
        }
        
        let jwtToken = await jwtService.generateServiceToken(
            user._id,
            user_service,
            appConstants.JWT_TYPE_AUTH
        );
        update_token.update_at = new Date();
        
        await db.collection(mongoCollections.TOKENS_SERVICE).update(filter, {$set: update_token});

        result.success = true;
        result.token = jwtToken;

    } catch(error) {
        logger.error(error);
        result.success = false;
        result.message = "Error interno de servidor";
    }
    return result;
}

const getUserSystem = async (sistema) => {
    try {
        const db = await mongodb.getDb();
        let filter = {
            sistema: sistema
        }
        let user = await db.collection(mongoCollections.TOKENS_SERVICE).findOne(filter);
        return {user: user.user_service};
    } catch(error) {
        logger.error(err);
        return {user: false};
    }
}

module.exports = {
    validateUserService,
    updateTokenService,
    getUserSystem
}