const test = require('tap').test;
const StateMachine = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const ScratchStateMachine = require('../../src/scratch_state_machine.js');
const ScratchProject = require('../../src/scratch_project.js');

/**
 * Deeply compare the two given arrays.
 * @param {!Array} array1 - The first array
 * @param {!Array} array2 - The second array
 * @return {boolean} true if the two are deeply equal, false otherwise
 */
var arraysEqual = function(array1, array2) {
    // if the other array is a falsy value, return
    if (!array2)
        return false;

    // compare lengths - can save a lot of time
    if (array1.length !== array2.length)
        return false;

    for (var i = 0, l=array1.length; i < l; i++) {
        // Check if we have nested array2s
        if (array1[i] instanceof Array && array2[i] instanceof Array) {
            // recurse into the nested array2s
            if (!array1[i].equals(array2[i]))
                return false;
        }
        else if (array1[i] !== array2[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};

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
