//Global Variables
	
$(document).ready(function() {

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
	    $("p.info").html("Wähle zuerst deinen Namen.");

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
	    		socket.emit("set player name", player_name);
	    		socket.on("set player name successful", function() {
	    			viewPlayers( false );
	    		});
	    		socket.on("set player name failed", function() {
	    			showError( "Interner Fehler" );
	    		});
	            
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

	    socket.emit("start searching opponents");

	    socket.on("update opponent list", function( data ) {

	      newData = $.extend(true, [], data);

	      for( var i = 0; i < oldData.length; ++i) {
	      	oldData[i].checked = false;
	      }

	      for ( var i=0; i<newData.length; i++ ) {
	      	for ( var j=0; j<oldData.length; j++) {
	      		if( newData[i].ip == oldData[j].ip ) {
	      			oldData[j].clientname = newData[i].clientname;
	      			newData[i].checked = true;
	      			oldData[j].checked = true;
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

	      socket.on("incoming request", function( data ) {
	      	console.log( data );
	      	$(".popup").html("<h2>\"" +  $(this).find(".player").text() + '\" würde gerne mit dir spielen.</h2><a href="#" class="button replay_yes" id="logOnPlay"><span>Ja</span></a><a href="#" class="button replay_no" id="logOnPlay"><span>Nein</span></a>');
            $(".popup").css("display", "block");
            $(".popup").animate({opacity:1}, 1000);
	      	
	      });

	      $("#playerList li").each(function() {
	          $(this).click( function(e) {
	            e.preventDefault();
	            console.log("play with: " + "{clientname: " + $(this).find(".player").text() + ", ip: " + $(this).data("ip") + "}");
	            socket.emit("play with", {clientname: $(this).find(".player").text(), ip: $(this).data("ip")});
	            $(".popup").html("<h2>Waiting for \"" +  $(this).find(".player").text() + "\"</h2>");
	            $(".popup").css("display", "block");
	            $(".popup").animate({opacity:1}, 1000);
	            socket.on("play request accepted", function( data ) {
	            	initFourInANode();
	            	//popup reseten
	            	$(".popup").css("display", "none");
	            	$(".popup").animate({opacity:0}, 500);
	            	startPlayground( false );
	            });
	          });
	      });
	    });
	  
	    $(".toPlayground").live("click", function() {
	        opponent_name = $(this).next().text();
	        console.log("send game request");
	        socket.emit("send game request", opponent_name);
	        
	    });
	}

	startPlayground = function( replay ) {
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
		c = document.getElementById(theCanvas);
		context = c.getContext("2d");
		
		context.beginPath();
		context.arc(posX, posY, radius, 0, 2 * Math.PI, true);
		context.fillStyle = fillColor;
		context.fill();
		context.lineWidth = 2;
		context.strokeStyle = strokeColor;
		context.stroke();
		context.closePath();
	}

	resetCanvas = function( theCanvas ) {
		c = document.getElementById(theCanvas);
		c.width = c.width;
	}


	//Functions to get the Winner
	checkWinner = function(row, colNumber) {
		console.log("checkWinner");
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
					console.log("counter: " + counter);
					if(counter >= 4) {
						for(j = i; j > (i-4); j--)
							$("#canvas" + j + "_" + colNumber).css("background-color", "#6E0101");
						break;
					}
				} else {
					counter = 0;
				}
				console.log("winning counter:" + counter);
			}
			Winner(counter);
		}
		
		function checkHorizontal(row) {
			counter = 0;
			for(var i=1; i<8; i++) {
				if(content[row+"_"+i] == getPlayer){
					counter++;
				} else {
					counter = 0;
				}
				Winner(counter);
				
			}
		}
		
		//check for 4 diagonal stones from bottom left to top right
		function checkDiagonal1(row) {
			r = row;
			col = colNumber;
			counter = 0;
			
			while(col>0 && r<6)
			{
				r++;
				col--;
			}
			
			for(var i=0; i<6; i++) {
				//console.log(r+"_"+col);
				if(content[r+"_"+col] == getPlayer){
					counter++;
				} else {
					counter = 0;
				}
				
				Winner(counter);
				col++;
				r--;
			}
		}
		
		//check for 4 diagonal stones from bottom right to top left
		function checkDiagonal2(row){
			counter = 0;
			r = row;
			col = colNumber;
			
			while(r>1 && col>1)
			{
				r--;
				col--;
			}

			for(var i=0; i<6; i++) {
				
				if(content[r+"_"+col] == getPlayer){
					counter++;
				} else {
					counter = 0;
				}
				
				Winner(counter);
				r++;
				col++;
			}
		}
	}

	initField = function() {
		for(var i=1; i<7; i++){
			for(var j=1; j<8; j++){
				field_occupied[i + "_" + j] = false;
				content[i + "_" + j]='';
				resetCanvas( "canvas"+i+"_"+j );
			}
			//resetCanvas( "canvas0_"+j );
		} 
	};

	initArrows = function() {
		for(var i=1; i<8; i++) {
			theCanvas = "canvas0_" + i + "_1";
			theCanvasInactive = "canvas0" + "_" + i + "_0";
			console.log(theCanvas);
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
		$("canvas").hover(function(e) {
			e.preventDefault();
			var col = $(this).data("col");
			
			$("#canvas0_" + col + "_1").css("opacity", 0);
			$("#canvas0_" + col + "_0").css("opacity", 1);

			//To change the colors of the rows and the arrows by hovering
			for( var i = 0; i < 7; i++) {
				$("#canvas" + i + "_" + col).css("background-color", "#ddd");
				$("#canvas" + i + "_" + col).css("border-color", "#000");
			}
		}, function(e) {
			e.preventDefault();
			var col = $(this).data("col");
			$("#canvas0_" + col + "_1").css("opacity", 1);
			$("#canvas0_" + col + "_0").css("opacity", 0);
			for( var i = 0; i < 7; i++) {
				$("#canvas" + i + "_" + col).css("background-color", "#fefefe");
				$("#canvas" + i + "_" + col).css("border-color", "#c8c8c8");
			}
		});
	}

	$("canvas").click(function(e) {
		e.preventDefault();
		colNumber = $(this).data("col");

		console.log("turn: " + turn);

		if( enabled ) {
			if( turn%2==0 ){
				var i = 6;
				while( freeField==false && i>0 ) {
					if( (field_occupied[i + "_" + colNumber] )==false ){
						theCanvas = "canvas" + i + "_" + colNumber;
						drawCircle(theCanvas, '#616161', '#4b4b4b', 25, 25, 20);
						
						$('.player2').css('font-weight','bold');
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

					theCanvas = "canvas0_" + colNumber + "_1"; 
					c = document.getElementById(theCanvas);
					context = c.getContext("2d");
					context.drawImage(cross, 10, 10);
					$("#canvas0_" + colNumber + "_1").unbind('mouseenter').unbind('mouseleave');
					$("#canvas0_" + colNumber + "_0").unbind('mouseenter').unbind('mouseleave');
					for( var i = 1; i < 7; i++ ) {
						$("#canvas" + i + "_" + colNumber).unbind('mouseenter').unbind('mouseleave');
						$("#canvas" + i + "_" + colNumber).css("background-color", "#fefefe");
						$("#canvas" + i + "_" + colNumber).css("border-color", "#c8c8c8");
					}
				}
			} else if(turn%2!=0) {
				i=6;
				while( freeField==false && i>0 ){
					if( (field_occupied[i + "_" + colNumber] )==false ){
						theCanvas = "canvas" + i + "_" + colNumber;
						drawCircle(theCanvas, '#ffa200', '#ea6900', 25, 25, 20);
						
						$('.player1').css('font-weight','bold');
						$('.player2').css('font-weight','normal');
						
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

					theCanvas = "canvas0_" + colNumber + "_1"; 
					c = document.getElementById(theCanvas);
					context = c.getContext("2d");
					context.drawImage(cross, 10, 10);
					$("#canvas0_" + colNumber + "_1").unbind('mouseenter').unbind('mouseleave');
					$("#canvas0_" + colNumber + "_0").unbind('mouseenter').unbind('mouseleave');
					for( var i = 1; i < 7; i++ ) {
						$("#canvas" + i + "_" + colNumber).unbind('mouseenter').unbind('mouseleave');
						$("#canvas" + i + "_" + colNumber).css("background-color", "#fefefe");
						$("#canvas" + i + "_" + colNumber).css("border-color", "#c8c8c8");
					}
				}
			}
			
	 		freeField=false;
			
			//Counter for filled Squares; if it is full (42), the game is over by draw
			if(turn==42){
				playAgain("");
			}
		}
	});
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

	initFourInANode = function() {
		content = new Array();
		field_occupied = new Array();
		freeField = false;
		turn = 0;
		$('.player1').css('font-weight','bold');
		
		initField();
		initArrows();
		bindCanvas();

		//making Coins for player 1 and player 2
		for(var i=1; i<3; i++) {
			theCanvas = "player"+i;
			if(theCanvas=="player1")
				drawCircle(theCanvas, '#616161', '#4b4b4b', 15, 15, 10);
			else
				drawCircle(theCanvas, '#ffa200', '#ea6900', 15, 15, 10);
		}
	}

});

// 