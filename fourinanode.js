var io = require('socket.io').listen(8080);

io.sockets.on('connection', function (socket) {
//  socket.emit('news', { hello: 'world' });
//  socket.on('my other event', function (data) {
//    console.log(data);
//  });
  socket.on('set player', function( data ) {
    CLIENTNAME = data;
    debug( console.log("new player name: "+CLIENTNAME) );
    socket.emit('new name', CLIENTNAME);
  });
  socket.on('start game with', function( data ) {
    UNICAST = data;
    debug( console.log("Play with: " + UNICAST) );
  })
});


var DEBUG = 1;


/*********** DEBUG HELPER *******************/
function debug( doThis ) {
  if (DEBUG === 1)
    eval("(function() { "+doThis+"})()");
}


/*********************** GAME OPTIONS *****************************/
var PORT      = 32442;                  // working port
var BROADCAST = "255.255.255.255";      // BROADCAST address
var UNICAST;                            // Unicast address
var TARGET    = BROADCAST;              // target address
var INTERVAL;                           // Interval ID 


/*********************** UDP VARS *********************************/
var dgram  = require("dgram");
var server = dgram.createSocket("udp4");

server.bind(PORT);
debug(server.setMulticastLoopback(true));


/*********************** JSON MESSAGE VARS ************************/ 
var VERSION    = 2;
var CLIENTTYPE = 1;
var STAGE      = 0;
var CLIENTNAME = "Player";
var TURN       = 0;
var COLUMN     = 0;
var CURR_MSG   = new Buffer ( "" );

var messages = {
  search:   JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:1,clientname:CLIENTNAME}),
  found:    JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:2,clientname:CLIENTNAME}),
  accepted: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:2}),
  ready:    JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:3}),
  turn:     JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:4,column:COLUMN, turn:TURN}),
  end:      JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:5}),
  abort:    JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:99})
}

function send() {
  server.send( CURR_MSG, 0, CURR_MSG.length, PORT, TARGET, function( err, bytes ) {
    if (err) throw err;
    debug(console.log("msg " + CURR_MSG + " sent to " + TARGET + ":" + PORT));
  })
}

function enableBroadcast() {
  server.setBroadcast(true);
  TARGET = BROADCAST;
}

function enableUnicast( IP ) {
  server.setBroadcast(false);
  TARGET = UNICAST = IP;
}

function updateMessage( message ) {
  endTransmission();
  
  if ( typeof( message ) !== "undefined" ) {
    CURR_MSG = new Buffer( message );
  }
  
  send();
  INTERVAL = setInterval( send, 2000);
}

function endTransmission() {
  clearInterval( INTERVAL );
}


// to start the whole thing 
//enableBroadcast();
//updateMessage( messages.search );

// test if update and unicast works
//setTimeout(function() { enableUnicast( "10.0.0.138" ); updateMessage( messages.end ); }, 7000);
