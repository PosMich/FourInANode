//Global Variables
	
$(document).ready(function() {

	//var socket = io.connect('http://localhost:8080');
	var content;
	var turn = 0;
	var theCanvas;
	var c;
	var context;
	var replay;
	var field_occupied;
	var freeField;
	var player_name;
	var opponent_name;
	var enabled = true;

	//Variables for Pictures
	var arrow;
	var arrow2;
	var cross;

	arrow = new Image();
	arrow2 = new Image();
	cross = new Image();
	arrow.src = 'img/Arrow2.png';
	arrow2.src = 'img/Arrow.png';
	cross.src = 'img/x.png';

	$(".play").on("click", function() {
	    $(".mainLogOn").css("display", "block");
	});

	$(".about").on("click", function() {
	    $(".mainAbout").css("display", "block");
	});

	startGame = function() {
	    $(".mainLogOn").css("display", "block");
	    $(".mainLogOn").animate({opacity: 1}, 1000);
	    $("p.info").html("Um \"Vier Gewinnt\" spielen zu können, wähle zuerst deinen Namen.");

	    $("#logOnPlay").on("click", function(e) {
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
	    		//socket.emit("set Name", player_name);
	    			viewPlayers( false );	            
	        } else {
	            showError( msg );
	        }
	    }); 
	}

	var oldData = [];

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

	    //socket.emit("start broadcast");

	    /*socket.on("update opponent list", function( data ) { 

	      newData = $.extend(true, [], data);

	      for( var i = 0; i < oldData.length; ++i) {
	      	oldData[i].checked = false;
	      }

	      for ( var i=0; i<newData.length; i++ ) {
	      	for ( var j=0; j<oldData.length; j++) {
	      		if( newData[i].ip == oldData[j].ip ) {
	      			if(oldData[j].clientname != newData[i].clientname) {
	      				oldData[j].clientname = newData[i].clientname;
		      			newData[i].checked = false;
		      			oldData[j].checked = false;
		      		} else {
						newData[i].checked = true;
		      			oldData[j].checked = true;
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
	      			console.log(newData[i]);
	      			$("ul#playerList").append('<li data-ip="' + newData[i].ip + '"><a href="#" class="button toPlayground"><span>Play</span></a><div class="player">' + newData[i].clientname + '</div></li>');
	      			$("ul#playerList").children().last().animate({opacity:1}, 1000);
	      		} else {
	      			$("ul#playerList").html('<li data-ip="' + newData[i].ip + '"><a href="#" class="button toPlayground"><span>Play</span></a><div class="player">' + newData[i].clientname + '</div></li>')
	      				.children().animate({opacity:1}, 1000);
	      			console.log(newData[i]);
	      		}
	      		oldData.push( newData[i] );
	      	}

	      }*/

	      /*socket.on("incoming request", function( data ) {
	      	console.log( data );
	      	$(".popup").html("<h2>\"" + data.clientname + '\" würde gerne mit dir spielen.</h2><a href="#" class="button play_yes" id="logOnPlay"><span>Ja</span></a><a href="#" class="button replay_no" id="logOnPlay"><span>Nein</span></a>');
            $(".popup").css("display", "block");
            $(".popup").animate({opacity:1}, 1000);

            $(".play_yes").click(function() {
            	socket.emit("incoming request accept");
            	startPlayground( false );
            })

	      });*/

	      $(document).on("click", ".toPlayground", function(e) {
	      	e.preventDefault();
	      	console.log("play with: " + "{clientname: " + $(this).parent().find(".player").text() + ", ip: " + $(this).parent().data("ip") + "}");
            //socket.emit("send request", {clientname: $(this).parent().find(".player").text(), ip: $(this).parent().data("ip")});
            $(".popup").html("<h2>Waiting for \"" +  $(this).find(".player").text() + "\"</h2>");
            $(".popup").css("display", "block");
            $(".popup").animate({opacity:1}, 1000);
            //socket.on("request accepted", function( data ) {
            	initFourInANode();
            	//popup reseten
            	$(".popup").css("display", "none");
            	$(".popup").animate({opacity:0}, 500);
            	startPlayground( false );
            //});
	      });
	      /*
	      $(".toPlayground").live().each( function() {
	      	$(this).live("click", function(e) {
	      		console.log("asdfasdf");
	            e.preventDefault();
	            console.log("play with: " + "{clientname: " + $(this).parent().find(".player").text() + ", ip: " + $(this).parent().data("ip") + "}");
	            socket.emit("send request", {clientname: $(this).find(".player").text(), ip: $(this).data("ip")});
	            $(".popup").html("<h2>Waiting for \"" +  $(this).find(".player").text() + "\"</h2>");
	            $(".popup").css("display", "block");
	            $(".popup").animate({opacity:1}, 1000);
	            socket.on("request accepted", function( data ) {
	            	initFourInANode();
	            	//popup reseten
	            	$(".popup").css("display", "none");
	            	$(".popup").animate({opacity:0}, 500);
	            	startPlayground( false );
	            });
	        });

	    });
	  });*/
	}

	function startPlayground ( replay ) {
		//socket.on("incoming request verified", function() {
			if(!replay) {
		        show(".mainStart", ".mainPlayground", function() {
		        	$("p.info").html("Du bist angemeldet als <b>" + player_name + ".<br />Los geht's!</b>");
			        $("span.player1").html( player_name );
			        $("span.player2").html( opponent_name );
		        });
		    } else {
		    	show(".popup", ".mainPlayground", function() {})
		    	initFourInANode();
		    }
		//});
	}

	function closeFourInANode() {
		show(".mainPlayground", ".mainClose", function() {
			$("p.info").html("");
			$(".popup").css("display", "none");
			$(".popup").html('<h2>Good Bye ' + player_name + '</h2><p>Bis zum nächsten mal auf<br/> <a href="#" class="popupLink">Four in a Node</a>');
			$(".popup").css("display", "block");
			$(".popup").animate({opacity: 1}, 1000);
		});
	}

	function showError( msg ) {
	    console.log("error :: " + msg)
	    $("p.error").html(msg);
	    $("p.error").show();
	}

	function show( current, target, doThis ) {
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

	function drawCircle(theCanvas, fillColor, strokeColor, posX, posY, radius) {
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
	function checkWinner(row, colNumber) {
		var counter;
		var getPlayer = content[row][colNumber];
		
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
				if(content[i][colNumber] == getPlayer){
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
				if(content[row][i] == getPlayer){
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
				if(content[r][col] == getPlayer){
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
				
				if(content[r][col] == getPlayer){
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

	function initField() {
		for(var i=1; i<7; i++){
			for(var j=1; j<8; j++){
				field_occupied[i][j] = false;
				content[i][j]='';
				$( "#canvas" + i + "_" + j )[0].width = $( "#canvas" + i + "_" + j )[0].width;
			}
			//resetCanvas( "canvas0_"+j );
		} 
	};

	function initArrows() {
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

	function bindCanvas() {
		//This handles the mouse-over Effect on arrows and fields (changing colors)
		$("canvas").hover( function(e) {
			e.preventDefault();
			hoverOn( $(this).data("col") );
		}, function(e) {
			e.preventDefault();
			hoverOut( $(this).data("col") );
		});
	}

	function hoverOn( col ) {
		$("#canvas0_" + col + "_1").css("opacity", 0);
		$("#canvas0_" + col + "_0").css("opacity", 1);

		//To change the colors of the rows and the arrows by hovering
		for( var i = 0; i < 7; i++) {
			$("#canvas" + i + "_" + col).css("background-color", "#ddd");
			$("#canvas" + i + "_" + col).css("border-color", "#000");
		}
		//new canvas
		for( var i = 6; i >= 0; i--) {
			console.log("col: "+col);
			console.log(field_occupied[0][col]);
			if( field_occupied[i][col] == false ) {
				theCanvas = $("#canvas" + i + "_" + col);
				break;
			}
		}

		theCanvas.after('<canvas id="hoverCanvas" width="50" height="50"></canvas>');
		var hoverCanvas = $("#hoverCanvas");
		hoverCanvas.css({marginLeft: -50, opacity: 0.5});
		if( turn%2 == 0 ) {
        	fillColor = "#616161" ; strokeColor = "#4b4b4b";
        } else {
        	fillColor = "#ffa200" ; strokeColor = "#ea6900";
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
		$("#hoverCanvas").remove();
		colNumber = $(this).data("col");
		setPoint( colNumber );
	});

	function setPoint( colNumber ) {
        
    if( typeof(bounceInterval) == "undefined" )
    	bounceInterval = null;
		clearInterval( bounceInterval );

		if( enabled ) {
			if( turn%2==0 ){
				var i = 6;
				while( freeField==false && i>0 ) {
					if( (field_occupied[i][colNumber] )==false ){

						var theCanvas = $("#canvas" + i + "_" + colNumber);	
						// add new canvas
						theCanvas.after('<canvas id="canvasTmpCopy" width="50" height="50"></canvas>');
						var tmpCanvas = $("#canvasTmpCopy");
						tmpCanvas.css({top: 180, marginLeft: -50});
						drawCircle(tmpCanvas[0], '#616161', '#4b4b4b', 25, 25, 20);
						
						tmpCanvas.animate({top: theCanvas.position().top}, 1000, "easeOutBounce", function() {
							drawCircle(theCanvas[0], '#616161', '#4b4b4b', 25, 25, 20);
							tmpCanvas.remove();
						});
						
						$('.player2').css('font-weight','bold');

						bounceInterval = setInterval( function() {
        					$("#player2").effect("bounce", { times:3 }, 600);
        				}, 1500);

						$('.player1').css('font-weight','normal');
						
						//To see which field is already occupied with a stone
						field_occupied[i][colNumber] = true;
						content[i][colNumber] = player_name;
						
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

					theCanvas = "canvas0_" + colNumber + "_1"; 
					c = document.getElementById(theCanvas);
					context = c.getContext("2d");
					context.drawImage(cross, 10, 10);
					unBindControlls( colNumber );
					unBindElements( colNumber, false );
				}
			} else if(turn%2!=0) {
				i=6;
				while( freeField==false && i>0 ){
					if( (field_occupied[i][colNumber] )==false ){

						var theCanvas = $("#canvas" + i + "_" + colNumber);	
						// add new canvas
						theCanvas.after('<canvas id="canvasTmpCopy" width="50" height="50"></canvas>');
						var tmpCanvas = $("#canvasTmpCopy");
						tmpCanvas.css({top: 180, marginLeft: -50});
						drawCircle(tmpCanvas[0], '#ffa200', '#ea6900', 25, 25, 20);
						tmpCanvas.animate({top: theCanvas.position().top}, 1000, "easeOutBounce", function() {
							drawCircle(theCanvas[0], '#ffa200', '#ea6900', 25, 25, 20);
							tmpCanvas.remove();
						});
						
						$('.player1').css('font-weight','bold');
						$('.player2').css('font-weight','normal');

						clearInterval( bounceInterval );

						bounceInterval = setInterval( function() {
        					$("#player1").effect("bounce", { times:3 }, 600);
        				}, 1500);
						
						content[i][colNumber] = opponent_name;
						field_occupied[i][colNumber]=true;
						
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

					theCanvas = "canvas0_" + colNumber + "_1"; 
					c = document.getElementById(theCanvas);
					context = c.getContext("2d");
					context.drawImage(cross, 10, 10);
					unBindControlls( colNumber );
					unBindElements( colNumber, false );
				}
			}
			
	 		freeField=false;
			
			//Counter for filled Squares; if it is full (42), the game is over by draw
			if(turn==42){
				playAgain("");
			}
			if(turn >= 1) {
				playerId_disable = ( turn%2 ) ? "1" : "2";
				playerId_enable = ( turn%2 ) ? "2" : "1";
			}



			$("#player" + playerId_disable).draggable( 'disable' );
			draggableTurn( turn );			
			$("#player" + playerId_enable).draggable( 'enable' );
		}
	}

	$(".canvas_div").mousedown(function(e){e.preventDefault();});

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

			$(".replay_yes").live("click", function() { 
				$(".popup").animate({opacity: 0}, 400);
				enabled = true;
				viewPlayers( true );
			});
			$(".replay_no").on("click", function() {
				$(".popup").animate({opacity: 0}, 400);
				enabled = true;
				closeFourInANode();
			});
		}, 1000);
	}

	function initFourInANode() {
		content = [];
		field_occupied = [];
		for(var i = 0; i < 7; i++) {
			content[i] = new Array();
			field_occupied[i] = new Array();
			for (var j=0; j<8; j++) {
				content[i][j] = ""; 
				field_occupied[i][j] = true;
			}
		}

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
			if( theCanvas.attr("id")=="player1" ) {
				drawCircle(theCanvas[0], '#616161', '#4b4b4b', 15, 15, 10);
				// drawCircle(theCanvas + 'copy', '#616161', '#4b4b4b', 15, 15, 10);
			} else {
				drawCircle(theCanvas[0], '#ffa200', '#ea6900', 15, 15, 10);
				// drawCircle(theCanvas + 'copy', '#ffa200', '#ea6900', 15, 15, 10);
			}
		}
	}

	function unBindElements( col, win ) {
		for( var i = 1; i < 7; i++ ) {
			$("#canvas" + i + "_" + col).unbind('mouseenter').unbind('mouseleave');
			if(!win) {
				$("#canvas" + i + "_" + col).css("background-color", "#fefefe");
				$("#canvas" + i + "_" + col).css("border-color", "#c8c8c8");
			}
		}
	}

	function unBindField( win ) {
		for( var i = 0; i < 7; ++i) {
			unBindControlls(i);
			unBindElements(i, win);
		}
	}

	function unBindControlls( col ) {
		$("#canvas0_" + col + "_1").unbind('mouseenter').unbind('mouseleave');
		$("#canvas0_" + col + "_0").unbind('mouseenter').unbind('mouseleave');
	}

	function draggableTurn( turn ) {
		playerId = ( turn%2 ) ? "2" : "1";
	    $("#player" + playerId).draggable({
	        revert: "invalid",
	        cursorAt: { left: 25, top: 25 },
	        start: function( e ) {
	        	theCanvasCopy = $("#" + $(this).attr("id") + "copy" );
	        	if( $(this).attr("id") == "player1" ) {
	            	fillColor = "#616161" ; strokeColor = "#4b4b4b";
	            } else {
	            	fillColor = "#ffa200" ; strokeColor = "#ea6900";            	
	            }

	            theCanvasCopy.css("display", "block");
	            drawCircle(theCanvasCopy[0], fillColor, strokeColor, 25, 25, 20 );

	            var i = 0;
	            var interval = setInterval( function() {
	            	i += 1;
	            	if( i >= 30 )
	            		clearInterval( interval )
	            	theCanvasCopy.width(20+i).height(20+i);
	            }, 10)
	            // return $( "#" + theCanvas );
	        },
	        helper: function( e ) {
	            return $( "#" + $(this).attr("id") + "copy" ).css("opacity", 0.8);
	        },
	        stop: function () {
	    		$(this).after('<canvas id="' + $(this).attr("id") + "copy" + '" width="50" height="50" style="opacity:0;"></canvas>');
	        }
	    });
	}

	 $( ".arrows_div canvas, .canvas_div canvas" ).droppable({
      drop: function( event ) {
      	setPoint( $(this).data("col") );
      }, over: function () {
      	if( !field_occupied[1][$(this).data("col")] )
      		hoverOn( $(this).data("col") );
      }, out: function () {
      	if( !field_occupied[1][$(this).data("col")] )
      		hoverOut( $(this).data("col") );
      }
    });

	 $("div, document, canvas").click(function(e){e.preventDefault();});


	/* socket.on("timeout", function() {
	 	console.log("timeout");
	 	$("#logOn").css("display", "none");
	 	$("#mainStart").css("display", "none");
	 	$("#mainPlayground").css("display", "none");
		show(".popup", "#mainStart");
		socket.emit("start broadcast");
	 });*/
});