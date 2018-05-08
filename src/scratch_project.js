/**
 * @fileoverview Defines the ScratchProject object as a JavaScript state
 * machine.
 *
 * @author quacht@mit.edu (Tina Quach)
 */

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
  data: function(scratchStateMachine) {
    return {
      scratch: scratchStateMachine,
      name: null,
      instructions: [],
      // TODO: deal with 1 versus 0 based indexing.
      // TODO: handle word forms of words in referencing steps.
      instructionPointer: null,
      editTriggers: {
        goToStep: /go to step (.*)|what's step (.*)|what is step (.*)/,
        nextStep: /go to next step|next step|what's next/,
        previousStep: /previous step|go back a step/,
        playStep: /play step|play current step|what does it do/,
        insertStepBefore: /insert (.*) before step (.*)|(.*) before step (.*)/,
        insertStepAfter: /insert (.*) after step (.*)|(.*) after step (.*)/,
        deleteStep: /delete step (.*)/,
        // TODO: distinguish between replacing everywhere and replacing in a
        // specific place.
        replaceStep: /replace step (.*) with (.*)/,
        replaceSound: /replace the (.*) sound with the (.*) sound'/,
        // TODO: address potential complex behavior in line below.
        replaceInStep: /in step (.*) replace (.*) with (.*)/,
        stopEditing: /stop|i\'m done|that\'s it'/
      },
      editCommands: {
        _describeCurrentStep: () => {
          // this does not refer to the state machine, but to the editCommands
          // object holding these functions.
          if (0 < this.instructionPointer &&
              this.instructionPointer <= this.instructions.length) {
            this.scratch.say('Step ' + this.instructionPointer);
            this.scratch.say(this.instructions[this.instructionPointer-1].raw)
            return true;
          } else {
            return false;
          }
        },
        goToStep: (args) => {
          this.instructionPointer = Utils.text2num(args[1]);
          if (this.instructionPointer == null) {
            this.instructionPointer = parseInt(args[1]);
          }
          if (!this.editCommands._describeCurrentStep()) {
            this.scratch.say('there is no step ' + this.instructionPointer);
          }
        },
        nextStep: () => {
          this.instructionPointer++;
          if (this.instructionPointer <= this.instructions.length) {
            this.editCommands._describeCurrentStep();
          } else {
            this.instructionPointer--;
            this.scratch.say('No more steps');
          }
        },
        previousStep: () => {
          this.instructionPointer--;
          if (this.instructionPointer > 0) {
            this.editCommands._describeCurrentStep();
          } else {
            this.instructionPointer++;
            this.scratch.say('No more steps');
          }
        },

        // todo - test below
        playStep: function() {
          var steps = this.instructions[this.instructionPointer-1].getSteps();
          // Assuming that the project can only be made of 'say' instructions
          for (var i = 0; i < steps.length; i++) {
            scratch.say(steps[i][1]);
          }
        },
        insertStepBefore: function(args) {
          // TODO: use try catch to handle inability to convert the Scratch
          // instruction.
          var stepToInsert = new ScratchInstruction(args[1]);
          var referenceStepNumber = Utils.text2num(args[2])-1;
          if (referenceStepNumber == null) {
            referenceStepNumber = parseInt(args[2])-1;
          }
          this.instructions.splice(referenceStepNumber, 0, stepToInsert);
          this.instructionPointer = referenceStepNumber;
          console.log(this.instructions);
        },
        insertStepAfter: function(args) {
          var stepToInsert = new ScratchInstruction(args[1]);
          var referenceStepNumber = Utils.text2num(args[2])-1;
          if (referenceStepNumber == null) {
            referenceStepNumber = parseInt(args[2])-1;
          }
          this.instructions.splice(referenceStepNumber + 1, 0, stepToInsert);
          this.instructionPointer = referenceStepNumber + 1;
          this.scratch.say('inserted step');
          console.log(this.instructions);
        },
        deleteStep: function(args) {
          console.log(this);
          var index = Utils.text2num(args[1])-1;
          if (index == null) {
            index = parseInt(args[1])-1;
          }
          var removedScratchInstruction = this.instructions.splice(index, 1);
          this.scratch.say('Removed step ' + (index+1));
          console.log(this.instructions);
        },
        replaceStep: function(args) {
          var index = Utils.text2num(args[1])-1;
          if (index == null) {
            index = parseInt(args[1])-1;
          }
          var step = new ScratchInstruction(args[2]);
          if (!step) {
            this.scratch.say(step + 'is not a Scratch command');
          }
          this.instructions.splice(index, 1, step);
          this.scratch.say('replaced step ' + (index+1));
          console.log(this.instructions);
        },
        replaceInStep: function(args) {
          var index = Utils.text2num(args[1])-1;
          if (index == null) {
            index = parseInt(args[1])-1;
          }
          var oldWord = args[2];
          var newWord = args[3];
          var instructionToModify = this.instructions[index];
          // TODO: determine how to replace things w/in a step.
        },
        replaceSound: function(args) {
          var oldSound = args[1];
          var newSound = args[2];
          // TODO: how does sound work in Scratch Programs.
        }
      }
    }
  },
  methods: {
    onStartProjectCreation() {
      return new Promise(function(resolve, reject) {
        this.scratch.say('What do you want to call it?');
        resolve();
      });
    },
    onNameProject: function() {
      return new Promise(function(resolve, reject) {
        // problem w/ using this.name is that this refers to the window--NOT to the scratch project.
        this.scratch.say('Okay. When you say, Scratch, ' + this.scratch.currentProject.name + ', I’ll play the project. What’s the first step?');
        resolve();
      })
    },
    onAddInstruction: function(utterance) {
      return new Promise(function(resolve, reject) {
        this.scratch.say('Okay, what’s the next step?');
        resolve();
      })
    },
    onFinishProject: function(utterance) {
      return new Promise(function(resolve, reject) {
        this.scratch.say('Cool, now you can say, Scratch, ' + this.scratch.currentProject.name + ', to play the project.');
        resolve();
      })
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
        this.scratch.projects[this.name] = this.scratch.currentProject;
        delete this.scratch.projects['Untitled-'+this.scratch.untitledCount];
        this.nameProject();
      // Add to or finish project.
      } else if (this.state == 'named' || this.state == 'nonempty') {
        // Detect project completion.
        if (utterance.indexOf("that's it") != -1) {
          this.finishProject(this.state);
          return 'exit';
        }

        // Detect and handle explicit edit commands.
        if (this._handleEditCommands(utterance)) {
          return;
        }

        // Parse instruction to add as a last result.
        var instruction = new ScratchInstruction(utterance);
        if (instruction.steps != null) {
          this.instructions.push(instruction);
          this.addInstruction();
        } else {
          this.scratch.say("I heard you say " + utterance);
          this.scratch.say("That doesn't match any Scratch commands.");
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
          this.scratch.say(this.tempResponse)
          this.scratch.executeCurrentProject(scratch, 'WhereItLeftOff');
        }
      }
    },
    /**
     * If the utterance matches the form of a supported program editing
     * command, execute the command.
     */
    _handleEditCommands: function(utterance) {
      utterance = Utils.removeFillerWords(utterance.toLowerCase());

      var scratchProject = this;
      for (var commandType in this.editTriggers) {
        var args = Utils.match(utterance, this.editTriggers[commandType]);
        if (args) {
          this.editCommands[commandType].call(scratchProject,args);
          this.scratch.saveToLocalStorage();
          return true;
        }
      }
    }
  }
});