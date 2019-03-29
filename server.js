// Grab all my dependencies
// express
const express = require("express");
const app = express();

// for bycrpt
const bcrypt = require("bcrypt");

// for pooling
const { Pool } = require("pg");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// set up server
const server = require("http").createServer(app);

// socket.io
const io = require("socket.io").listen(server);

// for database connection
require("dotenv").config();

// MOST LIKELY WILL NEED TO MOVE TO MODEL
users = [];
connections = [];

// set the port variable
const port = process.env.PORT || 5000;

// Give permissions to get static files
app.use(express.static("public"));

app.get("/", function(req, res) {
   res.sendFile(__dirname + "/public/index.html");
});

// For registration
app.post("/register", handleRegister);

app.post("/login", handleLogin);

server.listen(port, () => {
   console.log(`Listening on port: ${port}`);
});

// socket stuff
io.sockets.on("connection", function(socket) {
   connections.push(socket);
   console.log(`New connections: ${connections.length} sockets connected`);

   // Disconnect
   socket.on("disconnect", function(data) {
      //if (!socket.username) return;
      users.splice(users.indexOf(socket.username), 1);
      updateUsernames();
      connections.splice(connections.indexOf(socket), 1);
      console.log(`Socket disconnected: ${connections.length} still connected`);
   });

   // Send message
   socket.on("send message", function(data) {
      io.sockets.emit("new message", { msg: data });
   });

   // New user
   socket.on("new user", function(data, callback) {
      callback(true);
      socket.username = data;
      users.push(socket.username);

      updateUsernames();
   });

   function updateUsernames() {
      io.sockets.emit("get users", users);
   }
});

//////////////////////////// In different files
///////////////////// controller.js
function handleRegister(req, res) {
   const username = req.body.username;
   const password = req.body.password;

   createUser(username, password, function(err, data) {
      if (err) {
         return console.log(
            `Encountered and error while creating a user: ${err}`
         );
      }
      res.redirect("login.html");
   });
}

function handleLogin(req, res) {
   const username = req.body.username;
   const password = req.body.password;

   loginUser(username, password, function(err, hash) {
      if (err) {
         console.log(`Encountered and error while logging in: ${err}`);
      }
      // compare password with stored hash
      bcrypt.compare(password, hash, function(err, res) {
         if (err) {
            console.log(`There was an error verifying user: ${err}`);
         } else if (res) {
            // Passwords match
            
            // TODO: We should start a session here 

            // And we finally redirect them to the home page
            res.redirect("index.html");
         } else {
            // Passwords don't match

            // TODO: Handle the mismatch
         }
      });
   });
}

///////////////////// model.js
// set connection string for pooling
const connectionString = process.env.DATABASE_URL;
const myPool = new Pool({ connectionString: connectionString });

// Create a new user by connecting to the database
function createUser(username, password, callback) {
   const sql =
      "INSERT INTO users (username, hash, active_status) VALUES ($1, $2, 0)";

   bcrypt.genSalt(12, function(err, salt) {
      if (err)
         console.log(`There was an error creating the account hash: ${err}`); //handle error

      bcrypt.hash(password, salt, function(err, hash) {
         if (err) console.log(`There was an error creating the hash: ${err}`); //handle error

         // Store hash in your password DB.
         const params = [username, hash];

         myPool.query(sql, params, function(err, result) {
            if (err) {
               console.log(`An error occured in the DB while creating user`);
               console.log(err);
               callback(err, null);
            }
            console.log(`DB Query Finished`);
            callback(null, result.rows);
         });
      });
   });
}

// This methos will log in the user by verifying their password
function loginUser(username, password, callback) {
   const sql = "SELECT hash FROM users u WHERE u.username = $1";
   const params = [username];

   myPool.query(sql, params, function(err, result) {
      if (err) {
         console.log(`An error occured in the DB while logging in`);
         console.log(err);
         callback(err, null);
      }
      console.log(`DB Query Finished`);
      callback(null, result.rows);
   });
}
