/**
 * Created by Angel Quispe
 */
const utils = require('./../common/utils');
const userService = require('./../services/userService');
const candidateService = require('./../services/candidateService');
const inboxService = require('./../services/inboxService');
const emailService = require('./../services/emailService');
const jwtService = require('./../services/jwtService');
const appConstants = require('./../common/appConstants');
const errors = require('./../common/errors');
const fs = require('fs');
const request = require('request-promise');
const logger = require('./../server/logger').logger;
const notificationService = require('./../services/notificationService');

require('./../services/colas/kitchen');
const placeOrder = require('./../services/colas/waiter');

const typeFiles = ["application/pdf", "image/jpg", "image/jpeg", "image/png", "image/bmp", "image/x-ms-bmp"];

const users = async(req, res, next) => {
    const { search, page, count, estado, fechaInicio, fechaFin, ordenFec } = req.body;

    if (!page || !count) {
        return res.sendStatus(400);
    }

    if (!utils.validNumeric(page) ||
        !utils.validNumeric(count)) {
        return res.sendStatus(400);
    }

    let result = await userService.getUsersCitizen(search, page, count, estado, fechaInicio, fechaFin, ordenFec);

    if (!result.success) {
        return res.json({ success: false, error: result.error });
    }

    let response = {
        success: true,
        recordsTotal: result.recordsTotal,
        page: page,
        count: count,
        Items: result.users
    }

    return res.json(response);
}

const person = async(req, res, next) => {
    const { docType, doc } = req.body;

    if (utils.isEmpty(docType) || utils.isEmpty(doc)) {
        return res.sendStatus(400);
    }

    let resultUser = await userService.getUserCitizen(docType, doc);

    if (resultUser.success) {
        return res.json({ success: false, error: errors.CREATE_BOX_EXIST_BOX_TO_CANDIDATE });
    }

    let result = await candidateService.getCandidate(docType, doc);

    if (!result.success) {
        return res.json({ success: false, error: result.error });
    }

    let response = {
        success: true,
        person: {
            name: result.names
        }
    }

    return res.json(response);
}

const createBox = async(req, res, next) => {
    let box = req.fields;
    let files = req.files;

    let countFiles = Object.keys(files).length;
    console.log("createBox", box, ":: files " + countFiles);

    if (utils.isEmpty(box.box_doc_type) ||
        utils.isEmpty(box.box_doc) ||
        utils.isEmpty(box.box_email) ||
        utils.isEmpty(box.user_cellphone) ||
        utils.isEmpty(box.box_address) ||
        utils.isEmpty(box.box_acreditation_type) ||
        Object.keys(files).filter((x) => x.match(/^file[0-9]{1,3}$/g)).length == 0 ||
        countFiles == 0) {
        return res.status(400).json({success: false, error: "Datos no válidos"});
    }

    if (!utils.validNumeric(box.user_cellphone) || box.user_cellphone.length < 9) {
        return res.status(400).json({success: false, error: "Celular no válido"});
    }

    box.box_email = box.box_email.toLowerCase();

    let _files = [];
    let attachments = [];
    for (let i = 1; i <= countFiles; i++) {
        _files.push({ index: i });
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

    let userExist = await inboxService.getApprovedInboxByDoc(box.box_doc_type, box.box_doc);
    let emailExist = await inboxService.getApprovedInboxByEmail(box.box_email);

    if (userExist.success) {
        return res.status(400).json({ success: false, error: errors.CREATE_BOX_EXIST_BOX_TO_CANDIDATE.message });
    }
    if (emailExist.success) {
        return res.status(400).json({ success: false, error: errors.CREATE_BOX_EXIST_BOX_TO_EMAIL.message });
    }

    for await (file of _files) {
        file.file = await utils.copyFile(
            files['file' + file.index].path,
            appConstants.PATH_BOX,
            files['file' + file.index].name,
            box.box_doc,
            Date.now(),
            false,
            false
        );
        attachments.push(file.file);
    }
    let usuarioRegistro = req.user.name + ' ' + req.user.lastname;
    let result = await userService.createUserCitizen(box, req.user.id, attachments, usuarioRegistro);
    

    placeOrder.placeOrder(box)
            .then((job) => {
                console.log('\n Se creó la casilla y ahora se inicia la notificación \n ');
            })
            .catch(() => {
                console.log('\n Se creó la casilla y No se pudo realizar la notificación" \n ');
            });
    
    return res.json({ success: true });
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

const searchPerson = async(req, res, next) => {
    const { dni } = req.query;
    let result = null;

    try {
        let response = await request({
            uri: `${process.env.URL_RENIEC}`,
            method: 'POST',
            json: true,
            body: {
                codigo: process.env.CODIGO_RENIEC,
                clave: process.env.CLAVE_RENIEC,
                dni: dni,
            },
            resolveWithFullResponse: true
        });

        if (response.statusCode == 200) {
            result = response.body;
        }

    } catch (err) {
        console.error('Error validating questions in questionService: ' + err);
    }
    return res.json(result);
};

const searchRuc = async(req, res, next) => {
    const { ruc } = req.query;
    let result = null;

    try {
        let response = await request({
            uri: `${process.env.URL_SUNAT}`,
            qs: {
                numruc: ruc,
                out: 'json'
            },
            headers: {
                'Accept': 'application/json'
            },
            resolveWithFullResponse: true
        });

        if (response.statusCode == 200) {
            result = JSON.parse(response.body);
        }
    } catch (err) {
        console.error('Error getting questions in questionService: ' + err);
    }

    return res.json(result);
};



const box = async(req, res, next) => {
    const { docType, doc } = req.body;

    if (utils.isEmpty(docType) || utils.isEmpty(doc)) {
        return res.sendStatus(400);
    }

    let result = await inboxService.getInboxUserCitizen(docType, doc, req.token);

    return res.json({ result });
}

const downloadPdfBox = async(req, res, next) => {
    const { token, inbox, type } = req.query;

    if (utils.isEmpty(token) || utils.isEmpty(inbox) || utils.isEmpty(type)) {
        return res.sendStatus(400);
    }

    const resultVerifyToken = await jwtService.verifyToken(token, appConstants.PROFILE_REGISTER);

    if (!resultVerifyToken) {
        return res.sendStatus(401);
    }

    const resultPdfBox = await inboxService.downloadPdfInbox(inbox, type);

    if (!resultPdfBox.success) {
        return res.json(resultPdfBox);
    }

    const content = fs.readFileSync(resultPdfBox.pathfile);

    if (content) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + resultPdfBox.filename);
        res.send(content);

        return res;
    }

    return res.sendStatus(400);

}

const download = async(req, res, next) => {
    const { path } = req.query;

    if (utils.isEmpty(path)) {
        return res.sendStatus(400);
    }
    const path_upload = process.env.PATH_UPLOAD;

    const content = fs.readFileSync(path_upload + '/' + path);

    if (content) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + content.filename);
        res.send(content);

        return res;
    }

    return res.sendStatus(400);

}



const sendEmailEstateInbox = async(req, res, next) => {
    const Body= req.body;

    var email = Body.email;
    var estado = Body.estado;
    var nombre = Body.nombres;

    if (utils.isEmpty(id)) {
        return res.sendStatus(400);
    }
    let result = await emailService.sendEmailEstateInbox(nombre , email , estado);
    return res.json(result);
}


const deleteUser = async(req, res, next) => {
    const { doc, docType } = req.body;


    if (utils.isEmpty(docType) ||
        utils.isEmpty(doc)) {
        return res.sendStatus(400);
    }

    let result = await userService.deleteUser(docType, doc);

    if (!result.success) {
        return res.json({ success: false, error: result.error });
    }


    return res.json(result);
}

const createUser = async(req, res, next) => {
    try {
        let user = req.body;
        let usuarioRegistro = req.user.name + ' ' + req.user.lastname;
        console.log(user);
        if (utils.isEmpty(user.docType) ||
            utils.isEmpty(user.doc) ||
            utils.isEmpty(user.profile) ||
            utils.isEmpty(user.name) ||
            utils.isEmpty(user.lastname) ||
            utils.isEmpty(user.email)) {
            return res.sendStatus(400);
        }

        let result = await userService.newUser(user.docType, user.doc, user.profile, user.name, user.lastname, user.email, usuarioRegistro);
        return res.json(result);
    } catch (ex) {
        logger.error(ex);
        next({ success: false, error: 'error' });
    }

}

const editUser = async(req, res, next) => {
    try {
        let usuarioRegistro = req.user.name + ' ' + req.user.lastname;
        let user = req.body;
        if (utils.isEmpty(user.doc) ||
            utils.isEmpty(user.name) ||
            utils.isEmpty(user.lastname) ||
            utils.isEmpty(user.email)) {
            return res.sendStatus(400);
        }

        let result = await userService.editUser(user.doc, user.name, user.lastname, user.email, usuarioRegistro);
        return res.json(result);
    } catch (ex) {
        logger.error(ex);
        next({ success: false, error: 'error' });
    }
}

const listUsers = async(req, res, next) => {
    const { search, page, count } = req.body;

    if (!page || !count) {
        return res.sendStatus(400);
    }

    if (!utils.validNumeric(page) ||
        !utils.validNumeric(count)) {
        return res.sendStatus(400);
    }

    let result = await userService.getUsers(search, page, count);

    if (!result.success) {
        return res.json({ success: false, error: result.error });
    }

    let response = {
        success: true,
        recordsTotal: result.recordsTotal,
        page: page,
        count: count,
        Items: result.users
    }

    return res.json(response);
}

const getUserCitizenById = async(req, res, next) => {
    const { id } = req.query;

    if (utils.isEmpty(id)) {
        return res.sendStatus(400);
    }
    let result = await userService.getUserCitizenById(id);
    return res.json(result);
}

const getUserCitizenDetailById = async(req, res, next) => {
    const { id, atender } = req.query;
    const token = req.token;

    if (utils.isEmpty(id)) {
        return res.sendStatus(400);
    }
    let result = await userService.getUserCitizenDetailById(id, token, atender);
    return res.json(result);
}


const updateEstateInbox = async(req, res, next) => {

        const body= req.body;
    var iduser = body.idUser;
    var estado_ = body.estado;
    var motivo_ = body.motivo;

    var name = body.name;
    var email = body.email;

    if (utils.isEmpty(iduser)) {
        return res.sendStatus(400);
    }
    const result = await userService.updateEstateInbox(iduser,estado_,motivo_ ,name, email);

    if(result.success && estado_==='APROBADO'){

        let datosFirma = {
                iduser: iduser,
                pendingInbox: result.pendingInbox
            }

        placeOrder.placeOrderCiudadano(datosFirma)
            .then((job) => {
                console.log('\n Se aprobó la casilla y ahora se inicia la notificación \n ');
            })
            .catch(() => {
                console.log('\n Se aprobó la casilla y No se pudo realizar la notificación" \n ');
            });

    }
    
     return res.json(result); 
}
const validarLogClaridad = async(req, res, next) => {
    let result = {};
    userService.getLogClaridad();
    result.message = `Se inicia el proceso para enviar notificaciones no registradas`;
    return res.json(result);
}

const validarCasilla = async(req, res, next) => {
    let casilla = req.fields;
    let [isValid, message] = validarCampos(casilla);
    if(!isValid) {
        return res.status(400).send({success: false, message: message});
    }
    const result = await userService.getUserCasilla(casilla.docType, casilla.doc);
    return res.status(!result ? 404 : 200).json({"success":result.success, "user":result.user, "message":(result.success) ? result.message : result.error});
}

function validarCampos(casilla) {
    let countFields = Object.keys(casilla).length;
    let isValid = true;
    let message = "";
    
    if(utils.isEmpty(casilla.docType)
        || utils.isEmpty(casilla.doc)) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Datos no válidos";
    }
    let docType_ = ["dni", "ce"];
    if(!docType_.includes(casilla.docType)) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Tipo de documento no válido";
    }
    let doc_ = new String(casilla.doc).toString();
    if(casilla.docType == "dni" && doc_.length != 8) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Documento no válido";
    }
    if(casilla.docType == "ce" && (doc_.length < 8 || doc_.length > 12)) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Documento no válido";
    }
    if(countFields != 2) {
        isValid = false;
        message+= ((message.length> 0) ? ", " : "") + "Número de campos no válido";
    }

    return [isValid, message];
}

const searchCE = async (req, res, next) => {
    const { doc, type } = req.query;
  
    let exist = await userService.existCE(doc, type);
  
    if (exist) {
      let response = {
        success: true,
        name: exist.name,
        lastname: exist.lastname != null ? exist.lastname : null,
        second_lastname: exist.second_lastname != null ? exist.second_lastname : null
      }
      return res.json(response);
    }
    return res.json({ success: false});
};

const searchCasilla = async (req, res, next) => {
    const { doc, type } = req.query;

    let userExist = await inboxService.getApprovedInboxByDoc(type, doc);
  
    if (userExist.success) {
      return res.json({ success: false, error: errors.CREATE_BOX_EXIST_BOX_TO_CANDIDATE });
    }
    return res.json({ success: true });
  
};

module.exports = { 
    users, 
    person, 
    createBox, 
    box, 
    downloadPdfBox, 
    deleteUser, 
    searchPerson, 
    searchRuc, 
    createUser, 
    editUser, 
    listUsers, 
    getUserCitizenById, 
    download,
    validarLogClaridad,
    validarCasilla,
    searchCE,
    searchCasilla,
    getUserCitizenDetailById,updateEstateInbox ,sendEmailEstateInbox};