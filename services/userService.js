/**
 * Created by Angel Quispe
 */

const ObjectID = require('mongodb').ObjectID;

const mongodb = require('./../database/mongodb');
const logger = require('./../server/logger').logger;
const errors = require('./../common/errors');
const utils = require('./../common/utils');
const appConstants = require('./../common/appConstants');
const mongoCollections = require('./../common/mongoCollections');
const emailService = require('./../services/emailService');
const crypto = require("crypto");
const axios = require('axios');
const fs = require('fs');

const getUsersCitizen = async(search, page, count) => {
    try {
        const db = await mongodb.getDb();
        let _filter = {
            profile: appConstants.PROFILE_CITIZEN,
            $or: [{ name: new RegExp(diacriticSensitiveRegex(search), 'i') }, { lastname: new RegExp(diacriticSensitiveRegex(search), 'i') }, { organization_name: new RegExp(diacriticSensitiveRegex(search), 'i') }, { doc: new RegExp(diacriticSensitiveRegex(search)) }]

        }

        let cursor = await db.collection(mongoCollections.USERS).find(_filter).collation({ locale: "en", strength: 1 }).sort({ created_at: -1 }).skip(page > 0 ? ((page - 1) * count) : 0).limit(count);

        let recordsTotal = await cursor.count();

        let users = [];

        for await (const user of cursor) {
            var name;
            if(user.doc_type === 'RUC'){
                name = `${user.name}`;
            }else{
                name = `${user.name} ${user.lastname} ${user.second_lastname != undefined?user.second_lastname:''}`;
            }
             
            console.log("name", name);
            users.push({ id: user._id, name: name, doc_type: user.doc_type, doc: user.doc, organization: user.organization_name, createdAt: user.created_at, createUser: user.create_user });
        }

        return { success: true, recordsTotal: recordsTotal, users: users };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}

const getUsers = async(search, page, count) => {
    try {
        const db = await mongodb.getDb();
        let _filter = {
            profile: {
                $in: [appConstants.PROFILE_ADMIN, appConstants.PROFILE_REGISTER, appConstants.PROFILE_NOTIFIER,
                    appConstants.PROFILE_REGISTRADOR_NOTIFICADOR
                ]
            },
            $or: [{ name: new RegExp(diacriticSensitiveRegex(search), 'i') }, { lastname: new RegExp(diacriticSensitiveRegex(search), 'i') }, { organization_name: new RegExp(diacriticSensitiveRegex(search), 'i') }, { doc: new RegExp(diacriticSensitiveRegex(search)) }]
        };

        let cursor = await db.collection(mongoCollections.USERS).find(_filter).collation({ locale: "en", strength: 1 }).sort({ created_at: -1 }).skip(page > 0 ? ((page - 1) * count) : 0).limit(count);
        let recordsTotal = await cursor.count();
        let users = [];
        for await (const user of cursor) {
            users.push({
                name: user.name,
                lastname: user.lastname,
                doc_type: user.doc_type,
                doc: user.doc,
                organization: user.organization_name,
                createdAt: user.created_at,
                createUser: user.create_user,
                email: user.email,
                profile: user.profile
            });
        }

        console.log("data", users)
        return { success: true, recordsTotal: recordsTotal, users: users };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä]')
        .replace(/e/g, '[e,é,ë]')
        .replace(/i/g, '[i,í,ï]')
        .replace(/o/g, '[o,ó,ö,ò]')
        .replace(/u/g, '[u,ü,ú,ù]');
}

const createUserCitizen = async(box, idUser, attachments, usuarioRegistro) => {
    let created_at = new Date();

    let newInbox = {
        doc: box.doc,
        doc_type: box.docType,
        email: box.email,
        cellphone: box.cellphone,
        phone: box.phone,
        address: box.address,
        acreditation_type: box.acreditation_type,
        attachments: attachments,
        register_user_id: idUser,
        created_at: created_at,
        create_user: usuarioRegistro,
    };

    const password = crypto.randomBytes(5).toString('hex');

    let newUser = {
        doc: box.doc,
        doc_type: box.docType,
        profile: appConstants.PROFILE_CITIZEN,
        password: utils.passwordHash(password),
        name: box.name,
        lastname: box.lastname,
        second_lastname: box.second_lastname,
        email: box.email,
        cellphone: box.cellphone,
        phone: box.phone,
        address: box.address,
        //organization_doc: candidate.organization_doc,
        organization_name: box.organization,
        register_user_id: idUser,
        created_at: created_at,
        updated_password: false,
        create_user: usuarioRegistro
    };

    let newUserInbox = {
        doc: box.doc,
        doc_type: box.docType,
        profile: appConstants.USER_INBOX_PROFILE_OWNER
    }

    try {
        const db = await mongodb.getDb();

        let _newInbox = await db.collection(mongoCollections.INBOX).insertOne(newInbox);
        logger.info('success insert in inbox');

        await db.collection(mongoCollections.USERS).insertOne(newUser);
        logger.info('success insert in users');

        newUserInbox.inbox_id = _newInbox.ops[0]._id;

        await db.collection(mongoCollections.USER_INBOX).insertOne(newUserInbox);
        logger.info('success insert in user_inbox');

        let name = `${box.name} ${box.lastname} ${box.second_lastname != undefined?box.second_lastname:''}`;
        await emailService.sendEmailNewUserCitizen(name, newUser.email, password, box.doc);

        // Consultar servicio de claridad
        //searchCLARIDAD(box.doc, box.docType, true);
        return { success: true };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}

const searchCLARIDAD = async (dniCandidato, tipoDoc, generarPassword) => {
    let result = {};
    try {
        let response = await axios({
            url: `${process.env.WS_CLARIDAD}`,
            method: 'post',
            responseType: 'json',
            headers: {'apiKeyClaridad': appConstants.apiKeyClaridad},
            data: {
                dniCandidato: dniCandidato,
                generarPassword: generarPassword
            },
            timeout: 5000
        });
        result.success = true;
        result.statusCode = response.statusCode;
    } catch (error) {
        let err = error.toJSON();
        if(err.status != 404) await saveDoc(dniCandidato, tipoDoc);
        result.success = false;
        result.statusCode = err.status;
    }
    return result;
}

const saveDoc = async (doc, docType) => {
    try {
        let logDoc = {
            doc: doc,
            docType: docType,
            created_at: new Date()
        }
        const db = await mongodb.getDb();
        const filter = { docType: docType, doc: doc };
        let user = await db.collection(mongoCollections.LOG_CLARIDAD).findOne(filter);
        if(!user) await db.collection(mongoCollections.LOG_CLARIDAD).insertOne(logDoc);
    } catch (err) {
        logger.error(err);
    }
}

const getLogClaridad = async () => {
    let count = 0;
    try {
        const db = await mongodb.getDb();
        let info = await db.collection(mongoCollections.LOG_CLARIDAD).find();
        for await (logDoc of info) {
            let result = await searchCLARIDAD(logDoc.doc, logDoc.docType, true);
            if(result.success || result.statusCode == 404) {
                await db.collection(mongoCollections.LOG_CLARIDAD).deleteOne({
                    doc: logDoc.doc,
                    docType: logDoc.docType
                });
                count++;
            }
        }
    }
    catch (err) {
        logger.error(err);
    }
    console.log("count: ", count);
}

const getUserCitizen = async(docType, doc) => {
    try {
        const db = await mongodb.getDb();

        let user = await db.collection(mongoCollections.USERS).findOne({
            doc_type: docType,
            doc: doc,
            profile: appConstants.PROFILE_CITIZEN
        });

        if (!user) {
            logger.error('user citizen ' + doc + '/' + docType + ' not exist');
            return { success: false, error: errors.ADDRESSEE_CITIZEN_NOT_EXIST };
        }

        return {
            success: true,
            user: {
                names: user.name + ' ' + user.lastname,
                name: user.name,
                lastname: user.lastname,
                organization_doc: user.organization_doc,
                organization_name: user.organization_name
            }
        };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}

const createUser = async(newUser) => {
    try {
        if (await existUser(newUser.doc_type, newUser.doc, newUser.profile)) {
            return { success: false, error: errors.CREATE_USER_EXIST };
        }

        newUser.password = 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311';
        newUser.created_at = new Date();
        newUser.updated_password = false;

        const db = await mongodb.getDb();

        await db.collection(mongoCollections.USERS).insertOne(newUser);

        logger.info('success insert in users');

        return { success: true };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }

}

const existUser = async(docType, doc, profile) => {
    try {
        const db = await mongodb.getDb();

        let user = await db.collection(mongoCollections.USERS).findOne({
            doc_type: docType,
            doc: doc,
            profile: profile
        });

        if (!user) {
            return false
        }

        return true;

    } catch (err) {
        logger.error(err);

        return false;
    }

}

const updatePassword = async(docType, doc, profile, oldPassword, newPassword) => {
    try {
        const db = await mongodb.getDb();

        const filter = { doc_type: docType, doc: doc, profile: profile };

        let user = await db.collection(mongoCollections.USERS).findOne(filter);

        if (user) {
            if (user.password !== utils.passwordHash(oldPassword)) {
                logger.info('user ' + doc + '/' + docType + '/' + profile + ' old password not equals');

                return { success: false, error: errors.UPDATE_PASSWORD_INCORRECT_OLD_PASSWORD };
            }

            if (user.password === utils.passwordHash(newPassword)) {
                logger.info('user ' + doc + '/' + docType + '/' + profile + ' old password and new password are the same');

                return { success: false, error: errors.UPDATE_PASSWORD_NEW_PASSWORD_NOT_EQUALS_OLD_PASSWORD };
            }

            let event_history = {
                event: 'update_password',
                collection: mongoCollections.USERS,
                id: user._id,
                date: new Date()
            }

            await db.collection(mongoCollections.USERS).update(filter, {
                $set: {
                    updated_password: true,
                    password: utils.passwordHash(newPassword)
                }
            });

            logger.info('user ' + doc + '/' + docType + '/' + profile + ' success password update');

            await db.collection(mongoCollections.EVENT_HISTORY).insertOne(event_history);

            logger.info('success insert in event_history');

            return { success: true };

        } else {
            logger.info('user ' + doc + ', ' + docType + '/' + profile + ' user invalid');

            return { success: false, error: errors.INTERNAL_ERROR };
        }

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}

const recoverPassword = async(docType, doc) => {
    let user;
    try {
        const db = await mongodb.getDb();

        const filter = {
            doc_type: docType,
            doc: doc,
            $or: [{ profile: appConstants.PROFILE_REGISTER }, { profile: appConstants.PROFILE_NOTIFIER }]
        }

        user = await db.collection(mongoCollections.USERS).findOne(filter);

        if (user) {

            const newPassword = crypto.randomBytes(5).toString('hex');
            let name = `${user.name} ${user.lastname} ${user.second_lastname != undefined?user.second_lastname:''}`;
            await emailService.sendEmailNewPassword(name, user.email, newPassword);

            const _filter = { doc_type: docType, doc: doc, profile: user.profile }

            await db.collection(mongoCollections.USERS).update(filter, {
                $set: {
                    updated_password: false,
                    password: utils.passwordHash(newPassword)
                }
            });
            return { success: true };
        } else {
            return { success: false, error: { message: 'No se ha encontrado un usuario con el documento ingresado en el sistema. Por favor, verifique la información ingresada o póngase en contacto con el administrador.' } };
        }
    } catch (err) {
        logger.error(err);
        return { success: false , error: { message: 'El servicio no esta disponible, inténtelo de nuevo o más tarde'} }
    }

}

const getEmailCitizen = async(docType, doc) => {
    try {
        const db = await mongodb.getDb();

        let user = await db.collection(mongoCollections.USERS).findOne({
            doc_type: docType,
            doc: doc,
            profile: appConstants.PROFILE_CITIZEN
        });

        if (!user) {
            logger.error('user citizen ' + doc + '/' + docType + ' not exist');
            return { success: false, error: errors.ADDRESSEE_CITIZEN_NOT_EXIST };
        }

        return { success: true, email: user.email };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }

}

const getEmailCitizen2 = async (email) => {
    try {
      const db = await mongodb.getDb();
  
      let user = await db.collection(mongoCollections.USERS).findOne({
        email: email,
        profile: appConstants.PROFILE_CITIZEN
      });
  
      if (user != null) {
        logger.error('user email ' + email + ' exist');
        return { success: true, error: errors.ADDRESSEE_CITIZEN_NOT_EXIST };
      }
  
      return { success: false };
  
    } catch (err) {
      logger.error(err);
      return { success: false, error: errors.INTERNAL_ERROR };
    }
  
  }

const newUser = async(docType, dni, profile, name, lastname, email, usuarioRegistro) => {
    const db = await mongodb.getDb();

    const exists = await db.collection(mongoCollections.USERS).findOne({
        doc: dni
    });

    if (exists) {
        return { success: false, error: 'Ya existe un usuario registrado con el mismo número de documento' };
    }

    let usuario = {
        doc_type: docType,
        doc: dni,
        profile: profile,
        name: name,
        lastname: lastname,
        email: email,
        password: 'f4e98344541784f2eabcf6fcd1daf050afd9a1bfa2c59819356fe0543752f311',
        created_at: new Date(),
        updated_password: false,
        create_user: usuarioRegistro,
    };

    result = await db.collection(mongoCollections.USERS).insertOne(usuario);
    return { success: true };
}


const editUser = async(dni, name, lastname, email, usuarioRegistro) => {
    const db = await mongodb.getDb();
    const user = await db.collection(mongoCollections.USERS).findOne({
        doc: dni
    });

    if (!user) {
        return { success: false, error: 'Usuario no existe' };
    }

    result = await db.collection(mongoCollections.USERS).update({ doc: dni }, {
        $set: {
            name: name,
            lastname: lastname,
            email: email,
            update_user: usuarioRegistro,
            update_date: new Date(),
        }
    });
    return { success: true };
}


const deleteUser = async(docType, doc) => {
    try {
        const db = await mongodb.getDb();


        user_inboxes = await db.collection(mongoCollections.USER_INBOX).find({
            doc_type: docType,
            doc: doc,
        });


        await user_inboxes.forEach(async(element) => {
            await db.collection(mongoCollections.INBOX).deleteOne({
                _id: ObjectID(element.inbox_id)
            });
        });


        await db.collection(mongoCollections.USER_INBOX).deleteMany({
            doc_type: docType,
            doc: doc,
        });

        await db.collection(mongoCollections.USERS).deleteOne({
            doc_type: docType,
            doc: doc,
        });

        return { success: true };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }

}

const getUserCitizenById = async(id) => {
    try {
        const db = await mongodb.getDb();


        let user = await db.collection(mongoCollections.USERS).findOne({
            _id: ObjectID(id),
        });

        if (!user) {
            return { success: false };
        }

        let user_inbox = await db.collection(mongoCollections.USER_INBOX).findOne({
            doc_type: user.doc_type,
            doc: user.doc
        });

        let inbox = await db.collection(mongoCollections.INBOX).findOne({
            _id: ObjectID(user_inbox.inbox_id)
        });

        return {
            success: true,
            user: {
                doc: user.doc,
                doc_type: user.doc_type,
                name: user.name,
                lastname: user.lastname,
                second_lastname: user.second_lastname,
                organization_doc: user.organization_doc,
                organization_name: user.organization_name,
                email: user.email,
                cellphone: user.cellphone,
                phone: user.phone,
                addres: user.addres,
                accreditation: inbox.acreditation_type,
                attachments: inbox.attachments,
                address: user.address
            }
        };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }

}



const getImageDNI = async(pathPrincipal) => {
    const { path } = pathPrincipal;

    const path_upload = process.env.PATH_UPLOAD;

    const content = fs.readFileSync(path_upload + '/' + pathPrincipal);

    if (content) {
        return content;
    }else{
        return false;
    }


}


const getUserCitizenDetailById = async(id) => {
    try {
        const db = await mongodb.getDb();
        var tipoUser ="";
        let imgDNI= "";
        let represent = "";


        let user = await db.collection(mongoCollections.USERS).findOne({
            _id: ObjectID(id),
        });


        if (!user) {
            return { success: false };
        }

        let user_inbox = await db.collection(mongoCollections.USER_INBOX).findOne({
            doc_type: user.doc_type,
            doc: user.doc
        });


        let inbox = await db.collection(mongoCollections.INBOX).findOne({
            _id: ObjectID(user_inbox.inbox_id)
        });

        if(inbox.imageDNI){
            let FileDNI = inbox.imageDNI
            let path = FileDNI.path
            imgDNI = await getImageDNI(path);
        }

     


        if(user.doc_type === 'RUC'){
            tipoUser='J'
             represent = await db.collection(mongoCollections.REPRESENT).findOne({
                rucUser: user.doc
            });
            if (!represent) {
                return { success: false };
            }


        }else{
            tipoUser= 'n'
        }


        return {
            success: true,
            user: {
                doc: user.doc,
                doc_type: user.doc_type,
                type_user : tipoUser,
                name: user.name,
                lastname: user.lastname,
                second_lastname: user.second_lastname,
                organization_doc: user.organization_doc,
                organization_name: user.organization_name,
                email: user.email,
                cellphone: user.cellphone,
                phone: user.phone,
                addres: user.addres,
                accreditation: inbox.acreditation_type,
                attachments: inbox.attachments,
                imageDNI : imgDNI,
                address: user.address,
                representante : represent
            }
        };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }

}




const updateEstateInbox = async(iduser, estado, motivo= null) => {
    const db = await mongodb.getDb();
    let objectMotivo = {}; 
    const inbox = await db.collection(mongoCollections.INBOX).findOne({
        register_user_id: ObjectID(iduser),
    });

    if (!inbox) {
        return { success: false, error: 'No tiene casilla' };
    }

    if(motivo != null){
        objectMotivo = motivo;
    }

    result = await db.collection(mongoCollections.INBOX).update({ register_user_id: ObjectID(iduser) }, {
        $set: {
            estado: estado,
            motivo: objectMotivo,           
            update_date: new Date(),
        }
    });
    return { success: true };
}

module.exports = { 
    getUsersCitizen, 
    createUserCitizen, 
    getUserCitizen, 
    createUser, 
    updatePassword, 
    recoverPassword, 
    getEmailCitizen, 
    getEmailCitizen2,
    deleteUser, 
    newUser, 
    editUser, 
    getUsers, 
    getUserCitizenById,
    getLogClaridad ,
    getUserCitizenDetailById ,updateEstateInbox};