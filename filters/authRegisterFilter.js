/**
 * Created by Angel Quispe
 */

const jwt = require('jsonwebtoken');
const appConstants = require('./../common/appConstants');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        try {
            req.user = jwt.verify(token, process.env.AUTH_JWT_HMACKEY);

            if(req.user.profile === appConstants.PROFILE_REGISTER){
                req.token = token;
                return next();
            }
            // else if(req.user.profile === appConstants.PROFILE_REGISTER_no){

            // }
        } catch (err) {
            console.log(err)
        }
    }

    return res.sendStatus(401);
};
