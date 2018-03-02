var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/public_html/index.html');
});
app.use('/public_html',express.static(__dirname + '/public_html'));

//local server 2000 and console log when server started
serv.listen(8703);
console.log("Server started.");


//open up the mongodb database this is hosted by the college
var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://mongodb3832sd:ji1maw@danu7.it.nuigalway.ie:8717/mongodb3832", function(err, db) {
  if(err) { return console.dir(err); }
	var dbase = db.db("mongodb3832");



//holds all sockets
var SOCKET_LIST = {};
var lobby = {};
var Games = [];
var delay = 0;
 
var Entity = function(){
	
    var self = {id:"",opponent:"",}
    self.update = function(){self.updatePosition();}
    return self;
}
 
var Player = function(id){
    var self = Entity();
    self.id = id;
   
    var super_update = self.update;
    self.update = function(){
        super_update();
    }
   
    Player.list[id] = self;
    return self;
}

Player.list = {};
//when player connects they are given an id
Player.onConnect = function(socket){var player = Player(socket.id);}
//when they leave they are taken off the list 
Player.onDisconnect = function(socket){delete Player.list[socket.id];}
 
var DEBUG = true;
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
	lobby[socket.id] = socket;
   
   //delete player when they leave
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        Player.onDisconnect(socket);
    });
   
    socket.on('evalServer',function(data){
        if(!DEBUG)
            return;
        var res = eval(data);
        socket.emit('evalAnswer',res);     
    });
});

//returns the size of arrays
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {if (obj.hasOwnProperty(key)) size++;}
    return size;
};
 
//this is going to loop updating vals on the server
setInterval(function(){
	
	//if there are 2 games then then lobby added to games array and lobby emptied 
	if(Object.size(lobby)>1){
		var middleCard = Math.floor(Math.random() * 37);
		var playerCard = Math.floor(Math.random() * 37);

		var game = {
			players:lobby,
			turn:true,
			Data:null,
			guessing:false,
			middleCard:middleCard,
			playerCard:playerCard,
			score:[0,0]
		};


		Games.push(game);
		lobby = [];
	}
	
	//loops through each game
	for(var i in Games){
		
		//array hold which player is up and which has to wait
		if(Games[i].turn == true){var playerOn = [true,false];}
		else{var playerOn = [false,true];}

		
		//this is where we loop through both players in the current game
		count=0;
		for(var j in Games[i].players){
			var socket = Games[i].players[j];
			socket.emit('gameon');
			socket.emit('numPlayers',Object.size(SOCKET_LIST));

			var playerData = {turn:playerOn[count],Data:Games[i].Data,guessing:Games[i].guessing,middleCard:Games[i].middleCard,playerCard:Games[i].playerCard}
			socket.emit('yourTurn',playerData);

			//if game sends data then their turn is over
			socket.on('data', function(data){
				if(delay == 0){
					//change turn
					if(Games[i].turn == true){Games[i].turn = false;}
					else if(Games[i].turn == false){Games[i].turn = true;}
					Games[i].Data = data;
					Games[i].guessing = true;
					console.log("data inserted");
					delay++;
				}
			});

			//if game sends a guess then data saved to database along with all info 
			socket.on('guess', function(data){
				if(delay == 0){

					Games[i].guessing = false;
					Games[i].Data = null;


					Games[i].middleCard = Math.floor(Math.random() * 37);
					Games[i].playerCard = Math.floor(Math.random() * 37);

					var myobj = {data : data};
					dbase.collection("test").insertOne(myobj, function(err, res) {
    				if (err) throw err;
    				console.log("document inserted");
  					});
					delay++;
				}
			});
			count++;
		}
		delay = 0;
	}

},1000/10);

});