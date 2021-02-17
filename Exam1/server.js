/*
 * Example URLs:
 *
 * http://localhost:3000/?cmd=calcDistance&budget=100&mpg=30&fuelCost=5
 *
 */

const http = require("http");
const server = http.createServer(requestHandler);

const url = require("url");
const queryString = require("qs");

server.listen(3000, process.env.IP, startHandler);

function startHandler() {
  let address = server.address();
  console.log("Server listening at", address.address + ":" + address.port);
}

function requestHandler(req, res) {
  try {
    let query = getQuery(req);

    if (!query["cmd"]) {
      throw Error("A command must be specified.");
    }

    let contentType = "";
    let result = {};

    switch(query["cmd"]) {
      case "calcDistance":
        contentType = "json";
        result = calcDistance(query);
        break;
      case "calcCost":
        contentType = "json";
        result = calcCost(query);
        break;
      default:
        throw Error("Invalid command: " + query['cmd'] + ".");
    }

    switch(contentType) {
      case "html":
        res.writeHead(200, {"Content-Type": "text/html"});
        res.write("<pre>" + result + "</pre>");
        break;
      case "json":
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(result));
        break;
    }
  }
  catch (e) {
    let error = {"error" : e.message};
    console.log(e.stack);

    res.write(JSON.stringify(error));
  }

  res.end("");
}

function getQuery(req) {
  let urlParts = url.parse(req.url, true);
  let query = queryString.parse(urlParts.query);

  return query;
}

function calcDistance(query) {
  let budget = query["budget"];
  let mpg = query["mpg"];
  let fuelCost = query["fuelCost"];
  
  //Check for undefined values
  if(!budget || !mpg || !fuelCost) {
    throw Error("You must provide a budget, mpg and fuelCost");
  }

  //Check for non numbers
  if (isNaN(budget) || isNaN(mpg) || isNaN(fuelCost)) {
    throw Error("You must provide numbers for budget, mpg and fuelCost");
  }

  //Division by zero
  if (fuelCost == 0) {
    throw Error("fuelCost cannot be 0");
  }

  let result = {distance: (budget * mpg) / fuelCost};

  return result;
}

function calcCost(query) {
  let distance = query["distance"];
  let mpg = query["mpg"];
  let fuelCost = query["fuelCost"];
  
  //Check for undefined values
  if(!distance || !mpg || !fuelCost) {
    throw Error("You must provide a distance, mpg and fuelCost");
  }

  //Check for non numbers
  if (isNaN(distance) || isNaN(mpg) || isNaN(fuelCost)) {
    throw Error("You must provide numbers for distance, mpg and fuelCost");
  }

  //Division by zero
  if (mpg == 0) {
    throw Error("MPG cannot be 0");
  }

  let result = {cost: (distance / mpg) * fuelCost};

  return result;
}
