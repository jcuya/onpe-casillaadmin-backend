/**
 * Created by Angel Quispe
 */

 const mongodb = require('./../database/mongodb');
 const logger = require('./../server/logger').logger;
 const errors = require('./../common/errors');
 const utils = require('./../common/utils');
 const appConstants = require('./../common/appConstants');
 const mongoCollections = require('./../common/mongoCollections');
 const invokerService = require('./../services/invokerService');
 const emailService = require('./../services/emailService');
 const userService = require('./../services/userService');
 const inboxService = require('./../services/inboxService');
 const ObjectId = require('mongodb').ObjectId;
 const acuseNotified = require('./../templates/acuse_notified');
 const acuseNotifiedAgente = require('./../templates/acuse_notified_agente');
 const { redisWriter, redisReader } = require('./../database/redis');
 const pdf = require('html-pdf');
 const fs = require('fs');
 const dateFormat = require('dateformat');
 const hashFiles = require('hash-files');
 const agentClient = require('./agentClient');
 //var phantomjs = require('phantomjs');
 const path_upload = process.env.PATH_UPLOAD;
 const path_upload_tmp = process.env.PATH_UPLOAD_TMP;
 const base_url = process.env.BASE_URL;
 
 const sendNotificationTmp = async(notification, attachments, inbox, user, notifierUser) => {
 
     let created_at_timestamp = Date.now();
     let created_at = new Date(created_at_timestamp);
     let created_at_pdf = created_at - 5 * 60 * 60 * 1000;
 
     let newNotification = {
         inbox_id: inbox._id,
         inbox_doc_type: notification.docType,
         inbox_doc: notification.doc,
         inbox_name: user.names,
         organization_doc: user.organization_doc,
         organization_name: user.organization_name,
         expedient: notification.expedient,
         message: notification.message,
         //tag
         attachments: attachments,
         notifier_user_id: notifierUser.id,
         notifier_area_code: notifierUser.job_area_code,
         notifier_area: notifierUser.job_area_name,
         sent_at: created_at,
         //received_at: created_at,
         acuse_type: 'pdf'
     }
 
     try {
         let paramsAcuseNotifier = {
             notifier_doc_type: notifierUser.docType.toUpperCase(),
             notifier_doc: notifierUser.doc,
             notifier_name: notifierUser.name + ' ' + notifierUser.lastname,
             notifier_area: notifierUser.job_area_name,
             inbox_doc_type: notification.docType.toUpperCase(),
             inbox_doc: notification.doc,
             inbox_name: user.names,
             organization_doc: user.organization_doc != null ? pad(user.organization_doc, 11) : "",
             organization_name: user.organization_name,
             expedient: notification.expedient,
             timestamp: dateFormat(new Date(created_at_pdf), "dd/mm/yyyy HH:MM:ss"),
             message_hash: utils.stringHash(notification.message),
             attachments_hashes: await getFilesHash(newNotification.attachments)
         }
 
         newNotification.acuse_data = paramsAcuseNotifier;
 
         let resultAcuseNotifier = await pdfAcuseNotifier(paramsAcuseNotifier);
 
         if (!resultAcuseNotifier.success) {
             return { success: false, error: errors.INTERNAL_ERROR };
         }
 
         let pdf = path_upload_tmp + "/"  + resultAcuseNotifier.filepdf;
         let pdf_firmado = path_upload + "/"  + resultAcuseNotifier.filepdf;
 
         let pdf_firmado_copia = pdf_firmado;
         let _pdf_firmado = pdf_firmado_copia.split('/');
         let new_pdf_firmado_copia= pdf_firmado_copia.replace(_pdf_firmado[_pdf_firmado.length - 1], '');
         fs.mkdirSync(new_pdf_firmado_copia,{recursive:true});
 
         await agentClient.agentClient(pdf,pdf_firmado);
 
         let dataRedis = { notification: newNotification, filepdf: resultAcuseNotifier.filepdf };
 
         await setNotificationRedis(notifierUser.docType, notifierUser.doc, notification.docType, notification.doc, dataRedis);
 
         let parameter = await invokerService.getParameters(notifierUser.docType, notifierUser.doc, notification.docType, notification.doc)
 
         return { success: true, param: parameter };
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 
 }
 
 function pad(num, size) {
     let s = "000000000" + num;
     return s.substr(s.length - size);
 }
 
 const getFilesHash = async(attachments) => {
     let filesHash = [];
 
     for await (const attachment of attachments) {
 
         let _fileHash = {
             name: attachment.name,
             hash: hashFiles.sync({ files: [path_upload_tmp + '/' + attachment.path], algorithm: 'sha256' }),
             hash_type: 'sha256'
         }
 
         filesHash.push(_fileHash);
 
     }
 
     return filesHash;
 }
 
 const pdfAcuseNotifier = async(params) => {

    let content_1 = await acuseNotifiedAgente.template(params);
    let content_2 = await acuseNotified.template(params);

     let path = utils.getPath(appConstants.PATH_NOTIFICATION);
     let codigo = generarCodigoValidacion();
     let filename = params.notifier_doc_type + '_' + params.notifier_doc + '_' + 
         params.inbox_doc_type + '_' + params.inbox_doc + '_' + codigo + '.pdf';
 
     fs.mkdirSync(path_upload_tmp + "/" + path, { recursive: true });
 
     let newPathFile = path_upload_tmp + "/" + path + filename;
 
     let options = { format: 'Letter', phantomPath: '/usr/local/bin/phantomjs' };
     //let options = { format: 'Letter', phantomjs };
     const notificadorAgente = process.env.NOTIFICADOR_AGENTE;
     if(params.notifier_doc===notificadorAgente){
        return new Promise(resolve => {
            pdf.create(content_1, options).toFile(newPathFile, function(err, res) {
                if (err) {
                    console.log(err);
                    return resolve({ success: false });
                } else {
                    return resolve({ success: true, filepdf: path + filename });
                }
            });
        })
     }else{
        return new Promise(resolve => {
            pdf.create(content_2, options).toFile(newPathFile, function(err, res) {
                if (err) {
                    console.log(err);
                    return resolve({ success: false });
                } else {
                    return resolve({ success: true, filepdf: path + filename });
                }
            });
        })
     }

 }
 
 const generarCodigoValidacion = () => {
     let cadena = "";
     let min = 0;
     let max = 99;
     for (let i=1; i<=6; i++){
         let numAleatorio = Math.floor(Math.random()*(max - min + 1) + min);
         cadena+=numAleatorio;
     }
     return cadena;
   }
 
 function diacriticSensitiveRegex(string = '') {
     return string.replace(/a/g, '[a,á,à,ä]')
         .replace(/e/g, '[e,é,ë]')
         .replace(/i/g, '[i,í,ï]')
         .replace(/o/g, '[o,ó,ö,ò]')
         .replace(/u/g, '[u,ü,ú,ù]');
 }
 
 const getNotificationsByArea = async(area_code, search, filter, page, count) => {
 
     let _filter = {
         //notifier_area_code: area_code,
         $or: [
             { expedient: new RegExp(diacriticSensitiveRegex(search), 'i') },
             { organization_name: new RegExp(diacriticSensitiveRegex(search), 'i') },
             { inbox_name: new RegExp(diacriticSensitiveRegex(search), 'i') },
             { inbox_doc: new RegExp(diacriticSensitiveRegex(search)) }
         ]
     }
 
     await switchFilter((filter ? parseInt(filter) : filter), _filter);
     //let resultFilter = await switchFilter((filter ? parseInt(filter) : filter));
 
     // if (resultFilter) {
     //     _filter.read_at = resultFilter;
     // }
     
     try {
         const db = await mongodb.getDb();
 
         let cursor = await db.collection(mongoCollections.NOTIFICATIONS).find(_filter).sort({ received_at: -1 }).skip(page > 0 ? ((page - 1) * count) : 0).limit(count);
 
         let recordsTotal = await cursor.count();
 
         let notifications = [];
 
         for await (const notification of cursor) {
             notifications.push({
                 id: notification._id,
                 expedient: notification.expedient,
                 inbox_doc: notification.inbox_doc,
                 inbox_doc_type: notification.inbox_doc_type,
                 inbox_name: notification.inbox_name,
                 organization_name: notification.organization_name,
                 received_at: notification.received_at,
                 read_at: notification.read_at,
                 automatic: notification.automatic != null ? notification.automatic : false 
             });
         }
 
         return { success: true, recordsTotal: recordsTotal, notifications: notifications };
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 }
 
 const switchFilter = async(option, _filter) => {
     switch (option) {
         case appConstants.FILTER_READ:
             return _filter.read_at = { $exists: true };
         case appConstants.FILTER_UNREAD:
             return _filter.read_at = { $exists: false };
         case appConstants.FILTER_NOTIFIED:
             return _filter.automatic = { $in: [false, null] };
         case appConstants.FILTER_NOT_NOTIFIED:
             return _filter.automatic = true;
         default:
             return null;
     }
 }
 
 const getNotifierAgente = async(dniAgente,profile) => {
     console.log('\n dniAgente: '+dniAgente+' \n ' );
     console.log('\n profile: '+profile+' \n ' );
     try {
         const db = await mongodb.getDb();
         const userNotifier = await db.collection(mongoCollections.USERS).findOne({
             doc: dniAgente,
             profile: profile
         });
 
         return {
             success: true,
             userNotifier: userNotifier,
         }    
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }	 
 }
 
 function sleep(ms) {
     return new Promise((resolve) => {
       setTimeout(resolve, ms);
     });
   }
 
 const getNotificationCredencialAgente = async(dniCandidato) => {
 
     console.log('\n getNotificationCredencialAgente - dniCandidato: '+dniCandidato+' \n ' );
 
     //await sleep(20000);
 
     try {
         const db = await mongodb.getDb();
 
         let notification = await db.collection(mongoCollections.NOTIFICATIONS).findOne({inbox_doc: dniCandidato});
         //console.log('\n getNotificationCredencialAgente - notification: '+notification.inbox_doc+' \n ' );
         if (!notification) {
             logger.error('notification ' + dniCandidato + ' not exist');
             return { success: false, error: errors.NOTIFICATION_NOT_VALID };
         }
 
         return {
             success: true,
             id: notification._id,
             notification: notification,
         }    
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 }
 
 const getNotification = async(id, jwt) => {
     try {
         const db = await mongodb.getDb();
 
         let filter = {
             _id: ObjectId(id)
         }
 
         let notification = await db.collection(mongoCollections.NOTIFICATIONS).findOne(filter);
 
         if (!notification) {
             logger.error('notification ' + id + ' not exist');
             return { success: false, error: errors.NOTIFICATION_NOT_VALID };
         }
         let automatic = notification.automatic != null ? notification.automatic : false;
         
         if(automatic) {
             return {
                 success: true,
                 notification: {
                     id: notification._id,
                     inbox_doc: notification.inbox_doc,
                     inbox_name: notification.inbox_name,
                     expedient: notification.expedient,
                     message: notification.message,
                     attachments: await getAttachments(id, notification.attachments, jwt),
                     created_at: notification.created_at,
                     automatic: automatic,
                 }
             }
         }
         else {
             return {
                 success: true,
                 notification: {
                     id: notification._id,
                     inbox_doc: notification.inbox_doc,
                     inbox_name: notification.inbox_name,
                     expedient: notification.expedient,
                     notifier_area: notification.notifier_area,
                     received_at: notification.received_at,
                     read_at: notification.read_at,
                     message: notification.message,
                     attachments: await getAttachments(id, notification.attachments, jwt),
                     //acuse: getAcuseNotifier(id, notification.acuse_notified, jwt),
                     automatic: automatic
                 }
             };
         }
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 }
 
 const getAttachments = async(idNotification, attachments, jwt) => {
     let result = []
 
     for await (const attachment of attachments) {
         result.push({
             name: attachment.name,
             url: encodeURI(base_url + '/download-file?token=' + jwt + '&notification=' + idNotification + '&filename=' + attachment.name),
             blocked: attachment.blocked,
         });
     }
     return result;
 }
 
 const getAcuseNotifier = (idNotification, acuse_notified, jwt) => {
     return {
         name: acuse_notified.name,
         url: encodeURI(base_url + '/download-acuse?token=' + jwt + '&notification=' + idNotification)
     }
 }
 
 const sendNotification = async(notification, user) => {
     let key = user.docType + '_' + user.doc + '_' + notification.docType + '_' + notification.doc;
 
     const resultNotificationRedis = await getNotificationRedis(key);
 
     logger.info(resultNotificationRedis);
     if (!resultNotificationRedis) {
         return { success: false };
     }
 
     let newNotification = resultNotificationRedis.notification;
 
     let _arrayFilePdf = resultNotificationRedis.filepdf.split('/');
 
     newNotification.received_at = new Date();
 
     newNotification.acuse_notified = {
         path: resultNotificationRedis.filepdf,
         name: _arrayFilePdf[_arrayFilePdf.length - 1]
     };
 
     try {
 
         if (!fs.existsSync(path_upload + '/' + resultNotificationRedis.filepdf)) {
             logger.error('not exist acuse in path_upload');
             return { success: false, error: errors.INTERNAL_ERROR };
 
         }
 
         if (newNotification.attachments.length > 0) {
             let _arrayAttachments = newNotification.attachments[0].path.split('/');
 
             let newPath = newNotification.attachments[0].path.replace(_arrayAttachments[_arrayAttachments.length - 1], '');
 
             fs.mkdirSync(path_upload + "/" + newPath, { recursive: true });
 
         }
 
         for await (let attachment of newNotification.attachments) {
             fs.copyFileSync(path_upload_tmp + '/' + attachment.path, path_upload + '/' + attachment.path);
         }
 
         const db = await mongodb.getDb();
 
         newNotification.inbox_id = ObjectId(newNotification.inbox_id);
 
         await db.collection(mongoCollections.NOTIFICATIONS).insertOne(newNotification);
 
         logger.info('success insert in notifications');
 
         const resultEmail = await userService.getEmailCitizen(newNotification.inbox_doc_type, newNotification.inbox_doc);
 
         if (resultEmail.success) {
             await emailService.sendEmailNewNotification(newNotification.inbox_name, resultEmail.email);
         }
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 
     return { success: true };
 }
 
 const automaticNotificationCredencialClaridad = async(notification_param, pathCredenciales, nameCredencial) => {
    let sistema = notification_param.name;
     let docType = notification_param.docType;
     let doc = notification_param.doc;
     let message = notification_param.message;
     let expedient = notification_param.expedient;
     
     let created_at_timestamp = Date.now();
     let created_at = new Date(created_at_timestamp);
     let notification = {};
     
     let resultUser = await userService.getUserCitizen(docType, doc);
     let inboxUser = await inboxService.getApprovedInboxByDoc(docType, doc);
 
     if (!resultUser.success || !inboxUser.success) {
         return { success: false, message: resultUser.error };
     }

     let attachments = [];

     try {
         const db = await mongodb.getDb();

         let nameFileCredencial=nameCredencial;
         let pathFileCredencial=pathCredenciales+'/' + nameCredencial;
         
         let fileCredencial = await utils.copyFile(pathFileCredencial, appConstants.PATH_NOTIFICATION, nameFileCredencial, notification.doc, created_at_timestamp, true, true);
         attachments.push(fileCredencial);        
 
         let user = resultUser.user;
         
         notification.expedient = `${expedient != null ? expedient : `Notificación automática - Credenciales del sistema ${sistema}`}`;
         notification.message = `${message != null ? message : `Descargue el archivo PDF adjunto, en el se indicará sus Credenciales de Acceso al Sistema ${sistema}.`}`;
 
         let newNotification = {
             inbox_id: ObjectId(inboxUser.inbox._id),
             inbox_doc_type: docType,
             inbox_doc: doc,
             inbox_name: user.names,
             organization_name: user.organization_name,
             expedient: notification.expedient,
             message: notification.message,
             attachments: attachments,
             created_at: created_at,
             received_at: created_at,
             automatic: true,
         }
 
         if(user.organization_doc != null) newNotification.organization_doc = user.organization_doc;
 
         const buscaNotificacion = await getNotificationCredencialAgente(doc);
         if(!buscaNotificacion.success){
            let insert = await db.collection(mongoCollections.NOTIFICATIONS).insertOne(newNotification);
            console.log("Se crea notificacion de de Casilla nueva y de Credencial de Claridad para el usuario: "+doc);
            return { success: true, message: "Notificación registrada", insert: insert, sistema: sistema };
         }

         return { success: false, message: "Ya existe una notificacion de Casilla nueva y de Credencial de Claridad" };
 
     } catch (err) {
         logger.error(err);
         return { success: false, message: errors.INTERNAL_ERROR };
     }
 }

 const automaticNotification = async(notification_param, files) => {
 
     let sistema = notification_param.name;
     let docType = notification_param.docType;
     let doc = notification_param.doc;
     let message = notification_param.message;
     let expedient = notification_param.expedient;
     
     let created_at_timestamp = Date.now();
     let created_at = new Date(created_at_timestamp);
     let countFiles = Object.keys(files).length;
     let notification = {};
     
     let resultUser = await userService.getUserCitizen(docType, doc);
     let inboxUser = await inboxService.getApprovedInboxByDoc(docType, doc);
 
     if (!resultUser.success || !inboxUser.success) {
         return { success: false, message: resultUser.error };
     }
 
     let _files = [];
     let attachments = [];
     for (let i = 1; i <= countFiles; i++) {
         _files.push({index: i});
     }
 
     try {
         const db = await mongodb.getDb();
         
         for await (file of _files) {
             if(files['file' + file.index] != undefined) {
                 files['file' + file.index].path;
                 file.file = await utils.copyFile(files['file' + file.index].path, appConstants.PATH_NOTIFICATION, files['file' + file.index].name, notification.doc, created_at_timestamp, true, true);
                 attachments.push(file.file);
             }
         }
 
         let user = resultUser.user;
         
         notification.expedient = `${expedient != null ? expedient : `Notificación automática - Credenciales del sistema ${sistema}`}`;
         notification.message = `${message != null ? message : `Descargue el archivo PDF adjunto, en el se indicará sus Credenciales de Acceso al Sistema ${sistema}.`}`;
 
         let newNotification = {
             inbox_id: ObjectId(inboxUser.inbox._id),
             inbox_doc_type: docType,
             inbox_doc: doc,
             inbox_name: user.names,
             organization_name: user.organization_name,
             expedient: notification.expedient,
             message: notification.message,
             attachments: attachments,
             created_at: created_at,
             received_at: created_at,
             automatic: true,
         }
 
         if(user.organization_doc != null) newNotification.organization_doc = user.organization_doc;
 
         let insert = await db.collection(mongoCollections.NOTIFICATIONS).insertOne(newNotification);
         return { success: true, message: "Notificación registrada", insert: insert, sistema: sistema };
 
     } catch (err) {
         logger.error(err);
         return { success: false, message: errors.INTERNAL_ERROR };
     }
 }
 
 const singNotificationAutomatic = async(id, notifierUser) => {
 
     let created_at_timestamp = Date.now();
     let created_at = new Date(created_at_timestamp);
     let created_at_pdf = created_at - 5 * 60 * 60 * 1000;
 
     try {
         const db = await mongodb.getDb();
 
         let filter = {
             _id: ObjectId(id)
         }
 
         let notification = await db.collection(mongoCollections.NOTIFICATIONS).findOne(filter);
 
         if (!notification) {
             logger.error('notification ' + id + ' not exist');
             return { success: false, error: errors.NOTIFICATION_NOT_VALID };
         }
 
         let updateNotification = {
             notifier_user_id: notifierUser.id,
             notifier_area_code: notifierUser.job_area_code,
             notifier_area: notifierUser.job_area_name,
             sent_at: created_at,
             received_at: created_at,
             acuse_type: 'pdf',
             automatic: false
         }
         
         let paramsAcuseNotifier = {
             notifier_doc_type: notifierUser.docType.toUpperCase(),
             notifier_doc: notifierUser.doc,
             notifier_name: notifierUser.name + ' ' + notifierUser.lastname,
             notifier_area: notifierUser.job_area_name,
             inbox_doc_type: notification.inbox_doc_type.toUpperCase(),
             inbox_doc: notification.inbox_doc,
             inbox_name: notification.inbox_name,
             organization_doc: notification.organization_doc != null ? pad(notification.organization_doc, 11) : "",
             organization_name: notification.organization_name,
             expedient: notification.expedient,
             timestamp: dateFormat(new Date(created_at_pdf), "dd/mm/yyyy HH:MM:ss"),
             message_hash: utils.stringHash(notification.message),
             attachments_hashes: await getFilesHash(notification.attachments)
         }
 
         updateNotification.acuse_data = paramsAcuseNotifier;
 
         let resultAcuseNotifier = await pdfAcuseNotifier(paramsAcuseNotifier);
 
         if (!resultAcuseNotifier.success) {
             return { success: false, error: errors.INTERNAL_ERROR };
         }
 
         let pdf = path_upload_tmp + "/"  + resultAcuseNotifier.filepdf;
         let pdf_firmado = path_upload + "/"  + resultAcuseNotifier.filepdf;
 
         let pdf_firmado_copia = pdf_firmado;
         let _pdf_firmado = pdf_firmado_copia.split('/');
         let new_pdf_firmado_copia= pdf_firmado_copia.replace(_pdf_firmado[_pdf_firmado.length - 1], '');
         fs.mkdirSync(new_pdf_firmado_copia,{recursive:true});
 
         await agentClient.agentClient(pdf,pdf_firmado);
 
         let dataRedis = { notification: updateNotification, filepdf: resultAcuseNotifier.filepdf };
 
         await setNotificationRedis(notifierUser.docType, notifierUser.doc, notification.inbox_doc_type, notification.inbox_doc, dataRedis);
 
         let parameter = await invokerService.getParameters(notifierUser.docType, notifierUser.doc, notification.inbox_doc_type, notification.inbox_doc)
 
         return { success: true, param: parameter };
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 }
 
 const sendNotificationAutomatic = async(id, user) => {
     try {
 
         const db = await mongodb.getDb();
 
         let filter = {
             _id: ObjectId(id)
         }
 
         let notification = await db.collection(mongoCollections.NOTIFICATIONS).findOne(filter);
 
         if (!notification) {
             logger.error('notification ' + id + ' not exist');
             return { success: false, error: errors.NOTIFICATION_NOT_VALID };
         }
 
         let key = user.docType + '_' + user.doc + '_' + notification.inbox_doc_type + '_' + notification.inbox_doc;
 
         const resultNotificationRedis = await getNotificationRedis(key);
 
         if (!resultNotificationRedis) {
             return { success: false };
         }
 
         let updateNotification = resultNotificationRedis.notification;
 
         let _arrayFilePdf = resultNotificationRedis.filepdf.split('/');
 
         updateNotification.received_at = new Date();
 
         updateNotification.acuse_notified = {
             path: resultNotificationRedis.filepdf,
             name: _arrayFilePdf[_arrayFilePdf.length - 1]
         };
 
         if (!fs.existsSync(path_upload + '/' + resultNotificationRedis.filepdf)) {
             logger.error('not exist acuse in path_upload');
             return { success: false, error: errors.INTERNAL_ERROR };
 
         }
 
         if (notification.attachments.length > 0) {
             let _arrayAttachments = notification.attachments[0].path.split('/');
 
             let newPath = notification.attachments[0].path.replace(_arrayAttachments[_arrayAttachments.length - 1], '');
 
             fs.mkdirSync(path_upload + "/" + newPath, { recursive: true });
 
         }
 
         for await (let attachment of notification.attachments) {
             fs.copyFileSync(path_upload_tmp + '/' + attachment.path, path_upload + '/' + attachment.path);
         }
 
         await db.collection(mongoCollections.NOTIFICATIONS).update(filter, {$set: updateNotification});
 
         const resultEmail = await userService.getEmailCitizen(notification.inbox_doc_type, notification.inbox_doc);
 
         if (resultEmail.success) {
             await emailService.sendEmailNewNotification(notification.inbox_name, resultEmail.email);
         }
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 
     return { success: true };
 }
 
 const downloadAttachment = async(idNotification, filename) => {
     try {
         const db = await mongodb.getDb();
 
         let filter = {
             _id: ObjectId(idNotification)
         }
 
         let notification = await db.collection(mongoCollections.NOTIFICATIONS).findOne(filter);
 
         if (!notification) {
             logger.error('notification ' + idNotification + ' not exist');
             return { success: false, error: errors.NOTIFICATION_NOT_VALID };
         }
 
         let i = 0;
         let result = { };
 
         for await (const attachment of notification.attachments) {
             if (attachment.name === filename) {
                 if (attachment.blocked != null) {
                     if(attachment.blocked) {
                         result.success = false;
                         result.error = "Archivo bloqueado para el notificador";
                     } else {
                         result = validateFile(attachment);
                     }
                 } else {
                     result = validateFile(attachment);
                 }
                 break;
             } else {
                 i++;
             }
         }
 
         if(i == notification.attachments.length) {
             result.success = false;
             result.error = "Archivo no encontrado";
         }
         return result;
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 }
 
 function validateFile(attachment) {
     let result = {};
     if (fs.existsSync(path_upload + '/' + attachment.path)) {
         result.success = true;
         result.pathfile = path_upload + '/' + attachment.path;
     } else {
         logger.error('attachment ' + path_upload + '/' + attachment.path + ' not exist');
         result.success = false;
         result.error = "Archivo no encontrado";
     }
     return result;
 }
 
 const downloadAcuseNotified = async(idNotification) => {
     try {
         const db = await mongodb.getDb();
 
         let filter = {
             _id: ObjectId(idNotification)
         }
 
         let notification = await db.collection(mongoCollections.NOTIFICATIONS).findOne(filter);
 
         if (!notification) {
             logger.error('notification ' + idNotification + ' not exist');
             return { success: false };
         }
 
         let result = { success: false };
 
         if (fs.existsSync(path_upload + '/' + notification.acuse_notified.path)) {
             result.success = true;
             result.pathfile = path_upload + '/' + notification.acuse_notified.path;
             result.filename = notification.acuse_notified.name;
         } else {
             logger.error('acuse notified: ' + path_upload + '/' + notification.acuse_notified.path + ' not exist');
         }
 
         return result;
 
     } catch (err) {
         logger.error(err);
         return { success: false, error: errors.INTERNAL_ERROR };
     }
 }
 
 const setNotificationRedis = async(notifier_doc_type, notifier_doc, addressee_doc_type, addressee_doc, data) => {
     const key = notifier_doc_type + "_" + notifier_doc + "_" + addressee_doc_type + "_" + addressee_doc;
     const result = await redisWriter.set(key, JSON.stringify(data));
     return result !== null;
 }
 
 const getNotificationRedis = async(key) => {
     return JSON.parse(await redisReader.get(key));
 }
 
 const firmaConAgenteAutomatizado = async(job) => {
 
    let box = job.data;
    let dni_ciudadano= box.box_doc;
    userService.searchCLARIDAD(box.box_doc, box.box_doc_type, true);

    const pathCredenciales = process.env.PATH_CREDENCIALES_CLARIDAD;
    const nameCredencial = 'Credenciales_CLARIDAD_'+dni_ciudadano+'.pdf';
    const pathCompleto =  pathCredenciales + '/' + nameCredencial;
    if(fs.existsSync(pathCompleto)){
        console.log(dni_ciudadano + ' si es candidato.');

        let notification_param = {
            name: 'CLARIDAD',
            doc: dni_ciudadano,
            docType: 'dni',
        }
        
        let res = await automaticNotificationCredencialClaridad(notification_param, pathCredenciales, nameCredencial);
        if(res.success){

            let notificactionId = res.insert.insertedId;

            //Datos del notificador de Agente Automatizado
            const notifierUserDNI= process.env.NOTIFICADOR_AGENTE;
            const profile='notifier';
            const notifierAgente = await getNotifierAgente(notifierUserDNI,profile);
            if(!notifierAgente.success){
                console.log('\n No existe Notificador Agente \n ');
            }  
            let notifierUser=notifierAgente.userNotifier;
            notifierUser.docType=notifierUser.doc_type;
    
            const result2 = await singNotificationAutomatic(notificactionId, notifierUser);
            if (result2.success) {
                const parameter = result2.param;
                if (parameter.length > 0) {
                    const result3 = await sendNotificationAutomatic(notificactionId, notifierUser);
                    if(!result3){
                        console.log('Notificacion incompleta de: '+dni_ciudadano);
                    }
                }else{
                    console.log('No se envió notificación de: '+dni_ciudadano);
                }    
            } else {
                console.log('No se realizó la firma de Agente Automatizado de: '+dni_ciudadano);
            } 
        }else{
            console.log('No pudo crearse la notificacion de credencial de '+dni_ciudadano);
        }     
    }else{
        console.log(dni_ciudadano + ' no es candidato.');
    }
 }
 
 const firmaConAgenteAutomatizadoCiudadano = async(job) => {
 
    //sleep(1000);

    let datosFirma = job.data;
 
    //let iduser= datosFirma.iduser;
    let pendingInbox= datosFirma.pendingInbox;
    let dni_ciudadano= pendingInbox.doc;

    userService.searchCLARIDAD(pendingInbox.doc, pendingInbox.doc_type, true);

    //automaticNotificationCredencialClaridad
    const pathCredenciales = process.env.PATH_CREDENCIALES_CLARIDAD;
    const nameCredencial = 'Credenciales_CLARIDAD_'+dni_ciudadano+'.pdf';
    const pathCompleto =  pathCredenciales + '/' + nameCredencial;
    if(fs.existsSync(pathCompleto)){
        console.log(dni_ciudadano + ' si es candidato.');

        let notification_param = {
            name: 'CLARIDAD',
            doc: dni_ciudadano,
            docType: 'dni',
        }

        let res = await automaticNotificationCredencialClaridad(notification_param, pathCredenciales, nameCredencial);
        if(res.success){

            let notificactionId = res.insert.insertedId;

            //Datos del notificador de Agente Automatizado
            const notifierUserDNI= process.env.NOTIFICADOR_AGENTE;
            const profile='notifier';
            const notifierAgente = await getNotifierAgente(notifierUserDNI,profile);
            if(!notifierAgente.success){
                console.log('\n No existe Notificador Agente \n ');
            }  
            let notifierUser=notifierAgente.userNotifier;
            notifierUser.docType=notifierUser.doc_type;
      
            //Se usa las credenciales de Notificador de Agente Automatizado
            const result2 = await singNotificationAutomatic(notificactionId, notifierUser);
            if (result2.success) {
                const parameter = result2.param;
                if (parameter.length > 0) {
                    const result3 = await sendNotificationAutomatic(notificactionId, notifierUser);
                    if(!result3){
                        console.log('Notificacion incompleta de: '+dni_ciudadano);
                    }
                }else{
                    console.log('No se envió notificación de: '+dni_ciudadano);
                }    
            } else {
                console.log('No se realizó la firma de Agente Automatizado de: '+dni_ciudadano);
            } 

        }else{
            console.log('No pudo crearse la notificacion de credencial de '+dni_ciudadano);
        }     
    }else{
        console.log(dni_ciudadano + ' no es candidato.');
    }
 }

 const firmaConAgenteAutomatizadoMPVE = async(job) => {
 
    let notificactionId = job.data;

    let filter = {
        _id: ObjectId(notificactionId)
    }
    //Datos del notificador de Agente Automatizado
    const notifierUserDNI= process.env.NOTIFICADOR_AGENTE;
    const profile='notifier';
    const notifierAgente = await getNotifierAgente(notifierUserDNI,profile);
    if(!notifierAgente.success){
        console.log('\n No existe Notificador Agente \n ');
    }
    let notifierUser=notifierAgente.userNotifier;
    notifierUser.docType=notifierUser.doc_type;

    try {
        const db = await mongodb.getDb();

        let notification = await db.collection(mongoCollections.NOTIFICATIONS).findOne(filter);

        if (!notification) {
            logger.error('notification ' + inbox_doc + ' de MPVE not exist');
        }else{
            //Se usa las credenciales de Notificador de Agente Automatizado
            const result2 = await singNotificationAutomatic(notification._id, notifierUser);
            if (result2.success) {
                const parameter = result2.param;
                if (parameter.length > 0) {
                    console.log('\n Se realiza la firma automatizada MPVE correctamente\n ');
                    const result3 = await sendNotificationAutomatic(notification._id, notifierUser);
                    if(!result3){
                        console.log('Notificacion incompleta');
                    }
                }else{
                    //No se puede enviar notificación
                    console.log('No se envio notificación MPVE');
                }    
                console.log('Se realiza el envio de correo  MPVE correctamente');
            } else {
                //No se puede firmar
                console.log('No se realizo la firma de Agente Automatizado de MPVE');
            } 

        }
        
    } catch (err) {
        logger.error(err);
    }
}
 module.exports = {
     sendNotificationTmp,
     getNotificationsByArea,
     getNotification,
     pdfAcuseNotifier,
     sendNotification,
     downloadAttachment,
     downloadAcuseNotified,
     getNotificationRedis,
     getFilesHash,
     automaticNotification,
     singNotificationAutomatic,
     sendNotificationAutomatic,
     getNotificationCredencialAgente,
     getNotifierAgente, 
     firmaConAgenteAutomatizado,
     firmaConAgenteAutomatizadoCiudadano,
     firmaConAgenteAutomatizadoMPVE,
     automaticNotificationCredencialClaridad,
 };