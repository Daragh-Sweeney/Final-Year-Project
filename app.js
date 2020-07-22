var express = require('express');
var app = express();
var serv = require('http').Server(app);



//remember to update this on the server
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({
    extended: false
});

//remember to install EJS
app.engine('html', require('ejs').renderFile);

app.use('/public_html', express.static(__dirname + '/public_html'));

//open up the mongodb database this is hosted by the college
var MongoClient = require('mongodb').MongoClient;
MongoClient.connect("mongodb://mongodb3832sd:ji1maw@danu7.it.nuigalway.ie:8717/mongodb3832", function(err, db) {
    if (err) {
        return console.dir(err);
    }
    var dbase = db.db("mongodb3832");




    /*	user log in code	*/

    app.post('/login', urlencodedParser, function(req, res) {

        dbase.collection("Users").findOne({
            name: req.body.username
        }, function(err, result) {
            if (!result) {
                res.sendFile(__dirname + '/public_html/index.html');
            } else if (result) {

                //user signs in successfully
                if (req.body.username == result.name && req.body.password == result.password) {
                    res.render(__dirname + '/public_html/userHangout.html', {
                        name: result.name
                    });
                }

                //else user returns to sign in page
                else {
                    res.sendFile(__dirname + '/public_html/index.html');
                }
            }
        });
    });


    /*	user create an account code	*/

    app.post('/signup', urlencodedParser, function(req, res) {

        dbase.collection("Users").findOne({name: req.body.username}, function(err, result) {
            if (result) {
                res.sendFile(__dirname + '/public_html/index.html');
            } else if (!result) {

                //create new user
                var data = {
                    name: req.body.username,
                    password: req.body.password,
                    score: 1000,
                    pic :(1 + Math.floor(Math.random() * 8))
                }
                dbase.collection("Users").insertOne(data, function(err, res) {});

                //send user to hangout page
                res.render(__dirname + '/public_html/userHangout.html', {
                    name: req.body.username
                });
            }
        });
    });


    //Enter a game 
    app.post('/lobby', urlencodedParser, function(req, res) {
        //here we will send the user to the game and have their name as a unique key
        res.render(__dirname + '/public_html/userHangout.html', {
            name: req.body.username
        });

    });

    app.post('/tutorial', urlencodedParser, function(req, res) {
        //here we will send the user to the game and have their name as a unique key
        res.render(__dirname + '/public_html/tutorial.html', {
            name: req.body.username
        });

    });

    app.post('/game', urlencodedParser, function(req, res) {
        //here we will send the user to the game and have their name as a unique key
        res.render(__dirname + '/public_html/game.html', {
            name: req.body.username
        });

    });



    //index page 
    app.get('/index', function(req, res) {
        res.sendFile(__dirname + '/public_html/index.html');
    });
    //Data retrevial page 
    app.get('/data', function(req, res) {

        dbase.collection("moves").find({
            playermoved: 'daragh'
        }).toArray(function(err, result) {
            res.render(__dirname + '/public_html/data.html', {
                data: null
            });
        });
    });


    //local server 8703 and console log when server started
    serv.listen(8703);
    console.log("Server started.");




    //using ajax to pass data


    //this passes a list of all games 
    app.get('/games', function(req, res) {
        dbase.collection("Games").find({}).toArray(function(err, result) {
            res.send(result);
        });
    });

    //this passes all information about players 
    app.get('/users', function(req, res) {
        dbase.collection("Users").find({}).toArray(function(err, docs) {
            res.send(docs);
        });
    });

    app.post('/gameInfo', urlencodedParser, function(req, res) {
        dbase.collection("moves").find({
            gameid: req.body.request
        }).toArray(function(err, result) {
            var data = {
                data: result,
                type: 'game',
                title: req.body.request
            };
            res.render(__dirname + '/public_html/data.html', {
                data: data
            });
        });
    });

    app.post('/allInfo', urlencodedParser, function(req, res) {
        dbase.collection("moves").find({}).toArray(function(err, result) {
            var data = {
                data: result,
                type: 'all',
                title: 'All data'
            };
            res.render(__dirname + '/public_html/data.html', {
                data: data
            });
        });
    });

    app.post('/playerInfo', urlencodedParser, function(req, res) {
        dbase.collection("moves").find({
            playermoved: req.body.request
        }).toArray(function(err, result) {
            var data = {
                data: result,
                type: 'user',
                title: req.body.request
            };
            res.render(__dirname + '/public_html/data.html', {
                data: data
            });
        });
    });




    //This part of the server runs the game

    var SOCKET_LIST = {}; //lists sockets 
    var lobby = []; //lobby object
    var Games = []; //array of games 
    var delay = 0;

    var DEBUG = true;

    var io = require('socket.io')(serv, {});

    io.sockets.on('connection', function(socket) {

        socket.id = Math.random();
        SOCKET_LIST[socket.id] = socket;
        lobby.push(socket);

        //delete player when they leave
        socket.on('disconnect', function() {
            delete SOCKET_LIST[socket.id];
        });

        socket.on('evalServer', function(data) {
            if (!DEBUG)
                return;
            var res = eval(data);
            socket.emit('evalAnswer', res);
        });
    });


    //this is going to loop updating vals on the server
    setInterval(function() {

        //if there are 2 players then then lobby added to games array and lobby emptied 
        if (Object.size(lobby) > 1) {


            var middleCardValue = 2 + Math.floor(Math.random() * 8);
            var playerCardValue = 1 + Math.floor(Math.random() * 10);
            while (playerCardValue == middleCardValue) {
                middleCardValue = 2 + Math.floor(Math.random() * 8);
            }

            var suit1 =Math.floor(Math.random() * 4);
            var suit2 =Math.floor(Math.random() * 4);

            var middleCard = middleCardValue + (10 * suit1);
            var playerCard = playerCardValue + (10 * suit2);

            var game = {
                players: lobby,
                playerNames: [],
                playerMove: null,
                playerGuess: null,
                playerOn: [true, false],
                Data: null,
                middleCard: middleCard,
                playerCard: playerCard,
                middleCardValue:middleCardValue,
                playerCardValue:playerCardValue,
                score: [50, 50],
                gameID: "" + new Date(),
                gameOff: false,
                winner: null,
                looser: null,
                bet:null
            };

            //push your game into the game array and empty the lobby
            Games.push(game);
            lobby = [];
        }

        //loops through each game
        for (var i in Games) {

            //this is where we loop through both players in the current game
            count = 0;
            for (var j in Games[i].players) {

                var socket = Games[i].players[j];
                socket.emit('gameon');

                var playerLeaves = true;
                for (var vals in SOCKET_LIST) {
                    if (vals == socket.id) {
                        playerLeaves = false;
                    }
                }


                if (playerLeaves) {
                    Games[i].gameOff = true;
                    //update bot players that game has ended
                    for (var j in Games[i].players) {
                        var socket = Games[i].players[j];
                        socket.emit('gameoff')
                    }
                    Games.splice(i, 1);
                    break;
                }


                //this is the data we will send to the player
                var playerData = {
                    player: count,
                    beat:Games[i].bet,
                    turn: Games[i].playerOn[count],
                    Data: Games[i].Data,
                    guessing: Games[i].guessing,
                    middleCard: Games[i].middleCard,
                    playerCard: Games[i].playerCard,
                    score: Games[i].score,
                    round:Games[i].round
                }

                socket.emit('yourTurn', playerData);



                //if game sends data then their turn is over
                socket.on('data', function(data) {
                    if (delay == 0) {

                        //change turn
                        if (Games[i].playerOn[0] == true) {
                            Games[i].playerOn = [false, true];
                            Games[i].score[0] = Games[i].score[0] - data.bet;
                            Games[i].score[1] = Games[i].score[1] - data.bet;
                        } else {
                            Games[i].playerOn = [true, false];
                            Games[i].score[1] = Games[i].score[1] - data.bet;
                            Games[i].score[0] = Games[i].score[0] - data.bet;
                        }

                        //update data
                        Games[i].Data = data.data;
                        Games[i].bet = data.bet;
                        Games[i].playerMove = data.playerMove;

                        //determine if player lying or not
                        if (Games[i].playerCardValue > Games[i].middleCardValue && data.move == true) {Games[i].move = true;} 
                        else if (Games[i].playerCardValue < Games[i].middleCardValue && data.move == false) {Games[i].move = true;} 
                        else {Games[i].move = false;}

                        //pass the game into guessing mode
                        Games[i].guessing = true;
                        delay++;
                    }
                });








                //if game sends a guess then data saved to database along with all info 
                socket.on('guess', function(data) {
                    if (delay == 0) {

                        Games[i].guess = data.guess;
                        Games[i].playerGuess = data.playerGuess;

                        //update score if guesser wins
                        if (Games[i].guess == Games[i].move) {

                            if (Games[i].playerOn[0]) {Games[i].score[0] = Games[i].score[0] + 2*Games[i].bet;} 
                            else {Games[i].score[1] = Games[i].score[1] + 2*Games[i].bet;}
                            var win = Games[i].playerGuess;
                            var loose = Games[i].playerMove;

                        }


                        //update score if player wins
                         else {

                            if (Games[i].playerOn[0]) {Games[i].score[1] = Games[i].score[1] + 2*Games[i].bet;}
                            else {Games[i].score[0] = Games[i].score[0] + 2*Games[i].bet;}
                            var loose = Games[i].playerGuess;
                            var win = Games[i].playerMove;
                        }


                        //find out if move higher or lower
                        var move;
                        if (Games[i].playerMove == true) {move = 'higher'}
                        else {move = 'lower'}

                        //data to be inserted to the database
                        var myobj = {
                            gameid: Games[i].gameID,
                            playermoved: Games[i].playerMove,
                            playerGuessed: Games[i].playerGuess,
                            centreCard: Games[i].middleCardValue,
                            playerCard: Games[i].playerCardValue,
                            move: move,
                            playermove: Games[i].Data,
                            bet: Games[i].bet,
                            guess: data.guess,
                            playerguess: data.guessData,
                            chips: Games[i].score
                        };


                        dbase.collection("moves").insertOne(myobj, function(err, res) {});
                        console.log("document inserted");
                        delay++;

                        if (Games[i].score[0] <= 0 || Games[i].score[1] <= 0) {
                            Games[i].winner = win;
                            Games[i].looser = loose;
                            EndGame(i, j);
                        }

                        var middleCardValue = 2 + Math.floor(Math.random() * 8);
            			var playerCardValue = 1 + Math.floor(Math.random() * 10);
            			while (playerCardValue == middleCardValue) {
               	 			middleCardValue = 2 + Math.floor(Math.random() * 8);
            			}

            			var suit1 =Math.floor(Math.random() * 4);
            			var suit2 =Math.floor(Math.random() * 4);

            			var middleCard = middleCardValue + (10 * suit1);
            			var playerCard = playerCardValue + (10 * suit2);

                		Games[i].middleCardValue = middleCardValue;
                		Games[i].playerCardValue = playerCardValue;
                		Games[i].middleCard = middleCard;
                		Games[i].playerCard = playerCard;
                        Games[i].guessing = false;
                        Games[i].Data = null;
                        Games[i].round = Games[i].round++;
                    }
                });
                count++;
            }

            delay = 0;
        }

    }, 1000 / 1);




 


    //returns the size of arrays
    Object.size = function(obj) {
        var size = 0,
            key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };






    //ends the game updates the database and removes game from game list
    function EndGame(i, j) {

        Games[i].gameOff = true;
        //update bot players that game has ended
        for (var j in Games[i].players) {
            
            var socket = Games[i].players[j];
            socket.emit('gameoff',Games[i].winner)
        }

        var win = Games[i].winner;
        var loose = Games[i].looser;

        //update the data base with updated elo values
        dbase.collection("Users").findOne({
            name: win
        }, function(err, result1) {
            var winner = result1;
            dbase.collection("Users").findOne({
                name: loose
            }, function(err, result2) {
                var looser = result2;
                console.log('got here');
                // Transformed rating
                var R1 = 10 ^ (winner.score / 400);
                var R2 = 10 ^ (looser.score / 400);

                // Expected score
                var E1 = R1 / (R1 + R2);
                var E2 = R2 / (R1 + R2);

                // Updated Elo values
                var update = {$set: {score: Math.floor((winner.score + 100 * (1 - E1)))}}
                var update2 = {$set: {score: Math.floor((looser.score + 100 * (0 - E2)))}}

                dbase.collection("Users").updateOne({
                    name: winner.name
                }, update, function(err, result) {});
                dbase.collection("Users").updateOne({
                    name: looser.name
                }, update2, function(err, result) {});
            });
        });

        var gameID = {
            name: Games[i].gameID,
            player1: Games[i].playerMove,
            player2: Games[i].playerGuess
        }
        dbase.collection("Games").insertOne(gameID, function(err, res) {});
        Games.splice(i, 1);
    }

});