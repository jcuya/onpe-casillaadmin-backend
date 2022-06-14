/**
 * Created by Angel Quispe
 */

const userService = require('./../services/userService');
const utils = require('./../common/utils');

describe('userServiceTest', () => {

    it('createUserTest()', async() => {
        console.log('start')

        let newUser = {
            doc_type: 'dni',
            doc: '42138246',
            profile: 'notifier',
            name: 'CARLOMAN',
            lastname: 'CENTURION BARDALES',
            email: 'carloman.centurion@gmail.com',
            cellphone: '900000000',
            address: 'Calle Lima 550',
            job_area_code: '0001',
            job_area_name: 'GERENCIA DE SUPERVISIÓN DE FONDOS PARTIDARIOS'
        }

        let result = await userService.createUser(newUser);

        console.log(result);

        console.log('end');
    });

    it('passwordEncrypt', async() => {
        console.log('start')

        var result = utils.passwordHash('Ab123456');

        console.log(result);

        console.log('end');
    });

});