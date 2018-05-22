/**
 * @fileoverview Defines the ScratchProject object as a JavaScript state
 * machine.
 *
 * @author quacht@mit.edu (Tina Quach)
 */
const ScratchInstruction = require('./scratch_instruction.js');
const StateMachine = require('javascript-state-machine');
const ScratchProjectEditor = require('./scratch_project_editor.js');
const ScratchRegex = require('./triggers.js');
const Utils = require('./utils.js');


// TODO: idea: move the edit commands to the state machine level instead of the
// scratch project level, since we manage what the currentproject is.
// to resolve the issue of this referring to the wrong this.

var ScratchProject = StateMachine.factory({
  init: 'create',
  transitions: [
    // Support linear project creation process.
    { name: 'startProjectCreation', from: 'create', to: 'empty'},
    { name: 'nameProject', from: 'empty', to: 'named'},
    { name: 'addInstruction', from: 'named', to: 'nonempty'},
    { name: 'addInstruction', from: 'nonempty', to: 'nonempty'},
    { name: 'finishProject', from: 'nonempty', to: 'nonempty'},
    { name: 'finishProject', from: '*', to: (s) => { return s} },
    { name: 'goto', from: '*', to: function(s) { return s } }
  ],
  data: function(pm) {
    return {
      pm: pm,
      ssm: pm.ssm,
      name: null,
      instructions: [],
      // TODO: handle word forms of words in referencing steps.
      instructionPointer: 1, // Use 1-based indexing
      editor: new ScratchProjectEditor(),
    }
  },
  methods: {
    onStartProjectCreation: (lifecycle, project) =>  {
      return new Promise(((resolve, reject) => {
        project.pm.say('What do you want to call it?');
        resolve();
      }));
    },
    onNameProject: function() {
      var project = this;
      return new Promise(((resolve, reject) => {
        // problem w/ using this.name is that this refers to the window--NOT to the scratch project.
        project.pm.say('Okay. When you say, Scratch, ' + project.name + ', I’ll play the project. What’s the first step?');
        resolve();
      }))
    },
    onAddInstruction: function() {
      var project = this;
      return new Promise(((resolve, reject) => {
        project.pm.say('Okay, what’s the next step?');
        project.pm.save();
        resolve();
      }))
    },
    onFinishProject: function() {
      var project = this;
      return new Promise(((resolve, reject) => {
        project.pm.say('Cool, now you can say, Scratch, ' + project.name + ', to play the project.');
        project.pm.save();
        resolve();
      }))
    },
    /**
     * Return Scratch program.
     * @return {Array<Array>} Scratch program generated from instructions
     */
    getScratchProgram: function() {
      let steps = this.instructions.map(instruction => instruction.steps[0]);
      // Everytime you want to execute the program, you add a
      // when green flag block to start it.
      return [['whenGreenFlag']].concat(steps);
    },
    _getName: function(utterance) {
      var pattern = /call the project(.*)/;
      var matches = Utils.match(utterance, pattern);
      if (matches && matches.length > 0) {
        return matches[1].trim();
      } else {
        return utterance.trim();
      }
    },
    handleUtterance: function(utterance) {
      utterance = Utils.removeFillerWords(utterance.toLowerCase()).trim();

      // Name project
      if (this.state == 'create') {
        if (this.name) {
          this.goto('named');
        } else {
          this.startProjectCreation();
        }
      }
      if (this.state == 'empty') {
        this.name = this._getName(utterance);
        this.pm.projects[this.name] = this.pm.currentProject;
        delete this.pm.projects['Untitled-'+this.pm.untitledCount];
        this.nameProject();
      // Add to or finish project.
      } else if (this.state == 'named' || this.state == 'nonempty') {
        // Detect project completion.
        if (utterance.indexOf("that's it") != -1) {
          this.finishProject();
          return 'exit';
        }

        // Detect and handle explicit edit commands.
        if (this.editor.handleUtterance(utterance, this)) {
          return;
        }

        // Parse instruction to add as a last result.
        var instruction = new ScratchInstruction(utterance);
        if (instruction.steps != null) {
          this.instructions.push(instruction);
          this.addInstruction();
        } else {
          this.pm.say("I heard you say " + utterance);
          this.pm.say("That doesn't match any Scratch commands.");
        }
      }
    },
    handleUtteranceDuringExecution: function(utterance) {
      var scratchProject = this;
      if (utterance == 'scratch stop') {
        this.synth.cancel();
      } else if (utterance == 'scratch pause') {
        this.synth.pause();
      } else if (utterance == 'scratch resume' || utterance == 'scratch unpause') {
        this.synth.resume();
      } else {
        // Utterance should be an argument for the project.
        if (utterance == this.tempTrigger) {
          this.pm.say(this.tempResponse)
          this.pm.executeCurrentProject(scratch, 'WhereItLeftOff');
        }
      }
    },
  }
});

module.exports = ScratchProject;