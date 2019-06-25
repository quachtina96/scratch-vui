const WebSocketAsPromised = require('websocket-as-promised');

// var wsUrl = "ws://localhost:8765";
wsUrl = "ws://codi-backend.herokuapp.com:38099"
const wsp = new WebSocketAsPromised(wsUrl, {
  packMessage: data => JSON.stringify(data),
  unpackMessage: message => JSON.parse(message),
  attachRequestId: (data, requestId) => Object.assign({id: requestId}, data), // attach requestId to message as `id` field
  extractRequestId: data => data && data.id,                                  // read requestId from message `id` field
});

wsp.open()
 .then(() => {
 	wsp.sendRequest({foo: 'bar'})
 }) // actually sends {foo: 'bar', id: 'xxx'}, because `attachRequestId` defined above
 .then(response => console.log(response))  // waits server message with corresponding requestId: {id: 'xxx', ...}
 .catch(function(err) {
 	console.log(err);
 });

wsp.ws.onerror = (evt) => {
	console.log('ws onerror event:')
	console.log(evt);
}

wsp.onMessage.addListener(message => {
	console.log('message recieved by vui: ');
	console.log(message);
});

module.exports = wsp;
