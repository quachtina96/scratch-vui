const test = require('tap').test;
const ScratchStateMachine = require('../../src/scratch_state_machine.js');
const ScratchProjectManager = require('../../src/scratch_project_manager.js');
const ScratchStorage = require('../../src/storage.js');
const Triggers = require('../../src/triggers.js');

class MockPM extends ScratchProjectManager {
  constructor(ssm) {
    super(ssm, 'excludeWindow');
    // Polyfill
    if (!window) {
      var window = {
        speechSynthesis: null,
      }
    }
    this.synth = window.speechSynthesis;
    this.recognition = null;
  }

  say(whatToSay) {
    this.ssm.output.push(whatToSay);
  }
}

class MockSSM extends ScratchStateMachine {
  constructor() {
    super('test');
    this.pm = new MockPM(this);
    // Initalize construction after pm is set.
    this.onHome();
    this.output = [];
  }

  say(whatToSay) {
    this.output.push(whatToSay);
  }
}

test('Remembers when Scratch was already said', t => {
  var s = new MockSSM();
  // You need to say scratch to trigger an action.
  s.handleUtterance('create a new project');
  t.same(s.output.length, 0);

  // If you say scratch in the previous utterance, scratch should recognize that.
  s.handleUtterance('scratch');
  t.same(s.output.length, 0);

  s.handleUtterance('create a new project');
  t.same(s.output.length, 1);
  t.same(s.output, ['What do you want to call it?']);
  t.end();
});



