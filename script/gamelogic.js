//Global Variables
	
$(document).ready(function() {

	var socket = io.connect('http://localhost:8080');
	var content = [];
	var turn = 0;
	var theCanvas = null;
	var c = null;
	var context = null;
	var replay = true;
	var field_occupied = [];
	var freeField = true;
	var player_name = "";
	var opponent_name = "";
	var enabled = true;
	var oldData = [];
	var turnEnabled = true;
	var turnOffset = 0;
	animationActive = false;
	bounceInterval = null;

	//Variables for Pictures
	var arrow = new Image();
	var arrow2 = new Image();
	var cross = new Image();
	arrow.src = 'img/Arrow2.png';
	arrow2.src = 'img/Arrow.png';
	cross.src = 'img/x.png';

	$(".play").one("click", function() {
	    $(".mainLogOn").css("display", "block");
	});

	$(".about").one("click", function() {
	    $(".mainAbout").css("display", "block");
	});

	startGame = function() {
    $(".mainLogOn").css("display", "block");
    $(".mainLogOn").animate({opacity: 1}, 1000);
    $("p.info").html("Um \"Vier Gewinnt\" spielen zu können, wähle zuerst deinen Namen.");

    $("#logOnPlay").one("click", function(e) {
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
      bounceInterval = setInterval( function() {
				$("#player1").effect("bounce", { times:3 }, 600);
			}, 1500);
    }); 
	}

	viewPlayers = function( replay ) {
		if( !replay ) {
      show(".mainLogOn", ".mainStart", function() {
 		   	$("p.info").html("Wähle einen Spieler aus, den du in 4-Gewinnt besiegen möchtest!<br/>Du bist angemeldet als <b>" + player_name + "</b>.");
    	});
    } else {
    	initFourInANode();
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

            initFourInANode();

        	socket.emit("incoming request accept");
        	console.log("incoming request accept");
        	socket.removeAllListeners("incoming request verified");
        	socket.on("incoming request verified", function() {
        		socket.emit("ready for game");
						console.log("start gaḿe");
      			startPlayground( false );
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
    initFourInANode();

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
        startPlayground( true );
      });
    });
  }

	startPlayground = function( myTurn ) {

		$(".popup").animate({opacity: 0}, 500);
  	$(".popup").css("display", "none");

  	turnEnabled = myTurn;

    show(".mainStart", ".mainPlayground", function() {
  		$("p.info").html("Du bist angemeldet als <b>" + player_name + ".<br />Los geht's!</b>");
    	$("span.player1").html( player_name );
  	  $("span.player2").html( opponent_name );

  	  socket.removeAllListeners("turn");
  	  socket.on("turn", function( data ) {
  	  	setPoint( data.column );
  	  	turnEnabled = true;
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

	drawCircle = function(theCanvas, fillColor, strokeColor, posX, posY, radius) {
		// console.log(theCanvas);
		context = theCanvas.getContext("2d");
		
		context.beginPath();
		context.arc(posX, posY, radius, 0, 2 * Math.PI, true);
		context.fillStyle = fillColor;
		context.fill();
		context.lineWidth = 2;
		context.strokeStyle = strokeColor;
		context.stroke();
		context.closePath();
	}

	//Functions to get the Winner
	checkWinner = function(row, colNumber) {
		var counter;
		var getPlayer = content[row+"_"+colNumber];
		
		checkVertical();
		checkHorizontal(row);
		checkDiagonal1(row);
		checkDiagonal2(row);
		
		function Winner(counter) {
			if(counter >= 4) {
				enabled = false;
	      playAgain( getPlayer );				
			}
		}
		
		function checkVertical() {
			counter = 0;
			for(var i=1; i<7; i++) {
				if(content[i + "_" + colNumber] == getPlayer){
					counter++;
					if(counter >= 4) {
						for(j = i; j > (i-4); j--)
							$("#canvas" + j + "_" + colNumber).css("background-color", "#6E0101");
						unBindField( true );
						break;
					}
				} else {
					counter = 0;
				}
			}
			Winner(counter);
		}
		
		function checkHorizontal(row) {
			counter = 0;
			for(var i=1; i<8; i++) {
				if(content[row+"_"+i] == getPlayer){
					counter++;
					if( counter >= 4) {
						for(var j = i; j > (i-4); --j)
							$("#canvas" + row + "_" + j).css("background-color", "#6E0101");
						unBindField( true );
						break;
					}
				} else {
					counter = 0;
				}
			}
			Winner(counter);
		}
		
		//check for 4 diagonal stones from bottom left to top right
		function checkDiagonal1(row) {
			r = row;
			col = colNumber;
			counter = 0;
			
			while(col>0 && r<6) {
				r++;
				col--;
			}
			
			for(var i=0; i<6; i++) {
				//console.log(r+"_"+col);
				if(content[r+"_"+col] == getPlayer){
					counter++;
					if( counter >= 4) {
						for( var j = 0; j < 4; ++j) {
							$("#canvas" + r + "_" + col).css("background-color", "#6E0101");
							col--; r++;
						}

						unBindField( true );
						break;
					}
				} else {
					counter = 0;
				}
				col++;
				r--;
			}
			Winner(counter);
		}
		
		//check for 4 diagonal stones from bottom right to top left
		function checkDiagonal2(row){
			counter = 0;
			r = row;
			col = colNumber;
			
			while(r>1 && col>1) {
				r--;
				col--;
			}

			for(var i=0; i<6; i++) {
				
				if(content[r+"_"+col] == getPlayer){
					counter++;
					if( counter >= 4 ) {
						for( var j = 0; j < 4; ++j ) {
							$("#canvas" + r + "_" + col).css("background-color", "#6E0101");
							col--; r--;
						}

						unBindField( true );
						break;
					}
				} else {
					counter = 0;
				}
				r++;
				col++;
			}
			Winner(counter);
		}
	}

	initField = function() {
		for(var i=1; i<7; i++){
			for(var j=1; j<8; j++){
				field_occupied[i + "_" + j] = false;
				content[i + "_" + j]='';
				$( "#canvas"+i+"_"+j )[0].width = $( "#canvas"+i+"_"+j )[0].width;
			}
			//resetCanvas( "canvas0_"+j );
		} 
	};

	initArrows = function() {
		for(var i=1; i<8; i++) {
			theCanvas = "canvas0_" + i + "_1";
			theCanvasInactive = "canvas0" + "_" + i + "_0";
			c = document.getElementById(theCanvas);
			cInactive = document.getElementById(theCanvasInactive);
			c.width = c.width;
			cInactive.width = cInactive.width;
			context = c.getContext("2d");
			contextInactive = cInactive.getContext("2d");
			context.drawImage(arrow, 10, 10);
			contextInactive.drawImage(arrow2, 10, 10);
		}
	};

	bindCanvas = function() {
		//This handles the mouse-over Effect on arrows and fields (changing colors)
		$(".arrows_div canvas, .canvas_div canvas").hover( function(e) {
			if( turnEnabled ) {
				e.preventDefault();
				hoverOn( $(this).data("col") );
			}
		}, function(e) {
			if( turnEnabled ) {
				e.preventDefault();
				hoverOut( $(this).data("col") );
			}
		});
	}

	function hoverOn( col ) {
		$("#hoverCanvas").remove();
		$("#canvas0_" + col + "_1").css("opacity", 0);
		$("#canvas0_" + col + "_0").css("opacity", 1);

		//To change the colors of the rows and the arrows by hovering
		for( var i = 0; i < 7; i++) {
			$("#canvas" + i + "_" + col).css("background-color", "#ddd");
			$("#canvas" + i + "_" + col).css("border-color", "#000");
		}
		//new canvas
		for( var i = 7; i > 0; i--) {
			if( field_occupied[i + "_" + col] == false ) {
				theCanvas = $("#canvas" + i + "_" + col);
				break;
			}
		}

		theCanvas.after('<canvas id="hoverCanvas" width="50" height="50"></canvas>');
		var hoverCanvas = $("#hoverCanvas");
		hoverCanvas.css({marginLeft: -50, opacity: 0.5, border:"none"});
		if( turn%2 == 0 ) {
        	//fillColor = "#616161" ; strokeColor = "#4b4b4b";
        	fillColor = "#aa0000" ; strokeColor = "#880000";
        } else {
        	//fillColor = "#ffa200" ; strokeColor = "#ea6900";
        	fillColor = "#0000aa" ; strokeColor = "#000088";
        }
		drawCircle(hoverCanvas[0], fillColor, strokeColor, 25, 25, 20);

	}

	function hoverOut( col ) {
		$("#canvas0_" + col + "_1").css("opacity", 1);
		$("#canvas0_" + col + "_0").css("opacity", 0);
		for( var i = 0; i < 7; i++) {
			$("#canvas" + i + "_" + col).css("background-color", "#fefefe");
			$("#canvas" + i + "_" + col).css("border-color", "#c8c8c8");
		}
		$("#hoverCanvas").remove();
	}

	$(".arrows_div canvas, .canvas_div canvas").click(function(e) {
		e.preventDefault();
		if( turnEnabled ) {
			colNumber = $(this).data("col");
			socket.emit("turn", colNumber)
			$("#hoverCanvas").remove();
			setPoint( colNumber );
			$("#hoverCanvas").remove();
			turnEnabled = false;
			console.log("turnEnabled" + turnEnabled);
		}
	});

	function setPoint( colNumber ) {
		if (animationActive == true)
			return;
		animationActive = true;
        if( typeof(bounceInterval) == "undefined" )
        	bounceInterval = null;
		clearInterval( bounceInterval );

		if( enabled ) {
			if( (turn+turnOffset)%2==0 ){
				var i = 6;
				while( freeField==false && i>0 ) {
					if( (field_occupied[i + "_" + colNumber] )==false ){

						var theCanvas = $("#canvas" + i + "_" + colNumber);	
						// add new canvas
						theCanvas.after('<canvas id="canvasTmpCopy" width="50" height="50"></canvas>');
						var tmpCanvas = $("#canvasTmpCopy");
						tmpCanvas.css({top: 180, marginLeft: -50, border:"none", background:"transparent"});
						drawCircle(tmpCanvas[0], '#aa0000', '#880000', 25, 25, 20);
						
						tmpCanvas.animate({top: theCanvas.position().top}, 1000, "easeOutBounce", function() {
							drawCircle(theCanvas[0], '#aa0000', '#880000', 25, 25, 20);
							tmpCanvas.remove();
							animationActive = false;
						});
						
						$('.player2').css('font-weight','bold');

						bounceInterval = setInterval( function() {
        					$("#player2").effect("bounce", { times:3 }, 600);
        				}, 1500);

						$('.player1').css('font-weight','normal');
						
						//To see which field is already occupied with a stone
						field_occupied[i + "_" + colNumber] = true;
						content[i + "_" + colNumber] = player_name;
						
						turn++;
						checkWinner(i, colNumber);
						freeField = true;
					}
					i--;
				}
				if (i==0) {
					// clear hover effects & unbind elements of that row
					$("#canvas0_" + colNumber + "_1").css("opacity", 1);
					$("#canvas0_" + colNumber + "_0").css("opacity", 0);

					var myCanvas = "canvas0_" + colNumber + "_1"; 
					c = document.getElementById(myCanvas);
					context = c.getContext("2d");
					context.drawImage(cross, 10, 10);
					unBindControlls( colNumber );
					unBindElements( colNumber, false );
				}
			} else if( (turn+turnOffset)%2 != 0 ) {
				i=6;
				while( freeField==false && i>0 ){
					if( (field_occupied[i + "_" + colNumber] )==false ){

						var theCanvas = $("#canvas" + i + "_" + colNumber);	
						// add new canvas
						theCanvas.after('<canvas id="canvasTmpCopy" width="50" height="50"></canvas>');
						var tmpCanvas = $("#canvasTmpCopy");
						tmpCanvas.css({top: 180, marginLeft: -50, border:"none", background:"transparent"});
						drawCircle(tmpCanvas[0], '#0000aa', '#000088', 25, 25, 20);
						tmpCanvas.animate({top: theCanvas.position().top}, 1000, "easeOutBounce", function() {
							drawCircle(theCanvas[0], '#0000aa', '#000088', 25, 25, 20);
							tmpCanvas.remove();
							animationActive = false;
						});
						
						$('.player1').css('font-weight','bold');
						$('.player2').css('font-weight','normal');

						clearInterval( bounceInterval );

						bounceInterval = setInterval( function() {
        					$("#player1").effect("bounce", { times:3 }, 600);
        				}, 1500);
						
						content[i + "_" + colNumber] = opponent_name;
						field_occupied[i + "_" + colNumber]=true;
						
						turn++;
						checkWinner(i, colNumber);
						freeField = true;
					}
					i--;
				}
				if (i==0) {
					// clear hover effects & unbind elements of that row
					$("#canvas0_" + colNumber + "_1").css("opacity", 1);
					$("#canvas0_" + colNumber + "_0").css("opacity", 0);

					var myCanvas = "canvas0_" + colNumber + "_1"; 
					c = document.getElementById(myCanvas);
					context = c.getContext("2d");
					context.drawImage(cross, 10, 10);
					unBindControlls( colNumber );
					unBindElements( colNumber, false );
				}
			}
			
	 		freeField=false;
			
			//Counter for filled Squares; if it is full (42), the game is over by draw
			if( (turn-turnOffset)==42 ){
				playAgain("");
			}
		}
	}

	$(".canvas_div").mousedown(function(e){e.preventDefault();});

	playAgain = function( player ){

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

	initFourInANode = function() {
		content = new Array();
		field_occupied = new Array();
		freeField = false;
		turn = 0;
		$('.player1').css('font-weight','bold');
		
		initField();
		initArrows();
		bindCanvas();
		draggableTurn(0);

		//making Coins for player 1 and player 2
		for(var i=1; i<3; i++) {
			theCanvas = $("#player"+i);
			if( theCanvas.attr("id")=="player1" )
				drawCircle(theCanvas[0], '#aa0000', '#880000', 15, 15, 10);
			else
				drawCircle(theCanvas[0], '#0000aa', '#000088', 15, 15, 10);
		}
	}

	unBindElements = function( col, win ) {
		for( var i = 1; i < 7; i++ ) {
			$("#canvas" + i + "_" + col).unbind('mouseenter').unbind('mouseleave');
			if(!win) {
				$("#canvas" + i + "_" + col).css("background-color", "#fefefe");
				$("#canvas" + i + "_" + col).css("border-color", "#c8c8c8");
			}
		}
	}

	unBindField = function ( win ) {
		for( var i = 0; i < 7; ++i) {
			unBindControlls(i);
			unBindElements(i, win);
		}
	}

	unBindControlls = function( col ) {
		$("#canvas0_" + col + "_1").unbind('mouseenter').unbind('mouseleave');
		$("#canvas0_" + col + "_0").unbind('mouseenter').unbind('mouseleave');
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
	    			$("#players").append('<canvas id="player1copy" " width="50" height="50" style="opacity:0;"></canvas>');
	        }
	    });
	}


	 $( ".arrows_div canvas, .canvas_div canvas" ).droppable({
      drop: function( event ) {
      	setPoint( $(this).data("col") );
      }, over: function () {
      	if( !field_occupied["1_" + $(this).data("col")] )
      		hoverOn( $(this).data("col") );
      }, out: function () {
      	if( !field_occupied["1_" + $(this).data("col")] )
      		hoverOut( $(this).data("col") );
      }
    });

	 $("div, document, canvas").click(function(e){e.preventDefault();});

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