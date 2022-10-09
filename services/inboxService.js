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

const getApprovedInboxByDoc = async (docType, doc) => {
    try {
        const ESTADO_APROBADO = 'APROBADO';
        const db = await mongodb.getDb();

        let _filter = {
            $or: [
                {
                    doc: doc,
                    doc_type: docType,
                    status: ESTADO_APROBADO,
                },
                {
                    doc: doc,
                    doc_type: docType,
                    status: null,
                }
            ]
        }

        let inbox = await db.collection(mongoCollections.INBOX).findOne(_filter);

        if (!inbox) {
            logger.warn('inbox ' + doc + '/' + docType + ' approved not exist');
            return {success: false};
        }

        return {success: true, inbox: {_id: inbox._id, doc: inbox.doc, doc_type: inbox.doc_type}};

    } catch (err) {
        logger.error(err);
        return {success: false, error: errors.INTERNAL_ERROR};
    }
}

const getApprovedInboxByEmail = async (correo) => {
    try {
        const ESTADO_APROBADO = 'APROBADO';
        const db = await mongodb.getDb();

        let _filter = {$or:[
                {
                    email: correo,
                    status: ESTADO_APROBADO,
                },
                {
                    email: correo,
                    status: null,
                }
            ]}

        let inbox = await db.collection(mongoCollections.INBOX).findOne(_filter);

        if (!inbox) {
            logger.error('inbox with email ' + correo + ' approved not exist');
            return {success: false};
        }

        return {success: true};

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

const inboxEdit = async (inboxId, email, cellphone, ubigeo, address, usuarioRegistro) => {
    const db = await mongodb.getDb();
    const inbox = await db.collection(mongoCollections.INBOX).findOne({
        _id: ObjectId(inboxId)
    });

    if(!inbox){
        return { success: false, error: 'No existe la casilla' };
    }

    var user_inbox = await db.collection(mongoCollections.USER_INBOX).findOne({
        $or: [{ inbox_id: inbox._id }, { inbox_id: inbox._id.toString() }]
    });

    var user;
    if(user_inbox != null && user_inbox.user_id != null){
        user = await db.collection(mongoCollections.USERS).findOne({
            _id: ObjectId(user_inbox.user_id.toString())
        });
    }

    if (!user) {
        var users = await db.collection(mongoCollections.USERS).find({
            doc_type: inbox.doc_type,
            doc: inbox.doc
        }).toArray();
        if(users.length == 1) {
            user = users[0];
        }
    }

    if(!user){
        return { success: false, error: 'No es posible determinar el usuario para la casilla seleccionada' };
    }

    var result = await db.collection(mongoCollections.INBOX).updateOne({ _id: inbox._id }, {
        $set: {
            email: email,
            cellphone: cellphone,
            address: address,
            update_user: usuarioRegistro,
            update_date: new Date(),
        }
    });

    var result2 = await db.collection(mongoCollections.USERS).updateOne({ _id: user._id }, {
        $set: {
            email: email,
            cellphone: cellphone,
            address: address,
            Ubigeo: ubigeo,
            update_user: usuarioRegistro,
            update_date: new Date(),
        }
    });
    return { success: true };
}


module.exports = {getInbox, getInboxUserCitizen, downloadPdfInbox, getApprovedInboxByDoc, getApprovedInboxByEmail, inboxEdit};