const Queue = require('bee-queue');
//const firma = require('./../../controller/userController');

const options = {
    //isWorker: false,
    //sendEvents: false,
    removeOnSuccess: true, //
    redis: {
        host: process.env.REDIS_WRITER,
        port: 6379,
        password: process.env.REDIS_PASSWORD,
    },
}

const cookQueue = new Queue('cook', options);
const cookQueueCiudadano = new Queue('cookCiudadano', options);
const cookQueueMPVE = new Queue('cookMPVE', options);

const placeOrder = (order) => {
    return cookQueue.createJob(order).save();
};

const placeOrderCiudadano = (order) => {
    return cookQueueCiudadano.createJob(order).save();
};

const placeOrderMPVE = (order) => {
    return cookQueueMPVE.createJob(order).save();
};

module.exports = {
    placeOrder: placeOrder,
    placeOrderCiudadano: placeOrderCiudadano,
    placeOrderMPVE: placeOrderMPVE,
};