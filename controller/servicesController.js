/**
 * Created by Cesar Bernaola
 */
const utils = require('./../common/utils');
const validateService = require("../services/validateService");

const generateToken = async(req, res, next) => {

    const { user_service, password } = req.body;

    if (utils.isEmpty(user_service) || utils.isEmpty(password)) {
        return res.status(400).send({success: false, message: "Campos no válidos"});
    }

    if (!await validateService.validateUserService(user_service)) {
        return res.status(404).send({success: false, message: "Servicio no registrado"});
    }

    const result = await validateService.updateTokenService(user_service, password);

    return res.status(result.success ? 200 : 404).send(result);
}

module.exports = {
    generateToken
};