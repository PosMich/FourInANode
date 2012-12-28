var io = require('socket.io').listen(8080);

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
 
var VERSION = 1;
var PORT = 32442;
var CLIENTTYPE = 1;
var STAGE = 0;
var CLIENTNAME = "";

var dgram = require("dgram"); 
dgram.setBroadcast(true);
dgram.setMulticastTTL(255);
dgram.setMulticastLoopback(true);
var server = dgram.createSocket("udp4");

var messages = {
  search: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:1,clientname:CLIENTNAME}),
  found: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:2,clientname:CLIENTNAME}),
  accepted: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:2}),
  ready: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:3}),
  turn: function (col) { 
    return JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:4,column:col})
  },
  end: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:5}),
  abort: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE, stage:99})
}

var message = new Buffer( messages.search );


server.send(message, 0, message.length, PORT, rinfo.address, function(err, bytes) {
if (err) throw err;
console.log("msg " + message + " sent to " + rinfo.address + ":" + rinfo.port);
}); 



server.bind(PORT);
