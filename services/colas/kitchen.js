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

cookQueue.process(1, (job, done) => {
    notificationService
        .firmaConAgenteAutomatizado(job)
        .finally(() => done()); // Wait for the promise to resolve before exiting the process
});

cookQueueCiudadano.process(1, (job, done) => {
    notificationService
        .firmaConAgenteAutomatizadoCiudadano(job)
        .finally(() => done()); // Wait for the promise to resolve before exiting the process
});

cookQueueMPVE.process(1, (job, done) => {
    notificationService
        .firmaConAgenteAutomatizadoMPVE(job)
        .finally(() => done()); // Wait for the promise to resolve before exiting the process
});