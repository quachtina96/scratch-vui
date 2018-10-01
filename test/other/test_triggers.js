const test = require('tap').test;
const StateMachine = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const ScratchStateMachine = require('../../src/scratch_state_machine.js');
const ScratchProject = require('../../src/scratch_project.js');

const Conversations = require('../fixtures/conversations.js');

/**
 * Get mock ScratchStateMachine
 */
var MockScratchStateMachine = function() {
  var scratch = new ScratchStateMachine();
  scratch.stuffSaid = []
  scratch.say = function(whatToSay) {
    scratch.stuffSaid.push(whatToSay)
  }
  return scratch
}

// Define a test for every test converesation defined in by the fixture.
for (const [test_name, convo] of Object.entries(object)) {
  console.log(test_name);
  test(test_name, t => {
  var scratch = new MockScratchStateMachine();
  convo.forEach((dialogue) => {
    var userSpeech = dialogue[1];
    var desiredScratchResponse = dialogue[2];
    var check = {"start": scratch.stuffSaid.length - desiredScratchResponse.length,
                 "end": scratch.stuffSaid.length}

    scratch.handleUtterance(userSpeech);
    t.same(scratch.stuffSaid.slice(check.start, check.end), desiredScratchResponse)
    })
  })
}

