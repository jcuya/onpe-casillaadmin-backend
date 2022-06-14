/**
 * Created by Angel Quispe
 */

const emailService = require('./../services/emailService');

describe('emailServiceTest', () => {

    it('sendEmailNewPasswordTest()', async () => {
        console.log('start');

        let result = await emailService.sendEmailNewPassword('MIGUEL PAZO', 'miguel.ps19@gmail.com', 'Ab123456');

        console.log('start');
    });

    it('sendEmailNewUserCitizenTest()', async () => {
        console.log('start');

        let result = await emailService.sendEmailNewUserCitizen('ANGEL DAVID', 'angel.dqc@gmail.com', 'Ab123456');

        console.log('start');
    });

    it('sendEmailNewNotificationTest()', async () => {
        console.log('start');

        let result = await emailService.sendEmailNewNotification('ANGEL DAVID', 'angel.dqc@gmail.com');

        console.log('start');
    });
});

