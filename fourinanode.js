

/*********** DEBUG STUFF *******************/
var DEBUG = 1;

function debug( doThis ) {
  if (DEBUG === 1)
    eval(doThis);
}


/*********************** GAME OPTIONS *****************************/
var PORT       = 32442;                  // working port
var BROADCAST  = "255.255.255.255";      // BROADCAST address
var TARGET     = BROADCAST;              // target address
var OPPONENT;                           // oponent name
var INTERVAL;                           // Interval ID 

var OPPONENTS = [];

/*********************** UDP VARS *********************************/
var dgram      = require("dgram");
var server     = dgram.createSocket("udp4");

server.bind(PORT);
debug(server.setMulticastLoopback(true));

/*********************** JSON MESSAGE VARS ************************/ 
var VERSION    = 2;
var CLIENTTYPE = 1;
var STAGE      = 0;
var CLIENTNAME = "The King";
var TURN       = 0;
var COLUMN     = 0;
var CURR_MSG;

var messages = {
  search:   {version:VERSION,clienttype:CLIENTTYPE,stage:1,clientname:CLIENTNAME},
  found:    {version:VERSION,clienttype:CLIENTTYPE,stage:2,clientname:CLIENTNAME},
  accepted: {version:VERSION,clienttype:CLIENTTYPE,stage:2},
  ready:    {version:VERSION,clienttype:CLIENTTYPE,stage:3},
  turn:     {version:VERSION,clienttype:CLIENTTYPE,stage:4,column:COLUMN, turn:TURN},
  end:      {version:VERSION,clienttype:CLIENTTYPE,stage:5},
  abort:    {version:VERSION,clienttype:CLIENTTYPE,stage:99}
}

function validateJSON( msg, expected ) {
  console.log(msg.length+ " "+expected.length);
  if (msg.length != expected.length)
    return false;

  for (var key in expected) {
    if(typeof(msg[key]) === undefined)
      return false;

    if (typeof(msg[key]) != typeof(expected[key]))
      return false;

    console.log("true");
    return true;
  }
};

/*****************************************************************************************************/

var io = require('socket.io').listen(8080);
var fsmjs = require('fsmjs');


io.sockets.on('connection', function (socket) {
//  socket.emit('news', { hello: 'world' });
//  socket.on('my other event', function (data) {
//    console.log(data);
//  });

  debug( console.log("-- USER CONNECTED") );
  
  socket.on('set player name', function( data ) {
    CLIENTNAME = data;
    debug( console.log("-- new player name: "+CLIENTNAME) );
    if ( CLIENTNAME == data ) 
      socket.emit('update player name successful', CLIENTNAME);
    else
      socket.emit('update player name failed');
  });

  socket.on('start game with', function( data ) {
    UNICAST = data.ip;
    OPPONENT = data.name;
    debug( console.log("-- Play with: " + OPPONENT + " on " + UNICAST) );
    socket.emit("game started");
  });

  socket.on('disconnect', function()  {
    debug( console.log("-- USER DISCONNECTED") );
  });

  socket.on("request version", function() {
    socket.emit("got version", VERSION);
    debug( console.log("-- emit version: "+VERSION) );
  });

  socket.on("set column", function( data ) {
    debug( console.log("-- got column: "+data));
    socket.emit("set column callback");
  });


  /************** STATE MACHINE GOES HERE *************************/

  debug(console.log("STAAART"));


  var connectFour = fsmjs({

    idle: {
      // when 'go' or 'start' or 'g' are pushed, we move to 'running' and start
      // an interval that emits a 'tick' event every 200ms.
      'start': function(cb) {
        debug( console.log("/\\/\\ STAGE 1: start broadcasting"));

        connectFour._enableBroadcast();
        CURR_MSG = new Buffer( JSON.stringify(messages.search) );

        connectFour._interval = connectFour.interval('lookingForGame', 2000);
        //tim._timer = tim.interval('tick', 2000);
        cb();
      },
      lookingForGame: function(cb) {
        debug( console.log("/\\/\\ STAGE 1: lookingForGame") );
        // executed every 2 secs, so after 10 turns each opponents gets deleted;
        for (var i = 0; i < connectFour._opponents.length; i++) {
          if (connectFour._opponents.keepalive[i] <= 1) {
            connectFour._opponents.name.slice(i,1);
            connectFour._opponents.keepalive.slice(i,1);
            connectFour._opponents.ip.slice(i,1);
          } else {
            connectFour._opponents.keepalive[i]--;
          }
        }

        connectFour._send();
        cb();
      },
      // strings are target states (and emitted events)
      exit: function(cb) {
        console.log("exit pushed");
        connectFour.qemit('end');
        return cb();
      },

      e: "error",

      // any other event in this state shows this error
      '.*': "error",
      /*function(cb, e) {
        console.log("any other event pushed");
        console.log('error: i cant understand what you mean by "' + e + '"');
        cb();
      },*/
    },
    receivedGameRequest: {
      $enter: function(cb) {
        cb();
      },
      "accept": function(cb) {
        cb();
      },
      $exit: function(cb) {
        cb();
      },

    },
    sendGameRequest: {
      $enter: function(cb) {
        cb();
      },
      "aknowledged": function(cb) {
        cb();
      },
      $exit: function(cb) {
        cb();
      },
    },
    running: {

      // animate clock every tick
      /*tick: function(cb) {
        console.log("tick");
        var clock = [ '|', '/', '-', '\\' ];
        process.stdout.write('(' + clock[tim._i] + ")");
        for (var i = 0; i < 50; ++i) process.stdout.write(' ');
        process.stdout.write('\r');
        tim._i = (tim._i + 1) % clock.length;
        cb();
      },*/

      // cannot exit from this state
      exit: 'error',

      // when 'no' or 'stop' or 'x' are pushed, move to 'stopping' and start
      // a 2sec timeout that emits 'elapsed' when elapsed (surpise!)
      '(no|stop|x)': function(cb) {
        console.log("no, stop, x pushed");
        process.stdout.write('stopping...\n');
        connectFour.state = 'stopping';
        connectFour.timeout('stopped', 5000);

        cb();
      },
      'testing': function(cb) {
        console.log("switching to testing");
        connectFour.state= "testing";
        cb();
      },
      $exit: function(cb) {
        // take some time before changing state.
        console.log('our running times are over.. give me 2 more seconds.');
        setTimeout(cb, 2000);
      },

    },

    testing: {
      $enter: function(cb) {
        console.log("entering testing stage");
        cb();
      },
      "(a|b)": function(cb) {
        console.log("a oder b");
      },
      ".*": "error",
      $exit: function(cb) {
        console.log("testing exit");
      },
    },

    stopping: {

      $enter: function(cb) {
        console.log('entering stopping state');
        cb();
      },

      // called when the stopping timer elapses. clears the 
      // interval and changes state to 'idle'
      stopped: function(cb) {
        process.stdout.write('\nall done.\n');
        clearInterval(connectFour._interval);
        tim.state = 'idle';
        cb();
      },

      // a tick during stop operation, show dots
      tick: function(cb) {
        process.stdout.write(".");
        cb();
      },

      exit: 'error',

    },

    error: function(cb, state) {
      console.log('An error occured in state', state);
      connectFour.state = state;
      connectFour._endTransmission();
      cb();
    },

    _send: function () {
        debug( console.log("/\\/\\ try to send message") );
        server.send( CURR_MSG, 0, CURR_MSG.length, PORT, TARGET, function( err, bytes ) {
          if (err) throw err;
          debug(console.log("/\\/\\ msg " + CURR_MSG + " sent to " + TARGET + ":" + PORT));
        })
      },
    _enableBroadcast: function () {
      server.setBroadcast(true);
      TARGET = BROADCAST;
    },
    _enableUnicast: function( IP ) {
      server.setBroadcast(false);
      TARGET = IP;
    },
    _updateMessage: function( message ) {
      connectFour._endTransmission();
      
      if ( typeof( message ) !== "undefined" ) {
        CURR_MSG = new Buffer( message );
      }
      
      send();
      connectFour._interval = setInterval( connectFour._send, 2000);
    },

    _endTransmission: function() {
      clearInterval( connectFour._interval );
    },
    _opponents: {name: [], keepalive: [], ip:[]},
    _interval: null,
    //_timer: null, // timer object to allow clearing the interval
    //_i: 0, // animated clock
  });

  connectFour.on('end', function() {
    process.exit();
  });

  connectFour.on('error', function() {
    console.log('on-error');
  });

  connectFour.on('idle.start', function() {
    console.log("try 'go' the next time...");
  });
  console.log(connectFour);

  //connectFour.trigger("start");
  //tim.trigger("start");
  //tim.trigger("asdfg");

  //setTimeout(function() {tim.trigger("testing"); setTimeout(function() {tim.trigger("x")}, 5000);}, 6000);

  debug(console.log("EEEND"));



  /*********** HANDLER FOR INCOMING MESSAGES ***********/

  server.on("message", function (msg, rinfo) {
    debug(console.log("* server got: " + msg + " from " + rinfo.address + ":" + rinfo.port));
    var message = JSON.parse( msg );
    
    debug( console.log("* VERSION: "+message.version) );

    if ( message.version != VERSION ) {
      socket.emit("wrong version", message.version)
      connectFour.trigger("error");
    }

    switch( message.stage ) {
      case 1:
        validateJSON(message, messages.search);
        var length = connectFour._opponents.length;

        for (var i = 0; i < length; i++) {
          
          // Do something with element i.
        }
        // receive players, first stage
        //search:   JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:1,clientname:CLIENTNAME}),
        break;
      case 2:;
        if ( message.clientname !== undefined ) {
          validateJSON(message, messages.found);
          // game request

          //  found:    JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:2,clientname:CLIENTNAME}),
        } else {
          validateJSON(message, messages.accepted);
          // game accepted
            //accepted: JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:2}),
        }
        break;
      case 3:
        validateJSON(message, messages.ready);
        //ready:    JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:3}),
        // ready to play
        break;
      case 4:
        validateJSON(message, messages.turn);
        //turn:     JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:4,column:COLUMN, turn:TURN}),
        // receive turn
        break;
      case 5:
        validateJSON(message, messages.end);
        //end:      JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:5}),
        // game ended
        break;
      // case 99
      case 99:
        validateJSON(message, messages.abort);
        //abort:    JSON.stringify({version:VERSION,clienttype:CLIENTTYPE,stage:99})
        // error
        break;
      default:
        
        break;

    }


  });





});
