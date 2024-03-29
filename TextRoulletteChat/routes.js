// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

// Use the gravatar module, to turn email addresses into avatar images:

var gravatar = require('gravatar');
var fs = require("fs");

// Export a function, so that we can pass 
// the app and io instances from the app.js file:
var mongoose = require('mongoose');
var ChatDB = require('./models/userWaiting.js')
var dir = __dirname + '/public/img/avatars';
var emojiDir = __dirname + '/public/img/emoji';
var avatarList =JSON.stringify (fs.readdirSync(dir));
var emojiList = JSON.stringify (fs.readdirSync(emojiDir));

module.exports = function(app,io){ 

	app.get('/', function(req, res){

		// Render views/home.html
		res.render('home');
	});
	
	app.get('/about', function(req, res){

		// Render views/about.html
		res.render('about');
	});
	
	app.get('/chat/avatar/',function(req,res,next) {

		res.json(avatarList);
	});
	
	app.get('/chat/emoji/',function(req,res,next) {
		res.json(emojiList);
	});

	app.get('/create', function(req,res){
		
		ChatDB.where().findOneAndRemove(function(err,result) {
			if(err) {
				console.log(err);
			} 
			if(!result) {
				var id = Math.round((Math.random() * 1000000));
				var j = new ChatDB({chatRoomId:id});
				ChatDB.create(j,function(err,temp) {
					checkChatAvailability(err,temp,req,res,id);
				});
				
				console.log("Empty!");
			} else {
				joinChat(req,res,result);
				
				console.log("User has been paired with a partner.");
			}
		});
		
		

		// Generate unique id for the room
		

		// Redirect to the random room
		//res.redirect('/chat/'+id);
	});

	app.get('/chat/:id', function(req,res){
		console.log(req.originalUrl);
		// Render the chat.html view
		res.render('chat');
	});
	
	app.post('/chat/check/:id',function(req,res) {
		console.log("Checking if all is good");
		ChatDB.findOne({chatRoomId:req.params.id},function(err,result) {
			if(err) console.log(err);
			if(!result) {
				console.log("User has disconnected, trying to find a new lobby.");
				res.json({response:"bad"});
			} else {
				console.log("All good");
				res.json({response:"good"});
			}
		});
		
	});
	
	

	// Initialize a new socket.io application, named 'chat'
	var chat = io.on('connection', function (socket) {

		// When the client emits the 'load' event, reply with the 
		// number of people in this chat room

		socket.on('load',function(data){

			var room = findClientsSocket(io,data);
			if(room.length === 0 ) {

				socket.emit('peopleinchat', {number: 0});
			}
			else if(room.length === 1) {

				socket.emit('peopleinchat', {
					number: 1,
					user: room[0].username,
					avatar: room[0].avatar,
					id: data
				});
			}
			else if(room.length >= 2) {

				chat.emit('tooMany', {boolean: true});
			}
		});

		// When the client emits 'login', save his name and avatar,
		// and add them to the room
		socket.on('login', function(data) {

			var room = findClientsSocket(io, data.id);
			// Only two people per room are allowed
			if (room.length < 2) {

				// Use the socket object to store data. Each client gets
				// their own unique socket object

				socket.username = data.user;
				socket.room = data.id;
				
				if(data.avatar == "" || data.avatar=="undefined"){
				data.avatar = "../img/unnamed.jpg";
				}
				
				socket.avatar = data.avatar;
				

				// Tell the person what he should use for an avatar
				socket.emit('img', socket.avatar);


				// Add the client to the room
				socket.join(data.id);

				if (room.length == 1) {

					var usernames = [],
						avatars = [];

					usernames.push(room[0].username);
					usernames.push(socket.username);

					avatars.push(room[0].avatar);
					avatars.push(socket.avatar);

					// Send the startChat event to all the people in the
					// room, along with a list of people that are in it.

					chat.in(data.id).emit('startChat', {
						boolean: true,
						id: data.id,
						users: usernames,
						avatars: avatars
					});
				}
			}
			else {
				socket.emit('tooMany', {boolean: true});
			}
		});

		// Somebody left the chat
		socket.on('disconnect', function() {
			// Notify the other person in the chat room
			// that his partner has left

			socket.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user: this.username,
				avatar: this.avatar
			});

			// leave the room
			socket.leave(socket.room);
		});


		// Handle the sending of messages
		socket.on('msg', function(data){
			// When the server receives a message, it sends it to the other person in the room.
			if(data.avatar == "" || data.avatar=="undefined"){
				data.avatar = "../img/unnamed.jpg";
			}
			socket.broadcast.to(socket.room).emit('receive', {msg: data.msg, user: data.user, avatar: data.avatar});
		});
	});
};

function joinChat(req,res,result) {
			if(req.query.name!=null) {
				console.log(req.query.name + " is in the chat");
				
				res.redirect('/chat/'+result.chatRoomId + "?name=" + req.query.name + "&img=" + req.query.img);
			} else {
				res.redirect('/chat/'+result.chatRoomId);
			}
		}

function checkChatAvailability(err,temp,req,res,id) {
	if(err) {
		console.log(err);
	} else {
		console.log(temp);
		console.log("User added since no one was available");
		
		checkNameForRedirect(req,res,id);
	}	
}

function checkNameForRedirect(req,res,id) {
	if(req.query.name!=null) {
		res.redirect('/chat/'+id + "?name=" + req.query.name+ "&img=" + req.query.img);
	} else {
		res.redirect('/chat/'+id);
	}
}

function findClientsSocket(io,roomId, namespace) {
	var res = [],
		ns = io.of(namespace ||"/");    // the default namespace is "/"

	if (ns) {
		for (var id in ns.connected) {
			if(roomId) {
				var index = ns.connected[id].rooms.indexOf(roomId) ;
				if(index !== -1) {
					res.push(ns.connected[id]);
				}
			}
			else {
				res.push(ns.connected[id]);
			}
		} 
	}
	return res;
}


