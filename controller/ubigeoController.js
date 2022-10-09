const utils = require('./../common/utils');
const ubigeoService = require('./../services/ubigeoService');
const recaptchaService = require("../services/recaptchaService");
const logger = require('./../server/logger').logger;

const listaDepartamentos = async (req, res, next) => {
    try {
        let result = await ubigeoService.listaDepartamentos();
        return res.json(result);
    } catch (ex) {
        logger.error(ex);
        next({success: false, error: 'error'});
    }
}

const listaProvincias = async (req, res, next) => {
    const { codigod } = req.params;

    if (utils.isEmpty(codigod)) {
        return res.sendStatus(400);
    }
    try {
        let result = await ubigeoService.listaProvincias(codigod);
        return res.json(result);
    } catch (ex) {
        logger.error(ex);
        next({success: false, error: 'error'});
    }
}

const listaDistritos = async (req, res, next) => {
    const { codigod, codigop } = req.params;

    if (utils.isEmpty(codigod)) {
        return res.sendStatus(400);
    }
    if (utils.isEmpty(codigop)) {
        return res.sendStatus(400);
    }
    try {
        let result = await ubigeoService.listaDistritos(codigod, codigop);
        return res.json(result);
    } catch (ex) {
        logger.error(ex);
        next({success: false, error: 'error'});
    }
}


module.exports = {
    listaDepartamentos, listaProvincias, listaDistritos
};