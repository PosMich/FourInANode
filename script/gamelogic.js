//Global Variables
	var content;
	var turn = 0;
	var theCanvas;
	var c;
	var context;
	var replay;
	var field_occupied;
	var freeField;
	
	//Variables for Pictures
	var arrow;
	var arrow2;
	var cross;
	
	function drawCircle(theCanvas, fillColor, strokeColor, posX, posY, radius) {
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
	
	//Functions to get the Winner
	function checkWinner(row, colNumber){
		var counter;
		var getPlayer = content[row+"_"+colNumber];
		
		checkVertical();
		checkHorizontal(row);
		checkDiagonal1(row);
		checkDiagonal2(row);
		
		function Winner(counter) {
			if(counter >= 4)
			{
				alert(getPlayer + " hat gewonnen!");
                playAgain();
				//location.reload(true);
			}
		}
		
		function checkVertical() {
			counter = 0;
			for(var i=1; i<7; i++) {
				if(content[i+"_"+colNumber] == getPlayer){
					counter++;
				} else {
					counter = 0;
				}
				Winner(counter);
				
			}
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
		function checkDiagonal1(row){
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
				console.log(r+"_"+col);
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
	
	
	//Instanciate Arrays
	window.onload=function(){
	    content = new Array();
		field_occupied = new Array();
		freeField = false;
		$('.player1').css('font-weight','bold');
		
		arrow = new Image();
		arrow2 = new Image();
		cross = new Image();
		arrow.src = 'img/Arrow2.png';
		arrow2.src = 'img/Arrow.png';
		cross.src = 'img/x.png';
		
		for(var i=1; i<7; i++){
			for(var j=1; j<8; j++){
				field_occupied[i + "_" + j] = false;
				content[i + "_" + j]='';
			}
		} 
		
		for(var i=1; i<8; i++) {
			theCanvas = "canvas"+0+"_"+i; 
			c = document.getElementById(theCanvas);
			context = c.getContext("2d");
			context.drawImage(arrow, 10, 10);
		}
		
		//This handles the mouse-over Effect on arrows and fields (changing colors)
		//$('.arrow').mouseenter(function() {
        $('canvas').mouseenter(function() {
            var currentColumn = $(this).attr('id').charAt(8);
			//c = document.getElementById($(this).attr('id'));
            c = document.getElementById('canvas'+0+'_'+currentColumn);
			context = c.getContext("2d");
			context.drawImage(arrow2, 10, 10);

            //To change the colors of the rows by hovering
            for(var i=1; i<7; i++) {
                $('#canvas'+i+'_'+currentColumn).css("background-color", "#eeeeee");
            }

		}).mouseleave(function() {
			//c = document.getElementById($(this).attr('id'));
            currentColumn = $(this).attr('id').charAt(8);
            c = document.getElementById('canvas'+0+'_'+currentColumn);
			context = c.getContext("2d");
			context.drawImage(arrow, 10, 10);

            for(var i=1; i<7; i++) {
                $('#canvas'+i+'_'+currentColumn).css("background-color", "#fefefe");
            }
		});
		
		//making Coins for player 1 and player 2
		for(var i=1; i<3; i++) {
			theCanvas = "player"+i;
			
			if(theCanvas=="player1") {
				drawCircle(theCanvas, '#616161', '#4b4b4b', 15, 15, 10);
			}
			else {
				drawCircle(theCanvas, '#ffa200', '#ea6900', 15, 15, 10);
			}
		}
		
	}
	 
	function canvasClicked(canvasNumber, colNumber){   
		
		/*if(canvasNumber==0)
		{  */
				//First Player; Equal == first, Not Equal == second player
				if(turn%2==0){
					
					var i=6;
					while(freeField==false && i>0){
						if((field_occupied[i+"_"+colNumber])==false){
							theCanvas = "canvas"+i+"_"+colNumber;
							drawCircle(theCanvas, '#616161', '#4b4b4b', 25, 25, 20);
							
							$('.player2').css('font-weight','bold');
							$('.player1').css('font-weight','normal');
							
							//To see which field is already occupied with a stone
							field_occupied[i+"_"+colNumber]=true;
							content[i+"_"+colNumber] = 'player1';
							
							turn++;
							checkWinner(i, colNumber);
							freeField=true;
						}
						i--;
					}
					if (i==0)
					{
						theCanvas = "canvas"+0+"_"+colNumber; 
						c = document.getElementById(theCanvas);
						context = c.getContext("2d");
						context.drawImage(cross, 10, 10);
						//Unbind Mouse-Events to obtain the "X" image
						$("#" + theCanvas).unbind('mouseenter mouseleave');
					}
				}
							 
				else if(turn%2!=0){
					i=6;
					while((freeField==false) && (i>0)){
						if((field_occupied[i+"_"+colNumber])==false){
							theCanvas = "canvas"+i+"_"+colNumber;
							drawCircle(theCanvas, '#ffa200', '#ea6900', 25, 25, 20);
							
							$('.player1').css('font-weight','bold');
							$('.player2').css('font-weight','normal');
							
							content[i+"_"+colNumber] = 'player2';
							field_occupied[i+"_"+colNumber]=true;
							
							turn++;
							checkWinner(i, colNumber);
							freeField=true;
						}
					i--;
					}
					if (i==0)
					{
						theCanvas = "canvas"+0+"_"+colNumber; 
						c = document.getElementById(theCanvas);
						context = c.getContext("2d");
						context.drawImage(cross, 10, 10);
						$("#" + theCanvas).unbind('mouseenter mouseleave');
					}
				}
				
		 		freeField=false;
				
				//Counter for filled Squares; if it is full (42), the game is over by draw
				if(turn==42){
					alert("Unentschieden!");
					location.reload(true);
				}

	}
	 
	function playAgain(){
	    replay=confirm("Noch eine Runde?");
	    if(replay==true){
	        location.reload(true);
	    }
	    else{
	        alert("Dann eben nicht!");
	}
	 
	}
	
	