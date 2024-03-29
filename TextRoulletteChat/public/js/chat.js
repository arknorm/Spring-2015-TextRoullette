// This file is executed in the browser, when people visit /chat/<random id>
	var responseList;
	var formattingArray = new Array();
$(function(){

	var timeout;
	
	var audioSent = new Audio('../audio/sent.mp3');
	var audioRecieve = new Audio('../audio/recieve.mp3');


	// getting the id of the room from the url
	var id = Number(window.location.pathname.match(/\/chat\/(\d+)$/)[1]);

	// connect to the socket
	var socket = io();
	
	// variables which hold the data for each person
	var name = "",
		email = "",
		img = "",
		friend = "";

	// cache some jQuery objects
	var section = $(".section"),
		footer = $("footer"),
		onConnect = $(".connected"),
		inviteSomebody = $(".invite-textfield"),
		personInside = $(".personinside"),
		chatScreen = $(".chatscreen"),
		left = $(".left"),
		noMessages = $(".nomessages"),
		tooManyPeople = $(".toomanypeople");

	// some more jquery objects
	var chatNickname = $(".nickname-chat"),
		leftNickname = $(".nickname-left"),
		loginForm = $(".loginForm"),
		yourName = $("#yourName"),
		yourEmail = $("#yourEmail"),
		hisName = $("#hisName"),
		hisEmail = $("#hisEmail"),
		chatForm = $("#chatform"),
		textarea = $("#message"),
		messageTimeSent = $(".timesent"),
		chats = $(".chats");

	// these variables hold images
	var ownerImage = $("#ownerImage"),
		leftImage = $("#leftImage"),
		noMessagesImage = $("#noMessagesImage");


		
	// on connection to server get the id of person's room
	socket.on('connect', function(){

		socket.emit('load', id);
	});

	// save the gravatar url
	socket.on('img', function(data){
		img = data;
	});
	
	function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
	}
	
	function getYoutubeVars(url){
		var vars = {};
		var locationUrl = getLocation(url);
		var parts = locationUrl.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        	vars[key] = value;
    	});
    	return vars;
	}

	// receive the names and avatars of all people in the chat room
	socket.on('peopleinchat', function(data){

		if(data.number === 0){
			loginForm.on('submit', function(e){

				e.preventDefault();

				name = $.trim(yourName.val());
				
				if(name.length < 2){
					alert("Please enter a nick name longer than 1 character!");
					return;
				}

					showMessage("inviteSomebody");

					// call the server-side function 'login' and send user's parameters
					var imgsrc = $('#ownerImage').attr("src");
					socket.emit('login', {user: decodeURI(name), avatar: imgsrc, id: id});
			
			});
			
			var first = getUrlVars()["name"];
			var image = getUrlVars()["img"];
			name = first;
			img = image;
			if(first!=null && first!="") {
				showMessage("inviteSomebody");
				name = first;
					// call the server-side function 'login' and send user's parameters
				socket.emit('login', {user: decodeURI(name), avatar: img, id: id});
			} else{
			showMessage("connected");
			}

			
		}

		else if(data.number === 1) {

			showMessage("personinchat",data);
			
			var first = getUrlVars()["name"];
			var image = getUrlVars()["img"];
			name = first;
			img = image;
			if(first!=null && first!="") {
				showMessage("inviteSomebody");
				name = first;
					// call the server-side function 'login' and send user's parameters
				socket.emit('login', {user: decodeURI(name), avatar: img, id: id});
				return;
			} else{
				//showMessage("inviteSomebody");
			}
			
			loginForm.on('submit', function(e){

				e.preventDefault();

				name = $.trim(hisName.val());

				if(name.length < 1){
					alert("Please enter a nick name longer than 1 character!");
					return;
				}

				if(name == data.user){
					alert("There already is a \"" + name + "\" in this room!");
					return;
				}
				var imgsrc = $('#ownerImage').attr("src");
					socket.emit('login', {user: decodeURI(name), avatar: imgsrc, id: id});
			});
			
			
		}

		else {
			showMessage("tooManyPeople");
		}

	});

	// Other useful 

	socket.on('startChat', function(data){
		clearTimeout(timeout);
		if(data.boolean && data.id == id) {

			chats.empty();

			if(name === data.users[0]) {

				showMessage("youStartedChatWithNoMessages",data);
			}
			else {

				showMessage("heStartedChatWithNoMessages",data);
			}
			if(friend==name) {
				window.location.replace('../create?name=' + name + '&img=' + img);
			}
			chatNickname.text(friend);
		}
	});

	socket.on('leave',function(data){

		if(data.boolean && id==data.room){
			showMessage("somebodyLeft", data);
			chats.empty();
			var redirectUrl = "location.href = '../create?name="+ name + "&img="+img + "';";
			setTimeout(redirectUrl,generateRandomTimeOut());
		}

	});

	socket.on('tooMany', function(data){

		if(data.boolean && name.length === 0) {

			showMessage('tooManyPeople');
		}
	});

	socket.on('receive', function(data){

		showMessage('chatStarted');
		
		if(data.msg.trim().length) {
			audioRecieve.play();
			createChatMessage(data.msg, data.user, data.avatar, moment());
			scrollToBottom();
		}
	});

	textarea.keypress(function(e){

		// Submit the form on enter

		if(e.which == 13) {
			e.preventDefault();
			chatForm.trigger('submit');
		}

	});

	chatForm.on('submit', function(e){

		e.preventDefault();

		// Create a new chat message and display it directly

		showMessage("chatStarted");
		console.log("Chat has started");
		
		if(textarea.val().trim().length) {
			createChatMessage(textarea.val(), name, img, moment());
			scrollToBottom();

			// Send the message to the other person in the chat
			socket.emit('msg', {msg: textarea.val(), user: decodeURI(name), avatar: img});
			
		audioSent.play();

		}
		// Empty the textarea
		textarea.val("");
	});

	// Update the relative time stamps on the chat messages every minute

	setInterval(function(){

		messageTimeSent.each(function(){
			var each = moment($(this).data('time'));
			$(this).text(each.fromNow());
		});

	},60000);

	// Function that creates a new chat message

	function createChatMessage(msg,user,imgg,now){

		var who = '';

		if(user===name) {
			who = 'me';
		}
		else {
			who = 'you';
		}
		var isImgUrl = isImage(msg);

		var li = $(
			'<li class=' + who + '>'+
				'<div class="image">' +
					'<img src=' + imgg + ' />' +
					'<b id="NameID"></b>' +
					'<i class="timesent" data-time=' + now + '></i> ' +
				'</div>' +
				'<p></p>' +
			'</li>');

		// use the 'text' method to escape malicious user input
		
		var vidUrl = getYoutubeVars(msg.trim());
		if(isYoutubeUrl(msg.trim()) && vidUrl["v"]!=null){
			var firstPartYoutubeEmbed = "<iframe width='450' height='315' src='https://www.youtube.com/embed/";
			var lastPartYoutubeEmbed = "' frameborder='0' allowfullscreen></iframe>";
			li.find('p').html(firstPartYoutubeEmbed + vidUrl["v"] + lastPartYoutubeEmbed);
		} else if(ValidURL(msg.trim())){
			var linkTag = "<a target='_blank' href='" + msg.trim() + "'>";
			if(isImgUrl){
				li.find('p').html(linkTag + "<img src='" + msg.trim() + "' style='max-width: 100%;height: auto; width: auto\9; border:1px solid #; border-radius: 10px; box-shadow: 4px 3px 5px #888888;'></a>");
			} else{
				li.find('p').html(linkTag + msg.trim() + "</a>");
			}
			
		}else{
			var message = convertMessageToCode(msg.trim());
		li.find('p').html(message);
		}
		
		li.find('#NameID').text(decodeURI(user));

		chats.append(li);

		messageTimeSent = $(".timesent");
		messageTimeSent.last().text(now.fromNow());
	}

	function scrollToBottom(){
		$("html, body").animate({ scrollTop: $(document).height()-$(window).height() },1000);
	}

	function showMessage(status,data){

		if(status === "connected"){

			section.children().css('display', 'none');
			onConnect.show();
		}

		else if(status === "inviteSomebody"){

			// Set the invite link content
			/*$.ajax({
				url: '/chat/check/' + id,
				type: 'POST',
				data: { json: id},
				dataType: 'json',
				success : function (response) {
				if(response.response == "bad") {
					window.location.replace('../create?name=' + name);
				}
				}
			});*/
			
			onConnect.hide();
			inviteSomebody.show();
			
			
			$("#welcome").text("Welcome, " + decodeURI(name));
						
			var redirectUrl = "location.href = '../create?name="+ name + "&img="+img + "';";
			timeout = setTimeout(redirectUrl,generateRandomTimeOut());
			
			/*setTimeout(function(){
				$.ajax({
				url: '/chat/check/' + id,
				type: 'POST',
				data: { json: id},
				dataType: 'json',
				success : function (response) {
				if(response.response == "bad") {
					clearTimeout(timeout);
				}
				}
			});}
			,4000);*/

			
			
		}

		else if(status === "personinchat"){
			
			onConnect.css("display", "none");
			personInside.show();

			chatNickname.text(data.user);
			ownerImage.attr("src",data.avatar);
		}

		else if(status === "youStartedChatWithNoMessages") {

			left.hide();
			inviteSomebody.hide();
			noMessages.show();
			footer.show();
				
			

			friend = data.users[1];
			noMessagesImage.attr("src",data.avatars[1]);
		}

		else if(status === "heStartedChatWithNoMessages") {
			inviteSomebody.hide();
			personInside.hide();
			inviteSomebody.hide();
			noMessages.show();
			footer.show();
			

			friend = data.users[0];
			noMessagesImage.attr("src",data.avatars[0]);
		}

		else if(status === "chatStarted"){
			section.children().css('display','none');
			chatScreen.css('display','block');
		}

		else if(status === "somebodyLeft"){

			leftImage.attr("src",data.avatar);
			leftNickname.text(data.user);

			section.children().css('display','none');
			footer.css('display', 'none');
			left.show();
		}

		else if(status === "tooManyPeople") {
			var redirectUrl = "location.href = '../create?name="+ name + "&img="+img + "';";
			setTimeout(redirectUrl,generateRandomTimeOut());
			section.children().css('display', 'none');
			tooManyPeople.show();
		}
	}

	$(".randomChatButton").click(function(){
        window.location.replace('../create?name=' + name + "&img="+img);
    });

	$(".changeIdentityButton").click(function(){
		window.location.replace('../create');
	});
	
	$(".addSmileyFace").click(function(){
		$('#overlay').fadeIn('fast',function(){
            $('#box').animate({'top':'160px'},500);
        });
		loadSmileyFaces();
	});
	
	function loadSmileyFaces(){
		PopulateEmoji();
	}
	
	function PopulateEmoji() {
		$.ajax({
				url: '../chat/emoji/',
				type: 'GET',
				success : function (response) {
					window.responseList = JSON.parse(response);
					SetupEmojiDisplay();
				}
		})
		
	}
	
	function SetupEmojiDisplay(){
		
		var imageSelector = $('#imageSelector');
		imageSelector.empty();
		var imageGrabber = "<div class='floated_img'>";
		
		for(var i = 0; i < responseList.length; i++){
			if(i!=0 && i%20 == 0 ){
				imageGrabber +="<hr>";
			}
			if(i < 150) {
				imageGrabber += "<img id='img"+i+"' style='width:32px; height:32px;' src='../img/emoji/" +responseList[i] + "' fakesrc='../img/emoji/" +responseList[i] + "'>";
			} else{
			imageGrabber += "<img id='img"+i+"' style='width:32px; height:32px;' src='../img/unnamed.jpg' fakesrc='../img/emoji/" +responseList[i] + "'>"; 
			}
			
		}
		
		imageGrabber += "</div>";
		imageSelector.html(imageGrabber);
		for(var i = 0; i < responseList.length;i++){
			var string = "#img" + i;
		$(string).bind('inview',function(event, visible){
				if(visible){
					var temp = $(this).attr("fakesrc");
					$(this).attr("src",temp);
				}else{
					$(this).attr("src","../img/unnamed.jpg");
				}
			});
		$(string).click(function(){
			var messageItem = $("#message");
			var emojiName = $(this).attr("src").lastIndexOf("/");
			emojiName = $(this).attr("src").substring(emojiName + 1);
			emojiName= emojiName.replace(/\s+/g, "%20");			
			messageItem.val(messageItem.val() + " //" + emojiName + " ");
			
			$('#boxclose').trigger("click");
		});
		}
	}

	function generateRandomTimeOut() {
		return generateRandomInteger(3000,5000);
	}
	
	function generateRandomInteger(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}
	
	function ValidURL(str) {
		var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
		'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
		'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
		'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
		'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
		'(\\#[-a-z\\d_]*)?$','i');
		if(!pattern.test(str)) {
			return false;
		} else {
			return true;
		}
	}
	if(ownerImage.length){
	ownerImage.hover(function(){
		ownerImage.attr("src","../img/unnamedHover.jpg");
	},function() {
		ownerImage.attr("src","../img/unnamed.jpg");
	});
	
	ownerImage.click(function(){
		PopulateImages();
        $('#overlay').fadeIn('fast',function(){
            $('#box').animate({'top':'160px'},500);
        });
    });
	}
	if($('#creatorImage').length){
	$('#creatorImage').hover(function(){
		$('#creatorImage').attr("src","../img/unnamedHover.jpg");
	},function() {
		$('#creatorImage').attr("src","../img/unnamed.jpg");
	});

	
    
	
	$('#creatorImage').click(function(){
		PopulateImages();
        $('#overlay').fadeIn('fast',function(){
            $('#box').animate({'top':'160px'},500);
        });
    });
	}
    $('#boxclose').click(function(){
        $('#box').animate({'top':'-600px'},500,function(){
            $('#overlay').fadeOut('fast');
        });

	});
	
	function PopulateImages() {
		$.ajax({
				url: '../chat/avatar/',
				type: 'GET',
				success : function (response) {
					window.responseList = JSON.parse(response);
					SetupListDisplay();
				}
		})
		
		
		
	}
	
	function SetupListDisplay(){
		responseList = ShuffleArray(responseList);
		var imageSelector = $('#imageSelector');
		var imageGrabber = "<div class='floated_img'>";
		
		for(var i = 0; i < responseList.length; i++){
			if(i!=0 && i%6 == 0 ){
				imageGrabber +="<hr>";
			}
			if(i < 30) {
				imageGrabber += "<img id='img"+i+"' src='../img/avatars/" +responseList[i] + "' fakesrc='../img/avatars/" +responseList[i] + "'>";
			} else{
			imageGrabber += "<img id='img"+i+"' src='../img/unnamed.jpg' fakesrc='../img/avatars/" +responseList[i] + "'>"; 
			}
			
		}
		
		imageGrabber += "</div>";
		imageSelector.html(imageGrabber);
		for(var i = 0; i < responseList.length;i++){
			var string = "#img" + i;
		$(string).bind('inview',function(event, visible){
				if(visible){
					var temp = $(this).attr("fakesrc");
					$(this).attr("src",temp);
				}else{
					$(this).attr("src","../img/unnamed.jpg");
				}
			});
		$(string).click(function(){
			if(ownerImage.length){
				ownerImage.attr("src",$(this).attr("src"));
				ownerImage.unbind('mouseenter mouseleave');
				img = ownerImage.attr("src");
			}
			if($('#creatorImage').length){
				$('#creatorImage').unbind('mouseenter mouseleave');
				$('#creatorImage').attr("src",$(this).attr("src"));
				img = $('#creatorImage').attr("src");
			}
			
			$('#boxclose').trigger("click");
		});
		}
		
		
	}
	
	function ShuffleArray(array){
		
	var currentIndex = array.length, temporaryValue, randomIndex ;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;

	}
	
	function isImage(url){
		url = url.toLowerCase();
		var extension = url.split('.').pop().split(/\#|\?/)[0];
		switch(extension) {
			case "gif":
				return true;
				break;
			case "jpg":
				return true;
				break;
			case "jpeg":
				return true;
				break;
			case "png":
				return true;
				break;
			case "bmp":
				return true;
				break;
			default:
			return false;
			
		}
	}
	function getLocation(href) {
    var l = document.createElement("a");
    l.href = href;
    return l;
	};
	
	function isYoutubeUrl(url){
		var locationUrl = getLocation(url);
		if(locationUrl.hostname == "www.youtube.com" || locationUrl.hostname == "youtube.com"){
			return true;
		}
		return false;
	}
	
	function convertMessageToCode(message){
		var regex = /(<([^>]+)>)/ig
		var message = message.replace(regex, "");
		
		var finalMessage = "";
		var divMessage = "<div class='formattedMessage'>";
		while(message.indexOf("//")>-1){
			var indexOfSlash = message.indexOf("//");
			finalMessage += message.substring(0,indexOfSlash);
			message = message.substring(indexOfSlash,message.length);
			var endOfSlash = message.indexOf(" ");
			
			if(endOfSlash<0){
				endOfSlash = message.length;
			}
			
			var specialCode = message.substring(2,endOfSlash);
			
			switch(specialCode){
				case "i":
					htmlTag = "<i>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "b":
					htmlTag = "<b>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "u":
					htmlTag = "<u>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "small":
					htmlTag = "<small>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "mark":
					htmlTag = "<mark>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "strike":
					htmlTag = "<del>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "1":
					htmlTag = "<h1>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "2":
					htmlTag = "<h2>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "3":
					htmlTag = "<h3>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "4":
					htmlTag = "<h4>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "5":
					htmlTag = "<h5>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "6":
					htmlTag = "<h6>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "sub":
					htmlTag = "<sub>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "super":
					htmlTag = "<sup>";
					finalMessage += htmlTag;
					formattingArray.push(htmlTag);
					break;
				case "time":
					var currentdate = new Date(); 
					var datetime = "TextBot: Current Time - " + currentdate.getDate() + "/"
					+ (currentdate.getMonth()+1)  + "/" 
					+ currentdate.getFullYear() + "  "  
					+ currentdate.getHours() + ":"  
					+ currentdate.getMinutes() + ":" 
					+ currentdate.getSeconds();
					finalMessage += datetime;
					break;
				case "/":
					var htmlTag = formattingArray.pop();
					var indexOfBracket = htmlTag.indexOf("<");
					var closingTag = "</" + htmlTag.substring(1);
					finalMessage += closingTag;
					break;
				case "//":
					var size = formattingArray.length;
					
					for(var i = 0; i < size; i++){
						var htmlTag = formattingArray.pop();
						var indexOfBracket = htmlTag.indexOf("<");
						var closingTag = "</" + htmlTag.substring(1);
						finalMessage += closingTag;
					}
					break;
				default:
					if(isImage(specialCode)){
					var htmlToLoadEmoji = "<img style='width:32px; height:32px;' src='../img/emoji/" + specialCode + "'>";
					finalMessage += htmlToLoadEmoji;
					}
					
			}
			
			if(!(endOfSlash==message.length)){
				message = message.substring(endOfSlash,message.length);
			} else{
				message += " ";
				message = message.substring(endOfSlash,message.length - 1);
			}
		}
		finalMessage = divMessage + finalMessage + message;
		return finalMessage;
	}

});
