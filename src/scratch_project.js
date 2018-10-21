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
const ScratchAudio = require('./audio.js');
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
      audio: new ScratchAudio(),
      instructions: [],
      // Use 1-based indexing so step 1 refers to the first step when
      // communicating to the user.
      instructionPointer: 1,
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
     * @return {!String} Scratch program represented as a JSON or string
     *    containing the error.
     */
    getScratchProgram: function(startIndex, endIndex) {
      return new Promise((resolve,reject) => {
        // Batch instructions for the server to translate.
        let rawInstructions = this.instructions.map(instruction => instruction.no_punctuation);
        var urlSuffix = "user/" + this.ssm.user + "/scratch_program/" + this.name;
        var method = "post";
        var payload = {
              'instructions': rawInstructions,
              'useGreenFlag': true,
              'start': startIndex,
              'end':endIndex
            };
        Utils.requestScratchNLP(urlSuffix, method, payload).then(result => {
          resolve(result);
        })
        .catch(error => {
          console.log(error);
          reject(error);
        })
      })
    },
    _getName: function(utterance) {
      var pattern = /call the project (.*)/;
      var matches = Utils.matchRegex(utterance, pattern);
      if (matches && matches.length > 0) {
        return matches[1].trim();
      } else {
        return utterance.trim();
      }
    },
    _isValid: function(name) {
      // The name of a project cannot be the same as an existing project &
      // it cannot match the form of an existing scratch command nor the
      // form of an existing scratch VUI command.
      return ScratchInstruction.parse(name).then((parse) => {
        return !(name in this.pm.projects || parse || ScratchRegex.contains(name))
      })
    },
    handleUtterance: function(utterance, opt_scratchVoiced) {
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
        // Expect the utterance to be the name of the project.
        var proposedName = this._getName(utterance);
        if (this._isValid(proposedName)) {
          this.name = this._getName(utterance);
          this.pm.projects[this.name] = this.pm.currentProject;
          delete this.pm.projects['Untitled-'+this.pm.untitledCount];
          this.nameProject();
        } else {
          // TODO: Request new name from the user.
        }
      // Add to or finish project.
      } else if (this.state == 'named' || this.state == 'nonempty') {
        // Detect and handle explicit edit commands.
        var editor_result = this.editor.handleUtterance(utterance, this, opt_scratchVoiced);
        if (editor_result == 'exit') {
          this.finishProject();
          return editor_result;
        } else if (editor_result) {
          return;
        }

        // Make sure that Scratch is said before handling the utterance.
        var voicedScratch = Utils.matchRegex(utterance, /^(?:scratch|search)(?:ed)?/);
        if (voicedScratch) {
          // Only match the triggers to the utterance without the voiced scratch.
          var start = utterance.indexOf(voicedScratch[0]);
          var end = start + voicedScratch[0].length + 1;
          var command = utterance.substring(end, utterance.length);
          var punctuationless = command.replace(/['.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
          var command = punctuationless.replace(/\s{2,}/g," ");
          ScratchInstruction.parse(command).then((result) => {
            if (!result) {
              this.audio.cueMistake();
              this.pm.say("I heard you say " + utterance);
            } else {
              var instruction = new ScratchInstruction(command);
              instruction.parse = result
              this.instructions.push(instruction);
              this.addInstruction();
            }
          });
        }
      }
    },
    // TODO: the scratch_project should already be handling utterances during
    // execution if we are using the scratch-vm (for 3.0 projects. We should
    // be able to remove the following below.
    handleUtteranceDuringExecution: function(utterance, opt_scratchVoiced) {
      var scratchProject = this;
      var match = opt_scratchVoiced ? Utils.matchRegex : Utils.match;
      // TODO: tina figure out how to handle these high level stop/pause/resume.
      if (match(utterance,/stop/)) {
        this.pm.ssm.vm.stopAll()
        this.pm.synth.cancel();
      } else if (match(utterance,/pause/)) {
        // TODO: Figure out how to do this w/ scratch-vm
        this.pm.synth.pause();
      } else if (match(utterance, /unpause|resume/)) {
        // TODO: Figure out how to do this w/ scratch-vm
        this.pm.synth.resume();
      }
      // Utterance sould be an argument for the project.
      if (utterance == this.tempTrigger) {
        this.pm.say(this.tempResponse)
        this.pm.executeCurrentProjectWithVM('WhereItLeftOff');
      }
    },
    announceStepCount: function() {
      var stepCount = this.instructions.length;
      if (stepCount != 1) {
        this.pm.say('There are ' + stepCount + ' steps');
      } else {
        this.pm.say('There is 1 step');
      }
    }
  }
});

module.exports = ScratchProject;