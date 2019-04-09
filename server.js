// Grab all my dependencies
const express = require("express"); // express
const app = express();
const session = require("express-session"); // for sessions
const bcrypt = require("bcrypt"); // for bycrpt
const { Pool } = require("pg"); // for pooling
const bodyParser = require('body-parser');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// set up server
const server = require("http").createServer(app);
const io = require("socket.io").listen(server); // socket.io
require("dotenv").config(); // for database connection

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to check if the user is logged in
function requireLogin(req, res, next) {
   if (!req.user) {
      res.redirect("/login");
   } else {
      next();
   }
}

//SESSION INITIALIZATION
app.set('trust proxy', 1) // trust first proxy

app.use(session({
  secret: 'tacocat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

// MOST LIKELY WILL NEED TO MOVE TO MODEL
users = [];
connections = [];

// set the port variable
const port = process.env.PORT || 5000;

// Give permissions to get static files
app.use(express.static("public"));

app.get("/", function(req, res) {
   // Check if user is logged in
   if (!res.session.user)
      res.redirect("login.html");
   else
      res.sendFile('public/home.html');
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
      users.splice(users.homeOf(socket.username), 1);
      updateUsernames();
      connections.splice(connections.homeOf(socket), 1);
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
            req.session.user = username;

            // And we finally redirect them to the home page
            res.redirect("home.html");
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
      "INSERT INTO users (username, hash) VALUES ($1, $2)";

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
