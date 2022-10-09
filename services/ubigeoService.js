const mongodb = require('./../database/mongodb');
const mongoCollections = require('./../common/mongoCollections');

const listaDepartamentos  = async() => {
    const db = await mongodb.getDb();
    return (await db.collection(mongoCollections.UBIGEOS)
        .find(
            {
                ubprv: '00',
                estubi: '1',
            },
            {
                _id: 0,
                ubdep: 1,
                nodep: 1,
            },
        )
        .sort({ nodep: 1 }))
        .toArray();
}

const listaProvincias = async(codigoDepartamento) => {
    console.log('lista de provincias de ', codigoDepartamento);
    const db = await mongodb.getDb();
    return (await db.collection(mongoCollections.UBIGEOS)
        .find(
            {
                ubdep: codigoDepartamento,
                ubdis: '00',
                estubi: '1',
                noprv: { $exists: true },
            },
            {
                _id: 0,
                ubdep: 1,
                ubprv: 1,
                noprv: 1,
            },
        )
        .sort({ noprv: 1 }))
        .toArray();
}

const listaDistritos  = async(codigoDepartamento, codigoProvincia) => {
    console.log('lista distritos de ', codigoDepartamento, codigoProvincia);
    const db = await mongodb.getDb();
    return (await db.collection(mongoCollections.UBIGEOS)
        .find(
            {
                ubdep: codigoDepartamento,
                ubprv: codigoProvincia,
                estubi: '1',
                nodis: { $exists: true },
            },
            {
                _id: 0,
                ubdep: 1,
                ubprv: 1,
                ubdis: 1,
                nodis: 1,
            },
        )
        .sort({ nodis: 1 }))
        .toArray();
}


module.exports = {listaDepartamentos, listaProvincias, listaDistritos};