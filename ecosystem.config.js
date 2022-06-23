module.exports = {
    apps: [{
        name: 'webservice_admin',
        script: './bin/www',
        output: './storage/logs/debug.log',
        error: './storage/logs/error.log',
        merge_logs: true,
        env: {
            NODE_ENV: 'production',
            NODE_PORT: 3031,
            BASE_URL: "https://casilla-admin-api.onpe.mvpdemoapp.com",
            BASE_URL_FRONT: 'https://casilla-admin.onpe.mvpdemoapp.com',
            BASE_URL_FRONT_CITIZEN: 'https://casilla.onpe.mvpdemoapp.com',
            PATH_UPLOAD: '/var/www/casilla_files',
            PATH_UPLOAD_TMP: '/var/www/casilla_files_tmp',
            AUTH_JWT_HMACKEY: 'yMbKU98DEPmmfxBtbpKK2ULS7MhhRc',
            CLIENT_ID: 'QbJw1M1BUuUU771Wlb6uxQrp0NE',
            CLIENT_SECRET: 'Sf3WdcXJi_Zt6Ocf9aTx',
            PROTOCOL: 'S',
            MONGODB_WEB_HOST: '127.0.0.1',
            MONGODB_WEB_USERNAME: 'admin',
            MONGODB_WEB_PASSWORD: 'admin',
            MONGODB_WEB_DATABASE: 'casilla',
            REDIS_WRITER: '127.0.0.1',
            REDIS_READER: '127.0.0.1',
            REDIS_PASSWORD: 'redis',
            ELASTIC_URL: 'https://demo.com',
            ELASTIC_USERNAME: 'username',
            ELASTIC_PASSWORD: 'password',
            ELASTIC_INDEX_MATCHER: 'casilla',
            AWS_REGION_SES: 'us-east-2',
            AWS_REGION_SES_MAIL: 'SISEN <proyectos.sgiid@gmail.com>',
            AWS_ACCESS_KEY_ID_SES: 'AKIAUHWOMIT4EZUJYI5T',
            AWS_SECRET_ACCESS_KEY_SES: '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',
            RECAPTCHA_SECRET: '6LeFgcMZAAAAAJW0e3Qoh0VcAeYQ4UCqD58VkvKf',
            URL_RENIEC: 'http://192.168.48.69:8080/ws_padron_reniec/api/padron/dni',
            URL_SUNAT: 'https://ws3.pide.gob.pe/Rest/Sunat/DatosPrincipales',
            CODIGO_RENIEC: 'bgeCmJjIcGy8J9TECc5Lsw==',
            CLAVE_RENIEC: 'FeD0Ea74o2GwGWeeO9aNl9epmhlSrxJ6rka1kG9axlg=',
            WS_CLARIDAD: 'http://192.168.48.159:9001/apiClaridad/candidato/findByDocumentoIdentidad'
        }
    }]
};