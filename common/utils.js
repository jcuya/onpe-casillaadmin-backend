/**
 * Created by Angel Quispe
 */
const logger = require('./../server/logger').logger;
const fs = require('fs');
const crypto = require('crypto');
const path_upload = process.env.PATH_UPLOAD;
const path_upload_tmp = process.env.PATH_UPLOAD_TMP;

const validNumeric = (value) => {
    return /^[0-9]+$/.test(value) !== false;
}

const validEmail = (email) => {
    return /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email) !== false;
}

const isEmpty = (text) => {
    if (!text) {
        return true;
    }

    return text.trim() === '';
}

const validNewPassword = (newPassword) => {
    if (newPassword.length >= 8) {
        return /^(?=.*\d)(?=.*[a-záéíóúüñ]).*[A-ZÁÉÍÓÚÜÑ]/.test(newPassword) !== false;
    }

    return false;
}

const passwordHash = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const stringHash = (text) => {
    return crypto.createHash('sha256').update(text).digest('hex');
}

const getPath = (prePath) => {
    let _date = new Date(Date.now());
    return prePath + _date.getFullYear() + '/' + (_date.getMonth() + 1) + '/' + _date.getDate() + '/';
}

const copyFile = async (oldPathFile, newPath, filename, doc, timestamp, isTmp, isBlocked) => {
    try {
        let rawData = fs.readFileSync(oldPathFile);

        let pathAttachment = getPath(newPath);

        let stringHashNameFile = stringHash(crypto.randomBytes(5).toString('hex') + '_' + doc + '_' + timestamp + '_' + filename);

        let newPathFile = (isTmp ? path_upload_tmp : path_upload) + "/" + pathAttachment + stringHashNameFile;

        fs.mkdirSync((isTmp ? path_upload_tmp : path_upload) + "/" + pathAttachment, {recursive: true});

        fs.writeFileSync(newPathFile, rawData);

        return {path: pathAttachment + stringHashNameFile, name: filename, blocked: isBlocked};

    } catch (err) {
        logger.error(err);

        return false;
    }

}
const existFile = async (pathFile, nameFile) => {
    let respuesta = true;
    //pathRelativo=pathFile + '/' + nameFile;
    pathAbsoluto = pathFile + '/' + nameFile;
    //fs.readFile('./../../' + pathRelativo, 'utf8', function(err, data) {
      fs.readFileSync(pathAbsoluto, 'utf8', function(err, data) {
        if (err) {
          console.log('name: '+nameFile +' No es candidato');       
          respuesta = false;
          return false;
          //return console.log(err);
        }else{
          console.log('name: '+nameFile +' Es candidato');
          respuesta = true;
          return true;          
        }
      });
    return respuesta;
}

module.exports = {validNumeric, validEmail, isEmpty, validNewPassword, passwordHash, getPath, copyFile, stringHash, existFile};