// Require express and create an instance of it
var express = require('express');
var app = express();
const path = require('path');

var PORT = process.env.PORT;

app.set('view engine', 'ejs');
app.use(express.static('build'));

// on the request to root (localhost:PORT/)
app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname+'/build/prototype.html'));
});

// Change the 404 message modifing the middleware
app.use(function(req, res, next) {
    res.status(404).send("Sorry, that route doesn't exist. Have a nice day :)");
});

// start the server in the port PORT !
app.listen(PORT, function () {
    console.log(`Example app listening on port ${PORT}.`);
});