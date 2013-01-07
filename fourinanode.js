/************************* DEBUG STUFF ****************************/
var DEBUG = 1;

function debug( doThis ) {
  if (DEBUG === 1)
    eval(doThis);
}


/*********************** GAME OPTIONS *****************************/
// working port
var PORT       = 32442;
// Broadcast address
var BROADCAST  = "255.255.255.255";
// frequency of sending network messages
var FREQUENCY  = 2000;

/*********************** JSON MESSAGE VARS ************************/
// current version
var VERSION    = 2;
// Clienttype: 0=Game, 1=Web
var CLIENTTYPE = 1;

// message containers
var messages = {
  search:   {version:VERSION,clienttype:CLIENTTYPE,stage:1,clientname:null},
  found:    {version:VERSION,clienttype:CLIENTTYPE,stage:2,clientname:null},
  accepted: {version:VERSION,clienttype:CLIENTTYPE,stage:2},
  ready:    {version:VERSION,clienttype:CLIENTTYPE,stage:3},
  turn:     {version:VERSION,clienttype:CLIENTTYPE,stage:4,column:null, turn:null},
  end:      {version:VERSION,clienttype:CLIENTTYPE,stage:5},
  abort:    {version:VERSION,clienttype:CLIENTTYPE,stage:99}
}


/*********************** UDP VARS *********************************/
 // create a UDP socket and bind to specific Port
var dgram      = require("dgram");
var server     = dgram.createSocket("udp4");
server.bind(PORT);
// enable loopback if debug is set
debug(server.setMulticastLoopback(true));

// create socket.io server on port 8080
var io = require('socket.io').listen(8080);

// finite state machine
var fsmjs = require('fsmjs');


// bind whole thing to every incoming connection
io.sockets.on('connection', function (socket) {

  debug( console.log("-- USER CONNECTED") );

  // start game machine
  socket.on("start state machine", function() {
    debug( console.log("-- start state machine") );
    connectFour.trigger("start");
    socket.emit("state machine started");
  });

  // set player name
  socket.on('set player name', function( name ) {
    debug( console.log("-- new player name: "+name) );
    if ( connectFour.trigger("set player name", name) == true ) {
      debug( console.log("-- set player name successful"));
      socket.emit('set player name successful', name);
    } else {
      debug( console.log("-- set player name failed"));
      socket.emit('set player name failed');
    }
  });

  // get player name
  socket.on("get player name", function() {
    debug( console.log("-- get player name: "+connectFour.getPlayerName()));
    socket.emit("player name", connectFour.getPlayerName());
  });

  socket.on("start searching opponents", function() {
    debug( console.log("-- start searching opponents") );
    connectFour.trigger("search opponents");
  });

  socket.on('send game request', function( data ) {
    debug( console.log("-- Play with: " + data + " on " + data) );
    connectFour.trigger("send game request", data);
    socket.emit("request sent");
    //connectFour.trigger("start with", data)
    //socket.emit("game start failed");
  });

  socket.on('disconnect', function()  {
    debug( console.log("-- USER DISCONNECTED") );
    connectFour.trigger("error");
  });

  socket.on("verify version", function( data ) {
    socket.emit("got version", VERSION);
    if ( VERSION == data ) {
      socket.emit("verified version successfull");
    } else {
      socket.emit("verify version failed", { server: VERSION, client: data});
    }
    debug( console.log("-- emit version: "+VERSION) );
  });

  socket.on("set column", function( data ) {
    debug( console.log("-- got column: "+data));
    socket.emit("set column callback");
  });


  /************** STATE MACHINE GOES HERE *************************/
  var connectFour = fsmjs({
    start: {
      "start": function(cb) {
        debug( console.log("/\\/\\ START STAGE MACHINE"));
        debug( console.log("/\\/\\ STAGE 0: 'start'"));
        debug( console.log("/\\/\\ ENTER STAGE 0: setup Player name"));
        cb();
      },
      "set player name": function( cb, name ) {
        debug( console.log("/\\/\\ STAGE 1: 'set player name' from '"+this._name+"' to '"+name+"'"));
        this._name = name;
        cb();
        return true;
      },
      "search opponents": function( cb ) {
        debug( console.log("/\\/\\ STAGE 1: 'search opponents'"));
        this.state = "findOpponents";
        cb();
      },
      // strings are target states (and emitted events)
      exit: function(cb) {
        console.log("exit pushed");
        this.qemit('end');
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
        debug( console.log("/\\/\\ EXIT STAGE 0"));
        //this._disableBroadcast();
        cb();
      }
    },
    findOpponents: {
      $enter: function( cb ) {
        debug( console.log("/\\/\\ ENTER STAGE 1: find Opponents"));

        // set interval with search message and update keepalive of opponents
        this._msg = messages.search;
        this._msg.clientname = this._name;
        this._msg = new Buffer( JSON.stringify(this._msg) );
        console.log("************ msg" + this._msg);

        this._endTransmission();
        this._interval = this.interval( "gameTick", FREQUENCY);

        var that = this;

        // check incoming messages
        server.on("message", function(msg, rinfo){
          debug(console.log("* server got: " + msg + " from " + rinfo.address + ":" + rinfo.port));
          var message;
          try {
            message =JSON.parse( msg ) 
            if ( message.stage == 1 ) {
              if ( that._validateMessage(message, messages.search) == true ) {
                var found = false;
                  for (var i=0; i < that._opponents.length; i++) {
                    if ( that._opponents[i].ip == rinfo.address && that._opponents[i].stage == 1) {
                      that._opponents[i].keepalive = 10;
                      that._opponents[i].clientname = message.clientname;
                      found = true;
                    }
                  }
                  if ( found == false )
                    that._opponents.push({clientname: message.clientname, ip: rinfo.address, keepalive: 10, stage: 1});
              }
            } else {
              if ( message.stage == 2 && message.version == VERSION ) {
                if ( message.clientname != undefined ) {
                  // if clientname exists: general play message
                  if ( that._validateMessage( message, messages.found) == true ) {
                    var found = false;
                    for (var i=0; i < that._opponents.length; i++) {
                      if ( that._opponents[i].ip == rinfo.address && that._opponents[i].wanttoplay == false) {
                        that._opponents[i].keepalive = 10;
                        that._opponents[i].clientname = message.clientname;
                        found = true;
                      }
                    }
                    if ( found == false )
                      that._opponents.push({clientname: message.clientname, ip: rinfo.address, keepalive: 10, stage: 2});
                  }
                  that.qemit( "update opponents list", that._opponents);

                } else {
                  // if clientname doesn't exist: want's to play with you
                  if (that._validateMessage( message, messages.accepted) == true) {
                    for (var i=0; i < that._opponents.length; i++) {
                      if ( message.clientname == that._opponents[i].clientname && that._opponents[i].stage == 2 ) {
                        // emit play request
                        that._oponnents[i].
                        this.qemit( "play request accepted", that._opponents[i]);
                      }
                    }
                  }
                }
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
      gameTick: function(cb) {
        debug( console.log("/\\/\\ STAGE 1: TICK "));
        for (var i = 0; i < this._opponents.length; i++) {
            if (this._opponents[i].keepalive < 1) {
              debug( console.log("/\\/\\ STAGE 1: removing opponent: " + this._opponents[i].clientname));
              this._opponents.splice(i,1);
            } else {
              this._opponents[i].keepalive--;
            }
          }
        this._send(this);
        this.qemit( "update opponents list", this._opponents);
        cb();
      },
      "send game request": function( cb,  opponent ) {
        cb();
      },
      error: function( cb ) {
        console.log("error!!!!");
        this.state = "errorHandler";
        return( cb() );
      },
      $exit: function( cb ) {
        cb();
      }
    },
    requestGame: {
      $enter: function(cb) {
        debug( console.log("/\\/\\ ENTER STAGE 2: requestGame"));
        this.trigger("accept");
        cb();
      },
      "accept": function(cb) {
        this.state = "readyToPlay";
        cb();
      },
      $exit: function(cb) {
        debug( console.log("/\\/\\ EXIT STAGE 2"));
        cb();
      },

    },
    readyToPlay: {
      $enter: function(cb) {
        debug( console.log("/\\/\\ ENTER STAGE 3: readyToPlay"));
        this.trigger("aknowledged");
        cb();
      },
      "aknowledged": function(cb) {
        this.state = "turn";
        cb();
      },
      $exit: function(cb) {
        debug( console.log("/\\/\\ EXIT STAGE 3"));
        cb();
      },
    },
    turn: {
      $enter: function(cb) {
        debug( console.log("/\\/\\ ENTER STAGE 4: turn"));
        this.trigger("aknowledged");
        cb();
      },
      "aknowledged": function(cb) {
        this.state = "endOfGame";
        cb();
      },
      $exit: function(cb) {
        debug( console.log("/\\/\\ EXIT STAGE 4"));
        cb();
      },
    },
    endOfGame: {
      $enter: function(cb) {
        debug( console.log("/\\/\\ ENTER STAGE 5: endOfGame"));
        this.trigger("aknowledged");
        cb();
      },
      "aknowledged": function(cb) {
        this.state = "stopping";
        cb();
      },
      $exit: function(cb) {
        debug( console.log("/\\/\\ EXIT STAGE 5"));
        cb();
      },
    },
    stopping: {
      $enter: function(cb) {
        debug( console.log("/\\/\\ ENTER STOPPING STAGE"));
        this.trigger("e");
        cb();
      },
      // called when the stopping timer elapses. clears the 
      // interval and changes state to 'idle'
      stopped: function(cb) {
        //process.stdout.write('\nall done.\n');
        //clearInterval(connectFour._interval);
        //tim.state = 'idle';
        this.qemit('end');
        cb();
      },

      // a tick during stop operation, show dots
      tick: function(cb) {
        //process.stdout.write(".");
        cb();
      },

      e: 'error',
      $exit: function(cb) {
        debug( console.log("/\\/\\ EXIT STOPPING STAGE"));
        cb();
      }

    },
    errorHandler: {
      $enter: function(cb) {
        debug( console.log("/\\/\\ ENTER ERROR STAGE"));
        this._endTransmission();
        cb();
      },
      test: function(cb) {
        console.log("asdfasdf");
      },
      $end: function(cb) {
        debug( console.log("/\\/\\ EXIT ERROR STAGE"));
        cb();
      },
    },
    error: function(cb, state) {
      debug( console.log("/\\/\\ ERROR IN STATE: "+state));
      console.log('An error occured in state', state);
      //connectFour.state = state;
      //connectFour._endTransmission();
    },

    _send: function (that) {
      debug( console.log("/\\/\\ HELPER: try to send message") );
      server.send( that._msg, 0, that._msg.length, PORT, that._target, function( err, bytes ) {
        if (err) throw err;
        debug(console.log("/\\/\\        msg " + that._msg + " sent to " + that._target + ":" + PORT));
      });
    },

    _enableBroadcast: function () {
      debug( console.log("/\\/\\ HELPER: enable broadcast") );
      server.setBroadcast(true);
      cb();
    },

    _disableBroadcast: function() {
      debug( console.log("/\\/\\ HELPER: disable broadcast") );
      server.setBroadcast(false);
    },

    _updateMessage: function(msg ) {
      debug( console.log("/\\/\\ HELPER: update message to '"+msg+"'") );
      var message = new Buffer( msg );
      this._setInterval( this._send(that) );
    },

    _endTransmission: function() {
      debug( console.log("/\\/\\ HELPER: clear interval") );
      clearInterval( this._interval );
    },

    _setInterval: function(func ) {
      debug( console.log("/\\/\\ HELPER: set interval") );
      if ( typeof(func) == "function" ) {
        this._endTransmission();
        func();
        this._interval = this.interval( func, FREQUENCY);
      }
    },
    _validateMessage: function ( msg, expected ) {
      debug( console.log("/\\/\\ HELPER: validate message") );
      debug( console.log("/\\/\\         msg '"+msg+"' expected: '"+expected+"'") );
      // length must be equal
      if (msg.length != expected.length)
        return false;

      for (var key in expected) {
        // if key doesn't exist
        if(typeof(msg[key]) === undefined)
          return false;

        if ( typeof(msg[key]) != typeof(expected[key]) ) {
          if (typeof(expected[key]) != "string")
            return false;
        }
        return true;
      }
    },
    getPlayerName: function() {
      debug( console.log("/\\/\\ HELPER: get player name") );
      return this._name;
    },
    _opponents: [],
    _requests: [],
    _opponent: {clientname: null, keepalive: 10, ip: null, wanttoplay: false},
    _target: BROADCAST,
    _interval: null,
    _stage: 0,
    _name: "Tha Playa",
    _msg: null,
    //_timer: null, // timer object to allow clearing the interval
    //_i: 0, // animated clock
  });

  connectFour.on("update opponents list", function( data ) {
    console.log("OOOOOH-ponent List UUUUUUUUPDATE!");
    socket.emit("update opponent list", data);
  });

  connectFour.on("play request accepted", function( data ) {
    console.log("PLAAAAAAY REQUEST accepted")
    socket.emit("play request accepted", data);
  });
});