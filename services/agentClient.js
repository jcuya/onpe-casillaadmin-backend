const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const credential_agente = process.env.CREDENCIAL_AGENTE;
const url_agente = process.env.URL_AGENTE;
const stamp_agente = './assets/img/stamp_agente.PNG';
const parametros_firma = {
    signatureFormat: "PAdES",
    signatureLevel: "B",
    signaturePackaging: "",
    webTsa: "",
    userTsa: "",
    passwordTsa: "",
    contactInfo: "",
    signatureReason: "Soy el autor del documento",
    signatureStyle: 1,
    stampTextSize: 14,
    stampWordWrap: 37,
    stampPage: 1,
    positionx: 20,
    positiony: 20,
};
const parametros_agente = JSON.stringify(parametros_firma);

const agentClient =  async (pdf,pdf_firmado) =>{

    let stamp   = fs.createReadStream(stamp_agente);
    let document   = fs.createReadStream(pdf);

    let formData = new FormData()
    formData.append('param', parametros_agente);
    formData.append('credential', credential_agente);
    formData.append('document', document);
    formData.append('stamp', stamp);
    let formHeaders = formData.getHeaders();

    await axios.post(url_agente, formData, {
        headers: {       
            ...formHeaders,   
        },
        responseType: 'arraybuffer',
    })
    .then((res) => {
        //console.log(res);
        fs.writeFileSync(pdf_firmado, res.data,{encoding:'utf8'}, function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("El archivo ha sido guardado");
            return "OK";
        });
    })
    .catch(error => {
        console.log(error);
    });
}

module.exports = {
    agentClient
};