/**
 * Created by Angel Quispe
 */
const mongodb = require('./../database/mongodb');
const logger = require('./../server/logger').logger;
const mongoCollections = require('./../common/mongoCollections');
const errors = require('./../common/errors');
const appConstants = require('./../common/appConstants');
const ObjectId = require('mongodb').ObjectId;
const fs = require('fs');

const base_url = process.env.BASE_URL;
const path_upload = process.env.PATH_UPLOAD;

const getInbox = async (docType, doc) => {
    try {
        const db = await mongodb.getDb();

        let _filter = {
            doc: doc,
            doc_type: docType
        }

        let inbox = await db.collection(mongoCollections.INBOX).findOne(_filter);

        if (!inbox) {
            logger.error('inbox ' + doc + '/' + docType + ' not exist');
            return {success: false};
        }

        return {success: true, inbox: {_id: inbox._id, doc: inbox.doc, doc_type: inbox.doc_type}};

    } catch (err) {
        logger.error(err);
        return {success: false, error: errors.INTERNAL_ERROR};
    }

}

const getInboxUserCitizen = async (docType, doc, jwt) => {
    try {
        const db = await mongodb.getDb();

        let _filter = {
            doc: doc,
            doc_type: docType
        }

        let inbox = await db.collection(mongoCollections.INBOX).findOne(_filter);

        if (!inbox) {
            logger.error('inbox ' + doc + '/' + docType + ' not exist');
            return {success: false};
        }

        return {
            success: true,
            inbox: {
                doc: inbox.doc,
                doc_type: inbox.doc_type,
                email: inbox.email,
                cellphone: inbox.cellphone,
                phone: inbox.phone,
                address: inbox.address,
                acreditation_type: inbox.acreditation_type,
                pdf_resolution: pdfBox(inbox._id, appConstants.BOX_PDF_RESOLUTION, inbox.pdf_resolution, jwt),
                pdf_creation_solicitude: pdfBox(inbox._id, appConstants.BOX_PDF_CREATION_SOLICITUDE, inbox.pdf_creation_solicitude, jwt),
                pdf_agree_tos: pdfBox(inbox._id, appConstants.BOX_PDF_AGREE_TOS, inbox.pdf_agree_tos, jwt)
            }
        };

    } catch (err) {
        logger.error(err);
        return {success: false, error: errors.INTERNAL_ERROR};
    }

}

const pdfBox = (idInbox, pdf_type, pdf_inbox, jwt) => {
    return {
        name: pdf_inbox.name,
        url: encodeURI(base_url + '/download-pdf-box?token=' + jwt + '&inbox=' + idInbox + '&type=' + pdf_type)
    }
}

const downloadPdfInbox = async (idInbox, pdf_type) => {
    try {
        const db = await mongodb.getDb();

        let filter = {
            _id: ObjectId(idInbox)
        }

        let inbox = await db.collection(mongoCollections.INBOX).findOne(filter);

        if (!inbox) {
            logger.error('inbox ' + idInbox + ' not exist');
            return {success: false};
        }

        let result = {success: false};

        if (fs.existsSync(path_upload + '/' + inbox[pdf_type].path)) {
            result.success = true;
            result.pathfile = path_upload + '/' + inbox[pdf_type].path;
            result.filename = inbox[pdf_type].name;
        } else {
            logger.error(pdf_type + ' - ' + path_upload + '/' + inbox[pdf_type].path + ' not exist');
        }

        return result;

    } catch (err) {
        logger.error(err);
        return {success: false, error: errors.INTERNAL_ERROR};
    }
}

module.exports = {getInbox, getInboxUserCitizen, downloadPdfInbox};