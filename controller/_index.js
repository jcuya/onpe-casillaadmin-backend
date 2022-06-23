/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */

const express = require('express');
const formidableMiddleware = require('express-formidable');
const router = express.Router();
const loginController = require('./../controller/loginController');
const notificationController = require('./../controller/notificationController');
const servicesController = require('./../controller/servicesController');
const userController = require('./../controller/userController');
const catalogController = require('./../controller/catalogController');
const invokerController = require('./../controller/invokerController');
const authNotifierFilter = require('./../filters/authNotifierFilter');
const authFilter = require('./../filters/authFilter');
const authFilterRole = require('../filters/authFilterRole');
const authFilterClaridad = require('./../filters/authFilterClaridad');
const appConstants = require('../common/appConstants');

module.exports = () => {

    router.get('/', (req, res, next) => {
        return res.status(200).json({ status: 'ok' })
    });
    
    router.post('/login', loginController.login);
    router.post('/recover-password', loginController.recoverPassword);
    router.post('/new-password', authFilter, loginController.newPassword);

    router.get('/download-file', notificationController.downloadAttachment);
    router.get('/download-acuse', notificationController.downloadAcuseNotified);

    router.post('/update-service', servicesController.generateToken);

    router.get('/validar-log-claridad', function(req, res, next) {
        authFilterClaridad([appConstants.PROFILE_SERVICE], req, res, next);
    }, userController.validarLogClaridad);
    
    router.post('/person-notify', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, notificationController.personNotify);

    router.post('/notifications', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, notificationController.notifications);
    router.post('/notification', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, notificationController.notification);
    router.post('/sing-notification', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, formidableMiddleware(), notificationController.singNotification);
    router.post('/send-notification', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, formidableMiddleware(), notificationController.sendNotification);

    router.post('/save-automatic-notification', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_SERVICE], req, res, next);
    }, formidableMiddleware(), notificationController.saveAutomaticNotification);
    router.post('/sing-notification-automatic', function(req, res, next) {
      authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, formidableMiddleware(), notificationController.singNotificationAutomatic);
    router.post('/send-notification-automatic', function(req, res, next) {
      authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, formidableMiddleware(), notificationController.sendNotificationAutomatic);
    
    router.get('/cache-send-notification', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN, appConstants.PROFILE_NOTIFIER], req, res, next);
    }, catalogController.getCacheSendNotification);
    router.post('/catalog/paginate', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, catalogController.paginateCatalog);
    router.post('/catalog/create', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, catalogController.createCatalog);
    router.post('/catalog/update', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, catalogController.updateCatalog);
    router.post('/catalog/remove', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, catalogController.removeCatalog);
    router.get('/catalog/types', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, catalogController.getTypes);

    router.post('/users', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN,appConstants.PROFILE_EVALUATOR], req, res, next);
    }, userController.users);
    router.post('/list-users', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.listUsers);
    router.post('/delete-user', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.deleteUser);
    router.post('/create-user', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.createUser);
    router.put('/edit-user', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.editUser);
    router.get('/get-user', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.getUserCitizenById);
    router.get('/get-user-info-detail', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN,appConstants.PROFILE_EVALUATOR], req, res, next);
    }, userController.getUserCitizenDetailById);
    router.post('/updateEstateInbox', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN,appConstants.PROFILE_EVALUATOR], req, res, next);
    }, userController.updateEstateInbox);
    router.get('/download-pdf', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_ADMIN,appConstants.PROFILE_EVALUATOR], req, res, next);
    }, userController.download);



    router.post('/person', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.person);
    router.post('/create-box', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, formidableMiddleware(), userController.createBox);
    router.get('/cache-box', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, catalogController.getCacheBox);
    router.get('/search-person', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.searchPerson);
    router.get('/search-ruc', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.searchRuc);
    router.post('/create-box', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.createBox);
    router.post('/box', function(req, res, next) {
        authFilterRole([appConstants.PROFILE_REGISTER, appConstants.PROFILE_ADMIN], req, res, next);
    }, userController.box);
    router.get('/download-pdf-box', userController.downloadPdfBox);
    router.get('/service/download/:token', invokerController.download);
    router.post('/service/upload/:token', formidableMiddleware(), invokerController.upload);

    router.options('/*', (req, res) => {
        return res.status(200).json({})
    });

    return router;
};