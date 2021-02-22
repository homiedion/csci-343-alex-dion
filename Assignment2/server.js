const express = require('express');
const app = express();
const PORT = 3000;

// install session module first using 'npm install express-session'
var session = require('express-session'); 
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 600000 }}))

app.get('/', displaySongs);
app.get('/sort', displaySortedSongs);
app.get('/add', addSong);
app.get('/remove', removeSong);
app.get('/clear', clearSongs);
app.listen(PORT,  process.env.IP, startHandler())


function startHandler()
{
  console.log('Server listening on port ' + PORT)
}


//Displays all songs via an array in the original order
function displaySongs(req, res) {
  
  //Variables
  let result = {};
  
  try {
    //Define the song list for the session
    if (req.session.songs == undefined) {
      req.session.songs = [];
    }

    //Update the list
    result.songs = req.session.songs;
  }
  catch (e) {
    result = {'error' : e.message};
  }

  //Respond with the data
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(result));
  res.end('');
}


//Displays a newly sorted array of songs
function displaySortedSongs(req, res) {
  
  //Variables
  let result = {};
  
  try {
    //Define the song list for the session
    if (req.session.songs == undefined) {
      req.session.songs = [];
    }
  
    //Update the list
    result.songs = req.session.songs.sort();
  }
  catch (e) {
    result = {'error' : e.message};
  }

  //Respond with the data
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(result));
  res.end('');
}


//Adds a song provided by the query string song=
function addSong(req, res) {
  
  //Variables
  let result = {};
  
  try {
    //Define the song list for the session
    if (req.session.songs == undefined) {
      req.session.songs = [];
    }

    //Fail: No Song Provided
    if (req.query.song == undefined) {
      result = {result: "Please provide a song to add to the list."};
    }
  
    //Fail: Song Already Present
    else if (req.session.songs.includes(req.query.song)) {
      result = {result: "You've already favorited this song."};
    }

    //Success: Song addition process begins
    else {
      req.session.songs.push(req.query.song);
      result = {songs: req.session.songs};
    }
  }
  catch (e) {
    result = {'error' : e.message};
  }

  //Respond with the data
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(result));
  res.end('');
}


//Removes a song provided by the query string song=
function removeSong(req, res) {
  
  //Variables
  let result = {};
  
  try {
    //Define the song list for the session
    if (req.session.songs == undefined) {
      req.session.songs = [];
    }

    //Fail: No Song Provided
    if (req.query.song == undefined) {
      result = {result: "Please provide a song to remove from the list."};
    }
  
    //Fail: Song Not Found
    else if (!req.session.songs.includes(req.query.song)) {
      result = {result: "The provided song is has not been favorited."};
    }

    //Success: Song removal process begins
    else {
      req.session.songs = req.session.songs.filter(item => item !== req.query.song);
      result = {songs: req.session.songs};
    }
  }
  catch (e) {
    result = {'error' : e.message};
  }

  //Respond with the data
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(result));
  res.end('');
}


//Clears all songs from the array
function clearSongs(req, res) {
  
  //Variables
  let result = {};

  try {
    //Resets the session's songs
    req.session.songs = [];

    //Update the list
    result.songs = req.session.songs;
  }
  catch (e) {
    result = {'error' : e.message};
  }

  //Respond with the data
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(result));
  res.end('');
}
