var xml2js = require("xml2js");
var axios = require("axios");

function processWrongTags(name) {
  return name.replace("soap:", '').replace("$", 'item');
}

function processWrongAttrs(name) {
  return name.replace("$", 'item');
}

const xmlBodyRequest = `<soap:Envelope
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:xsd="http://www.w3.org/2001/XMLSchema"
xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
<soap:Body>
      <execRIA
             xmlns="http://asw.ro/">
             <sesiune>site</sesiune>
           <proceduraSQL>SNCwExportArticoleMagazinOnline</proceduraSQL>
             <strParXML></strParXML>
             <reqTimeOut>999</reqTimeOut>
      </execRIA>
</soap:Body>    
</soap:Envelope>
`;

let getProducts = async () => {
  let response = await axios.post('http://asis.glissando.ro:8081/asis/mobria/dateria.asmx', xmlBodyRequest, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Host': 'asis.glissando.ro',
      'SOAPAction': 'http://asw.ro/execRIA',
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  });
  var parser = new xml2js.Parser({ trim: true, normalizeTags: true, tagNameProcessors: [processWrongTags], attrValueProcessors: [processWrongAttrs] });
      parser.parseString(response.data, function (err, result) {
        const finalObj = result.envelope.body[0].execriaresponse[0].execriaresult[0].sqlxml[0];
        const produse = finalObj.date[0].articole[0].articol;
        const produseProcessed = produse.map(produs => {
          const array = Object.entries(produs).map(([name, value]) => value)
          return array[0];
        });
        console.log("Date", finalObj.date);
        console.log("Mesaje", JSON.stringify(finalObj.mesaje));
        console.log("Errori", finalObj.erori);
        console.log(produseProcessed)
      });
}

getProducts();
