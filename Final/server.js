const bcrypt = require('bcrypt');
const express = require("express");
const fs = require("fs");
const mysql = require('mysql');
const session = require("express-session");

const app = express();

const conInfo =  {
    host: process.env.IP,
    user: "root",
    password: "",
    database: "TreasureHunt"
};

const port = 3000;

const sessionOptions = {
  secret: "correct horse battery staple",
  resave: false,
  saveUninitialized: false,
  cookie: {maxAge: 600000}
};

app.use(session(sessionOptions));
app.get("/", serveIndex);
app.get("/game", game);
app.get("/settings", settings);
app.all('/whoIsLoggedIn', whoIsLoggedIn);                  
app.all('/register', register);
app.all('/login', login);
app.all('/logout', logout);
app.all('/history', history);
app.listen(port,  "localhost", startHandler());

/**
 * Start the handler
 */
function startHandler() {
  console.log(`Server listening on port ${port}`);
}

/**
 * Serve the index.html page to the server
 */
function serveIndex(req, res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  
  let index = fs.readFileSync("index.html");
  res.end(index);
}

/**
 * Game Logic
 * req - The request
 * res - The response
 */
function game(req, res) {
  let result = {};

  try {
    if (!req.session.answer) { resetGame(req); }

    if (req.query.guess == undefined) {
      resetGame(req);
      result = {gameStatus: "Pick a number from 1 to 100.", guesses: req.session.guesses, gameOver: false};      
    }
    else {
      result = evaluateGuess(req, res);
    }
  }
  catch (e) {
    result = handleError(e);
  }

  if (result) { writeResult(res, result); }
}

/**
 * Returns the history
 * req - The request
 * res - The response
 */
function history(req, res) {
  if (req.session.user == undefined) {
    writeResult(res, {'error' : "You must be logged in to view a history!"});
    return;
  }

  let con = mysql.createConnection(conInfo);
  let user = req.session.user.user;

  con.connect(function(err) {
    if (err) { writeResult(res, {'error' : err}); }
    else {
      con.query("SELECT * FROM Game WHERE UserId = ?;", [ user.id ], function (err, result, fields) {
        if (err)  { writeResult(res, {'error' : err}); }

        let games = [];

        for(let i = 0; i < result.length; i++) {
          games.push({
            'date' : result[i].DatePlayed,
            'boxCount' : result[i].BoxCount,
            'guessesUsed' : result[i].GuessesUsed,
            'maxAttempts' : result[i].MaxAttempts,
            'victory' : result[i].Victory
          });
        }

        writeResult(res, {'history' : games});
      });
    };
  });
}

/**
 * Resets the game
 * req - The request
 */
function resetGame(req) {
  let max = req.query.max || 100;

  req.session.guesses = 0;
  req.session.answer = Math.floor(Math.random() * max) + 1;
}

/**
 * Evaluates the game state
 * req - The request
 * res - The response
 */
function evaluateGuess(req, res) {
  validateGuess(req);

  incrementGuesses(req);

  if(isGuessCorrect(req)) {
    submitScore(req, res, true);
    result = winGame(req, res);
  }

  else if (isOutOfGuesses(req)) {
    submitScore(req, res, false);
    result = loseGame(req, res);
  }

  else if(isGuessTooHigh(req)) {
    result = {gameStatus: "Too high. Guess again!", guesses: req.session.guesses, gameOver: false, victory: false};
  }

  else {
    result = {gameStatus: "Too low. Guess again!", guesses: req.session.guesses, gameOver: false, victory: false};
  }

  return result;
}

/**
 * Check if the user has any remaining guesses
 * 0 max guesses is treated as infinite guesses
 * req - The request
 */
function isOutOfGuesses(req) {

  let currentGuesses = req.session.guesses;
  let maxAttempts = req.session.user.user.maxAttempts;

  if (maxAttempts <= 0) { return false; }

  return (currentGuesses >= maxAttempts);
}

/**
 * Ensure the validity of the guess
 * req - The request
 */
function validateGuess(req) {
  let guess = parseInt(req.query.guess);
  let message = `Guess must be a number between 1 and ${req.session.max}.`;

  if(isNaN(guess)) { throw Error(message); }
  if(guess < 1 || guess > req.session.max) { throw Error(message); }
}

function submitScore(req, res, victory) {
  
  if (req.session.user == undefined) {
    writeResult(res, {'error' : "You must be logged in to submit a score!"});
    return;
  }

  let con = mysql.createConnection(conInfo);
  let user = req.session.user.user;
  let today = new Date().toISOString().slice(0, 19).replace('T', ' ');

  con.connect(function(err) {
    if (err) { writeResult(res, {'error' : err}); }
    else {
      con.query("INSERT INTO Game (UserId, DatePlayed, BoxCount, GuessesUsed, MaxAttempts, Victory) VALUES (?, ?, ?, ?, ?, ?)",
        [ user.id, today, user.boxCount, req.session.guesses, user.maxAttempts, victory ], function (err, result, fields) {
        if (err)  { writeResult(res, {'error' : err}); }
      });
    };
  });
}

/**
 * Check if the guess is correct
 * req - The request
 */
function isGuessCorrect(req) {
  return (req.query.guess == req.session.answer);
}

/**
 * Success game completion logic (win state)
 * req - The request
 * res - The response
 */
function winGame(req, res) {
  req.session.answer = undefined;

  result = {
    gameStatus: `Correct! It took you ${req.session.guesses} guesses. Play Again!`,
    guesses: req.session.guesses,
    gameOver: true,
    victory: true
  };

  return result;
}

/**
 * Success game completion logic (lose state)
 * req - The request
 * res - The response
 */
function loseGame(req, res) {
  req.session.answer = undefined;

  result = {
    gameStatus: `Failure! You too too many guesses! Play Again!`,
    guesses: req.session.guesses,
    gameOver: true,
    victory: false
  };

  return result;
}

/**
 * Increments the guesses up by 1
 * req - The request
 */
function incrementGuesses(req) {
  req.session.guesses++;
}

/**
 * Checks to see if the guess is too high
 * req - The request
 */
function isGuessTooHigh(req) {
  return (req.query.guess > req.session.answer);
}

/**
 * Writes a json response
 * req - The request
 * result - The json content being written to the response
 */
function writeResult(res, result) {
  res.writeHead(200, {"Content-Type": "application/json"});
  res.end(JSON.stringify(result));
}

/**
 * Error Handling
 * e - The error being handled
 */
function handleError(e){
  console.log(e.stack);
  return {error: e.message};
}

/**
 * Return who is logged in
 * req - The request
 * res - The response
 */
function whoIsLoggedIn(req, res) {
  if (req.session.user == undefined) {
    writeResult(res, {'user' : {
      'id' : undefined,
      'email' : undefined,
      'boxCount' : 6,
      'maxAttempts' : 0
    }});
  }
  else {
    writeResult(res, req.session.user);
  }
}

/**
 * Updates the user's settings 
 * req - The request
 * res - The response
 */
function settings(req, res) {

  if (req.session.user == undefined) {
    writeResult(res, {'error' : "You must be logged in to update settings."});
    return;
  }

  let con = mysql.createConnection(conInfo);

  con.connect(function(err) {
    if (err) { writeResult(res, {'error' : err}); }
    else {
    
      // Update the user's box count
      con.query("UPDATE User SET BoxCount = ? WHERE Id = ?", [req.query.boxCount, req.session.user.user.id], function(err, result) {
        if (err) { writeResult(res, {'error' : err}); }
        req.session.user.user.boxCount = req.query.boxCount;

        // Update the user's max attempts
        con.query("UPDATE User SET MaxAttempts = ? WHERE Id = ?", [req.query.maxAttempts, req.session.user.user.id], function(err, result) {
          if (err) { writeResult(res, {'error' : err}); }
          req.session.user.user.maxAttempts = req.query.maxAttempts;

          //Restart the game
          con.query("SELECT * FROM User WHERE Email = ?", [req.session.user.user.email], function (err, result, fields) {
            if (err) { writeResult(res, {'error' : err}); }
            else {
              req.session.user = {'user' : {
                'id' : result[0].Id,
                'email' : result[0].Email,
                'boxCount' : result[0].BoxCount,
                'maxAttempts' : result[0].MaxAttempts,
              }};

              req.query.max = req.query.boxCount;
              resetGame(req);

              writeResult(res, req.session.user);
            }
          });
        });
      });
    }
  });
}

/**
 * Register new user
 * req - The request
 * res - The response
 */
function register(req, res)
{
  if (req.query.email == undefined || !validateEmail(req.query.email)) {
    writeResult(res, {'error' : "Please specify a valid email"});
    return;
  }

  if (req.query.password == undefined || !validatePassword(req.query.password)) {
    writeResult(res, {'error' : "Password must have a minimum of eight characters, at least one letter and one number"});
    return;
  }

  let con = mysql.createConnection(conInfo);
  con.connect(function(err)  {
    if (err) { writeResult(res, {'error' : err}); }
    else {
      // bcrypt uses random salt is effective for fighting
      // rainbow tables, and the cost factor slows down the
      // algorithm which neutralizes brute force attacks ...
      let hash = bcrypt.hashSync(req.query.password, 12);
      con.query("INSERT INTO User (Email, Password) VALUES (?, ?)", [req.query.email, hash], function (err, result, fields) {
        if (err)  {
          if (err.code == "ER_DUP_ENTRY") { err = "User account already exists."; }
          writeResult(res, {'error' : err});
        }
        else {
          con.query("SELECT * FROM User WHERE Email = ?", [req.query.email], function (err, result, fields) {
            if (err) { writeResult(res, {'error' : err}); }
            else {
              req.session.user = {'user' : {
                'id' : result[0].Id,
                'email' : result[0].Email,
                'boxCount' : result[0].BoxCount,
                'maxAttempts' : result[0].MaxAttempts,
              }};
              writeResult(res, req.session.user);
            }
          });
        }
      });
    }
  });
}

/**
 * Login to an existing user
 * req - The request
 * res - The response
 */
function login(req, res) {
  
  if (req.query.email == undefined) {
    writeResult(res, {'error' : "Email is required"});
    return;
  }

  if (req.query.password == undefined) {
    writeResult(res, {'error' : "Password is required"});
    return;
  }
  
  let con = mysql.createConnection(conInfo);
  con.connect(function(err) {
    if (err) { writeResult(res, {'error' : err}); }
    else {
      
      con.query("SELECT * FROM User WHERE Email = ?", [req.query.email], function (err, result, fields)  {
        if (err) { writeResult(res, {'error' : err}); }
        else {
          if(result.length == 1 && bcrypt.compareSync(req.query.password, result[0].Password)) {
            req.session.user = {'user' : {
              'id' : result[0].Id,
              'email' : result[0].Email,
              'boxCount' : result[0].BoxCount,
              'maxAttempts' : result[0].MaxAttempts,
            }};
            writeResult(res, req.session.user);
          }
          else  {
            writeResult(res, {'error': "Invalid email/password"});
          }
        }
      });
    }
  });
}

/**
 * Logout of the current userefine
 * req - The request
 * res - The response
 */
function logout(req, res) {
  req.session.user = undefined;
  writeResult(res, {'user' : {'id' : undefined, 'email' : undefined}});
}

/**
 * Ensure an email address is valid
 * email - The email address provided
 */
function validateEmail(email) 
{
  if (email == undefined) {
    return false;
  }
  else {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
}

/**
 * Ensure an password is valid
 * pass - The password provided
 */
function validatePassword(pass) {
  if (pass == undefined) {
    return false;
  }
  else {
    let re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return re.test(pass);
  }
}