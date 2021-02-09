var http = require('http');
var server = http.createServer(requestHandler); 
server.listen(40000, process.env.IP, startHandler);

function startHandler()
{
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
}

function requestHandler(req, res) 
{
  console.log("Handling a request")
  
  //Variable
  var url = require('url');
  var url_parts = url.parse(req.url, true);
  var query = url_parts.query;
  var cmd = getQueryKeyValue(query, "cmd");
    
  res.writeHead(200, {'Content-Type': 'text/html'});

  //Command Logic
  if (equalsIgnoreCase(cmd, "dotted")) {
    cmdDotted(res, query);
  }

  else if (equalsIgnoreCase(cmd, "numCheck")) {
    cmdNumCheck(res, query);
  }

  else if (equalsIgnoreCase(cmd, "gradeStats")) {
    cmdGradeStats(res, query);
  }

  else if (equalsIgnoreCase(cmd, "calculateRectangleProperties")) {
    cmdCalculateRectangleProperties(res, query);
  }

  //End
  res.end('');
}

//Dotted Logic
function cmdDotted(res, query) {

  let word1 = getQueryKeyValue(query, "word1");
  let word2 = getQueryKeyValue(query, "word2");
  let len = 30 - word1.length - word2.length;

  if (word1 === "" || word2 === "") {
    return;
  }

  res.write(word1);
  for(var i = 0; i < len; i++) {
    res.write(".");
  }
  res.write(word2);
}

//Num Check Logic
function cmdNumCheck(res, query) {
  let start = getQueryKeyValue(query, "start");
  let end = getQueryKeyValue(query, "end");

  if (start === "" || end === "") {
    return;
  }

  for(var i = parseInt(start); i <= parseInt(end); i++) {  
    
    //ThFi Logic
    if (i % 3 == 0 && i % 5 == 0) {
      res.write("ThFi");
    }

    //Th Logic
    else if (i % 3 == 0) {
      res.write("Th");
    }

    //Fi Logic
    else if (i % 5 == 0) {
      res.write("Fi");
    }

    //Default Logic
    else {
      res.write("" + i);
    }

    res.write("</br>");
  }
}

//Grade Stats Logic
function cmdGradeStats(res, query) {
  let grades = getQueryKeyValue(query, "grade");

  let json = {
    average: 0,
    minimum: null,
    maximum: null
  };

  console.log(grades);
  for(var i in grades) {

    let grade = grades[i];

    //Add to the average
    json.average += parseInt(grade);

    //Check if lowest grade
    if (json.minimum === null || grade < json.minimum) {
      json.minimum = parseInt(grade);
      console.log("New Lowest " + grade);
    }

    //Check if highest grade
    if (json.maximum === null || grade > json.maximum) {
      json.maximum = parseInt(grade);
    }
  }

  //Calculate Average
  json.average /= grades.length;

  //Send Response
  res.write("<pre>" + JSON.stringify(json) + "</pre>");
}

//Calculate Rectangle Properties Logic
function cmdCalculateRectangleProperties(res, query) {

  let length = getQueryKeyValue(query, "length");
  let width = getQueryKeyValue(query, "width");

  if (length === "" || width === "") {
    return;
  }

  //Parse Integers
  length = parseInt(length);
  width = parseInt(width);

  //Respond with JSON
  let json = {
    area: (length * width),
    perimeter: (length * 2) + (width * 2)
  };
  res.write("<pre>" + JSON.stringify(json) + "</pre>");
}

//Returns the value assigned to the target key or null
function getQueryKeyValue(query, targetKey) {
  for(var key in query) {
    if (key === targetKey) {
      return query[key];
    }
  }
  return "";
}

//Equals ignore case
function equalsIgnoreCase(str1, str2) {
  return str1.toUpperCase() === str2.toUpperCase();
}
