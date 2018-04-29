const test = require('tap').test;
const Instruction = require('../../src/scratch_instruction.js');

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

// TODO: correct test
test('extractArgs_ ""', t => {
    var scratch = new Instruction("");
    let parsed = Instruction.extractArgs("");
    t.same(parsed, {"original": ""});
  t.end();
});

test('extractArgs_ "when EVENT, you CMD"', t => {
  let instruction = "when i say knock knock, you say who's there";
  var jsonInfo = Instruction.extractArgs(instruction);
  t.same(jsonInfo, {
    original: "when i say knock knock, you say who's there",
    event: "i say knock knock",
    command: "say who's there"
  });
  t.end();
});

test('extractArgs_ "when EVENT, CMD"', t => {
  let instruction = "when i say knock knock, say who's there";
  var jsonInfo = Instruction.extractArgs(instruction);
  t.same(jsonInfo, {
    original: "when i say knock knock, say who's there",
    event: "i say knock knock",
    command: "say who's there"
  });
  t.end();
});

test('extractArgs_ identifies "CMD" structure', t => {
  let instruction = "say who's there";
  var jsonInfo = Instruction.extractArgs(instruction);
    t.same(jsonInfo.command, instruction);
  t.end();
});

test('extractArgs_ "then/next/after, CMD"', t => {
  let instruction = "then, say who's there";
  var jsonInfo = Instruction.extractArgs(instruction);
  t.same(jsonInfo, {
    original: instruction,
    event: "after last command",
    command: "say who's there"
  });
  t.end();
});

test('extractArgs_ "first, CMD"', t => {
  let instruction = "first, say who's there";
  var jsonInfo = Instruction.extractArgs(instruction);
  t.same(jsonInfo, {
    original: instruction,
    event: "first",
    command: "say who's there"
  });
  t.end();
});

test('getSteps works with single instruction', t => {
  let instruction = 'say King Tut-key fried chicken!';
  var scratch = new Instruction(instruction);
  var step = scratch.getSteps();
  t.same(step, [['say:', 'King Tut-key fried chicken!']]);
  t.end();
});

test('getSteps works with single instruction with event', t => {
  let instruction = "when I say knock knock, say who's there?";
  var scratch = new Instruction(instruction);
  let step = scratch.getSteps();
  arraysEqual(step, [["doAsk", ""],["doIf", ["=", ["answer"], "knock knock"], [["say:", "who's there?"]]]]);
  t.end();
});

test('getSteps works with multiple instructions in single utterance', t => {
  let instruction = "First, say knock knock. Then, when I say who's there, you say King Tut";
  var scratch = new Instruction(instruction);
  let step = scratch.getSteps();
  arraysEqual(step, [["say:", "knock knock"],["doAsk", ""],["doIf", ["=", ["answer"], "who's there"], [["say:", "King Tut"]]]]);
  t.end();
});

test('getUnsupportedSteps returns only unsupported steps', t => {
  t.same(Instruction.getUnsupportedSteps('repeat tell me a joke'), ['repeat tell me a joke']);
  t.same(Instruction.getUnsupportedSteps('repeat fart!'), ['repeat fart!']);
  t.same(Instruction.getUnsupportedSteps('say fart'), []);
  t.end();
});
