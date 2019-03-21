const express = require('express');
const app = express();

// for local development
require('dotenv').config();
const connectionString = process.env.DATABASE_URL;

const port = process.env.PORT || 5000;

app.use(express.static('public'));

app.listen(port, () => {
    console.log(`Listening on port: ${poet}`);
});

