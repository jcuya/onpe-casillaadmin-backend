/**
 * Created by Angel Quispe
 */

module.exports = Object.freeze({
    INTERNAL_ERROR: {code: 110, message: 'Ha ocurrido un error, por favor vuelve a intentarlo.'},
    LOGIN_INVALID_DATA: {code: 115, message: 'El documento de identidad o los datos ingresados son inválidos.'},
    UPDATE_PASSWORD_INCORRECT_OLD_PASSWORD: {code: 116, message: 'Contraseña anterior ingresada no es correcta.'},
    UPDATE_PASSWORD_NEW_PASSWORD_NOT_EQUALS_OLD_PASSWORD: {code: 116, message: 'La nueva contraseña no puede ser igual a la anterior.'},
    CANDIDATE_NOT_EXIST: {code: 117, message: 'No se encontró información del ciudadano.'},
    ADDRESSEE_CITIZEN_NOT_EXIST: {code: 118, message: 'No se encontró información del destinatario.'},
    CREATE_BOX_EXIST_BOX_TO_CANDIDATE: {code: 119, message: 'Ya cuenta con una casilla electrónica.'},
    CREATE_BOX_EXIST_BOX_TO_EMAIL: { code: 119, message: 'Ya se encuentra registrado el correo electrónico.' },
    CREATE_USER_EXIST: {code: 120, message: 'Ya se encuentra registrado.'},
    NEW_PASSWORD_REGEX: {code:121, message:'La nueva contraseña no cumple con las políticas de seguridad.'},
    NOTIFICATION_NOT_VALID: {code:122, message:'Notificación no válida.'},
});