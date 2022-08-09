/**
 * Created by Angel Quispe
 */
const loginService = require('./../services/loginService');
const userService = require('./../services/userService');
const recaptchaService = require('../services/recaptchaService');
const utils = require('./../common/utils');
const errors = require('./../common/errors');

const login = async(req, res, next) => {
    const { docType, doc, password, recaptcha } = req.body;

    if (utils.isEmpty(docType) || utils.isEmpty(doc) || utils.isEmpty(password) || utils.isEmpty(recaptcha)) {
        return res.sendStatus(400);
    }

    console.log("la ipxxxxxxx", req.ip);

    if (!await recaptchaService.isValid(recaptcha, req.ip)) {//Comentar el método para correr en local
        return res.sendStatus(400);
    }

    const result = await loginService.login(docType, doc, password);

    if (!result.jwtToken) {
        return res.json({ success: false, error: result.error });
    }

    let response = { success: true, token: result.jwtToken, updated_password: result.updated_password };

    return res.json(response);
}

const recoverPassword = async(req, res, next) => {
    const { docType, doc, recaptcha } = req.body;

    if (utils.isEmpty(docType) || utils.isEmpty(doc) || utils.isEmpty(recaptcha)) {
        return res.sendStatus(400);
    }

    if (!await recaptchaService.isValid(recaptcha, req.ip)) {
        return res.sendStatus(400);
    }

    const result = await userService.recoverPassword(docType, doc);

    return res.json(result);
}

const newPassword = async(req, res, next) => {
    const { oldPassword, newPassword, repeatNewPassword } = req.body;

    if (utils.isEmpty(oldPassword) || utils.isEmpty(newPassword) || utils.isEmpty(repeatNewPassword)) {
        return res.sendStatus(400);
    }

    if (newPassword !== repeatNewPassword) {
        return res.sendStatus(400);
    }

    if (!utils.validNewPassword(newPassword)) {
        return res.json({ success: false, error: errors.NEW_PASSWORD_REGEX });
    }

    const result = await userService.updatePassword(req.user.docType, req.user.doc, req.user.profile, oldPassword, newPassword);

    if (!result.success) {
        return res.json({ success: false, error: result.error });
    }

    return res.json({ success: true });
}

module.exports = { login, recoverPassword, newPassword };