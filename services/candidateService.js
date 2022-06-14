/**
 * Created by Angel Quispe
 */

const mongodb = require('./../database/mongodb');
const logger = require('./../server/logger').logger;
const errors = require('./../common/errors');
const utils = require('./../common/utils');
const appConstants = require('./../common/appConstants');
const mongoCollections = require('./../common/mongoCollections');

const getCandidate = async (docType, doc) => {
    try {
        const db = await mongodb.getDb();

        let candidate = await db.collection(mongoCollections.CANDIDATE).findOne({doc_type: docType, doc: doc});

        if (!candidate) {
            logger.info('ciudadano ' + doc + '/' + docType + ' not exist');
            return {success: false, error: errors.CANDIDATE_NOT_EXIST};
        }

        return {
            success: true,
            names: candidate.name + ' ' + candidate.lastname,
            name: candidate.name,
            lastname: candidate.lastname,
            organization_doc: candidate.organization_doc,
            organization_name: candidate.organization_name
        };

    } catch (err) {
        logger.error(err);
        return {success: false};
    }
}

module.exports = {getCandidate};