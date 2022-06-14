/**
 * Created by Alexander Llacho
 */

const logger = require('./../server/logger').logger;
const appConstants = require('./../common/appConstants');
const fs = require('fs');
const {redisWriter, redisReader} = require('./../database/redis');

const getParameters = async (notifier_doc_type, notifier_doc, addressee_doc_type, addressee_doc) => {
    let param = null;
    let name = notifier_doc_type + "_" + notifier_doc + "_" + addressee_doc_type + "_" + addressee_doc;

    try {
        let token = (new Buffer(name)).toString('base64');

        const data = {
            app: 'pcx',
            mode: 'simple-p',
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            idFile: 'upload',
            type: 'W',
            protocol: process.env.PROTOCOL,
            fileDownloadUrl: process.env.BASE_URL + '/service/download/' + token,
            fileUploadUrl: process.env.BASE_URL + '/service/upload/' + token,
            fileDownloadStampUrl: 'sp.reniec.gob.pe/app/iFirma1.png',
            contentFile: name + '.pdf',
            reason: 'Soy el autor del documento',
            isSignatureVisible: 'true',
            stampAppearanceId: '0',
            pageNumber: '0',
            dcfilter: '.*FIR.*' + notifier_doc + '.*|.*FAU.*' + notifier_doc + '.*',
            signatureLevel: '0',
            outputFile: appConstants.METADATA_SIGN_PDF,
            maxFileSize: '5242880',
            posx: '5',
            posy: '5',
            fontSize: '7',
        };

        param = JSON.stringify(data);
        param = (new Buffer(param)).toString('base64');

        return param;
    } catch (err) {
        logger.error(err);
    }

    return null;
}

const uploadFile = async (token) => {

    try {
        let key = (new Buffer(token, 'base64')).toString('ascii');

        let result = await getRedis(key);

        if (result) {
            let pathFile = process.env.PATH_UPLOAD_TMP + '/' + result.filepdf;
            logger.info('path file: ' + pathFile);

            return fs.readFileSync(pathFile);
        }
    } catch (err) {
        logger.error(err);
    }

    return null;
}

const downloadFile = async (file, token) => {

    try {
        let key = (new Buffer(token, 'base64')).toString('ascii');

        let result = await getRedis(key);

        if (result) {
            let path = result.filepdf;
            let _newPath = result.filepdf.split('/');
            let newPath = process.env.PATH_UPLOAD + '/' + result.filepdf.replace(_newPath[_newPath.length - 1], '');

            fs.mkdirSync(newPath, {recursive: true});

            let rawData = fs.readFileSync(file.path);

            fs.writeFileSync(process.env.PATH_UPLOAD + '/' + path, rawData);

            return true
        }
    } catch (err) {
        logger.error(err);
    }

    return false;
}

const getRedis = async (key) => {
    return JSON.parse(await redisReader.get(key));
}

module.exports = {getParameters, uploadFile, downloadFile};