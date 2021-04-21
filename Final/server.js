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
app.all('/whoIsLoggedIn', whoIsLoggedIn);                  
app.all('/register', register);
app.all('/login', login);
app.all('/logout', logout);
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

  if(result) { writeResult(res, result); }
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

  if(isGuessCorrect(req)) {
    incrementGuesses(req);
    result = winGame(req, res);
  }
  else if(isGuessTooHigh(req)) {
    incrementGuesses(req);
    result = {gameStatus: "Too high. Guess again!", guesses: req.session.guesses, gameOver: false};
  }
  else {
    incrementGuesses(req);
    result = {gameStatus: "Too low. Guess again!", guesses: req.session.guesses, gameOver: false};
  }

  return result;
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

/**
 * Check if the guess is correct
 * req - The request
 */
function isGuessCorrect(req) {
  return (req.query.guess == req.session.answer);
}

/**
 * Successful game completion logic
 * req - The request
 * res - The response
 */
function winGame(req, res) {
  req.session.answer = undefined;

  result = {
    gameStatus: `Correct! It took you ${req.session.guesses} guesses. Play Again!`,
    guesses: req.session.guesses, gameOver: true
  };

  writeResult(res, result);
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
    writeResult(res, {'user' : {'id' : undefined, 'email' : undefined}});
  }
  else {
    writeResult(res, req.session.user);
  }
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
              req.session.user = {'user' : {'id': result[0].Id, 'email': result[0].Email}};
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
            req.session.user = {'user' : {'id': result[0].Id, 'email': result[0].Email}};
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