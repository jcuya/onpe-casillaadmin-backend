/**
 * Created by Angel Quispe
 */
const catalogService = require('./../services/catalogService');
const appConstants = require('./../common/appConstants');
const utils = require('./../common/utils');

const getCacheBox = async(req, res, next) => {
    let acreditationTypes = await catalogService.getCatalogByType(appConstants.CATALOG_TYPE_ACREDITATION);

    if (!acreditationTypes.success) {
        return res.json({ success: false, error: acreditationTypes.error });
    }

    let data = { acreditationTypes: acreditationTypes.catalogs };

    return res.json({ success: true, data: data });
}
const paginateCatalog = async(req, res, next) => {
    const { search, page, count } = req.body;

    let data = await catalogService.paginateCatalog(search, page, count);
    return res.json(data);
}
const createCatalog = async(req, res, next) => {
    const { type, code, value } = req.body;
    let usuarioRegistro = req.user.name + ' ' + req.user.lastname;

    if (utils.isEmpty(type) ||
        utils.isEmpty(code) ||
        utils.isEmpty(value)) {
        return res.sendStatus(400);
    }
    let data = await catalogService.createCatalog(type, code, value, usuarioRegistro);
    return res.json(data);
}
const updateCatalog = async(req, res, next) => {
    const { id, value } = req.body;
    const usuarioRegistro = req.user.name + ' ' + req.user.lastname;

    if (utils.isEmpty(id) ||
        utils.isEmpty(value)) {
        return res.sendStatus(400);
    }
    let data = await catalogService.updateCatalog(id, value, usuarioRegistro);
    return res.json(data);
}

const removeCatalog = async(req, res, next) => {
    const { id } = req.body;

    if (utils.isEmpty(id)) {
        return res.sendStatus(400);
    }
    let data = await catalogService.removeCatalog(id);
    return res.json(data);
}

const getTypes = async(req, res, next) => {
    let data = await catalogService.getTypes();
    return res.json(data);
}
const getCacheSendNotification = async(req, res, next) => {
    let resultProcedures = await catalogService.getCatalogByType(appConstants.CATALOG_TYPE_PROCEDURE);

    if (!resultProcedures.success) {
        return res.json({ success: false, error: resultProcedures.error });
    }

    let data = { procedures: resultProcedures.catalogs };

    return res.json({ success: true, data: data });
}

module.exports = { getCacheBox, getCacheSendNotification, paginateCatalog, createCatalog, updateCatalog, removeCatalog, getTypes };