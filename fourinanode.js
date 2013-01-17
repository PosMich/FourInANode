// create socket.io server on port 8080
var io = require('socket.io').listen(8080);


/************************* debug STUFF ****************************/
GLOBAL.DEBUG = 1;
GLOBAL.debug = function ( doThis ) {
  if (DEBUG == 1) {
    doThis();
  }
};

/************************* get local IPs **************************/
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

GLOBAL.VERSION       = 2;
// working port
GLOBAL.PORT          = 32442;
// Broadcast address
GLOBAL.BROADCAST     = "255.255.255.255";
// frequency of sending network messages
GLOBAL.FREQUENCY     = 2000;
GLOBAL.TIMEOUT       = 10;
GLOBAL.TURNTIMEOUT   = 30;
GLOBAL.NAME          = "Tha Playa";
GLOBAL.CLIENTTYPE    = 1;
GLOBAL.ERRORFREQ = 10;

/*********************** JSON MESSAGE VARS ************************/

// message containers
GLOBAL.messages = {
  search:   function() { return {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:1,clientname:GLOBAL.NAME}},
  request:  function() { return {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:2,clientname:GLOBAL.NAME}},
  accepted: function() { return {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:2}},
  ready:    function() { return {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:3}},
  turn:     function(clmn, trn) { return {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:4,column:clmn, turn:trn}},
  end:      function() { return {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:5}},
  abort:    function() { return {version:GLOBAL.VERSION,clienttype:GLOBAL.CLIENTTYPE,stage:99}}
}


// bind whole thing to every incoming socket connection
io.sockets.on('connection', function (socket) {
  console.log("SOCKET CONNECTED");
  var dgram      = require("dgram");
  var server     = dgram.createSocket("udp4");
  server.bind(PORT);

  interval = null;
  timeoutInterval = 0;
  turnTimeoutInterval = 0;
  timeInt = null;
  error = 0;
  LASTMSG = null;
  var TURN = -1;
  var OPPONENTS = [];
  var OPPONENT = {clientname: "asdf", ip: "0", keepalive: GLOBAL.TIMEOUT, starts: false, turntimeout: GLOBAL.TURNTIMEOUT};
/*
socket zeugs:

Stage 1 "Spieler finden"
  html: name setzen           socket.on("set name")
  html: broadcast starten     socket.on("start broadcast")
  server: Liste updaten       socket.emit("update opponents", opponents)

Stage 2 "incoming request"
  server: incoming request    socket.emit("incoming request", opponent)
  html:   annehmen            socket.on("incoming request accept")
  server: timeout             socket.emit("timeout")

Stage 2: "outgoing request"
  html: outgoing request      socket.on("outgoing request", opponent)
  server: timeout             socket.emit("timeout")

Stage 3: "Spielbereit"
  server: spiel starten       socket.emit("play starts")
  server: timeout             socket.emit("timeout")

Stage 4: "Turn"
  html: turn                  socket.on("turn")
  server: turn                socket.emit("turn")
  server: timeout             socket.emit("timeout")

Stage 5: "Ende"
  html: ende                  socket.on("end")
  server: ende                socket.emit("end")

Stage 99: "Error"             socket.emit("error")
                              socket.on("error")

*/

/****************************************************/
/********************* set Name *********************/
  socket.on("set Name", function(data) {
    GLOBAL.NAME = data;
    console.log("new Name: "+GLOBAL.NAME);
  });


/****************************************************/
/**************** start  Broadcast ******************/
/*
Stage 1 "Spieler finden"
  html: broadcast starten     socket.on("start broadcast")
  server: Liste updaten       socket.emit("update opponents", opponents)
*/
  socket.on("start broadcast", function() {
    OPPONENTS = [];
    server.setBroadcast(true);
    clearInterval(interval);
    interval = setInterval(function() {
      for(var i=0; i<OPPONENTS.length; i++) {
        OPPONENTS[i].keepalive -= GLOBAL.FREQUENCY/1000;
        if (OPPONENTS[i].keepalive<1)
          OPPONENTS.splice(i,1);
      }

      socket.emit("update Opponents", OPPONENTS);

      var msg = new Buffer(JSON.stringify(GLOBAL.messages.search()));
      server.send(msg, 0, msg.length, GLOBAL.PORT, GLOBAL.BROADCAST);
    }, FREQUENCY);

    server.removeAllListeners("message");
    server.on("message", function(msg, rinfo){
      if (isLocalhost(rinfo.address) == true)
        return;

      try {
        var msg = JSON.parse(msg);
        if (validateMessage( msg, GLOBAL.messages.search() ) == true && msg.stage == 1) {

          console.log("VALID search msg");
          console.log(msg);

          var found = false;
          for (var i=0; i<OPPONENTS.length; i++) { 
            if (OPPONENTS[i].ip == rinfo.address) {
              found = true 
              OPPONENTS[i].keepalive=GLOBAL.TIMEOUT;
              OPPONENTS[i].clientname=msg.clientname;
            }
          }

          if ( found == false ) {
            OPPONENTS.push({clientname:msg.clientname,ip:rinfo.address,keepalive:GLOBAL.TIMEOUT});
          }
          socket.emit("update Opponents", OPPONENTS);
        } else if (validateMessage( msg, GLOBAL.messages.request() ) == true && msg.stage == 2) {
          console.log("VALID incoming request msg");
          clearInterval(interval);
          server.setBroadcast(false);
          incomingRequestHandler(msg, rinfo.address);
        } else if ( OPPONENT.ip != "0" && OPPONENT.ip == rinfo.address && msg.stage == 99 ) {
          clearInterval( error );
        }
        
      } catch(err) {
        console.log(err);
      }
    });

  
  });

/*
Stage 2 "incoming request"
  server: incoming request    socket.emit("incoming request", opponent)
  html:   annehmen            socket.on("incoming request accept")
  html:   ablehnen            socket.on("incoming request decline") <-- automatisch wieder zum broadcast wechseln
  server: timeout             socket.emit("timeout")
*/
  function incomingRequestHandler(msg, ip) {
    clearInterval(error);
    OPPONENT.clientname = msg.clientname;
    OPPONENT.ip = ip;
    OPPONENT.starts = true;
    OPPONENT.keepalive = GLOBAL.TIMEOUT;
    OPPONENT.turntimeout = GLOBAL.TURNTIMEOUT;
    TURN = 0;

    socket.emit("incoming request", {clientname:OPPONENT.clientname,ip:OPPONENT.ip});
    socket.emit("update Opponents");

    clearInterval(timeoutInterval);
    timeoutInterval = setInterval(function() {
      OPPONENT.keepalive -= GLOBAL.FREQUENCY/1000;
      if ( OPPONENT.keepalive <= 0 ) {
        clearInterval(timeoutInterval);
        socket.emit("timeout");
      }
    }, GLOBAL.FREQUENCY);

    server.removeAllListeners("message");
    server.on("message", function(msg, rinfo) {
      if (isLocalhost(rinfo.address) == true)
        return;

      try {
        var msg = JSON.parse(msg);
        if (validateMessage( msg, GLOBAL.messages.request) == true ) {
          if (msg.clientname == OPPONENT.clientname)
            OPPONENT.keepalive = GLOBAL.TIMEOUT;
        }
        
      } catch(err) {
        console.log("err");
      }
    })
  }

  socket.on("incoming request decline", function() {
    clearInterval(timeoutInterval);
  });

  socket.on("incoming request accept", function() {
    clearInterval(timeoutInterval);
    timeoutInterval = setInterval(function(){
      OPPONENT.keepalive -= GLOBAL.FREQUENCY/1000;
      if (OPPONENT.keepalive <=0) {
        clearInterval(timeoutInterval);
        socket.emit("timeout");
      }

      var msg = new Buffer(JSON.stringify(GLOBAL.messages.accepted()));
      server.send(msg, 0, msg.length, GLOBAL.PORT, OPPONENT.ip);
    }, GLOBAL.FREQUENCY);
    server.removeAllListeners("message");
    server.on("message", function(msg, rinfo) {
      if (isLocalhost(rinfo.address) == true)
        return;

      try {
        var msg = JSON.parse(msg);
        if (validateMessage( msg, GLOBAL.messages.request()) == true && OPPONENT.ip == rinfo.address ) {

          if (rinfo.address == OPPONENT.ip)
            OPPONENT.keepalive = GLOBAL.TIMEOUT;
        } else if (validateMessage(msg, GLOBAL.messages.ready()) == true && OPPONENT.ip == rinfo.address ){
          clearInterval(timeoutInterval);
          OPPONENT.keepalive = GLOBAL.TIMEOUT;
          socket.emit("incoming request verified");
        }
        
      } catch(err) {
        console.log("err: " + err);
      }
    });
  });
  
  socket.on("send request", function(opponent) {
    clearInterval(interval);
    server.setBroadcast(false);
    clearInterval(error);
    OPPONENT = {clientname: opponent.clientname, ip: opponent.ip, keepalive: GLOBAL.TIMEOUT, starts: false, turntimeout: GLOBAL.TURNTIMEOUT};
    clearInterval(timeoutInterval);
    timeoutInterval = setInterval( function() {
      OPPONENT.keepalive -= GLOBAL.FREQUENCY/1000;
      if (OPPONENT.keepalive <= 0) {
        clearInterval(timeoutInterval);
        socket.emit("timeout");
      }
      var msg = new Buffer( JSON.stringify( GLOBAL.messages.request() ) );
      server.send( msg, 0, msg.length, GLOBAL.PORT, OPPONENT.ip );
    }, GLOBAL.FREQUENCY);

    server.removeAllListeners("message");
    server.on("message", function(msg, rinfo) {
      if (isLocalhost(rinfo.address) == true)
        return;

      try {
        var msg = JSON.parse(msg);
        // if i begin
        if ( validateMessage( msg, GLOBAL.messages.accepted() ) == true ) {
          // ready verfified, start game
          if (rinfo.address == OPPONENT.ip) {
            clearInterval(timeoutInterval);
            TURN = 0;
            socket.emit("request accepted");
          }
        }
      } catch (err) {
        console.log("err: "+err);
      }
    });
  });

  socket.on("ready for game", function() {
    OPPONENT.keepalive = GLOBAL.TIMEOUT;
    console.log("==================== OPP ==========");
    console.log(OPPONENT);
    clearInterval(timeoutInterval);
    timeoutInterval = setInterval(function() {
      OPPONENT.keepalive -= GLOBAL.FREQUENCY/1000;
      if(OPPONENT.keepalive <= 0) {
        clearInterval(timeoutInterval);
        socket.emit("timeout");
      }

      var msg = new Buffer(JSON.stringify(GLOBAL.messages.ready()));
      console.log("========================= SEND STAGE 3 TO OPPONENT");
      server.send(msg, 0, msg.length, GLOBAL.PORT, OPPONENT.ip);
    }, GLOBAL.FREQUENCY);

    server.removeAllListeners("message");
    server.on("message", function(msg, rinfo) {
      if (isLocalhost(rinfo.address) == true)
        return;

      try {
        var msg = JSON.parse(msg);
        // if i begin
        if (validateMessage( msg, GLOBAL.messages.ready()) == true 
          && rinfo.address == OPPONENT.ip) {
          // ready verfified, start game
          //clearInterval(timeoutInterval);
          OPPONENT.keepalive = GLOBAL.TIMEOUT;
          TURN = 0;
          socket.emit("start game");
          if  (timeInt == null )
            timeInt = setTimeout(function() { socket.emit("turn timeout");} ,  GLOBAL.TURNTIMEOUT*1000);
        } else if (validateMessage( msg, GLOBAL.messages.turn(0,0)) == true 
            && OPPONENT.starts == true
            && TURN == msg.turn
            && rinfo.address == OPPONENT.ip ) {
          TURN = 0;
          turnHandler(msg.column, true);
        }
      } catch (err) {
        console.log("err: " + err);
      }
    });
  });

  socket.on("turn", function(data) {
    turnHandler(data, false);
  });

  function turnHandler( clmn, incoming ) {
    var lastturn = TURN;
    TURN++;
    console.log("=============================== last turn:");
    console.log(lastturn);

/*

Gegner schickt Zug 0:
  incoming = true
  lastturn = 0
  TURN = 1

  ////

  was passiert:
    keepalive timeout falls er innerhalb 10 sek nichts schickt

  expected:
    msg.turn == lastturn

Ich schicke Zug 1:
  incoming = false
  lastturn = 1
  TURN = 2

  last msg = zug 0

  was passiert:
    msg wird gesendet
    turntimeout falls innerhalb 30 nichts passiert  --> wenn msg.turn != TURN
    keepalive timeout falls er innerhalb 10 sek nichts schickt  -->> wenn msg.turn != lastturn

  expected:
    msg.turn == TURN

Gegner schickt Zug 2:
  incoming = true;
  lastturn = 2
  TURN = 3

  last msg = zug 2

  was passiert:
    keepalive timeout falls er innerhalb 10 sek nichts schickt  --> msg.turn != lastturn

  expected:
    msg.turn == lastturn

-----------------------------
Ich schicke Zug 0:
  incoming = false;
  lastturn = 0
  TURN = 1

  last msg = ready

  was passiert:
    msg wird gesendet
    turntimeout falls innerhalb 30 nichts passiert  --> msg == msg.ready
    keepalive timeout falls er innerhalb 10 sek nichts schickt  --> msg == msg.ready

  expected:
    msg mit msg.turn == TURN

Gegner schickt Zug 1:
  incoming = true
  lastturn = 1
  TURN = 2

  was passiert:
    keepalive timeout falls er innerhalb 10 sek nichts schickt  --> msg.turn != lastturn

  expected:
    msg mit msg.turn == TURN

Ich schicke Zug 2:
  incoming = false
  lastturn = 2
  TURN = 3

  

  expected:
    msg.turn == TURN


*/
    function clearTimeouts() {
      clearTimeout( timeInt );
      clearInterval( timeoutInterval );
      clearInterval( turnTimeoutInterval );
    }

    clearTimeouts();

    timeoutInterval = setInterval(function() {
      OPPONENT.keepalive  -= GLOBAL.FREQUENCY/1000;
      if ( OPPONENT.keepalive <= 0 ) {
        setTimeout(function() {clearTimeouts();}, 200);
        socket.emit("timeout");
      }

      if ( incoming == true && lastturn == 0 ) {
        var msg = new Buffer( JSON.stringify(GLOBAL.messages.ready()) );
        server.send(msg, 0, msg.length, GLOBAL.PORT, OPPONENT.ip);
      } else if ( lastturn > 0 ){
        server.send(LASTMSG, 0, LASTMSG.length, GLOBAL.PORT, OPPONENT.ip);
      }
    }, GLOBAL.FREQUENCY);

    if ( incoming==false ) {
      turnTimeoutInterval = setInterval(function() {
        OPPONENT.turntimeout -= GLOBAL.FREQUENCY/1000;
        if ( OPPONENT.turntimeout <= 0 ) {
          setTimeout(function() {clearTimeouts();}, 200);
          socket.emit("turn timeout");
        }

          console.log("asjhdashfksdjhfjksdhfjksdfhsdjkh " + lastturn);
          var msg = new Buffer(JSON.stringify(GLOBAL.messages.turn(clmn, lastturn)));
          LASTMSG = msg;
          console.log("============ OUTOING TURN");
          console.log(msg);
          server.send(msg, 0, msg.length, GLOBAL.PORT, OPPONENT.ip);
      }, GLOBAL.FREQUENCY);
    }

    if (incoming == true) {
      console.log("============ INCOMING TURN");
      OPPONENT.keepalive = GLOBAL.TIMEOUT;
      OPPONENT.turntimeout = GLOBAL.TURNTIMEOUT;
      socket.emit("turn", {column: clmn, turn: lastturn});
    }

    server.removeAllListeners("message");
    server.on("message", function(msg, rinfo) {
      if (isLocalhost(rinfo.address) == true)
        return;

      try {
        var msg = JSON.parse(msg);
        if (OPPONENT.ip != rinfo.address)
          return;

        console.log("/\\/\\/\\ INCOMING MSG FROM OPPONENT");
        if ( lastturn == 0 ) {
          console.log("/\\/\\/\\ lastturn == 0");
          if ( incoming == true ) {
            console.log("/\\/\\/\\ incoming == true");
            if ( validateMessage( msg, GLOBAL.messages.turn(0,0)) == true ) {
              console.log("/\\/\\/\\ valid turn message --> update timeout");
              OPPONENT.keepalive = GLOBAL.TIMEOUT;
            }
          } else {
            console.log("/\\/\\/\\ incoming == false");
            if ( validateMessage(msg, GLOBAL.messages.ready()) == true ) {
              OPPONENT.keepalive = GLOBAL.TIMEOUT;
              console.log("/\\/\\/\\ ready msg received --> update timeout");
            } else if ( validateMessage(msg, GLOBAL.messages.turn(0,0)) == true && msg.turn == TURN) {
              OPPONENT.keepalive = GLOBAL.TIMEOUT;
              OPPONENT.turntimeout = GLOBAL.TURNTIMEOUT;
              turnHandler(msg.column, true);
            }
          }
        } else {
            console.log("/\\/\\/\\ lastturn > 0");
          if ( incoming == true ) {
            console.log("/\\/\\/\\ incoming == true");
            if ( validateMessage( msg, GLOBAL.messages.turn(0,0)) == true && msg.turn == lastturn) {
              OPPONENT.keepalive = GLOBAL.TIMEOUT;
              OPPONENT.turntimeout = GLOBAL.TURNTIMEOUT;
              console.log("/\\/\\/\\ last turn received --> update timeout");
            }
          } else {
            console.log("/\\/\\/\\ incoming == false");
            if ( (validateMessage( msg, GLOBAL.messages.turn(0,0)) == true && msg.turn == (lastturn-1) ) 
              || (validateMessage( msg, GLOBAL.messages.ready())== true && lastturn == 0) ) {
              OPPONENT.keepalive = GLOBAL.TIMEOUT;
              OPPONENT.turntimeout = GLOBAL.TURNTIMEOUT;
              console.log("/\\/\\/\\ last turn -1 received --> update timeout");
            } else if ( validateMessage(msg, GLOBAL.messages.turn(0,0)) == true && msg.turn == TURN ) {
              OPPONENT.keepalive = GLOBAL.TIMEOUT;
              OPPONENT.turntimeout = GLOBAL.TURNTIMEOUT;
              console.log("/\\/\\/\\ TURN received --> update timeout, turnHandler !!!!");
              turnHandler(msg.column, true);
            }
          }
        }

      } catch (err) {
        console.log("err: " + err);
      }
    });
  }

  socket.on("end of game", function() {
    clearInterval(timeoutInterval);
    timeoutInterval = setInterval(function() {
      OPPONENT.keepalive -= GLOBAL.FREQUENCY/1000;
      if (OPPONENT.keepalive <= 0 ) {
        clearInterval(timeoutInterval);
        socket.emit("timeout");
      }

      var msg = new Buffer(JSON.stringify(GLOBAL.messages.end()));
      server.send(msg, 0, msg.length, GLOBAL.PORT, OPPONENT.ip);
    }, GLOBAL.FREQUENCY);

    server.removeAllListeners("message");
    server.on("message", function(msg, rinfo) {
      try {
        var msg = JSON.parse(msg);
        if (validateMessage(msg, GLOBAL.messages.end())) {
          if (rinfo.address == OPPONENTS) {
            clearInterval(timeoutInterval);
            socket.emit("end of game");
          }
        }
      } catch (err) {
        console.log("err: "+err);
      }
    });
  });

  socket.on("error", function() {
    error = setInterval(function() {
      var msg = new Buffer(JSON.stringify(GLOBAL.messages.abort()));
      for(var i = 0; i < GLOBAL.ERRORFREQ; i++)
        server.send(msg, 0, msg.length, GLOBAL.PORT, OPPONENT.ip);
    }, GLOBAL.FREQUENCY);
  });

  socket.on("disconnect", function() {
    console.log("DISCONNECT");
    clearInterval(timeoutInterval);
    clearInterval(interval);
    clearInterval(turnTimeoutInterval);
  })

  function validateMessage( msg, expected ) {
    if ( msg.stage != expected.stage )
      return false;

    // length must be equal
    if (msg.length != expected.length)
      return false;

    if (msg.version != GLOBAL.VERSION)
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
  };

  function isLocalhost( ip ) {
    //if ( DEBUG ==0 ) {
      for (var i=0; i<GLOBAL.MYIPS.length; i++)
        if (ip == GLOBAL.MYIPS[i]) return true;
    //}
  };

});
