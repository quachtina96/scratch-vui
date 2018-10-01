const test = require('tap').test;
const StateMachine = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const ScratchStateMachine = require('../../src/scratch_state_machine.js');
const ScratchProject = require('../../src/scratch_project.js');

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

// TODO: correct test
test('create a project', t => {
  var scratch = new MockScratchStateMachine();
  scratch.handleUtterance("new project");
  scratch.handleUtterance("give me a compliment");
  scratch.handleUtterance("say you're amazing");
  scratch.handleUtterance("that's it");
  scratch.handleUtterance("give me a compliment");
  t.same(scratch.stuffSaid, ["What do you want to call it?'", "Okay. When you say, Scratch, give me a compliment, I’ll play the project. What’s the first step?", "Okay, what’s the next step?", "Cool, now you can say, Scratch, give me a compliment, to play the project."])
  t.end();
});

test('goto step', t => {
  var scratch = new MockScratchStateMachine();
  scratch.handleUtterance('new project');
  scratch.handleUtterance('give me a compliment');
  t.end();
});

test('next step', t => {
  t.end();
});

test('next step', t => {
  t.end();
});
