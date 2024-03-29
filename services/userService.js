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
const {redisWriter, redisReader} = require('./../database/redis');
//const mkdirp = require("mkdirp");

const takenInboxTtl = 5 * 60;

const getUsersCitizen = async(search, page, count, estado, fechaInicio, fechaFin, ordenFec) => {
    try {
        const db = await mongodb.getDb();
        let _filter = {
            $or: [
                {email: new RegExp(diacriticSensitiveRegex(search), 'i')},
                {doc: new RegExp(diacriticSensitiveRegex(search))}]
        }
        if(estado != '' && estado != 'REGISTRO INTERNO'){
            _filter.status = estado;
        }
        if(estado == 'REGISTRO INTERNO'){
            _filter.status = null;
        }

        if (isNaN(fechaInicio) && !isNaN(Date.parse(fechaInicio))) {
            let fechaInicial = new Date(fechaInicio);
            fechaInicial.setTime(fechaInicial.getTime() + (5*60*60*1000));

            _filter.created_at = { $gt : fechaInicial };
        }
        if (isNaN(fechaFin) && !isNaN(Date.parse(fechaFin))) {
            let fechaFinal = new Date(fechaFin);
            fechaFinal.setDate(fechaFinal.getDate() + 1);
            fechaFinal.setTime(fechaFinal.getTime() + (5*60*60*1000));

            if(_filter.created_at){
                _filter.created_at.$lt = fechaFinal;
            }else{
                _filter.created_at = { $lt : fechaFinal };
            }
        }

        let cursor = await db.collection(mongoCollections.INBOX)
            .find(_filter)
            .sort({created_at: (ordenFec == undefined || ordenFec == 'asc' ? 1 : -1)})
            .skip(page > 0 ? ((page - 1) * count) : 0)
            .limit(count);

        let inbox_id_list = [];
        let inbox_str_id_list = [];
        let inboxes = {};
        let inboxes_bydoc = {};
        for await (const inbox of cursor) {
            inbox_id_list.push(inbox._id);
            inbox_str_id_list.push(inbox._id.toString());
            inboxes[inbox._id] = inbox;
            inboxes_bydoc[inbox.doc_type+":"+inbox.doc] = inbox._id; //por si se tratan de registros antiguos
        }

        let recordsTotal = await cursor.count();

        let user_inbox_array = await db.collection(mongoCollections.USER_INBOX)
            .find({ $or: [{ inbox_id: {$in: inbox_id_list} }, { inbox_id: {$in: inbox_str_id_list} }]})
            .toArray();

        let user_id_list = [];
        let user_inboxes = {};
        let user_inboxes_doc_test = {};
        for (const user_inbox of user_inbox_array) {
            if (user_inbox.user_id != null) {
                user_id_list.push(ObjectID(user_inbox.user_id.toString()));
                if(user_inbox.inbox_id != null && inboxes[user_inbox.inbox_id.toString()] != null){
                    user_inboxes[user_inbox.inbox_id.toString()] = user_inbox.user_id.toString();
                    user_inboxes_doc_test[user_inbox.doc_type+":"+user_inbox.doc] = true;
                }
            }
        }

        let users_by_id = (await db.collection(mongoCollections.USERS)
            .find({profile: appConstants.PROFILE_CITIZEN, _id: {$in: user_id_list}})
            .toArray())
            .reduce((acc, user) => {
                return {...acc, [user._id.toString()]: user}
            }, {});

        let users_by_doc = {};
        if(Object.values(users_by_id).length < inbox_id_list.length){  //usuarios que no tienen ids en la tabla user_inbox
            let doc_faltantes = Object.keys(inboxes_bydoc)
                .filter(doc_key => !Object.keys(user_inboxes_doc_test).includes(doc_key))
                .map(doc_key => inboxes[inboxes_bydoc[doc_key]])
                .map(inbox => {return {'doc_type': inbox.doc_type, 'doc': inbox.doc}});

            users_by_doc = (await db.collection(mongoCollections.USERS)
                .find({ profile: appConstants.PROFILE_CITIZEN, $or: doc_faltantes })
                .toArray())
                .reduce((acc, user) => {
                    return {...acc, [user.doc_type + ':' + user.doc]: user}
                }, {});
        }


        let users = [];

        for await (const inbox of Object.values(inboxes)) {
            let user = users_by_id[user_inboxes[inbox._id.toString()]];
            if(user == undefined){
                user = users_by_doc[inbox.doc_type+':'+inbox.doc];
            }
            if(user == undefined){
                continue;
            }
            var name;
            if(user.doc_type === 'RUC'){
                name = `${user.name}`;
            }else{
                name = `${user.name} ${user.lastname} ${user.second_lastname != undefined?user.second_lastname:''}`;
            }

            if(inbox.status == null){
                inbox.status = "";
            }

            let isTaken = (await validarEnAtencion(inbox._id.toString())) != null;

            users.push({ id: user._id, inbox_id: inbox._id, name: name, doc_type: user.doc_type, doc: user.doc, organization: user.organization_name, createdAt: inbox.created_at, updateddAt: inbox.update_date, createUser: user.create_user, estate_inbox : inbox.status, enAtencion: isTaken });
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
        doc_type: box.box_doc_type,
        doc: box.box_doc,
        email: box.box_email,
        cellphone: box.user_cellphone,
        phone: box.user_phone,
        address: box.box_address,
        acreditation_type: box.box_acreditation_type,
        attachments: attachments,
        register_user_id: idUser,
        created_at: created_at,
        create_user: usuarioRegistro,
    };

    const password = crypto.randomBytes(5).toString('hex');

    let uName = box.user_name.toUpperCase();
    let uLastname = box.user_lastname != null ? box.user_lastname.toUpperCase() : null;
    let uSecondLastname = box.user_second_lastname != null ? box.user_second_lastname.toUpperCase() : null;

    let newUser = {
        doc_type: box.user_doc_type,
        doc: box.user_doc,
        profile: appConstants.PROFILE_CITIZEN,
        password: utils.passwordHash(password),
        name: uName,
        lastname: uLastname,
        second_lastname: uSecondLastname,
        email: box.user_email,
        cellphone: box.user_cellphone,
        phone: box.user_phone,
        address: box.user_address,
        //organization_doc: candidate.organization_doc,
        organization_name: box.box_organization_name,
        register_user_id: idUser,
        created_at: created_at,
        updated_password: false,
        create_user: usuarioRegistro,
        Ubigeo : box.ubigeo 
    };

    let newUserInbox = {
        nroExpediente : box.user_nroExpediente,
        doc: box.box_doc,
        doc_type: box.box_doc_type,
        profile: appConstants.USER_INBOX_PROFILE_OWNER
    }

    try {
        const db = await mongodb.getDb();

        let _newInbox = await db.collection(mongoCollections.INBOX).insertOne(newInbox);
        logger.info('success insert in inbox');

        let _newUser = await db.collection(mongoCollections.USERS).insertOne(newUser);
        logger.info('success insert in users');

        newUserInbox.user_id = _newUser.insertedId;
        newUserInbox.inbox_id = _newInbox.insertedId;

        await db.collection(mongoCollections.USER_INBOX).insertOne(newUserInbox);
        logger.info('success insert in user_inbox');

        let name = `${uName} ${uLastname != null ? uLastname : ''} ${uSecondLastname != null ? uSecondLastname : ''}`;
        //let name = `${box.name} ${box.lastname} ${box.second_lastname != undefined?box.second_lastname:''}`;
        await emailService.sendEmailNewUserCitizen(name, newUser.email, password, box.box_doc);

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
        result.esCandidato = response.data.success;
        result.respuestaClaveGenerada = response.data.data.clave;
        result.statusCode = response.statusCode;
    } catch (error) {       
        let err = error.toJSON();
        //logger.error("Error Status Claridad: "+err.status + " - DNI: "+dniCandidato);
        //if(err.status != 404) await saveDoc(dniCandidato, tipoDoc);
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
    const ESTADO_APROBADO = 'APROBADO';
    try {
        const db = await mongodb.getDb();

        let inbox = await db.collection(mongoCollections.INBOX).findOne({
            doc_type: docType,
            doc: doc,
            $or: [{ status: ESTADO_APROBADO }, { status: null }],
        });

        let user = await db.collection(mongoCollections.USERS).findOne({
            doc_type: docType,
            doc: doc,
            profile: appConstants.PROFILE_CITIZEN,
            $or: [{ status: ESTADO_APROBADO }, { status: null }],
        });

        if (!inbox || !user) {
            logger.error('approved user citizen ' + doc + '/' + docType + ' not exist');
            return { success: false, error: errors.ADDRESSEE_CITIZEN_NOT_EXIST };
        }

        return {
            success: true,
            message: "Tiene casilla electrónica",
            user: {
                names: user.name + ' ' + user.lastname + (user.second_lastname != undefined ? ' ' + user.second_lastname : ''),
                name: user.name,
                lastname: user.lastname,
                second_lastname: user.second_lastname != undefined ? user.second_lastname : '',
                organization_doc: user.organization_doc,
                organization_name: user.organization_name
            }
        };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}

const getUserCasilla = async(docType, doc) => {
    try {
        const db = await mongodb.getDb();

        let user = await db.collection(mongoCollections.USERS).findOne({
            doc_type: docType,
            doc: doc,
            profile: appConstants.PROFILE_CITIZEN,
            $or: [
                {
                  'status': {
                    '$eq': 'APROBADO'
                  }
                }, {
                  'status': {
                    '$exists': false
                  }
                }
              ]  
        });

        if (!user) {
            logger.error('inbox validation: user citizen ' + doc + '/' + docType + ' not exist');
            return { success: false, error: errors.CITIZEN_NOT_EXIST.message };
        }

        return {
            success: true,
            message: "Tiene casilla electrónica",
            user: {
                email: user.email,
                cellphone: user.cellphone,
                address: user.address != undefined ? user.address : 'No registrado',
                ubigeo: user.Ubigeo != undefined ? user.Ubigeo : 'No tiene ubigeo',
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
            logger.error('getting citizen email: user citizen ' + doc + '/' + docType + ' not exist');
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
                $or: [{ _id: ObjectID(element.inbox_id) }, { _id: element.inbox_id }]
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
            $or: [{ user_id: id }, { user_id: ObjectID(id) }]
        });

        if (!user_inbox) {
            user_inbox = await db.collection(mongoCollections.USER_INBOX).findOne({
                doc_type: user.doc_type,
                doc: user.doc
            });
        }

        let inbox = await db.collection(mongoCollections.INBOX).findOne({
            $or: [{ _id: user_inbox.inbox_id }, { _id: user_inbox.inbox_id.toString() }]
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

const existCE = async (doc, docType) => {
    const db = await mongodb.getDb();
  
    const exist = await db.collection(mongoCollections.USERS).findOne({
      doc_type: docType,
      doc: doc
    });
  
    const exist_2 = await db.collection(mongoCollections.USERS).findOne({
      rep_doc_type: docType,
      rep_doc: doc
    });
  
    return exist != null ? exist : exist_2;
}


const getImageDNI = async(pathPrincipal) => {
    //const { path } = pathPrincipal;
    const path_upload = process.env.PATH_UPLOAD;
    const pathFinal = path_upload + '/' + pathPrincipal;
    try{
        console.log("\nEl pathFinal de la imagen: \n", pathFinal, "\n=========================== \n");
        const content = fs.readFileSync(pathFinal);
        return content;
    } catch (err) {
        logger.error(err);
        return { success: false, error: "No se puede leer la imagen" }; //return { success: false, error: errors.INTERNAL_ERROR };
    }
}


const getUserCitizenDetailById = async(id, token, atender) => {
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
        
     //console.log("Datos de usuario xxxx", user);
        let user_inbox = await db.collection(mongoCollections.USER_INBOX).findOne({
            $or: [{ user_id: id }, { user_id: ObjectID(id) }]
        });

        if (!user_inbox) {
            user_inbox = await db.collection(mongoCollections.USER_INBOX).findOne({
                doc_type: user.doc_type,
                doc: user.doc
            });
        }

        //console.log("Datos de user_inbox xxxx", user_inbox);

        let inbox = await db.collection(mongoCollections.INBOX).findOne({
            _id: ObjectID(user_inbox.inbox_id.toString())
        });

        //console.log("Datos de inbox xxxx", inbox);

        if(inbox.imageDNI){
            let FileDNI = inbox.imageDNI
            let path = FileDNI.path
            imgDNI = await getImageDNI(path);
            // console.log("Imagen DNI", imgDNI)
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

        let estadoAtencion = {enAtencion: false};
        if(atender != undefined && atender == "true"){
            estadoAtencion = await procesarEnAtencion(inbox._id.toString(), token);
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
                ubigeo : user.Ubigeo,
                paginaweb : user.PaginaWeb,
                cellphone: user.cellphone,
                phone: user.phone,
                addres: user.addres,
                accreditation: inbox.acreditation_type,
                attachments: inbox.attachments,
                imageDNI : imgDNI,
                address: user.address,
                representante : represent,
                enAtencion: estadoAtencion.taken,
                enAtencionPor: (estadoAtencion.takenBy != null ? estadoAtencion.takenBy.name : '')
            }
        };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }

}

const procesarEnAtencion = async (inbox_id, token) => {

    let key = "INBOX_ID:" + inbox_id;
    let takenInbox = await validarEnAtencion(inbox_id);
    let session = JSON.parse(await redisReader.get(token));

    if (takenInbox != null) {
        if(takenInbox.takenBy.user_id == session.user_id){
            return {taken: false, takenBy: null};
        }
        return {taken: true, takenBy: takenInbox.takenBy};
    }
    takenInbox = {takenBy: {user_id: session.user_id, name: session.name + " " + session.lastname}};
    await redisWriter.set(key, JSON.stringify(takenInbox), 'EX', takenInboxTtl);
    logger.info(takenInbox);

    return {taken: false, takenBy: null};
}

const validarEnAtencion = async (inbox_id) => {
    let key = "INBOX_ID:" + inbox_id;
    let data = await redisReader.get(key);
    return JSON.parse(data);
}


const obtieneDNICiudadano= async(iduser) => {
    const db = await mongodb.getDb();									 
    const datosCiudadano = await db.collection(mongoCollections.INBOX).findOne({
        register_user_id: iduser + "",	  
    });

    return { success: true, datosCiudadano: datosCiudadano};
}

const updateEstateInbox = async(iduser, estado, motivo= null,name , email) => {
    console.log("datooooooooooooooooooooos update sttate inbox", "  --- " , iduser, "  --- " , estado, "  --- " , name , "  --- " , email);
    const db = await mongodb.getDb();
    let objectMotivo = {}; 
    const pendingInbox = await db.collection(mongoCollections.INBOX).findOne({
        register_user_id: iduser + "",
			  
    });

    if (!pendingInbox) {
        return { success: false, error: 'No tiene casilla' };
    }

    if (pendingInbox.status != 'PENDIENTE') {
        return {success: false, error: 'La solicitud registro de casilla ya fue atendida'};
    }

    if(estado == 'APROBADO'){
        let inbox_by_email = await db.collection(mongoCollections.INBOX).findOne({
            email: pendingInbox.email,
            $or: [{ status: 'APROBADO' }, { status: null }],
        });

        if (inbox_by_email != null) {
            return { success: false, error: 'Ya existe una casilla electrónica aprobada con el correo ingresado' };
        }

        let inbox_by_doc = await db.collection(mongoCollections.INBOX).findOne({
            doc: pendingInbox.doc,
            doc_type: pendingInbox.doc_type,
            $or: [{ status: 'APROBADO' }, { status: null }],
        });

        if (inbox_by_doc != null) {
            return { success: false, error: 'Ya existe una casilla electrónica aprobada con el documento ingresado' };
        }
    }

    if(motivo != null){
        objectMotivo = motivo;
    }

    result = await db.collection(mongoCollections.INBOX).update({ register_user_id: iduser }, {
        $set: {
            status: estado,
            motivo: objectMotivo,           
            update_date: new Date(),
        }
    });

    let password = '';
    let userDoc='';
    let user = await db.collection(mongoCollections.USERS).findOne({
        _id: ObjectID(iduser),
    });
    let dataUserUpdate = {status: estado};

    if (estado === "APROBADO") {
        password = crypto.randomBytes(5).toString('hex');
        userDoc = user.doc;
        dataUserUpdate.password = utils.passwordHash(password);
    }

    let resultUser = await db.collection(mongoCollections.USERS).update({ _id: user._id }, {
        $set: dataUserUpdate
    });

    let names = `${user.name} ${user.lastname != null ? user.lastname : ''} ${user.second_lastname != null ? user.second_lastname : ''}`;
    if(result){
        console.log("Aprobacion de la casilla para el ciudadano: " + name + " - iduser: " + iduser + " - DNI: " + pendingInbox.doc);
        respuestaEmail = await emailService.sendEmailEstateInbox(names , email, estado, password, userDoc, objectMotivo);
        /*if (estado === "APROBADO") {
            await searchCLARIDAD(pendingInbox.doc, pendingInbox.doc_type, true);
        }*/
    }

    return { success: true, aprobado: estado, pendingInbox: pendingInbox };
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
    getLogClaridad,
    getUserCasilla,
    existCE, getUserCitizenDetailById ,updateEstateInbox, obtieneDNICiudadano, searchCLARIDAD};
