/**
 * Created by Angel Quispe
 */
const userService = require('./../services/userService');
const utils = require('./../common/utils');
const appConstants = require('./../common/appConstants');
const notificationService = require('./../services/notificationService');
const inboxService = require('./../services/inboxService');
const jwtService = require('./../services/jwtService');
const fs = require('fs');
require('./../services/colas/kitchen');
const placeOrder = require('./../services/colas/waiter');
const typeFiles = ["application/pdf", "image/jpg", "image/jpeg", "image/png", "image/bmp", "image/x-ms-bmp"];

const notifications = async (req, res, next) => {
    const {search, filter, page, count} = req.body;

    if (!page || !count) {
        return res.sendStatus(400);
    }

    if (!utils.validNumeric(page)
        || !utils.validNumeric(count)) {
        return res.sendStatus(400);
    }

    let response = {
        success: true,
        page: page,
        count: count,
    }

    let result = await notificationService.getNotificationsByArea(req.user.job_area_code, search, filter, page, count);

    if (!result.success) {
        return res.json({success: false, error: result.error});
    }

    response.recordsTotal = result.recordsTotal;
    response.Items = result.notifications;

    return res.json(response);

}

const notification = async (req, res, next) => {
    let {id} = req.body;

    if (utils.isEmpty(id)) {
        return res.sendStatus(400);
    }

    let result = await notificationService.getNotification(id, req.token);

    if (!result.success) {
        return res.json({success: false, error: result.error});
    }
    return res.json({success: true, notification: result.notification});

}

const personNotify = async (req, res, next) => {
    const {docType, doc} = req.body;

    if (utils.isEmpty(docType) || utils.isEmpty(doc)) {
        return res.sendStatus(400);
    }

    const result = await userService.getUserCitizen(docType, doc);

    if (!result.success) {
        return res.json({success: false, error: result.error});
    }

    let response = {
        success: true,
        person: result.user.names
    }

    return res.json(response);
}

const singNotification = async (req, res, next) => {
    let notification = req.fields;
    let files = req.files;
    let countFiles = Object.keys(files).length;

    if (utils.isEmpty(notification.docType)
        || utils.isEmpty(notification.doc)
        || utils.isEmpty(notification.name)
        || utils.isEmpty(notification.expedient)
        || utils.isEmpty(notification.message)
        || Object.keys(files).filter((x) => x.match(/^file[0-9]{1,3}$/g)).length == 0
        || countFiles == 0) {
        return res.status(400).json({success: false, error: "Datos no válidos"});
    }

    let [resultInbox, resultUser] = await Promise.all([
        inboxService.getApprovedInboxByDoc(notification.docType, notification.doc),
        userService.getUserCitizen(notification.docType, notification.doc)
    ]);

    if (!resultInbox.success || !resultUser.success) {
        return res.status(400).json({success: false, error: "Nro. de documento no registrado"});
    }

    let _files = [];
    let attachments = [];
    for (let i = 1; i <= countFiles; i++) {
        _files.push({index: i});
    }

    let isValid = true;
    let message = "";
    for await (file of _files) {
        if(files['file' + file.index].size == 0 || files['file' + file.index].size > appConstants.TAM_MAX_FILE) {
            isValid = false;
            message+= ((message.length> 0) ? ", " : "") + `El Archivo ${file.index} con tamaño no válido`;
            break;
        }
        if(!typeFiles.includes(files['file' + file.index].type)) {//if(files['file' + file.index].type != "application/pdf") {
            isValid = false;
            message+= ((message.length> 0) ? ", " : "") + `El Archivo ${file.index} sólo en formato PDF, JPEG, JPG, PNG o BMP`;
            break;
        }
        const signedFile = fs.readFileSync(files['file' + file.index].path);
        //let verified = (Buffer.isBuffer(signedFile) && signedFile.lastIndexOf("%PDF-") === 0 && signedFile.lastIndexOf("%%EOF") > -1);
        if(!validatebyteFile(files['file' + file.index].type, signedFile)) {
            isValid = false;
            message+= ((message.length> 0) ? ", " : "") + `El Archivo ${file.index} está dañado o no es válido`;
        }
    }

    if(!isValid) return res.status(400).json({success: false, error: message});

    let _timestamp = Date.now();
    for await (file of _files) {
        files['file' + file.index].path;
        file.file = await utils.copyFile(files['file' + file.index].path, appConstants.PATH_NOTIFICATION, files['file' + file.index].name, notification.doc, _timestamp, true, false);
        attachments.push(file.file);
    }

    const result = await notificationService.sendNotificationTmp(notification, attachments, resultInbox.inbox, resultUser.user, req.user);

    if (!result.success) {
        return res.json({success: false, error: result.error});
    }

    return res.json({success: true, param: result.param});
}

const validatebyteFile = (typeFile, signedFile) => {
    switch(typeFile) {
        case "application/pdf":
            return (Buffer.isBuffer(signedFile) && signedFile.lastIndexOf("%PDF-") === 0 && signedFile.lastIndexOf("%%EOF") > -1);
        case "image/jpg": 
        case "image/jpeg": 
            return (/^(ffd8ffe([0-9]|[a-f]){1}$)/g).test(signedFile.toString('hex').substring(0, 8));
        case "image/png":
            return signedFile.toString('hex').startsWith("89504e47");
        case "image/bmp":
        case "image/x-ms-bmp":
            return signedFile.toString('hex').startsWith("424d");
        default:
            return false;
    }
}

const sendNotification = async (req, res, next) => {
    let notification = req.fields;

    let files = req.files;

    if (utils.isEmpty(notification.docType)
        || utils.isEmpty(notification.doc)
        || utils.isEmpty(notification.name)
        || utils.isEmpty(notification.expedient)
        || utils.isEmpty(notification.message)) {
        return res.sendStatus(400);
    }

    let [resultInbox, resultUser] = await Promise.all([
        inboxService.getInbox(notification.docType, notification.doc),
        userService.getUserCitizen(notification.docType, notification.doc)
    ]);

    if (!resultInbox.success || !resultUser.success) {
        return res.sendStatus(400);
    }

    const result = await notificationService.sendNotification(notification, req.user);

    if (!result.success) {
        return res.json({success: false, error: result.error});
    }

    return res.json({success: true});
}

const downloadAttachment = async (req, res, next) => {
    const {token, notification, filename} = req.query;

    if (utils.isEmpty(token) || utils.isEmpty(notification) || utils.isEmpty(filename)) {
        res.setHeader(appConstants.ERROR_HANDLER, "Datos no válidos");
        return res.status(400).send({
            success: false, error: "Datos no válidos"
        });
    }

    const resultVerifyToken = await jwtService.verifyToken(token, appConstants.PROFILE_NOTIFIER);

    if (!resultVerifyToken) {
        res.setHeader(appConstants.ERROR_HANDLER, "Token no válido");
        return res.status(401).send({
            success: false, error: "Token no válido"
        });
    }

    const resultAttachment = await notificationService.downloadAttachment(notification, filename);
    if (!resultAttachment.success) {
        res.setHeader(appConstants.ERROR_HANDLER, resultAttachment.error);
        return res.status(404).send(resultAttachment);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
    res.download(resultAttachment.pathfile, filename, (err) => {
        if(err) {
            logger.error('No se pudo descargar el archivo: ' + err);
            res.setHeader(appConstants.ERROR_HANDLER, "No se pudo descargar el archivo");
            res.status(500).send({
                success: false, error: "No se pudo descargar el archivo"
            });
        }
    });
    return res;
}

const downloadAcuseNotified = async (req, res, next) => {
    const {token, notification} = req.query;

    if (utils.isEmpty(token) || utils.isEmpty(notification)) {
        return res.sendStatus(400);
    }

    const resultVerifyToken = await jwtService.verifyToken(token, appConstants.PROFILE_NOTIFIER);

    if (!resultVerifyToken) {
        return res.sendStatus(401);
    }

    const resultAcuse = await notificationService.downloadAcuseNotified(notification);

    if (!resultAcuse.success) {
        return res.json(resultAcuse);
    }

    const content = fs.readFileSync(resultAcuse.pathfile);
    console.log(resultAcuse);
    if (content) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + resultAcuse.filename);
        res.send(content);

        return res;
    }

    return res.sendStatus(400);

}

const saveAutomaticNotification = async (req, res, next) => {
    let notification = req.fields;
    let files = req.files;
    let [isValid, message] = validarCampos(notification, files);
    if(!isValid) {
        return res.status(400).send({success: false, message: message});
    }
    const result = await notificationService.automaticNotification(notification, files);

    let notificactionId=result.insert.insertedId;
    //Envía a cola la firma automatizada y el envío de correo
    if(result.success || result.sistema==='MPVE'){
        placeOrder.placeOrderMPVE(notificactionId)
        .then((job) => {
            console.log('\n Se creo la notificacion MPVE y ahora se inicia la firma automatizada \n ');
        })
        .catch(() => {
            console.log('\n Se creo la notificacion MPVE y No se pudo realizar la firma automatizada " \n ');
        });
    }
    
    if(!result.success){
        console.log("El ciudadano "+notification.doc+" tiene casilla DESAPROBADA");
    }
    if(!result.sistema==='MPVE'){
        console.log("La notificacion NO tiene el campo name como MPVE");
    }
         
    return res.status(!result ? 404 : 200).json(result);
}

function validarCampos(notification, files) {

    let countFiles = Object.keys(files).length;
    let countFields = Object.keys(notification).length;
    let isValid = true;
    let message = "";
    let maxFiles = appConstants.MAX_FILES_AUTOMATIC_NOTIFICATION;

    let validField = (utils.isEmpty(notification.docType)
                    || utils.isEmpty(notification.doc)
                    || utils.isEmpty(notification.name)
                    || Object.keys(files).filter((x) => x.match(/^file[0-9]{1,3}$/g)).length == 0
                    || countFiles == 0);

    if(validField) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Datos no válidos";
    }
    let docType_ = ["dni", "ce"];
    if(!docType_.includes(notification.docType)) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Tipo de documento no válido";
    }
    let doc_ = new String(notification.doc).toString();
    if(notification.docType == "dni" && doc_.length != 8) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Documento no válido";
    }
    if(notification.docType == "ce" && (doc_.length < 8 || doc_.length > 12)) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Documento no válido";
    }
    if(countFields < 3 || countFields > 5) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Número de campos no válido";
    }

    if(countFiles > maxFiles) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") +  `Máximo ${maxFiles} ${maxFiles ==  1 ? "archivo" : "archivos"}`;
    }
    let _files = [];
    for (let i = 1; i <= countFiles; i++) {
        _files.push({index: i});
    }

    for (file of _files) {
        if(files['file' + file.index] != undefined){
            if(files['file' + file.index].size == 0 || files['file' + file.index].size > appConstants.TAM_MAX_FILE) {
                isValid = false;
                message+= ((message.length> 0) ? ", " : "") + `Archivo ${'file' + file.index} con tamaño no válido`;
                break;
            }
            if(files['file' + file.index].type != "application/pdf") {
                isValid = false;
                message+= ((message.length> 0) ? ", " : "") + `Archivo ${'file' + file.index} sólo en formato PDF`;
                break;
            }
            const signedPdfBuffer = fs.readFileSync(files['file' + file.index].path);
            let verified = (Buffer.isBuffer(signedPdfBuffer) && signedPdfBuffer.lastIndexOf("%PDF-") === 0 && signedPdfBuffer.lastIndexOf("%%EOF") > -1);
            if(!verified) {
                isValid = false;
                message+= ((message.length> 0) ? ", " : "") + `Archivo ${'file' + file.index} está dañado o no es válido`;
                break;
            }
        }
    }

    return [isValid, message];
}

const singNotificationAutomatic = async (req, res, next) => {
    let notification = req.fields;

    if (utils.isEmpty(notification.id)) {
        return res.sendStatus(400);
    }

    const result = await notificationService.singNotificationAutomatic(notification.id, req.user);

    return res.json(result);
}

const sendNotificationAutomatic = async (req, res, next) => {
    let notification = req.fields;

    if (utils.isEmpty(notification.id)) {
        return res.sendStatus(400);
    }

    const result = await notificationService.sendNotificationAutomatic(notification.id, req.user);

    return res.json(result);
}

module.exports = {notifications, 
    notification, 
    personNotify, 
    singNotification, 
    sendNotification, 
    downloadAcuseNotified, 
    downloadAttachment, 
    saveAutomaticNotification, 
    singNotificationAutomatic,
    sendNotificationAutomatic,
    };
