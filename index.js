const express=require('express')
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
var port =process.env.PORT || 5000
app.use(express.static(__dirname + '/public'))

http.listen(port, () => {
    console.log('listening on *:', port);
  });