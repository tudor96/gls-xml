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
  let taxes =  await axios.get(`https://www.casaplant.ro/wp-json/wc/v3/taxes/`, {
    headers: {
      'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
      'Content-Type': 'application/json',
      'Host': 'www.casaplant.ro',
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  });

  var parser = new xml2js.Parser({ trim: true, normalizeTags: true, tagNameProcessors: [processWrongTags], attrValueProcessors: [processWrongAttrs] });
  parser.parseString(response.data, async function (err, result) {
    const finalObj = result.envelope.body[0].execriaresponse[0].execriaresult[0].sqlxml[0];
    const produse = finalObj.date[0].articole[0].articol;
    const produseProcessed = produse.map(produs => {
      const array = Object.entries(produs).map(([name, value]) => value)
      return array[0];
    });

    //loop on every product from Asis
    await Promise.all(produseProcessed.filter(async element => {
      //extract corespondent product from CasaPlant
      let productFromCasaPlant = await axios.get(`https://www.casaplant.ro/wp-json/wc/v3/products/?sku=${element.sku}`, {
        headers: {
          'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
          'Content-Type': 'application/json',
          'Host': 'www.casaplant.ro',
          'Connection': 'keep-alive',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });
      if (productFromCasaPlant.data.length === 0) {
        //product exists in CasaPlant
        let category = await axios.get(`https://www.casaplant.ro/wp-json/wc/v3/products/categories/?search=${element.denumire_grupa}`, {
          headers: {
            'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
            'Content-Type': 'application/json',
            'Host': 'www.casaplant.ro',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });

        if (category.data.length === 0) {
          //category non existent in CasaPlant
        }
        else {
          //category exists in CasaPlant
          let productToInsert = {
            name: element.denumire_scurta,
            sku: element.sku,
            regular_price: element.pret_vanzare_amanunt,
            stock_quantity: element.stoc,
            categories: [
              {
                id: category.data[0].id
              }
            ],
            tax_class: taxes.data.find(x => parseInt(x.rate).toFixed(0) === parseInt(element.cota_tva).toFixed(0)) ? taxes.data.find(x => parseInt(x.rate).toFixed(0) === parseInt(element.cota_tva).toFixed(0)).class : "standard",
            status: element.status === 'Inactiv' ? 'draft' : 'publish'
          }
          //create new product in CasaPlant
          await axios.post(`https://www.casaplant.ro/wp-json/wc/v3/products/`, productToInsert, {
            headers: {
              'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
              'Content-Type': 'application/json',
              'Host': 'www.casaplant.ro',
              'Connection': 'keep-alive',
              'Accept-Encoding': 'gzip, deflate, br'
            }
          }).catch(err => console.log(err));
        }
      }
      else {
        //product non existent in CasaPlant
        let category = await axios.get(`https://www.casaplant.ro/wp-json/wc/v3/products/categories/?search=${element.denumire_grupa}`, {
          headers: {
            'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
            'Content-Type': 'application/json',
            'Host': 'www.casaplant.ro',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });

        if (category.data.length === 0) {
          //category non existent in CasaPlant
        }
        else {
          //category exists in CasaPlant
          let productToUpdate = {
            name: element.denumire_scurta,
            sku: element.sku,
            regular_price: element.pret_vanzare_amanunt,
            stock_quantity: element.stoc,
            categories: [
              {
                id: category.data[0].id
              }
            ],
            tax_class: taxes.data.find(x => parseInt(x.rate).toFixed(0) === parseInt(element.cota_tva).toFixed(0)) ? taxes.data.find(x => parseInt(x.rate).toFixed(0) === parseInt(element.cota_tva).toFixed(0)).class : "standard",
            status: element.status === 'Inactiv' ? 'draft' : 'publish'
          }
          console.log(productToUpdate)
          //update product in CasaPlant
          await axios.put(`https://www.casaplant.ro/wp-json/wc/v3/products/${productFromCasaPlant.data[0].id}`, productToUpdate, {
            headers: {
              'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
              'Content-Type': 'application/json',
              'Host': 'www.casaplant.ro',
              'Connection': 'keep-alive',
              'Accept-Encoding': 'gzip, deflate, br'
            }
          }).catch(err => console.log(err));
        }
      }
      return element;
    }))
    return produseProcessed;
  });
}

getProducts();
