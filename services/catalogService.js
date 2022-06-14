/**
 * Created by Angel Quispe
 */
const mongodb = require('./../database/mongodb');
const logger = require('./../server/logger').logger;
const errors = require('./../common/errors');
const mongoCollections = require('./../common/mongoCollections');
const ObjectID = require('mongodb').ObjectID;

function diacriticSensitiveRegex(string = '') {
    return string.replace(/a/g, '[a,á,à,ä]')
        .replace(/e/g, '[e,é,ë]')
        .replace(/i/g, '[i,í,ï]')
        .replace(/o/g, '[o,ó,ö,ò]')
        .replace(/u/g, '[u,ü,ú,ù]');
}

const getCatalogByType = async(type) => {
    try {
        const db = await mongodb.getDb();

        let filter = {
            type: type
        }

        let cursor = await db.collection(mongoCollections.CATALOG).find(filter);

        let catalogs = [];

        for await (const catalog of cursor) {
            catalogs.push({ code: catalog.code, value: catalog.value });
        }

        return { success: true, catalogs: catalogs };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}

const paginateCatalog = async(search, page, count) => {
    try {
        const db = await mongodb.getDb();
        let _filter = {
            $or: [{ type: new RegExp(diacriticSensitiveRegex(search), 'i') },
                { code: new RegExp(diacriticSensitiveRegex(search), 'i') },
                { value: new RegExp(diacriticSensitiveRegex(search), 'i') }
            ]
        };

        let cursor = await db.collection(mongoCollections.CATALOG).find(_filter).collation({ locale: "en", strength: 1 }).sort({ create_date: -1 }).skip(page > 0 ? ((page - 1) * count) : 0).limit(count);
        let recordsTotal = await cursor.count();
        let data = [];
        for await (const item of cursor) {
            data.push({
                id: item._id,
                type: item.type,
                value: item.value,
                code: item.code,
            });
        }
        return { success: true, recordsTotal: recordsTotal, data: data, count: count };

    } catch (err) {
        logger.error(err);
        return { success: false, error: errors.INTERNAL_ERROR };
    }
}


const createCatalog = async(type, code, value, usuarioRegistro) => {
    const db = await mongodb.getDb();
    const filter = {
        type,
        code
    };
    const data = await db.collection(mongoCollections.CATALOG).findOne(filter);

    if (data) {
        return { success: false, error: 'Catálogo ya existe (tipo y código)' };
    }

    await db.collection(mongoCollections.CATALOG).insertOne({
        type,
        code,
        value,
        create_user: usuarioRegistro,
        create_date: new Date(),
    });
    return { success: true };
}

const updateCatalog = async(id, value, usuarioRegistro) => {
    const db = await mongodb.getDb();
    const filter = {
        _id: ObjectID(id)
    };
    const data = await db.collection(mongoCollections.CATALOG).findOne(filter);

    if (!data) {
        return { success: false, error: 'Catálogo no existe' };
    }

    await db.collection(mongoCollections.CATALOG).update(filter, {
        $set: {
            value,
            update_user: usuarioRegistro,
            update_date: new Date(),
        }
    });
    return { success: true };
}
const removeCatalog = async(id) => {
    const db = await mongodb.getDb();
    const filter = {
        _id: ObjectID(id)
    };
    const data = await db.collection(mongoCollections.CATALOG).findOne(filter);

    if (!data) {
        return { success: false, error: 'Catálogo no existe' };
    }

    await db.collection(mongoCollections.CATALOG).deleteOne(filter);
    return { success: true };
}
const getTypes = async() => {
    const db = await mongodb.getDb();
    const data = await db.collection(mongoCollections.CATALOG).distinct("type");
    let catalogs = [];
    for await (const catalog of data) {
        catalogs.push(catalog);
    }
    return catalogs;
}
module.exports = { getCatalogByType, paginateCatalog, createCatalog, updateCatalog, removeCatalog, getTypes };