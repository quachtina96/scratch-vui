const WebSocketAsPromised = require('websocket-as-promised');

// Support TLS-specific URLs, when appropriate.
if (typeof window != 'undefined' && window.location.protocol == "https:") {
  var ws_scheme = "wss://";
} else {
  var ws_scheme = "ws://"
};

wsUrl = `${ws_scheme}codi-backend.herokuapp.com`

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

wsp.onError.addListener = (evt) => {
  console.log('ws onerror event:')
  console.log(evt);
}

wsp.onMessage.addListener(message => {
  console.log('message recieved by vui: ');
  console.log(message);
});

module.exports = wsp;
