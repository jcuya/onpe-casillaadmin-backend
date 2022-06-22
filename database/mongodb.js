/**
 * Created by Miguel Pazo (https://miguelpazo.com)
 */

const mongoClient = require('mongodb').MongoClient;

let _db;

let component = {
    getDb: async () => {
        if (!_db) {
            let result = await getConnections();

            if (!result) {
                console.error('Error connecting to mongodb.');
                return null;
            }
        }

        return _db;
    }
};

async function getConnections() {
    if (_db) {
        return _db;
    }

    let uri;
    let connectConfig = {
        poolSize: 1,
        keepAlive: true,
        connectTimeoutMS: 5000,
        useUnifiedTopology: true,
        // autoReconnect: true,
        // reconnectTries: 10,
    };

  //  uri = `mongodb://${process.env.MONGODB_WEB_USERNAME}:${process.env.MONGODB_WEB_PASSWORD}@${process.env.MONGODB_WEB_HOST}`;//SOLO PARA PRUEBAS
  uri = `mongodb://localhost:27017`;

    try {
        _db = await mongoClient.connect(uri, connectConfig);
        _db = _db.db(process.env.MONGODB_WEB_DATABASE);
    } catch (err) {
        console.error(err);
    }

    return _db;
}

module.exports = component;
