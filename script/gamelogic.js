//Global Variables
	var content;
	var turn = 0;
	var theCanvas;
	var c;
	var context;
	var squaresFilled = 0;
	var replay;
	var field_occupied;
	var freeField;
	var arrow;
	var arrow2;
	var cross;
	
	var startX;
	var startY;
	var size;
	var theCanvas2;
	var d;
	var number;
	
	//Instanciate Arrays
	window.onload=function(){
	    content = new Array();
		field_occupied = new Array();
		freeField = false;
		
		for(var i=1; i<7; i++){
			for(var j=1; j<8; j++){
				field_occupied[i + "_" + j] = false;
				content[i + "_" + j]='';
			}
		} 
		
		arrow = new Image();
		arrow2 = new Image();
		cross = new Image();
		arrow.src = 'img/Arrow2.png';
		arrow2.src = 'img/Arrow.png';
		cross.src = 'img/x.png';
		
		for(var i=1; i<8; i++) {
			theCanvas = "canvas"+0+"_"+i; 
			c = document.getElementById(theCanvas);
			context = c.getContext("2d");
			context.drawImage(arrow, 10, 10);
		}
		
	}
	 
	function canvasClicked(canvasNumber, colNumber){   
		
		if(canvasNumber==0)
		{
				//First Player; Equal == first, Not Equal == second player
				if(turn%2==0){
					
					var i=6;
					while(freeField==false && i>0){
						if((field_occupied[i+"_"+colNumber])==false){
							theCanvas = "canvas"+i+"_"+colNumber;
							c = document.getElementById(theCanvas);

							context = c.getContext("2d");
							
							context.beginPath();
							context.arc(25, 25, 20, 0, 2 * Math.PI, true);
							context.fillStyle = '#616161';
							context.fill();
							context.lineWidth = 2;
							context.strokeStyle = '#4b4b4b';
							context.stroke();
							context.closePath();
							
							//To see which field is already occupied with a stone
							field_occupied[i+"_"+colNumber]=true;
							squaresFilled++;
							content[i+"_"+colNumber] = 'Spieler 1';	
							freeField=true;
							turn++;
						}
						i--;
					}
					if (i==0)
					{
						theCanvas = "canvas"+0+"_"+colNumber; 
						c = document.getElementById(theCanvas);
						context = c.getContext("2d");
						context.drawImage(cross, 10, 10);
					}
				}
							 
				else if(turn%2!=0){
					i=6;
					while((freeField==false) && (i>0)){
					//for(var i=6; i>=0; i--) {
						if((field_occupied[i+"_"+colNumber])==false){
							theCanvas = "canvas"+i+"_"+colNumber;
							c = document.getElementById(theCanvas);
							context = c.getContext("2d");
							
							context.beginPath();
							context.arc(25, 25, 20, 0, 2 * Math.PI, true);
							context.fillStyle = '#ffa200';
							context.fill();
							context.lineWidth = 2;
							context.strokeStyle = '#ea6900';
							context.stroke();
							context.closePath();
							
							squaresFilled++;
							content[i+"_"+colNumber] = 'Spieler 2';
							field_occupied[i+"_"+colNumber]=true;
							freeField=true;
							turn++;
						}
					i--;
					}
					if (i==0)
					{
						theCanvas = "canvas"+0+"_"+colNumber; 
						c = document.getElementById(theCanvas);
						context = c.getContext("2d");
						context.drawImage(cross, 10, 10);
					}
				}
				
		 		freeField=false;
				//Counter for filled Squares; if it is full (42), the game is over by draw
				if(squaresFilled==42){
					alert("Unentschieden!");
					location.reload(true);
				}
			}		 
	}
	 
	function playAgain(){
	    replay=confirm("Noch eine Runde?");
	    if(replay==true){
	        alert("Okay, neue Runde!");
	        location.reload(true);
	    }
	    else{
	        alert("Dann eben nicht!");
	}
}