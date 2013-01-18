//Global Variables
	
$(document).ready(function() {
	//init socket.io
	socket = io.connect('http://localhost:8080');

	//init arrow-images
	var arrow_active = new Image();
	arrow_active.src = "img/Arrow2.png";
	var arrow_inactive = new Image();
	arrow_inactive.src = "img/Arrow.png";
	var cross = new Image();
	cross.src = "img/x.png";

	//init field
	var field = [];
	var incomingTurn = false;
	var fillColor = null;
	var strokeColor = null;
	var bounceInterval = null;
	var animationActive = false;

	//init basic canvas elements
	var c = null;
	var context = null;

	//init players
	var player_name = "";
  var opponent_name = "";
  var  oldData = [];

  startGame();

  function startGame() {
    $(".mainLogOn").css("display", "block");
    $(".mainLogOn").animate({opacity: 1}, 1000);
    $("p.info").html("Um \"Vier Gewinnt\" spielen zu können, wähle zuerst deinen Namen.");

    $("#logOnPlay").click( function(e) {
      e.preventDefault();
        
      var msg = "";
      var $_logOn = $("#logOnText");
      var logOnLength = $_logOn.val().length;
        
      if( logOnLength == 0 )
        msg = "Bitte geben Sie zuerst Ihren Namen ein.";
      else {
        if( logOnLength < 5 )
          msg = "Bitte wählen Sie einen Namen mit mehr als 5 Zeichen.";
        if( logOnLength > 20 )
          msg = "Bitte wählen Sie einen Namen mit weniger als 20 Zeichen.";
      }

      if( msg.length == 0) {
        $("p.error").html("");
        $("p.error").hide();
        // call second stage
        player_name = $_logOn.val()
        console.log("trying to set new player name " + player_name);
        socket.emit("set Name", player_name);
        viewPlayers( false );
      } else {
        showError( msg );
      }
    }); 
  }

  viewPlayers = function( replay ) {
    if( !replay ) {
      show(".mainLogOn", ".mainStart", function() {
        $("p.info").html("Wähle einen Spieler aus, den du in 4-Gewinnt besiegen möchtest!<br/>Du bist angemeldet als <b>" + player_name + "</b>.");
      });
    } else {
      // initPlayground();
      show(".mainPlayground", ".mainStart", function() {
        $("p.info").html("Wähle einen Spieler aus, den du in 4-Gewinnt besiegen möchtest!<br/>Du bist angemeldet als <b>" + player_name + "</b>.");
        $(".popup").css("display", "none");
      });
    }

    console.log("trying to start game");

    socket.emit("start broadcast");
    socket.removeAllListeners("update Opponents");
    socket.on("update Opponents", function( data ) { 

      newData = $.extend(true, [], data);
      for( var i = 0; i < oldData.length; ++i) {
        oldData[i].checked = false;
      }

      for ( var i=0; i<newData.length; i++ ) {
        for ( var j=0; j<oldData.length; j++) {
          if( newData[i].ip == oldData[j].ip ) {
            if(oldData[j].clientname == newData[i].clientname) {
              newData[i].checked = true;
              oldData[j].checked = true;
            } else {
              newData[i].checked = false;
              oldData[j].checked = false;             
            }
          }
        }
      }

      for( var i=0; i<oldData.length; i++) {
        if( oldData[i].checked != true ) {
          // remove
          $("li[data-ip='" + oldData[i].ip + "']").animate({opacity:0}, 500, function() {$(this).remove();});
          oldData.splice(i,1);
        }
      }

      for( var i=0; i < newData.length; i++) {
        if( newData[i].checked != true ) {
          // add 
          if($("ul#playerList").children().length > 0) {
            $("ul#playerList").append('<li data-ip="' + newData[i].ip + '"><a href="#" class="button toPlayground"><span>Play</span></a><div class="player">' + newData[i].clientname + '</div></li>');
            $("ul#playerList").children().last().animate({opacity:1}, 1000);
          } else
            $("ul#playerList").html('<li data-ip="' + newData[i].ip + '"><a href="#" class="button toPlayground"><span>Play</span></a><div class="player">' + newData[i].clientname + '</div></li>')
              .children().animate({opacity:1}, 1000);
          oldData.push( newData[i] );
        }

      }

      socket.removeAllListeners("incoming request");
      socket.on("incoming request", function( data ) {
        opponent_name = data.clientname;
        $(".popup").html("<h2>\"" +  data.clientname + 
          '\" würde gerne mit dir spielen.</h2><a href="#" class="button accept_game_request" id="logOnPlay">' + 
          '<span>Annehmen</span></a><a href="#" class="button reject_game_request" id="logOnPlay"><span>Ablehnen</span></a>');
        $(".popup").css("display", "block");
        $(".popup").animate({opacity:1}, 1000);

        $(".reject_game_request").one("click",function() {
          $(".popup").css("display", "none");
          $(".popup").animate({opacity: 0}, 1000);
          socket.emit("incoming request decline");
          socket.emit("start broadcast");
        });

        $(".accept_game_request").one("click",function() {
          socket.emit("incoming request accept");
          console.log("incoming request accept");
          socket.removeAllListeners("incoming request verified");
          socket.on("incoming request verified", function() {
            socket.emit("ready for game");
            console.log("start gaḿe");
            startPlayground( true );
            turnOffset = 1;
          });   
        });
      });

      $(".toPlayground").each(function() {
        $(this).off("click");
        $(this).one("click", function(e) {
          e.preventDefault();
          sendRequest($(this).next("div").html(), $(this).parent().data("ip"));
        });
      });
    });
  }

  sendRequest = function(client, _ip) {
    // initFourInANode();

    console.log("send request: " + "{clientname: " + client + ", ip: " + _ip + "}");
    socket.emit("send request", {clientname: client, ip: _ip});

    opponent_name = client;

    $(".popup").html("<h2>Waiting for \"" + client + "\"</h2>");
    $(".popup").css("display", "block");
    $(".popup").animate({opacity:1}, 1000);
    socket.removeAllListeners("request accepted");
    socket.on("request accepted", function( data ) {
      socket.emit("ready for game");
      socket.removeAllListeners("start game");
      socket.on("start game", function() {
        //popup reseten
        $(".popup").css("display", "none");
        $(".popup").animate({opacity:0}, 500);
        startPlayground( false );
      });
    });
  }

  startPlayground = function( myTurn ) {

  	incomingTurn = myTurn;
    initPlayground();

    $(".popup").animate({opacity: 0}, 500);
    $(".popup").css("display", "none");

    show(".mainStart", ".mainPlayground", function() {
      $("p.info").html("Du bist angemeldet als <b>" + player_name + ".<br />Los geht's!</b>");
      $("span.player1").html( player_name );
      $("span.player2").html( opponent_name );

      socket.removeAllListeners("turn");
      socket.on("turn", function( data ) {
        setToken( data.column );
      });
    });
  }

  closeFourInANode = function() {
    show(".mainPlayground", ".mainClose", function() {
      $("p.info").html("");
      $(".popup").css("display", "none");
      $(".popup").html('<h2>Good Bye ' + player_name + '</h2><p>Bis zum nächsten mal auf<br/> <a href="#" class="popupLink">Four in a Node</a>');
      $(".popup").css("display", "block");
      $(".popup").animate({opacity: 1}, 1000);
    });
  }

  showError = function( msg ) {
      console.log("error :: " + msg)
      $("p.error").html(msg);
      $("p.error").show();
  }

  show = function( current, target, doThis ) {
      $(current).animate( {opacity: 0}, 400);
      $(current).queue("fx", function(next) { 
        $(this).css("display", "none");
        if(typeof(doThis)=="function")
          doThis();
        
        $(target).css("display", "block");
        $(target).animate({opacity: 1}, 1000);
        
        next();
      });
  }

  function playAgain( player ){

    var text = "";
    if( player == '' ) 
      text = "Unentschieden!!";
    else if ( player == player_name )
      text = "Du hast gewonnen!!";
    else
      text = opponent_name + " hat gewonnen!!";

    setTimeout(function() {
      $(".popup").html('<h2>' + text + '</h2><p>Nochmal spielen?</p><p class="options"><a href="#" class="button replay_yes" id="logOnPlay"><span>Ja</span></a><a href="#" class="button replay_no" id="logOnPlay"><span>Nein</span></a></p>');
    
      $(".popup").css("display", "block");
      $(".popup").animate({opacity: 1}, 1000);

      $(".replay_yes").one("click", function() { 
        $(".popup").animate({opacity: 0}, 400);
        enabled = true;
        viewPlayers( true );
      });
      $(".replay_no").one("click", function() {
        $(".popup").animate({opacity: 0}, 400);
        enabled = true;
        closeFourInANode();
      });
    }, 1000);
  }

	function enableClickAndHoverEvent() {
		$(".arrows_div canvas, .canvas_div canvas").one( "click", function(e) {
			e.preventDefault();
			var column = $(this).data("col");
			var row = checkForFirstFree( column );
      socket.emit("turn", column);
			hoverOut( row, column );
			setToken( column );
		});

		$(".arrows_div canvas, .canvas_div canvas").hover(function(e) {
			hoverOn( $(this).data("col") );
		}, function(e) {
			 hoverOut( checkForFirstFree( $(this).data("col") ), $(this).data("col") );
		});
	}

	 function hoverOn( column ) {
    $("#hoverCanvas").remove();
    $("#canvas0_" + column + "_1").css("opacity", 0);
    $("#canvas0_" + column + "_0").css("opacity", 1);

    //To change the colors of the rows and the arrows by hovering
    for( var i = 0; i < 7; i++) {
      $("#canvas" + i + "_" + column).css("background-color", "#ddd");
      $("#canvas" + i + "_" + column).css("border-color", "#000");
    }
    //new canvas
    var firstFree = checkForFirstFree( column );
    var currentCanvas = $("#canvas" + firstFree + "_" + column);

    currentCanvas.after('<canvas id="hoverCanvas' + firstFree + '_' + column + '" width="50" height="50"></canvas>');
    var hoverCanvas = $("#hoverCanvas" + firstFree + '_' + column);
    hoverCanvas.css({marginLeft: -50, opacity: 0.5, border:"none"});
    hoverFillColor = "#aa0000"; hoverStrokeColor = "#880000";
    
    drawCircle(hoverCanvas[0], hoverFillColor, hoverStrokeColor, 25, 25, 20);
  }

  function hoverOut( row, column ) {
    $("#canvas0_" + column + "_1").css("opacity", 1);
    $("#canvas0_" + column + "_0").css("opacity", 0);
    for( var i = 0; i < 7; i++) {
      $("#canvas" + i + "_" + column).css("background-color", "#fefefe");
      $("#canvas" + i + "_" + column).css("border-color", "#c8c8c8");
    }
    $("#hoverCanvas" + row + "_" + column).remove();
  }

	function setToken( column ) {
		/* if (animationActive == true)
      return;
    animationActive = true;
    if( typeof(bounceInterval) == "undefined" )
      bounceInterval = null;
    clearInterval( bounceInterval ); */

		freeFieldSpace = checkForFirstFree( column );
		// return 1 = last available field - disable events after that
		if(freeFieldSpace == 1)
			disableClickAndHoverEvent( column );

		// set point depending on incoming/outgoing turn
		field[freeFieldSpace][column] = (incomingTurn) ? 2 : field[freeFieldSpace][column] = 1;

		// start animation
		animateTokenToDestination( freeFieldSpace, column );
		
		printField();
		checkForWinner( freeFieldSpace, column );

		if(incomingTurn == true) {
			draggableTurn();
			enableClickAndHoverEvent();
			incomingTurn = false;
		} else {
			$("#player1").draggable("disable");
			disableClickAndHoverEvent( -1 );
			incomingTurn == true;
		}

		/* clearInterval( bounceInterval );
		var player = (incomingTurn) ? 1 : 2;

		startBounceInterval( player ); */
		
	}

	/* function startBounceInterval( player ) {
		bounceInterval = setInterval( function() {
      $("#player" + player).effect("bounce", { times:3 }, 600);
    }, 1500);
	} */

	function checkForWinner( lastRow, lastColumn) {

		var player = (incomingTurn) ? 2 : 1;
		var winning_counter = 0;

		if( checkForVerticalWinner( player, lastRow, lastColumn ) >= 4 
				|| checkForHorizontalWinner( player, lastRow, lastColumn ) >= 4
				|| checkForDiagonalLeftWinner ( player, lastRow, lastColumn ) >= 4
				|| checkForDiagonalRightWinner ( player, lastRow, lastColumn ) >= 4) {
			console.log("And the winner is... " + player);
			disableClickAndHoverEvent( -1 );
			var winning_player_name = (incomingTurn) ? opponent_name : player_name;
			playAgain( winning_player_name );
		} 

		// check for vertical winning
		function checkForVerticalWinner( player, lastRow, lastColumn ) {
			if( lastRow < 4 ) {
				for( var i = lastRow; i < lastRow+4; i++) {
					if( field[i][lastColumn] == player )
						winning_counter++;
					else
						winning_counter = 0;
				}
				if( winning_counter >= 4) {
					for( var i = lastRow; i < lastRow+4; i++) {
						console.log(i);
						$("#canvas" + i + "_" + lastColumn).css("background-color", "#6E0101");
					}
				}
			}
			return winning_counter;
		}

		// check for horizontal winning
		function checkForHorizontalWinner( player, lastRow, lastColumn ) {
			for ( var i = 1; i < 8; i++ ) {
				if( field[lastRow][i] == player)
					winning_counter++;
				else
					winning_counter = 0;

				if( winning_counter >= 4) {
					for( var j = i; j < (i-4); j++) {
						$("#canvas" + lastRow + "_" + i).css("background-color", "#6E0101");
					}
				}
			}
			return winning_counter;
		}
	
		// check verticals
		function checkForDiagonalLeftWinner( player, lastRow, lastColumn ) {
			if( lastRow < 4 ) {
				// from left to right
				row = lastRow; column = lastColumn;
				while(row < 7 && column < 8) {
					if(field[row][column] == player)
						winning_counter++;
					else
						winning_counter = 0;
					if( winning_counter >= 4 ) {
						while( row >= lastRow && column >= lastColumn ) {
							$("#canvas" + row + "_" + column).css("background-color", "#6E0101");
							row--; column--;
						}
						break;
					}
					row++;
					column++;
				}
				return winning_counter;
			}
		}

		function checkForDiagonalRightWinner( player, lastRow, lastColumn ) {
			if( lastRow < 4 ) {
				// from right to left
				row = lastRow; column = lastColumn;
				while(row < 7 && column < 8) {
					if(field[row][column] == player)
						winning_counter++;
					else
						winning_counter = 0;
					if( winning_counter >= 4 ) {
						while( row >= lastRow && column <= lastColumn ) {
							$("#canvas" + row + "_" + column).css("background-color", "#6E0101");
							row--; column++;
						}
						break;
					}
					row++;
					column--;
				}
				return winning_counter;
			}
		}

	}

	function animateTokenToDestination( row, column ) {

		// create new canvas token
		$("#canvas" + row + "_" + column).after('<canvas id="tmpCanvas' + row + '_' + column +
			'" width="50" height="50" class="noBG"></canvas> ');
		fillColor = ( incomingTurn ) ? "#0000aa" : "#aa0000";
		strokeColor = ( incomingTurn ) ? "#000088" : "#880000";

		var tmpCircle = $("#tmpCanvas" + row + "_" + column);
		var currentField = $("#canvas" + row + "_" + column);
		drawCircle( tmpCircle[0], fillColor, strokeColor, 25, 25, 20 );

    tmpCircle.animate({top: currentField.position().top}, 1000, "easeOutBounce", function() {
		  drawCircle(currentField[0], fillColor, strokeColor, 25, 25, 20);
		  tmpCircle.remove();
		  animationActive = false;
		});

	}

	function drawCircle( elem, fillColor, strokeColor, posX, posY, radius ) {
		context = elem.getContext("2d");
		context.beginPath();
    context.arc(posX, posY, radius, 0, 2 * Math.PI, true);
    context.fillStyle = fillColor;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = strokeColor;
    context.stroke();
    context.closePath();		
	}

	function disableClickAndHoverEvent( column ) {
		if(column == -1 ) {
			for( var i = 6; i > 0; i-- )
				for( var j = 7; j > 0; j--) {
					$("#canvas" + i + "_" + j).unbind("click").unbind("hover");	
					$("#canvas0" + "_" + j + "_1").unbind("click").unbind("hover");
					$("#canvas0" + "_" + j + "_0").unbind("click").unbind("hover");	
				}
		} else {
			for( var i = 6; i > 0; i-- )
				$("#canvas" + i + "_" + column).unbind("click").unbind("hover");
			$("#canvas0" + "_" + column + "_1").unbind("click").unbind("hover");
			$("#canvas0" + "_" + column + "_0").unbind("click").unbind("hover");

			// change arrow to cross
			disableControls( column );
		}
	}

	function disableControls( column ) {
		var arrow_active_canvas = $("#canvas0_" + column + "_1")[0];
		var arrow_inactive_canvas = $("#canvas0_" + column + "_0")[0];
		arrow_active_canvas.width = arrow_active_canvas.width;
		arrow_inactive_canvas.width = arrow_inactive_canvas.width;
		var arrow_active_context = arrow_active_canvas.getContext("2d");
		var arrow_inactive_context = arrow_inactive_canvas.getContext("2d");
		arrow_active_context.drawImage(cross, 10, 10);
		arrow_inactive_context.drawImage(cross, 10, 10);
	}

  function draggableTurn() {

    $("#player1").draggable({
        revert: false,
        cursorAt: { left: 25, top: 25 },
        start: function( e ) {
          theCanvasCopy = $("#player1copy" );
          fillColor = "#aa0000" ; strokeColor = "#880000";

          theCanvasCopy.css("display", "block");
          drawCircle(theCanvasCopy[0], fillColor, strokeColor, 25, 25, 20 );

          var i = 0;
          var interval = setInterval( function() {
            i += 1;
            if( i >= 30 )
              clearInterval( interval );
              theCanvasCopy.width(20+i).height(20+i);
            }, 10)
            // return $( "#" + theCanvas );
        },
        helper: function( ) {
            return $( "#player1copy" ).css("opacity", 0.8);
        },
        stop: function () {
          $("#players").append('<canvas id="player1copy" width="50" height="50" style="opacity:0;"></canvas>');
        }
    });
  }


  $( ".arrows_div canvas, .canvas_div canvas" ).droppable({
    drop: function( event ) {
    	var column = $(this).data("col");
    	var row = checkForFirstFree( column );
			hoverOut( row, column );
      setToken( column );      
    }, over: function () {
      if( field[1][$(this).data("col")] == 0 )
        hoverOn( $(this).data("col") );
    }, out: function () {
      if( field[1][$(this).data("col")] == 0 ) {
      	freeField = checkForFirstFree($(this).data("col"));
        hoverOut( freeField, $(this).data("col") );
      }
    }
  });

	function checkForFirstFree( column ) {
		// first check first free space from the column
		for( var i = 6; i > 0; i-- ) {
			if( field[i][column] == 0 ) {
				return i;
			}
		}
	}

	function printField() {
		var tmp;
		console.log("================");
		for( var i = 1; i < 7; i++ ) {
			tmp = "";
			for( var j = 1; j < 8; j++ ) {
				tmp += field[i][j] + " ";
			}
			console.log( tmp );
		}
	}


	function drawArrows() {
		for( var i = 1; i < 8; i++ ) {
			cActive = $("#canvas0_" + i + "_1")[0];
			cInActive = $("#canvas0_" + i + "_0")[0];
			cActive.width = cActive.width;
			cInActive.width = cInActive.width;
			contextActive = cActive.getContext("2d");
			contextInActive = cInActive.getContext("2d");
			contextActive.drawImage( arrow_active, 10, 10 );
			contextInActive.drawImage( arrow_inactive, 10, 10 );
		}
	}

	function initField() {
		for( var i = 1; i < 7; i++ ) {
			field[i] = [];
			for( var j = 1; j < 8; j++ ) {
				field[i][j] = 0;
				$("#canvas" + i + "_" + j).css("background-color", "#fefefe");
				$("#canvas" + i + "_" + j).css("border-color", "#c8c8c8");
			}
		}
	}

	function initPlayers() {
		client_name = "Test";
		opponent_name = "1234";
		$("span.player1").html(client_name);
		$("span.player2").html(opponent_name);
    console.log("drawing players");
		drawCircle( $("#player1")[0], "#aa0000", "#880000", 15, 15, 10 );
		drawCircle( $("#player2")[0], '#0000aa', '#000088', 15, 15, 10) ;
    console.log("players drawed");
	}


	function initPlayground() {
    console.log("arrows init");
		drawArrows();
    console.log("field init");
		initField();
    console.log("init players");
		initPlayers();
    console.log()
		if(incomingTurn == true) {
			disableClickAndHoverEvent( -1 );
			// $("#player1").draggable( "remove" );
			// startBounceInterval( 2 );
		} else {
      console.log("it's a draggable turn");
			draggableTurn();
      console.log("events are enabled");
			enableClickAndHoverEvent();
      console.log("bounce started");
			// startBounceInterval( 1 );
		}
	}

	// startPlayground sets the incomingTurn on true or false
	// if it's false - i start
	// 		- so it's a draggableTurn, all events are enabled & the bounceInterval is 1
	// if it's true - the opponent starts
	// 		- so it's no draggableTurn, all events are disabled & the bounceInterval is 2

   socket.on("timeout", function() {
    $(".mainLogOn, .mainStart, .mainPlayground, .mainAbout, .mainClose, .popup").css({opacity: 0, display: "none"});
    $(".mainStart").css({opacity: 1, display: "block"});
    socket.emit("start broadcast");
   });

   socket.on("turn timeout", function() {
    socket.emit("error");
    $(".mainLogOn, .mainStart, .mainPlayground, .mainAbout, .mainClose, .popup").css({opacity: 0, display: "none"});
    $(".mainStart").css({opacity: 1, display: "block"});
    socket.emit("start broadcast");
   });	

});