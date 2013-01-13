// create socket.io server on port 8080
var io = require('socket.io').listen(8080);
// finite state machine
var fsmjs = require('fsmjs');

console.log(addresses)
/************************* debug STUFF ****************************/
GLOBAL.DEBUG = 1;
GLOBAL.debg = function ( doThis ) {
  if (DEBUG == 1) {
    doThis();
  }
};

var os = require('os')

var interfaces = os.networkInterfaces();
var addresses = [];
for (k in interfaces) {
    for (k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family == 'IPv4' && !address.internal) {
            addresses.push(address.address)
        }
    }
}

GLOBAL.MYIPS = addresses;

/*********************** GAME OPTIONS *****************************/
// working port
GLOBAL.PORT        = 32442;
// Broadcast address
GLOBAL.BROADCAST   = "255.255.255.255";
// frequency of sending network messages
GLOBAL.FREQUENCY   = 2000;
GLOBAL.TIMEOUT     = 10;
GLOBAL.TURNTIMEOUT = 30;

/*********************** JSON MESSAGE VARS ************************/
// current version
GLOBAL.VERSION    = 2;
// Clienttype: 0=Game, 1=Web
GLOBAL.CLIENTTYPE = 1;

// message containers
GLOBAL.messages = {
  search:   {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:1,clientname:undefined},
  request:  {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:2,clientname:undefined},
  accepted: {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:2},
  ready:    {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:3},
  turn:     {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:4,column:undefined, turn:undefined},
  end:      {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:5},
  abort:    {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:99}
}

// bind whole thing to every incoming connection
io.sockets.on('connection', function (socket) {

  debg( function(){ console.log("-- USER CONNECTED") });

  /************** STATE MACHINE GOES HERE *************************/
  var connectFour = fsmjs({
    start: {
      "start": function(cb) {
        /*********************** UDP VARS *********************************/
        // create a UDP socket and bind to specific Port
        connectFour._dgram      = require("dgram");
        connectFour._server     = connectFour._dgram.createSocket("udp4");
        connectFour._server.bind(PORT);

        //debg( function(){connectFour._server.setMulticastLoopback(true)});

        debg( function(){ console.log("/\\/\\ START STAGE MACHINE")});
        debg( function(){ console.log("/\\/\\ STAGE 0: 'start'")});
        connectFour._enableBroadcast();
        cb();
      },
      "set player name": function( cb, name ) {
        debg( function(){ console.log("/\\/\\ STAGE 1: 'set player name' from '"+connectFour._name+"' to '"+name+"'")});
        connectFour._name = name;
        cb();
        return true;
      },
      "search opponents": function( cb ) {
        debg( function(){ console.log("/\\/\\ STAGE 1: 'search opponents'")});
        connectFour.state = "broadcast";
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
      $exit: function(cb) {
        debg( function(){ console.log("/\\/\\ EXIT STAGE 0")});
        //this._disableBroadcast();
        cb();
      }
    },
    broadcast: {
      $enter: function( cb ) {
        connectFour._opponent.keepalive = GLOBAL.TIMEOUT;
        connectFour._server.setBroadcast(true);
        clearInterval(connectFour._interval);
        connectFour._broadcastInterval = connectFour.interval("broadcast", FREQUENCY);

        connectFour._server.on("message", function(msg, rinfo){
          if (connectFour._localIP(rinfo.address) == true)
            return true;
          console.log("XXX GOT");
          var message;
          try {
            message =JSON.parse( msg );
            m = {msg: message, ip: rinfo.address};

            connectFour.qemit("incoming msg", m);
            
            if ( message.stage == 1 ) {
              connectFour._handleIncomingBroadcast(message, rinfo);
            } else if ( message.stage == 2 ) {
              console.log("XXX GOT2");
              if (connectFour._validateMessage(message, messages.request)) {
                var opponent = {};
                opponent.ip = rinfo.address;
                opponent.name = message.clientname;
                connectFour._opponent = opponent;
                connectFour.state = "incomingRequest";
              }
            }

          } catch (err) {
            console.log("EEEEEEEEROR parsing JSON - message dropped");
            //that.trigger("error");
            cb();
          }
        });

        cb();
      },
      "play with": function(cb, opponent) {
        connectFour._opponent = opponent;
        connectFour.state = "outgoingRequest";
        cb();
      },
      broadcast: function(cb) {
        for (var i = 0; i < connectFour._opponents.length; i++) {
          if (connectFour._opponents[i].keepalive < 1) {
            connectFour._opponents.splice(i,1);
          } else {
            connectFour._opponents[i].keepalive--;
          }
        }

        var search = messages.search;
        search.clientname = connectFour.getPlayerName();

        connectFour._send(search, BROADCAST);
        connectFour.qemit( "update opponents list", connectFour._opponents);
        cb();
      },
      $exit: function( cb ) {

        connectFour._server.setBroadcast(false);
        clearInterval( connectFour._broadcastInterval );
        clearInterval( connectFour._interval );
        cb();
      }
    },
    incomingRequest: {
      $enter: function(cb) {
        console.log("IIIINCOOOOMING");
        connectFour.qemit("incoming request", connectFour._opponent);
        opponent.keepalive = TIMEOUT;
        connectFour._opponent.starts = true;
        connectFour._interval = connectFour.interval("keepalive", FREQUENCY);
        cb();
      },
      keepalive: function(cb) {
        connectFour._opponent.keepalive--;
        if (connectFour._opponent.keepalive <0)
          connectFour.state = "broadcast"; 
        cb();
      },
      "accept incoming request": function(cb) {
        connectFour.state = "acceptIncomingRequest";
        cb();
      },
      "decline incoming request": function(cb) {
        connectFour.state = "broadcast";
        cb();
      },
      $exit: function(cb) {
        clearInterval(connectFour._interval);
        cb();
      }
    },
    outgoingRequest: {
      $enter: function (cb) {
        connectFour._opponent.keepalive = GLOBAL.TIMEOUT;
        connectFour._interval = connectFour.interval("keepalive", FREQUENCY);

        connectFour._server.on("message", function(msg, rinfo) {
          if (connectFour._localIP(rinfo.address) == true)
            return true;
          
          var message;
          try {
            message =JSON.parse( msg );
            m = {msg: message, ip: rinfo.address};

            connectFour.qemit("incoming msg", m);
            if ( message.version == GLOBAL.VERSION
                 && rinfo.address == connectFour._opponent.ip
                 && message.stage == 2
                 && message.clientname == undefined) {
              connectFour._turn.turn = 0;
              connectFour._turn.column = message.column;
              connectFour.state = "outTurn";
              connectFour.qemit("");
            }
          } catch (err) {
            console.log("EEEEEEEEROR parsing JSON - message dropped");
            //that.trigger("error");
            cb();
          }
        });
        cb();
      },
      keepalive: function() {
        connectFour._opponent.keepalive--;
        if (connectFour._opponent.keepalive <0)
          connectFour.state="broadcast";

        var msg = {};
        msg.version = 2;
        msg.clienttype = 1;
        msg.stage = 2;
        msg.clientname = connectFour.getPlayerName();
        connectFour._send(msg, connectFour._opponent.ip);
      },
      $exit: function (cb) {
        clearInterval(connectFour._interval);
        cb();
      }
    },
    acceptIncomingRequest: {
      $enter: function (cb) {
        connectFour._opponent.keepalive = TIMEOUT;
        connectFour._interval = connectFour.interval("sendready", FREQUENCY);

        connectFour._server.on("message", function(msg, rinfo) {
          if (connectFour._localIP(rinfo.address) == true)
            return true;
          
          var message;
          try {
            message =JSON.parse( msg );
            m = {msg: message, ip: rinfo.address};

            connectFour.qemit("incoming msg", m);
            if ( message.version == GLOBAL.VERSION
                 && rinfo.address == connectFour._opponent.ip
                 && message.stage == 4
                 && message.turn == 0
                 && message.clienttype == connectFour._opponent.clienttype) {
              connectFour._turn.turn = 0;
              connectFour._turn.column = message.column;
              connectFour.state = "inTurn";
            }
          } catch (err) {
            console.log("EEEEEEEEROR parsing JSON - message dropped");
            //that.trigger("error");
            cb();
          }
        });

        cb();
      },
      sendready: function(cb) {
        connectFour._opponent.keepalive--;
        if (connectFour._opponent.keepalive <=0)
          connectFour.state = "broadcast";

        connectFour._send(messages.ready, connectFour._opponent.ip);
        cb();
      },
      $exit: function(cb) {
        clearInterval(connectFour._interval);
        cb();
      }
    },
    inTurn: {
      $enter: function(cb) {
        connectFour._opponent.turnalive = GLOBAL.TURNTIMEOUT;
        connectFour.qemit("opponents turn", connectFour._turn);
        connectFour._interval("keepalive", FREQUENCY);

        connectFour._server.on("message", function(msg, rinfo) {
          if (connectFour._localIP(rinfo.address) == true)
            return true;
          
          var message;
          try {
            message =JSON.parse( msg );
            m = {msg: message, ip: rinfo.address};

            connectFour.qemit("incoming msg", m);
            if ( message.version == GLOBAL.VERSION
                 && rinfo.address == connectFour._opponent.ip
                 && message.stage == 99
                 && message.clienttype == connectFour._opponent.clienttype) {
                connectFour.state = "error";
            }
            if ( message.version == GLOBAL.VERSION
                 && rinfo.address == connectFour._opponent.ip
                 && message.stage == 4
                 && message.turn == connectFour._turn.turn
                 && message.column == connectFour._turn.column
                 && message.clienttype == connectFour._opponent.clienttype) {
              connectFour._opponent.keepalive = TIMEOUT
            }
          } catch (err) {
            console.log("EEEEEEEEROR parsing JSON - message dropped");
            //that.trigger("error");
            cb();
          }
        });

        cb();
      },
      "gameOver": function(cb) {
        connectFour.state="gameEnd";
        cb();
      },
      keepalive: function(cb) {
        connectFour._opponent.keepalive--;
        if (connectFour._opponent.keepalive <0)
          connectFour.state = "broadcast";
        connectFour._opponent.turnalive--;
        if (connectFour._opponent.turnalive <0)
          connectFour.state = "error";
        cb();
      },
      "turn": function(cb, turn) {
        connectFour._turn = turn;
        connectFour.state = "outTurn";
        cb();
      },
      $exit: function(cb) {
        clearInterval(connectFour._interval);
        cb();
      }
    },
    outTurn: {
      $enter: function(cb) {
        connectFour.opponent.turnalive = GLOBAL.TURNTIMEOUT;
        connectFour.opponent.keepalive = GLOBAL.TIMEOUT;
        connectFour._interval = connectFour.interval("sendTurn", GLOBAL.FREQUENCY);

        connectFour._server.on("message", function(msg, rinfo) {
          if (connectFour._localIP(rinfo.address) == true)
            return true;
          
          var message;
          try {
            message =JSON.parse( msg );
            m = {msg: message, ip: rinfo.address};

            connectFour.qemit("incoming msg", m);
            if ( message.version == GLOBAL.VERSION
                 && rinfo.address == connectFour._opponent.ip
                 && message.stage == 99
                 && message.clienttype == connectFour._opponent.clienttype) {
                connectFour.state = "error";
            }
            if ( message.version == GLOBAL.VERSION
                 && rinfo.address == connectFour._opponent.ip
                 && message.stage == 4
                 && message.clienttype == connectFour._opponent.clienttype) {
              if ( message.turn == connectFour._turn.turn) {
                connectFour._opponent.keepalive = TIMEOUT
              } else if (message.turn == (connectFour._turn.turn +1 )) {
                connectFour._turn.turn = message.turn;
                connectFour._turn.column = message.column;
                connectFour.state = "inTurn";
              } else {
                connectFour.state = "error";
              }
            }
          } catch (err) {
            console.log("EEEEEEEEROR parsing JSON - message dropped");
            //that.trigger("error");
            cb();
          }
        });

        cb();
      },
      "gameOver": function(cb) {
        connectFour.state="gameEnd";
        cb();
      },
      sendTurn: function(cb) {
        var msg = messages.turn;
        msg.turn = connectFour._turn.turn;
        msg.column = connectFour._turn.column;
        connectFour._send(msg, connectFour._opponent.ip);
        connectFour._opponent.turnalive--;
        if (connectFour._opponent.turnalive <0)
          connectFour.state = "error";
        connectFour._opponent.keepalive--;
        if (connectFour._opponent.keepalive <0)
          connectFour.state = "broadcast";

        cb();
      },
      $exit: function(cb) {
        clearInterval(connectFour._interval);
        cb();
      }
    },
    gameEnd: {
      $enter: function(cb) {

      },
      $exit: function(cb) {

      }
    },
    errorHandler: {
      $enter: function(cb) {
        debg( function(){ console.log("/\\/\\ ENTER ERROR STAGE")});
        connectFour._endTransmission();
        cb();
      },
      test: function(cb) {
        console.log("asdfasdf");
      },
      $end: function(cb) {
        debg( function(){ console.log("/\\/\\ EXIT ERROR STAGE")});
        cb();
      },
    },
    error: function(cb, state) {
      debg( function(){ console.log("/\\/\\ ERROR IN STATE: "+state)});
      console.log('An error occured in state', state);
      //connectFour.state = state;
      //connectFour._endTransmission();
    },

    _send: function ( message, target) {
      debg( function(){ console.log("/\\/\\ HELPER: try to send message") });

      var msg = new Buffer(JSON.stringify(message));

      connectFour._server.send( msg, 0, msg.length, PORT, target, function( err, bytes ) {
        if (err) throw err;
        debg( function(){console.log("/\\/\\        msg " + message + " sent to " + target + ":" + PORT)});
      });
    },

    _enableBroadcast: function () {
      debg( function(){ console.log("/\\/\\ HELPER: enable broadcast") });
      connectFour._server.setBroadcast(true);
    },

    _disableBroadcast: function() {
      debg( function(){ console.log("/\\/\\ HELPER: disable broadcast") });
      connectFour._server.setBroadcast(false);
    },
    _endBroadcast: function() {
      debg( function(){ console.log("/\\/\\ HELPER: clear interval") });
      connectFour._disableBroadcast();
      clearInterval( this._interval );
    },
    _validateMessage: function ( msg, expected ) {
      debg( function(){ console.log("/\\/\\ HELPER: validate message") });
      debg( function(){ 
        console.log("/\\/\\         msg '"); 
        console.log(msg);
        console.log("' expected: '");
        console.log(expected);
        console.log("'"); 
      });
      // length must be equal
      if (msg.length != expected.length)
        return false;

      if (msg.version != GLOBAL.VERSION)
        return false;
      for (var key in expected) {
        // if key doesn't exist
        if(typeof(msg[key]) === undefined)
          return false;
      }
      
      debg( function() {console.log("** MSG VALID");});
      
      return true;
    },
    _handleIncomingBroadcast: function(message, rinfo) {
      if ( connectFour._validateMessage(message, messages.search) == true ) {
        var found = false;
        for (var i=0; i < connectFour._opponents.length; i++) {
          if ( connectFour._opponents[i].ip == rinfo.address ) {
            connectFour._opponents[i].keepalive = GLOBAL.TIMEOUT;
            connectFour._opponents[i].clientname = message.clientname;
            found = true;
          }
        }
        if ( found == false )
          connectFour._opponents.push({clientname: message.clientname, ip: rinfo.address, keepalive: GLOBAL.TIMEOUT});
      }
    },
    _localIP: function(ip) {
      var self = false;
      for (var i=0; i<GLOBAL.MYIPS.length; i++) {
        if (ip == GLOBAL.MYIPS[i])
          self = true;
      }
      if (self == true)
        return true;
      return false;
    },
    getPlayerName: function() {
      debg( function(){ console.log("/\\/\\ HELPER: get player name") });
      return this._name;
    },
    _opponents: [],
    _requests: [],
    _gameRequestsOut: [],
    _gameRequestsIn: [],
    _acceptOut: [],
    _acceptIn: [],
    _turn: {turn:false,column:false},
    _opponent: {clientname: null, 
                keepalive: GLOBAL.TIMEOUT, 
                ip: null, 
                starts: false, 
                turnalive: GLOBAL.TURNTIMEOUT},
    _target: BROADCAST,
    _interval: null,
    _timeoutInterval: null,
    _broadcastInterval: null,
    _errorInterval: null,
    _stage: 0,
    _name: "Tha Playa",
    _msg: null,
    _server: null,
    _dgram: null,
    //_timer: null, // timer object to allow clearing the interval
    //_i: 0, // animated clock
  });
  
  //connectFour.trigger("start");

  connectFour.on("update opponents list", function( data ) {
    console.log("OOOOOH-ponent List UUUUUUUUPDATE!");
    socket.emit("update opponent list", data);
  });

  connectFour.on("play request accepted", function( data ) {
    console.log("PLAAAAAAY REQUEST accepted")
    socket.emit("play request accepted", data);
  });

  connectFour.on("incoming request", function(data) {
    console.log("INCOMING REQUEST");
    socket.emit("incoming request", data);
  });


  // set player name
  socket.on('set player name', function( name ) {
    debg( function(){ console.log("-- new player name: "+name) });
    if ( connectFour.trigger("set player name", name) == true ) {
      debg( function(){ console.log("-- set player name successful")});
      socket.emit('set player name successful', name);
    } else {
      debg( function(){ console.log("-- set player name failed")});
      socket.emit('set player name failed');
    }
  });

  // get player name
  socket.on("get player name", function() {
    debg( function(){ console.log("-- get player name: "+connectFour.getPlayerName())});
    socket.emit("player name", connectFour.getPlayerName());
  });

  socket.on("start searching opponents", function() {
    debg( function(){ console.log("-- start searching opponents") });
    connectFour.trigger("search opponents");
  });

  socket.on('play with', function( data ) {
    // {clientname: name, ip: ip}
    debg( function(){ console.log("-- Play with: " + data + " on " + data) });
    connectFour.trigger("play with", data);
    socket.emit("request sent");
    //connectFour.trigger("start with", data)
    //socket.emit("game start failed");
  });

  socket.on("accept incoming request", function() {
    console.log("ACCEPT INCOMING REQUEST");
    connectFour.trigger("accept incoming request");
  });
  socket.on("decline incoming request", function() {
    console.log("DECLINE INCOMING REQUEST");
    connectFour.trigger("decline incoming request");
  });


  socket.on('disconnect', function()  {
    debg( function(){ console.log("-- USER DISCONNECTED") });
    connectFour.trigger("error");
  });

  socket.on("verify version", function( data ) {
    socket.emit("got version", VERSION);
    if ( VERSION == data ) {
      socket.emit("verified version successfull");
    } else {
      socket.emit("verify version failed", { server: VERSION, client: data});
    }
    debg( function(){ console.log("-- emit version: "+VERSION) });
  });


  connectFour._dgram      = require("dgram");
  connectFour._server     = connectFour._dgram.createSocket("udp4");
  connectFour._server.bind(PORT);


  ip = "";
  clientname = "";

  socket.on("set IP", function(data) {
    ip = data;
  });

  socket.on("set name", function(data) {
    clientname = clientname;
  });

  socket.on("enable broadcast", function() {
    var msg = GLOBAL.messages.search;
    msg.clientname = clientname;
    sendFour._enableBroadcast();
    sendFour._send(msg, ip);
    sendFour._disableBroadcast();
  });

  socket.on("disable broadcast", function() {

  })

  socket.on("send request", function() {
    var msg = GLOBAL.messages.request;
    msg.clientname = clientname;
    sendFour._send(msg, ip)
  });
  socket.on("accept request", function() {
    var msg = GLOBAL.messages.accepted;
    sendFour._send(msg, ip);

  });

  connectFour.on("incoming msg", function(data) {
    socket.emit("incoming msg", data);
  });
});
