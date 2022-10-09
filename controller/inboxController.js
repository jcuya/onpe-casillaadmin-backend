/**
 * Created by Angel Quispe
 */
const utils = require('./../common/utils');
const inboxService = require('./../services/inboxService');
const logger = require('./../server/logger').logger;

const inboxEdit = async (req, res, next) => {
    try {
        let usuarioRegistro = req.user.name + ' ' + req.user.lastname;
        let payload = req.body;
        if (utils.isEmpty(payload.inbox_id) ||
            utils.isEmpty(payload.cellphone) ||
            utils.isEmpty(payload.ubigeo) ||
            utils.isEmpty(payload.address) ||
            utils.isEmpty(payload.email)) {
            return res.sendStatus(400);
        }

        let result = await inboxService.inboxEdit(payload.inbox_id, payload.email, payload.cellphone, payload.ubigeo, payload.address, usuarioRegistro);
        return res.json(result);
    } catch (ex) {
        logger.error(ex);
        next({success: false, error: 'error'});
    }
}


module.exports = {
    inboxEdit
};