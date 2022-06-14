/**
 * Created by Angel Quispe
 */

const inboxService = require('./../services/inboxService');
const appConstants = require('./../common/appConstants')

describe('inboxServiceTest', () => {

    it('getInboxUserCitizenTest()', async () => {
        console.log('start')

        let result = await inboxService.getInboxUserCitizen('dni','19000499','adakdjhlajalskdjhalkjsd');

        console.log(result);

        console.log('end');
    });

    it('downloadPdfInboxTest()', async () => {
        console.log('start')

        let result = await inboxService.downloadPdfInbox('6039256d28e0c07b59f3434a',appConstants.BOX_PDF_RESOLUTION);

        console.log(result);

        console.log('end');
    });
});
