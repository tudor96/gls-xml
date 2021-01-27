var fs = require("fs"),
  xml2js = require("xml2js");


  function processWrongTags(name){
    return name.replace("soap:",'').replace("$",'item');
}

  function processWrongAttrs(name){
    return name.replace("$",'item');
}

var parser = new xml2js.Parser({trim: true, normalizeTags: true, tagNameProcessors: [processWrongTags], attrValueProcessors: [processWrongAttrs]});

fs.readFile(__dirname + "/endpoint.xml", function (err, data) {
  parser.parseString(data, function (err, result) {
    const finalObj = result.envelope.body[0].execriaresponse[0].execriaresult[0].sqlxml[0];
    const produse = finalObj.date[0].articole[0].articol;
    const produseProcessed = produse.map(produs => {
        const array =  Object.entries(produs).map(([name, value]) => value)
        return array[0];
    });
    console.log("Date",finalObj.date);
    console.log("Mesaje",finalObj.mesaje);
    console.log("Errori",finalObj.date);
    console.log(produseProcessed)



    console.log("Done");
  });
});
