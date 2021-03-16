//Constants
const express = require('express');
const app = express();
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const PORT = 3000;
const session = require('express-session'); 

const conInfo = {
    host: process.env.IP,
    user: "root",
    password: "",
    database: "SONGDB"
};

//Start APP
app.use(session({ secret: 'happy jungle', 
                  resave: false, 
                  saveUninitialized: false, 
                  cookie: { maxAge: 60000 }}));

app.all('/', whoIsLoggedIn);                  
app.all('/register', register);
app.all('/login', login);
app.all('/logout', logout);                  
app.get('/addSong', addSong);
app.get('/listSongs', listSongs);
app.get('/removeSong', removeSong);
app.get('/clearSongs', clearSongs);

app.listen(PORT,  process.env.IP, startHandler());

/* General Logic
*******************************************************************************/

//Callback function for the handler starting.
function startHandler() {
  console.log('Server listening on port ' + PORT);
}

//Write the result as json
function writeResult(req, res, obj) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.write(JSON.stringify(obj));
  res.end('');
}

/* Root Logic
*******************************************************************************/

//Display who is logged in
function whoIsLoggedIn(req, res) {
  writeResult(req, res, req.session.user == undefined ? {'result' : 'Nobody is logged in.'} : req.session.user);
}

/* Register Logic
*******************************************************************************/

//Register a new user
function register(req, res) {

  //Ensure a valid email is provided
  if (req.query.email == undefined || !isValidEmail(req.query.email)) {
    writeResult(req, res, {'error' : "Please specify a valid email"});
    return;
  }

  //Ensure a valid password is provided
  if (req.query.password == undefined || !isValidPassword(req.query.password)) {
    writeResult(req, res, {'error' : "Password must have between 8 and 20 characters, at least one letter, one number and one special character (@#$%!)"});
    return;
  }

  //Connect to the database
  let con = mysql.createConnection(conInfo);
  con.connect(function(err) {
    if (err) {writeResult(req, res, {'error' : err});}
    else {
      // bcrypt uses random salt is effective for fighting
      // rainbow tables, and the cost factor slows down the
      // algorithm which neutralizes brute force attacks ...
      let hash = bcrypt.hashSync(req.query.password, 12);
      con.query("INSERT INTO USER (USER_EMAIL, USER_PASS) VALUES (?, ?)", [req.query.email, hash], function (err, result, fields) {
        if (err) {
          if (err.code == "ER_DUP_ENTRY") { err = "User account already exists."; }
          writeResult(req, res, {'error' : err});
        }
        else {
          con.query("SELECT * FROM USER WHERE USER_EMAIL = ?", [req.query.email], function (err, result, fields) {
            if (err) { writeResult(req, res, {'error' : err}); }
            else {
              req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
              writeResult(req, res, req.session.user);
            }
          });
        }
      });
    }
  });
}

//Return if the email is valid
function isValidEmail(email)  {
  if (email == undefined) {
    return false;
  }
  else {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }
}

//Return if the password is valid
function isValidPassword(pass) {
  if (pass == undefined)   {
    return false;
  }
  else {
    let re = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@#$%!])[A-Za-z@#$%!\d]{8,20}$/;
    return re.test(pass);
  }
}

/* Login Logic
*******************************************************************************/
function login(req, res)
{
  //Ensure an email is provided
  if (req.query.email == undefined) {
    writeResult(req, res, {'error' : "Email is required"});
    return;
  }

  //Ensure a password is provided
  if (req.query.password == undefined) {
    writeResult(req, res, {'error' : "Password is required"});
    return;
  }
  
  //Attempt Login
  let con = mysql.createConnection(conInfo);
  con.connect(function(err) {
    if (err) { writeResult(req, res, {'error' : err}); }
    else {
      con.query("SELECT * FROM USER WHERE USER_EMAIL = ?", [req.query.email], function (err, result, fields)  {
        if (err) { writeResult(req, res, {'error' : err}); }
        else {
          if(result.length == 1 && bcrypt.compareSync(req.query.password, result[0].USER_PASS)) {
            req.session.user = {'result' : {'id': result[0].USER_ID, 'email': result[0].USER_EMAIL}};
            writeResult(req, res, req.session.user);
          }
          else {
            writeResult(req, res, {'error': "Invalid email/password"});
          }
        }
      });
    }
  });
}


/* Logout Logic
*******************************************************************************/
function logout(req, res) {
  req.session.user = undefined;
  writeResult(req, res, {'result' : 'Nobody is logged in.'});
}

/* List Songs Logic
*******************************************************************************/
function listSongs(req, res) {
  if (req.session.user == undefined) { writeResult(req, res, {'error' : "You must be logged in to list songs"}); }
  else {
    let con = mysql.createConnection(conInfo);
    con.connect(function(err) {
      if (err) { writeResult(req, res, {'error' : err}); }
      else {
        con.query("SELECT * FROM SONG WHERE USER_ID = (?) ORDER BY SONG_NAME", [req.session.user.result.id], function (err, result, fields) {
          if (err) { writeResult(req, res, {'error' : err}); }
          else { writeResult(req, res, {'result' : result}); }
        });
      }
    });
  }
}


/* Add Songs Logic
*******************************************************************************/
function addSong(req, res) {
  if (req.session.user == undefined) { writeResult(req, res, {'error' : "You must be logged in to add a song"}); }
  else if (req.query.song == undefined) { writeResult(req, res, {'error' : "You must provide a song to add"}); }
  else {
    let con = mysql.createConnection(conInfo);
    con.connect(function(err) {
      if (err) { writeResult(req, res, {'error' : err}); }
      else {
        con.query('INSERT INTO SONG (USER_ID, SONG_NAME) VALUES (?, ?)', [req.session.user.result.id, req.query.song], function (err, result, fields) {
          if (err) { writeResult(req, res, {'error' : err}); }
          else {
            con.query("SELECT * FROM SONG WHERE USER_ID = (?) ORDER BY SONG_NAME", [req.session.user.result.id], function (err, result, fields) {
              if (err) { writeResult(req, res, {'error' : err}); }
              else { writeResult(req, res, {'result' : result}); }
            });
          }
        });
      }
    });
  }
}

/* Remove Songs Logic
*******************************************************************************/
function removeSong(req, res) {
  if (req.session.user == undefined) { writeResult(req, res, {'error' : "You must be logged in to remove a song"}); }
  else if (req.query.song == undefined) { writeResult(req, res, {'error' : "You must provide a song to remove"}); }
  else {
    let con = mysql.createConnection(conInfo);
    con.connect(function(err)  {
      if (err) { writeResult(req, res, {'error' : err}); }
      else {
        con.query('DELETE FROM SONG WHERE SONG_NAME = ? AND USER_ID = ?', [req.query.song, req.session.user.result.id], function (err, result, fields)  {
          if (err) { writeResult(req, res, {'error' : err}); }
          else {
            con.query("SELECT * FROM SONG WHERE USER_ID = ? ORDER BY SONG_NAME", [req.session.user.result.id], function (err, result, fields)  {
              if (err) { writeResult(req, res, {'error' : err}); }
              else { writeResult(req, res, {'result' : result}); }
            });
          }
        });
      }
    });
  }
}

/* Clear Songs Logic
*******************************************************************************/
function clearSongs(req, res)
{
  if (req.session.user == undefined) { writeResult(req, res, {'error' : "You must be logged in to clear your songs"}); }
  else {
    let con = mysql.createConnection(conInfo);
    con.connect(function(err) {
      if (err) { writeResult(req, res, {'error' : err}); }
      else {
        con.query('DELETE FROM SONG WHERE USER_ID = ?', [req.session.user.result.id], function (err, result, fields) {
          if (err) { writeResult(req, res, {'error' : err}); }
          else {
            con.query("SELECT * FROM SONG WHERE USER_ID = ? ORDER BY SONG_NAME", [req.session.user.result.id], function (err, result, fields)  {
              if (err) { writeResult(req, res, {'error' : err}); }
              else { writeResult(req, res, {'result' : result}); }
            });
          }
        });
      }
    });
  }
}
