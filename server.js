// Grab all my dependencies
// express
const express = require("express");
const app = express();

// set up server
const server = require("http").createServer(app);

// socket.io
const io = require("socket.io").listen(server);

// for local development
require("dotenv").config();
const connectionString = process.env.DATABASE_URL;

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

server.listen(port, () => {
   console.log(`Listening on port: ${port}`);
});

// socket stuff
io.sockets.on("connection", function(socket) {
   connections.push(socket);
   console.log(`New connections: ${connections.length} sockets connected`);
  

   // Disconnect
   socket.on("disconnect", function(data) {
      connections.splice(connections.indexOf(socket), 1);
      console.log(`Socket disconnected: ${connections.length} still connected`);
   });

   // Send message
   socket.on("send message", function(data) {
        io.sockets.emit('new message', {msg: data});
   });
});
