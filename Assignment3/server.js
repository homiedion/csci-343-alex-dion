// Constants
const express = require('express');
const app = express();

const PORT = 3000;
const CONNECTION_INFO = {
    host: process.env.IP,
    user: "root",
    password: "",
    database: "GAMESTATS"
};

// State
let mysql = require('mysql');
let session = require('express-session'); 


// Trigger App Functions
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}))

app.get('/', instructions);                  
app.get('/game', game);
app.get('/stats', stats);

app.listen(PORT, process.env.IP, startHandler())

//Handler Start Function
function startHandler() {
  console.log('Server listening on port ' + PORT);
}

// Game Logic
function game(req, res) {

  // Logic
  try {
    
    // Restart Game
    if (req.session.answer == undefined) {
      resetGame(req);
    }
      
    // Guess: None
    if (req.query.guess == undefined) {
      writeResponse(res, {'gameStatus' : 'Pick a number from 1 to 100.'});
      resetGame(req);
      
    }
    
    // Guess: Correct
    else if (req.query.guess == req.session.answer) {
      req.session.guesses = req.session.guesses + 1;
      submit(res, req);
      req.session.answer = undefined;
    }
    
    // Guess: Too High
    else if (req.query.guess > req.session.answer) {
      req.session.guesses = req.session.guesses + 1;
      writeResponse(res, {'gameStatus' : 'To High. Guess Again!', 'guesses' : req.session.guesses}); 
    }
    
    // Guess: Too Low
    else {
      req.session.guesses = req.session.guesses + 1;
      writeResponse(res, {'gameStatus' : 'To Low. Guess Again!', 'guesses' : req.session.guesses}); 
    };
  }
  
  // Error Handling
  catch (e) {
    writeResponse(res, {'error' : e.message});
  }
}

// Instructions Logic
function instructions(req, res)
{
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write("<h1>Number Guessing Game</h1>");
  res.write("<p>Use /game to start a new game.</p>");
  res.write("<p>Use /game?guess=num to make a guess.</p>");
  res.end('');
}

// Stats Logic
function stats(req, res)
{
  // State
  let con = mysql.createConnection(CONNECTION_INFO);
  
  // Connect to the Database
  con.connect(function(err) {
  
    // Connection Failure
    if (err) { writeResponse(res, {"error" : err}); }
    
    // Connection Success
    else {
    
      // Perform Queries
      con.query(`SELECT SCORE FROM GAMESTATS ORDER BY SCORE DESC`, function(err, result, fields) {
      
        if (err) { writeResponse(res, {"error" : err}); }
        else {

          // State
          let best = -1;
          let worst = -1;
          let gamesPlayed = 0;

          // No Results
          if (result == undefined || result.length == 0) {
            best = 0;
            worst = 0;
            gamesPlayed = 0;
          }
          
          //Valid Results
          else {
          
            // Update the number of games
            gamesPlayed = result.length;
            
            //Find the best and worst of the results
            result.forEach(e => {
              let score = e.SCORE;
              if (best == -1 || score < best) { best = score; }
              if (worst == -1 || score > worst) { worst = score; }
            });
          }
          
          // Write the response
          writeResponse(res, {"result" : {
            "best" : best,
            "worst" : worst,
            "gamesPlayed" : gamesPlayed
          }});
        }
      
      });
    }
  });
}

// Submit a score
function submit(res, req) {

  // State
  let con = mysql.createConnection(CONNECTION_INFO);
  
  // Connect to the Database
  con.connect(function(err) {
    // Connection Failure
    if (err) { writeResponse(res, {"error" : err}); }
    
    // Connection Success
    else {
    
      // Perform Queries
      con.query(`insert into GAMESTATS (SCORE) values (?)`, [req.session.guesses], function(err, result, fields) {
        if (err) { 
          writeResponse(res, {"error" : err});
         }
        else {
          writeResponse(res, {'gameStatus' : `Correct! It took you ${req.session.guesses} guesses. Play Again!`});
        }
      });
    }
  });
}

// Write a JSON response
function writeResponse(res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}

//Reset the game
function resetGame(req) {
  req.session.guesses = 0;
  req.session.answer = Math.floor(Math.random() * 100) + 1;
}
