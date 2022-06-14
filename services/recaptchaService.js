/**
 * Created by Angel Quispe
 */

const request = require('request-promise');

const service = {
    isValid: async (code, ip) => {
        try {
            let gResponse = await request({
                url: 'https://www.google.com/recaptcha/api/siteverify',
                method: 'POST',
                json: true,
                form: {
                    secret: process.env.RECAPTCHA_SECRET,
                    response: code,
                    remoteip: ip
                }
            });

            if (gResponse) {
                return gResponse.success;
            }
        } catch (err) {
            console.error(err);
        }

        return false;
    }
};

module.exports = service;