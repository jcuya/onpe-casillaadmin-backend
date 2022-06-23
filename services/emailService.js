/**
 * Created by Angel Quispe
 */

const nodemailer = require('nodemailer');
const logger = require('./../server/logger').logger;
const AWS = require('aws-sdk');

const url_front = process.env.BASE_URL_FRONT;
const url_front_citizen = process.env.BASE_URL_FRONT_CITIZEN;

const sendEmailNewPassword = async (name, email, newPassword, doc) => {
  if (await sendNewPasswordWithAws(name, email, newPassword, doc)) {
    return true;
  }

  return false;
}

const sendNewPasswordWithAws = async (name, email, newPassword, doc) => {
  // AWS.config.update({
  //     accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES,
  //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_SES,
  //     region: process.env.AWS_REGION_SES,
  // });

  // const ses = new AWS.SES();

  try {

    const html = `         
                <div style="width: 100%; max-width: 700px; margin: 0 auto;">
                    <div style="text-align: center; padding-top: 20px;">
                        <table style="border:none; width: 100%;background: #062b56;">
                            <tr>
                                <td style="text-align: left;  padding-left: 10px;  font-size: 50px;  line-height: 48px;  font-weight: bold;   font-family: system-ui;    color: #fff;">
                                    SISEN
                                </td>                    
                                <td style=" text-align: right; font-size: 15px; line-height: 48px;  font-family: system-ui; color: #fff; padding-right: 10px;">
                                    Sistema de Notificación Electrónica de la ONPE
                                </td>
                            </tr> 
                        </table>
                    </div>
                    <hr>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:24px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                        Hola ${name},
                    </p>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                        para recuperar tu acceso al Sistema de Notificación Electrónica de la ONPE (SISEN), sigue los siguientes pasos:
                    </p>
                    <div style="font-family:arial,helvetica,sans-serif; text-align:left; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                        <table style="font-family:arial,helvetica,sans-serif;">                        
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    1. Ingresa haciendo clic <a href="${url_front}">aquí</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    2. Digita tu usuario: ${doc} e ingresa esta contraseña: <b>${newPassword}</b>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    3. El sistema te solicitará cambiarla y crear una nueva contraseña.
                                </td>
                            </tr>                                               
                        </table>
                    </div>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 30px 10px;">
                        No olvides revisar periódicamente tu casilla electrónica.<br>
                    </p>
                    <div style="background: #062b56; padding: 5px 10px; margin: 0 0 20px 0; text-align:right;">
                        <!-- <img src="img/onpeblanco.png" style="width: 40px; height: auto;" alt=""> -->
                    </div>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:12px; color:rgb(80,83,90);text-align:center; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                        Jr. Washington 1894, Cercado de Lima<br>
                        Central Telefónica: (01) 417-0630 / L - S 07:00 h - 18:00 h 
                    </p>
                </div>         
        `;

    // const params = {
    //     Destination: {
    //         ToAddresses: [email]
    //     },
    //     Message: {
    //         Body: {
    //             Html: {
    //                 Charset: 'UTF-8',
    //                 Data: html
    //             },
    //         },
    //         Subject: {
    //             Charset: 'UTF-8',
    //             Data: 'Nueva Contraseña - SISEN'
    //         }
    //     },
    //     Source: process.env.AWS_REGION_SES_MAIL
    // };

    let result = await enviarCorreo(process.env.EMAIL_ORIGEN, email, 'Nueva Contraseña - SISEN', html);

    logger.info(JSON.stringify({ message: `email sent to: ${email}`, result: result }));

    return true;

  } catch (err) {
    logger.error(JSON.stringify({ message: `error sending email to ${email}`, result: err }));
  }

  return false;
}

const sendEmailNewUserCitizen = async (name, email, password, doc) => {
  if (await sendEmailNewUserCitizenWithAws(name, email, password, doc)) {
    return true;
  }

  return false;
}

const sendEmailNewUser = async (name, email, password, doc) => {
  if (await sendEmailNewUserAws(name, email, password, doc)) {
    return true;
  }

  return false;
}

const sendEmailNewUserAws = async (name, email, password, doc) => {
  try {
    const html = `
            <html>
            <body>  
                <!-- En DIV's (Ini) -->
                <div style="width: 100%; max-width: 700px; margin: 0 auto;">
                    <div style="text-align: center; padding-top: 20px;">
                        <table style="border:none; width: 100%;background: #062b56;">
                            <tr>
                                <td style="text-align: left;  padding-left: 10px;  font-size: 50px;  line-height: 48px;  font-weight: bold;   font-family: system-ui;    color: #fff;">
                                    SISEN
                                </td>                    
                                <td style=" text-align: right; font-size: 15px; line-height: 48px;  font-family: system-ui; color: #fff; padding-right: 10px;">
                                    Sistema de Notificación Electrónica de la ONPE
                                </td>
                            </tr>
                        </table>
                    </div>
                    <hr>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:24px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                        Hola ${name},
                    </p>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                     Se creó tu usuario para la aplicación casilla electrónica con éxito. Para ingresar al Módulo de Administración del Sistema de Notificación Electrónica de la ONPE (SISEN), sigue los siguientes pasos:
                    </p>
                    <div style="font-family:arial,helvetica,sans-serif; text-align:left; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                        <table style="font-family:arial,helvetica,sans-serif;">                        
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    1. Ingresa haciendo clic <a href="${url_front}">aquí</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    2. Digita tu usuario: ${doc} e ingresa esta contraseña: <b>${password}</b>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    3. El sistema te solicitará cambiarla y crear una nueva contraseña.
                                </td>
                            </tr>                                               
                        </table>                    
                    </div>

                    <div style="background: #062b56; padding: 5px 10px; margin: 0 0 20px 0; text-align:right;">
                        <!-- <img src="img/onpeblanco.png" style="width: 40px; height: auto;" alt=""> -->
                    </div>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:12px; color:rgb(80,83,90);text-align:center; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                        Jr. Washington 1894, Cercado de Lima<br>
                        Central Telefónica: (01) 417-0630 / L - S 07:00 h - 18:00 h 
                    </p>
                </div>
            </body>
            </html>        
        
        `;

    let result = await enviarCorreo(process.env.EMAIL_ORIGEN, email, 'Contraseña de acceso - SISEN', html);

    logger.info(JSON.stringify({ message: `email sent to: ${email}`, result: result }));

    return true;

  } catch (err) {
    logger.error(JSON.stringify({ message: `error sending email to ${email}`, result: err }));
  }

  return false;
}
const sendEmailNewUserCitizenWithAws = async (name, email, password, doc) => {
  // AWS.config.update({
  //     accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES,
  //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_SES,
  //     region: process.env.AWS_REGION_SES,
  // });

  // const ses = new AWS.SES();

  try {


    const html = `
            <html>
            <body>  
                <!-- En DIV's (Ini) -->
                <div style="width: 100%; max-width: 700px; margin: 0 auto;">
                    <div style="text-align: center; padding-top: 20px;">
                        <table style="border:none; width: 100%;background: #062b56;">
                            <tr>
                                <td style="text-align: left;  padding-left: 10px;  font-size: 50px;  line-height: 48px;  font-weight: bold;   font-family: system-ui;    color: #fff;">
                                    SISEN
                                </td>                    
                                <td style=" text-align: right; font-size: 15px; line-height: 48px;  font-family: system-ui; color: #fff; padding-right: 10px;">
                                    Sistema de Notificación Electrónica de la ONPE
                                </td>
                            </tr>
                        </table>
                    </div>
                    <hr>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:24px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                        Hola ${name},
                    </p>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                        Se creó tu casilla electrónica con éxito. Para ingresar al Sistema de Notificación Electrónica de la ONPE (SISEN), sigue los siguientes pasos:
                    </p>
                    <div style="font-family:arial,helvetica,sans-serif; text-align:left; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                        <table style="font-family:arial,helvetica,sans-serif;">                        
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    1. Ingresa haciendo clic <a href="${url_front_citizen}">aquí</a>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    2. Digita tu usuario: ${doc} e ingresa esta contraseña: <b>${password}</b>
                                </td>
                            </tr>
                            <tr>
                                <td style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);">
                                    3. El sistema te solicitará cambiarla y crear una nueva contraseña.
                                </td>
                            </tr>                                               
                        </table>                    
                    </div>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 30px 10px;">
                        No olvides revisar periódicamente tu casilla electrónica.<br>
                    </p>
                    <div style="background: #062b56; padding: 5px 10px; margin: 0 0 20px 0; text-align:right;">
                        <!-- <img src="img/onpeblanco.png" style="width: 40px; height: auto;" alt=""> -->
                    </div>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:12px; color:rgb(80,83,90);text-align:center; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                        Jr. Washington 1894, Cercado de Lima<br>
                        Central Telefónica: (01) 417-0630 / L - S 07:00 h - 18:00 h 
                    </p>
                </div>
            </body>
            </html>        
        
        `;



    // const params = {
    //     Destination: {
    //         ToAddresses: [email]
    //     },
    //     Message: {
    //         Body: {
    //             Html: {
    //                 Charset: 'UTF-8',
    //                 Data: html
    //             },
    //         },
    //         Subject: {
    //             Charset: 'UTF-8',
    //             Data: 'Contraseña de acceso - SISEN'
    //         }
    //     },
    //     Source: process.env.AWS_REGION_SES_MAIL
    // };

    // let result = await ses.sendEmail(params).promise();

    let result = await enviarCorreo(process.env.EMAIL_ORIGEN, email, 'Contraseña de acceso - SISEN', html);

    logger.info(JSON.stringify({ message: `email sent to: ${email}`, result: result }));

    return true;

  } catch (err) {
    logger.error(JSON.stringify({ message: `error sending email to ${email}`, result: err }));
  }

  return false;
}

const sendEmailNewNotification = async (name, email) => {
  if (await sendEmailNewNotificationWithAws(name, email)) {
    return true;
  }

  return false;
}

const sendEmailNewNotificationWithAws = async (name, email) => {
  // AWS.config.update({
  //     accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES,
  //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_SES,
  //     region: process.env.AWS_REGION_SES,
  // });

  // const ses = new AWS.SES();

  try {
    const html = `
            <html>
            <body>  
                <div style="width: 100%; max-width: 700px; margin: 0 auto;">
                    <div style="text-align: center; padding-top: 20px;">
                        <table style="border:none; width: 100%;background: #062b56;">
                            <tr>
                                <td style="text-align: left;  padding-left: 10px;  font-size: 50px;  line-height: 48px;  font-weight: bold;   font-family: system-ui;    color: #fff;">
                                    SISEN
                                </td>                    
                                <td style=" text-align: right; font-size: 15px; line-height: 48px;  font-family: system-ui; color: #fff; padding-right: 10px;">
                                    Sistema de Notificación Electrónica de la ONPE
                                </td>
                            </tr>
                        </table>
                    </div>
                    <hr>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:24px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                        Hola ${name},
                    </p>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                        Recibiste una notificación, para verla ingresa a tu casilla electrónica haciendo clic
                        <a href="${url_front_citizen}" style="font-family:arial,helvetica,sans-serif; font-size:24px; font-weight: 700; color:#062b56; text-align:center; margin: 20px 0 20px 0; padding: 0 10px 0 10px; text-decoration: none;">
                            aquí
                        </a>
                    </p>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 30px 10px;">
                        No olvides revisar periódicamente tu casilla electrónica.<br>
                    </p>
                    <div style="background: #062b56; padding: 5px 10px; margin: 0 0 20px 0; text-align:right;">
                        <!-- <img src="img/onpeblanco.png" style="width: 40px; height: auto;" alt=""> -->
                    </div>
                    <p style="font-family:arial,helvetica,sans-serif; font-size:12px; color:rgb(80,83,90);text-align:center; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                        Jr. Washington 1894, Cercado de Lima<br>
                        Central Telefónica: (01) 417-0630 / L - S 07:00 h - 18:00 h 
                    </p>
                </div>
            </body>
            </html>                
        `;


    // const params = {
    //     Destination: {
    //         ToAddresses: [email]
    //     },
    //     Message: {
    //         Body: {
    //             Html: {
    //                 Charset: 'UTF-8',
    //                 Data: html
    //             },
    //         },
    //         Subject: {
    //             Charset: 'UTF-8',
    //             Data: 'Nueva Notificación - SISEN'
    //         }
    //     },
    //     Source: process.env.AWS_REGION_SES_MAIL
    // };

    // let result = await ses.sendEmail(params).promise();

    let result = await enviarCorreo(process.env.EMAIL_ORIGEN, email, 'Nueva Notificación - SISEN', html);

    logger.info(JSON.stringify({ message: `email sent to: ${email}`, result: result }));

    return true;

  } catch (err) {
    logger.error(JSON.stringify({ message: `error sending email to ${email}`, result: err }));
  }

  return false;
}


const sendEmailDisapprovedWithAws = async (name, email) => {
    // AWS.config.update({
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID_SES,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_SES,
    //     region: process.env.AWS_REGION_SES,
    // });
  
    // const ses = new AWS.SES();
  
    try {
      const html = `
      <html>
      <body>  
          <!-- En DIV's (Ini) -->
          <div style="width: 100%; max-width: 700px; margin: 0 auto;">
              <div style="text-align: center; padding-top: 20px;">
                  <table style="border:none; width: 100%;background: #062b56;">
                      <tr>
                          <td style="text-align: left;  padding-left: 10px;  font-size: 50px;  line-height: 48px;  font-weight: bold;   font-family: system-ui;    color: #fff;">
                              SISEN
                          </td>                    
                          <td style=" text-align: right; font-size: 15px; line-height: 48px;  font-family: system-ui; color: #fff; padding-right: 10px;">
                              Sistema de Notificación Electrónica de la ONPE
                          </td>
                      </tr>
                  </table>
              </div>
              <hr>
              <p style="font-family:arial,helvetica,sans-serif; font-size:24px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                  Hola ${name},
              </p>
              <p style="font-family:arial,helvetica,sans-serif; font-size:16px; color:rgb(80,83,90);text-align:justify; margin: 30px 0 0 0; padding: 0 10px 0 10px;">
                  Hemos recibido su solicitud de creación de casilla electrónica y usted no cuenta con los requisitos establecidos por la ONPE.</p>
              <div style="font-family:arial,helvetica,sans-serif; text-align:left; margin: 20px 0 20px 0; padding: 0 10px 0 10px;"></div>
<div style="background: #062b56; padding: 5px 10px; margin: 0 0 20px 0; text-align:right;">
<!-- <img src="img/onpeblanco.png" style="width: 40px; height: auto;" alt=""> -->
</div>
              <p style="font-family:arial,helvetica,sans-serif; font-size:12px; color:rgb(80,83,90);text-align:center; margin: 20px 0 20px 0; padding: 0 10px 0 10px;">
                  Jr. Washington 1894, Cercado de Lima<br>
                  Central Telefónica: (01) 417-0630 / L - S 07:00 h - 18:00 h 
              </p>
          </div>
      </body>
      </html>                    
          `;
  
  
      // const params = {
      //     Destination: {
      //         ToAddresses: [email]
      //     },
      //     Message: {
      //         Body: {
      //             Html: {
      //                 Charset: 'UTF-8',
      //                 Data: html
      //             },
      //         },
      //         Subject: {
      //             Charset: 'UTF-8',
      //             Data: 'Nueva Notificación - SISEN'
      //         }
      //     },
      //     Source: process.env.AWS_REGION_SES_MAIL
      // };
  
      // let result = await ses.sendEmail(params).promise();
  
      let result = await enviarCorreo(process.env.EMAIL_ORIGEN, email, 'Nueva Notificación - SISEN', html);
  
      logger.info(JSON.stringify({ message: `email sent to: ${email}`, result: result }));
  
      return true;
  
    } catch (err) {
      logger.error(JSON.stringify({ message: `error sending email to ${email}`, result: err }));
    }
  
    return false;
  }

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  tls: { rejectUnauthorized: process.env.EMAIL_SECURE },
  secure: process.env.EMAIL_SECURE,
  debug: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const transporterAnonymous = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  tls: { rejectUnauthorized: process.env.EMAIL_SECURE === 'true' },
  secure: process.env.EMAIL_SECURE === 'true',
  debug: true,
});

const enviarCorreo = async (origen, destino, asunto, contenido) => {
  try {
    logger.info('Parametros de conexion SMTP', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      tls: { rejectUnauthorized: process.env.EMAIL_SECURE === 'true' },
      secure: process.env.EMAIL_SECURE === 'true',
      debug: true,
    });
    const transport = process.env.EMAIL_ANONYMOUS === 'true' ? transporterAnonymous : transporter
    result = await transport.verify();
    logger.info(`Verificar servidor SMTP (Anonymous: ${process.env.EMAIL_ANONYMOUS} )`, result);
    await transport.sendMail({
      from: origen,
      to: destino,
      subject: asunto,
      html: contenido
    });
    return true;
  } catch (error) {
    logger.error(`Ocurrió un erro al enviar el correo (Anonymous: ${process.env.EMAIL_ANONYMOUS}): `, error);
    return false;
  }

}

module.exports = { sendEmailNewPassword, sendEmailNewUserCitizen, sendEmailNewUser, sendEmailNewNotification, enviarCorreo }