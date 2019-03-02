var ws = new WebSocket("ws://localhost:8765");

ws.onopen = function () {
  ws.send("This is the browser!");
};

ws.onmessage = function (message) {
  console.log('message recieved by vui: ')
  console.log(message);
};

var messageCount = 0;
document.getElementById('sendMessageButton').onclick = function() {
	ws.send(`${messageCount} Here's some text that the server is urgently awaiting!`);
	messageCount = messageCount + 1;
}