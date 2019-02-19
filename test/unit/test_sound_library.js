const test = require('tap').test;
const ScratchStateMachine = require('../../src/scratch_state_machine.js');

// The following code chunk can be pasted in the JS console
// var lib = scratch.pm.soundLibrary
// var testQueries = ['loud', 'silly', 'guitar','bass', 'animal', 'human','car','fish','holiday']
// testQueries.forEach((query) => {
//   console.log(lib.search(query));
// })

test('search loud uses substring', t => {
  var scratch = new ScratchStateMachine();
  var lib = scratch.pm.soundLibrary;
  var searchResults = lib.search('loud')
  t.same(searchResults, ["Boom Cloud"])
  t.end();
});

test('search silly uses word distance', t => {
  var scratch = new ScratchStateMachine();
  var lib = scratch.pm.soundLibrary;
  var searchResults = lib.search('silly')
  t.same(searchResults, ["Alert", "Alien Creak1", "Alien Creak2", "Boom Cloud", "Space Ambience", "Space Flyby", "Space Noise", "Spiral", "Teleport", "Teleport2", "Teleport3", "Whoop", "Zoop", "Bell Cymbal"])
  t.end();
});

test('search guitar uses substring', t => {
  var scratch = new ScratchStateMachine();
  var lib = scratch.pm.soundLibrary;
  var searchResults = lib.search('guitar')
  t.same(searchResults, ["A Elec Guitar", "A Guitar", "B Elec Guitar", "B Guitar", "C Elec Guitar", "C Guitar", "C2 Elec Guitar", "C2 Guitar", "D Elec Guitar", "D Guitar", "E Elec Guitar", "E Guitar", "F Elec Guitar", "F Guitar", "G Elec Guitar", "G Guitar", "Guitar Chords1", "Guitar Chords2", "Guitar Strum"])
  t.end();
});

test('search animal uses tag', t => {
  var scratch = new ScratchStateMachine();
  var lib = scratch.pm.soundLibrary;
  var searchResults = lib.search('animal')
  t.same(searchResults, ["Baa", "Bird", "Chatter", "Chee Chee", "Chirp", "Cricket", "Crickets", "Croak", "Dog1", "Dog2", "Duck", "Gallop", "Goose", "Growl", "Grunt", "Horse", "Horse Gallop", "Jungle Frogs", "Meow", "Meow2", "Moo", "Owl", "Rooster", "Screech", "Seagulls", "Snort", "Squawk", "Squeaks", "Tropical Birds", "Whinny", "Wolf Howl"])
  t.end();
});

test('search human uses substring', t => {
  var scratch = new ScratchStateMachine();
  var lib = scratch.pm.soundLibrary;
  var searchResults = lib.search('human')
  t.same(searchResults, ["Beat Box1", "Beat Box2", "Bite", "Cheer", "Chomp", "Clapping", "Cough1", "Cough2", "Crazy Laugh", "Crowd Gasp", "Crowd Laugh", "Finger Snap", "Footsteps", "Goal Cheer", "Hand Clap", "Hey", "Hihat Beatbox", "Human Beatbox1", "Human Beatbox2", "Laugh1", "Laugh2", "Laugh3", "Party Noise", "Scream1", "Scream2", "Singer1", "Singer2", "Sneeze1", "Sneeze2", "Snoring", "Zip","Human Beatbox1", "Human Beatbox2"])
  t.end();
});