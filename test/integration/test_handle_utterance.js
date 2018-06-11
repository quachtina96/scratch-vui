const test = require('tap').test;
const ScratchStateMachine = require('./scratch_state_machine.js');

class MockSSM extends ScratchStateMachine {
  constructor() {
    super();
    this.output = []
  }

  say(whatToSay) {
    this.output.push(whatToSay);
  }
}

test('Remembers when Scratch was already said', t => {
  var s = MockSSM();
  // You need to say scratch to trigger an action.
  s.handleUtterance('create a new project');
  t.same(s.output.length, 0);

  // If you say scratch in the previous utterance, scratch should recognize that.
  s.handleUtterance('scratch');
  t.same(s.output.length, 0);

  s.handleUtterance('create a new project');
  t.same(s.output.length, 1);
  t.same(s.output, ['What do you want to call it?']);
});



