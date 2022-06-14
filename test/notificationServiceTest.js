/**
 * Created by Angel Quispe
 */

const notificationService = require('./../services/notificationService');

describe('notificationServiceTest', () => {

    it('pdfAcuseNotifierTest()', async () => {
        console.log('start')

        let params = {
            notifier_doc_type: 'dni',
            notifier_doc: '46752638',
            notifier_name: 'ANGEL DAVID QUISPE CONDORI',
            notifier_area: 'GERENCIA DE FONDOS PARTIDARIOS',
            inbox_doc_type: 'dni',
            inbox_doc: '44455511',
            inbox_name: 'NOMBRE NOMBRE APELLIDO APELLIDO',
            organization_doc: ' 101234567899',
            organization_name: 'PARTIDO POLÍTICO 1',
            expedient: 'EXP 00012-2021-02-00015',
            timestamp: '17/02/2021 15:45:00',
            message_hash: 'asdasdasdasdgdfsgsdfgdsfgjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjajasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjajasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjajasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfjasfasfjsfjshfja',
            attachments_hashes: [
                {
                    name: 'hola1.pdf',
                    hash: 'd7c74b5aa81c540280ff6a6dd02765e1600317b46baa04e32a8fdd9f0a1ef386',
                    hash_type: 'sha256'
                },
                {
                    name: 'hola2.pdf',
                    hash: 'd7c74b5aa81c540280ff6a6dd02765e1600317b46baa04e32a8fdd9f0a1ef386',
                    hash_type: 'sha256'
                }
            ]
        }

        let result = await notificationService.pdfAcuseNotifier(params);

        console.log(result);

        console.log('end');
    });

    it('getFilesHashTest()', async () => {
        console.log('start')

        let attachments = [{
            path: 'notification/2021/2/17/1481c40c13dfdcff75a1272b1c856f57bd7d66ec7d68fd59532fe8144cda0539',
            name: 'hola1.pdf'
        }, {
            path: 'notification/2021/2/17/295751c8f7f0d24c8f48a8626f9050607645c759c78e32e3a00d91396fac3909',
            name: 'hola2.pdf'
        }]

        let result = await notificationService.getFilesHash(attachments);

        console.log(result);

        console.log('end');
    });

    it('downloadAcuseNotifierTest()', async () => {
        console.log('start')

        let idNotification = '6035a30ec93ab438e6c303b6';

        let result = await notificationService.downloadAcuseNotified(idNotification);

        console.log(result);

        console.log('end');
    });
});
