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
  let products = await axios.get('https://www.casaplant.ro/wp-json/wc/v3/products/?per_page=100', {
    headers: {
      'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
      'Content-Type': 'application/json',
      'Host': 'www.casaplant.ro',
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  });

  let categories = await axios.get('https://www.casaplant.ro/wp-json/wc/v3/products/categories/?per_page=100', {
    headers: {
      'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
      'Content-Type': 'application/json',
      'Host': 'www.casaplant.ro',
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  });
  let response = await axios.post('http://asis.glissando.ro:8081/asis/mobria/dateria.asmx', xmlBodyRequest, {
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Host': 'asis.glissando.ro',
      'SOAPAction': 'http://asw.ro/execRIA',
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  });

  //console.log("categories: ", categories.data[0])
  var parser = new xml2js.Parser({ trim: true, normalizeTags: true, tagNameProcessors: [processWrongTags], attrValueProcessors: [processWrongAttrs] });
      parser.parseString(response.data, async function (err, result) {
        const finalObj = result.envelope.body[0].execriaresponse[0].execriaresult[0].sqlxml[0];
        const produse = finalObj.date[0].articole[0].articol;
        const produseProcessed = produse.map(produs => {
          const array = Object.entries(produs).map(([name, value]) => value)
          return array[0];
        });
       /*  console.log("Date", finalObj.date);
        console.log("Mesaje", JSON.stringify(finalObj.mesaje));
        console.log("Errori", finalObj.erori);
        console.log(produseProcessed)  */
        produseProcessed[0].sku = 'FER-002'; 

        produseProcessed.forEach(element => {
          if(categories.data.find(x => x.name.toUpperCase() === element.denumire_grupa.toUpperCase())) {
          }
        });

        /* let promises = produseProcessed.map(element => {
          return axios.get(`https://www.casaplant.ro/wp-json/wc/v3/products/?sku=${element.sku}`, {
          headers: {
            'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
            'Content-Type': 'application/json',
            'Host': 'www.casaplant.ro',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });
        }) */

      await Promise.all(produseProcessed.filter(async element => {
          let productFromCasaPlant = await axios.get(`https://www.casaplant.ro/wp-json/wc/v3/products/?sku=${element.sku}`, {
          headers: {
            'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
            'Content-Type': 'application/json',
            'Host': 'www.casaplant.ro',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });
        if(productFromCasaPlant.data.length === 0){
          let category = await axios.get(`https://www.casaplant.ro/wp-json/wc/v3/products/categories/?search=${element.denumire_grupa}`, {
          headers: {
            'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
            'Content-Type': 'application/json',
            'Host': 'www.casaplant.ro',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        });

          if(category.data.length === 0){
            
          }
          else{
            if(element.sku === '709'){
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
                status: element.status === 'Inactiv' ? 'draft' : 'publish'
              }
             //console.log(productToInsert)

              let insertedProduct = await axios.post(`https://www.casaplant.ro/wp-json/wc/v3/products/products/`, {
          headers: {
            'Authorization': 'Basic Y2tfNjQ3OGE0MTUzYTliNTE1ZjEzMjcwYzkwMTNhNTZlMTY5NmI4N2JkZDpjc18wOWJmZGNmNzY0NmZmNmNhNTVjZGYyNDUyMTE2Zjk0NDM4MzhiNjMx',
            'Content-Type': 'application/json',
            'Host': 'www.casaplant.ro',
            'Connection': 'keep-alive',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        },
        productToInsert
        );
              console.log(insertedProduct);
            }
          }
          // search category
          // if not existent => create category
          // insert product
        }
        else{
         // console.log("else: ", element.denumire_scurta)

          // update product 
        }
        return element;
        })) 

     /*  let productsUnmatched = await Promise.all(promises).then(values => {
        let newValues = [];
         values.forEach(val => {
          if(val.data.length === 0){
            newValues.push(val.data[0]);
          }
        })
        console.log(newValues)
      }) */



        return produseProcessed;
      });
}

getProducts();
