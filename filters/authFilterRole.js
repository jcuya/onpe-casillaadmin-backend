/**
 * Created by Eduardo Tolentino Escarcena
 */

const jwt = require('jsonwebtoken');
const appConstants = require('./../common/appConstants');
const {redisReader} = require("../database/redis");

module.exports = async (role, req, res, next) => {
    const authHeader = req.headers.authorization;

    let prefix = new String(authHeader);
    let validate = prefix.startsWith(appConstants.TOKEN_PREFIX);
    if (validate) {
        const token = authHeader.split(' ')[1];
        try {
            let exists = await redisReader.get(token);
            if (!exists) {
                return res.status(401).send({message:"No autorizado"});
            }
            req.user = jwt.verify(token, process.env.AUTH_JWT_HMACKEY);
            if (role.includes(req.user.profile)) {
                req.token = token;
                return next();
            }
        } catch (err) {
            console.log(err)
        }
    }

    return res.status(401).send({message:"No autorizado"});
};
