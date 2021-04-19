// Constants
const express = require('express');
const app = express();
const http = require('http');
const fs = require('fs');

const port = 3000;
const boardSize = 6;

//Session
const session = require('express-session'); 
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}))

app.get('/', serveIndex);                  
app.get('/game', game);

app.listen(port,  process.env.IP, startHandler());

function startHandler() {
  console.log('Server listening on port ' + port);
}

//Returns the board
function game(req, res) {

    if (req.query.restart) {
      req.session.game = {};
    }

    //Start the game if it hasn't been started
    initializeGame(req);

    //Gameplay
    gameplay(req, res);

    //Return the game board
    //writeResult(req, res, {'result' : req.session.game});
}

//Initializes the game
function initializeGame(req) {
    
    //Initialize the game
    if (!req.session.game) {
        req.session.game = {};
    }

    //Initialize the board
    if (!req.session.game.board) {
        
        let treasureLocation = getRandomInteger(0, boardSize - 1);

        req.session.game.board = [];
        for(let i = 0; i < boardSize; i++) {
            req.session.game.board[i] = {
                treasure: (treasureLocation == i),
                uncovered: false
            };
        }
    }

    //Initialize Guesses
    if (!req.session.game.guesses) {
        req.session.game.guesses = 0;
    }

    //Initialize game state
    if (!req.session.game.state) {
        req.session.game.state = "INPROGRESS";
    }
}

//Generates a random integer between min and max
function getRandomInteger(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
}

//Gameplay logic
function gameplay(req, res) {
  let guess = req.query.guess;
  let game = req.session.game;
  let board = game.board;

  //If the player has guessed
  if (guess) {

      //If the guess is invalid
      if (guess < 0 || guess >= board.length) {
        writeResult(req, res, {'error' : `Guess out of bounds. Your guess must be between 0 and ${req.session.game.board.length - 1}`});
        return;
      }

      //Reveal the guess if it hasn't been revealed
      if (!board[guess].uncovered) {
        board[guess].uncovered = true;
        game.guesses++;

        //Check to see if this was the treasure
        if (board[guess].treasure == true) {
          game.state = "COMPLETE";
        }
      }
  }

  //Write the result
  writeResult(req, res, {'result' : req.session.game});
};

//Write a JSON result onto the response
function writeResult(req, res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}

// added so we can serve index.html...
function serveIndex(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  let index = fs.readFileSync('index.html');
  res.end(index);
}