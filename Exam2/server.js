// Constants
const express = require('express');
const app = express();

const PORT = 3000;
const CONNECTION_INFO = {
    host: process.env.IP,
    user: "root",
    password: "",
    database: "Gifts"
};

// State
let mysql = require('mysql');
let session = require('express-session'); 


// Trigger App Functions
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}));

app.get('/', gifts);
app.get('/add', add);
app.get('/clear', clear);
app.get('/info', info);

app.listen(PORT, process.env.IP, startHandler());

//Handler Start Function
function startHandler() {
  console.log('Server listening on port ' + PORT);
}


/*
  Displays all gifts within
  Parameters: None
*/
function gifts(req, res) {
  //Logic
  try {
    updateSession(req, true);
    
    //Connect to the database
    let con = mysql.createConnection(CONNECTION_INFO);

    con.connect(function(err) {
        //Failure
        if (err) {
          writeResponse(res, {"error" : err}); 
          return;
        }
    
        displayGifts(req, res, con);
    });
  }
  
  // Error Handling
  catch (e) {
    writeResponse(res, {'error' : e.message});
  }
}

/*
  Adds a new gift to the database
  Parameters:
    gift - Required. The gift being inserted.
*/
function add(req, res) {
  //Logic
  try {
    updateSession(req, true);

    //Ensure valid data
    if (req.query.gift == undefined) {
      writeResponse(res, {"error" : "Please provide a gift to give."}); 
      return;
    }
    
    //Connect to the database
    let con = mysql.createConnection(CONNECTION_INFO);

    con.connect(function(err) {
        //Failure
        if (err) {
          writeResponse(res, {"error" : err}); 
          return;
        }
    
        //Add to the database
        con.query(`INSERT INTO Gifts(GiftName) Values (?)`, [req.query.gift], function(err, result){
          //Failure
          if (err) {
            writeResponse(res, {"error" : err}); 
            return;
          }
          
          //Success
          req.session.sessionGiftsAdded++;
        });
        
        //Display the list of songs
        displayGifts(req, res, con);
    });
  }
  
  // Error Handling
  catch (e) {
    writeResponse(res, {'error' : e.message});
  }
}

/*
  Removes all gifts from the database
  Parameters: None
*/
function clear(req, res) {
  //Logic
  try {
    updateSession(req, true);
    
    //Connect to the database
    let con = mysql.createConnection(CONNECTION_INFO);

    con.connect(function(err) {
        //Failure
        if (err) {
          writeResponse(res, {"error" : err}); 
          return;
        }
    
        //Add to the database
        con.query(`TRUNCATE TABLE Gifts`, function(err, result){
          //Failure
          if (err) {
            writeResponse(res, {"error" : err}); 
            return;
          }
        });
    
        //Display the list of songs
        displayGifts(req, res, con);
    });
  }
  
  // Error Handling
  catch (e) {
    writeResponse(res, {'error' : e.message});
  }
}

/*
  Displays information about the session
  Parameters: None
*/
function info(req, res) {
  //Logic
  try {
    updateSession(req, false);

    //Connect to the database
    let con = mysql.createConnection(CONNECTION_INFO);

    con.connect(function(err) {
        //Failure
        if (err) {
          writeResponse(res, {"error" : err}); 
          return;
        }
        
        //Success
        con.query("SELECT COUNT(*) AS 'count' FROM Gifts", function(err, result) {
          //Failure
          if (err) {
            writeResponse(res, {"error" : err}); 
            return;
          }
        
          //Success
          writeResponse(res, {
            "sessionVisits": req.session.sessionVisits,
            "sessionGiftsAdded": req.session.sessionGiftsAdded,
            "totalGifts": result[0].count
          });
        });
      }
    );
  }
  // Error Handling
  catch (e) {
    writeResponse(res, {'error' : e.message});
  }
}

//Updates the session information
function updateSession(req, increment) {
  
  //Session Visits
  if (req.session.sessionVisits == undefined) {
    req.session.sessionVisits = 0;
  }
  
  //Session Gifts
  if (req.session.sessionGiftsAdded == undefined) {
    req.session.sessionGiftsAdded = 0;
  }
  
  if (increment) {
    req.session.sessionVisits++;
  }
}

//Write a JSON response
function writeResponse(res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}

//Displays all gifts
function displayGifts(req, res, con) {
  con.query("SELECT * FROM Gifts", function(err, result) {
    //Failure
    if (err) {
      writeResponse(res, {"error" : err}); 
      return;
    }

    //Success
    let gifts = [];
    result.forEach(element => gifts.push(element.GiftName));
    writeResponse(res, {gifts: gifts});
  });
}
