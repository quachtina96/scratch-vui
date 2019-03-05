/**
 * @fileoverview Defines the ScratchProject object as a JavaScript state
 * machine.
 *
 * @author quacht@mit.edu (Tina Quach)
 */
const ScratchInstruction = require('./scratch_instruction.js');
const StateMachine = require('javascript-state-machine');
const ScratchProjectEditor = require('./scratch_project_editor.js');
const ScratchAction = require('./scratch_action.js');
const ScratchAudio = require('./audio.js');
const Utils = require('./utils.js');

// TODO: idea: move the edit commands to the state machine level instead of the
// scratch project level, since we manage what the currentproject is.
// to resolve the issue of this referring to the wrong this.

var ScratchProject = StateMachine.factory({
  init: 'create',
  transitions: [
    // Support linear project creation process: create, empty, named, nonempty
    { name: 'startProjectCreation', from: 'create', to: 'empty'},
    { name: 'nameProject', from: 'empty', to: 'named'},
    { name: 'nameProject', from: 'create', to: 'named'},
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

        // Send request to ScratchNLP via websockets.
        wsp.sendRequest({
          'type': 'project',
          'user': this.ssm.user,
          'projectName':this.name,
          'instructions': rawInstructions,
          'useGreenFlag': true,
          'start': startIndex,
          'end':endIndex
        }).then(result => {
          console.log('RESULT OF SEND REQUEST IN SCRATCH PROGRAM');
          console.log(result.response);
          resolve(result.response);
        })
        .catch(error => {
          console.log('ERROR IN SEND REQUEST IN SCRATCH PROGRAM');
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
      return ScratchAction.Validator.unconflictingProjectName(this.ssm, name);
    },
    // When the project editor successfully handles an utterance, finish the
    // project if the intent was for the user to exit.
    _finishProjectIfNeeded: (editor_result) => {
      DEBUG && console.log(`[project _finishProjectIfNeeded] editor handled utterance with result: ${editor_result}`)

      if (editor_result == 'exit') {
        this.finishProject();
        resolve(editor_result);
      } else if (editor_result) {
        resolve();
      }
    },
    // When the project editor could not handle the utterance,
    _matchToScratchCommand: async (utterance, project) => {
      DEBUG && console.log(`[project _matchToScratchCommand] editor rejected handle utterance; now attempting Scratch command`);
      // If no edit commands work, attempt to match the utterance to a Scratch
      // command.
      var voicedScratch = Utils.matchRegex(utterance, /^(?:scratch|search)(?:ed)?/);
      var command = utterance;
      if (voicedScratch) {
        // Only match the triggers to the utterance without the voiced scratch.
        var start = utterance.indexOf(voicedScratch[0]);
        var end = start + voicedScratch[0].length + 1;
        var command = utterance.substring(end, utterance.length);
      }
      var punctuationless = command.replace(/['.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
      var command = punctuationless.replace(/\s{2,}/g," ");

      var parseResult = await ScratchInstruction.parse(command);
      DEBUG && console.log(`[project handleUtterance] scratch command parse result: ${parseResult} `);

      if (!parseResult) {

        // Failed to parse the command using ScratchNLP.
        throw Error(`[project handleUtterance] failed parse to Scratch command: ${command}`);
      } else {
        // Success!
        DEBUG && console.log(`[project handleUtterance] parsed to Scratch command`);
        await project.pm.audio.cueSuccess();
        var instruction = new ScratchInstruction(command);
        instruction.parse = parseResult;
        project.instructions.push(instruction);
        project.addInstruction();
        return;
      }
    },
    /**
     * Handle utterance. Return true if successful, 'exit' if successfully finishing
     * project, or false if failed.
     */
    handleUtterance: async function(utterance, opt_scratchVoiced) {
      DEBUG && console.log(`[project handle utterance]`)

      // Preprocess utterance
      utterance = Utils.removeFillerWords(utterance.toLowerCase()).trim();
      DEBUG && console.log(`[project handleUtterance] ${this}`)
      DEBUG && console.log(`[project handleUtterance] ${this.state}`)
      switch(this.state) {
        case 'create':
          // Request project name from user
          if (this.name) {
            this.goto('named');
          } else {
            await this.pm.audio.cueSuccess();
            this.startProjectCreation();
          }
          return true;
        case 'empty':
          // Expect the utterance to be the name of the project.
          var proposedName = this._getName(utterance);
          if (this._isValid(proposedName)) {
            this.name = this._getName(utterance);
            this.pm.projects[this.name] = this.pm.currentProject;
            delete this.pm.projects['Untitled-'+this.pm.untitledCount];
            await this.pm.audio.cueSuccess();
            this.nameProject();
          }
          return true;
        case 'named':
        case 'nonempty':
          // Detect and handle explicit edit commands.
          try {
            var editorResult = await this.editor.handleUtterance(utterance, this);
            if (editorResult == 'exit') {
              return this._finishProjectIfNeeded();
            } else {
              return true;
            }
          } catch (e) {
            try {
              await this._matchToScratchCommand(utterance, this);
              return true;
            } catch (e) {
              return false;
            }
          }
        default:
          DEBUG && console.log(`[project handle utterance] Scratch project did not handle utterance ${utterance}`);
          return false;
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
    },
    // Set the state of the project based on information. Useful for loading
    // a project from storage.
    setState: function() {
      if (!this.name) {
        this.goto("empty");
      } else if (this.name && this.instructions.length == 0) {
        this.goto("named");
      } else if (this.name && this.instructions.length > 0) {
        this.goto("nonempty");
      }
    },
  }
});

module.exports = ScratchProject;