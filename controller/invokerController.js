/**
 * Created by Alexander Llacho
 */

const logger = require('./../server/logger').logger;
const invokerService = require('./../services/invokerService');
const utils = require('./../common/utils');

const download = async (req, res, next) => {
    const {token} = req.params;

    if (utils.isEmpty(token)) {
        logger.info('no exist token');
        return res.sendStatus(400);
    }

    let content = await invokerService.uploadFile(token);

    if (content) {
        logger.info('exist content file');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=notification.pdf');
        res.send(content);

        return res;
    }

    logger.info('no exist content file');

    return res.sendStatus(400);
}

const upload = async (req, res, next) => {
    const {token} = req.params;
    let file = req.files.upload;
    let response = {success: false}

    let result = await invokerService.downloadFile(file, token);

    if (result) {
        response.success = true;
    }

    return res.json(response);
}

module.exports = {download, upload};