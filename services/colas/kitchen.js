const Queue = require('bee-queue');
const notificationService = require('./../notificationService');

const options = {
    redis: {
        host: process.env.REDIS_WRITER,
        port: 6379,
        password: process.env.REDIS_PASSWORD,
    },
}

const cookQueue = new Queue('cook', options);
const cookQueueCiudadano = new Queue('cookCiudadano', options);
const cookQueueMPVE = new Queue('cookMPVE', options);

cookQueue.process(8, (job, done) => {

    notificationService.firmaConAgenteAutomatizado(job);
    done();
});

cookQueueCiudadano.process(8, (job, done) => {
   
    notificationService.firmaConAgenteAutomatizadoCiudadano(job);
    done();
});

cookQueueMPVE.process(8, (job, done) => {
    notificationService.firmaConAgenteAutomatizadoMPVE(job);
    done();
});