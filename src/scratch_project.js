/**
 * @fileoverview Defines the ScratchProject object as a JavaScript state
 * machine.
 *
 * @author quacht@mit.edu (Tina Quach)
 */

var ScratchProject = StateMachine.factory({
  init: 'empty',
  transitions: [
    // Support linear project creation process.
    { name: 'nameProject', from: 'empty', to: 'named'},
    { name: 'addInstruction', from: 'named', to: 'nonempty'},
    { name: 'addInstruction', from: 'nonempty', to: 'nonempty'},
    { name: 'finishProject', from: 'nonempty', to: 'nonempty'},
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
      editCommands: {
        _describeCurrentStep: function() {
          this.scratch.say('Step ' + this.instructionPointer);
          this.scratch.say(this.instructions[this.instructionPointer].raw)
        },
        goToStep: function(args) {
          this.instructionPointer = args[1];
          this._describeCurrentStep()
        },
        nextStep: function() {
          this.instructionPointer++;
          this._describeCurrentStep();
        },
        previousStep: function() {
          this.instructionPointer--;
          this._describeCurrentStep();
        },
        playStep: function() {
          var steps = this.instructions[this.instructionPointer].getSteps();
          // Assuming that the project can only be made of 'say' instructions
          for (var i = 0; i < steps.length; i++) {
            scratch.say(steps[i][1]);
          }
        },
        insertStepBefore: function(args) {
          // TODO: use try catch to handle inability to convert the Scratch
          // instruction.
          var stepToInsert = new ScratchInstruction(args[1]);
          var referenceStepNumber = args[2];
          this.instructions.splice(referenceStepNumber, 0, stepToInsert);
          this.instructionPointer = referenceStepNumber;
          console.log(this.instructions);
        },
        insertStepAfter: function(args) {
          var stepToInsert = new ScratchInstruction(args[1]);
          var referenceStepNumber = args[2];
          this.instructions.splice(referenceStepNumber + 1, 0, stepToInsert);
          this.instructionPointer = referenceStepNumber + 1;
          this.scratch.say('inserted step');
          console.log(this.instructions);
        },
        deleteStep: function(args) {
          var index = args[1];
          var removedScratchInstruction = this.instructions.splice(index, 1);
          this.scratch.say('removed step ' + index);
          console.log(this.instructions);
        },
        replaceStep: function(args) {
          var index = args[1];
          var step = new ScratchInstruction(args[1]);
          this.instructions.splice(index, 1, step);
          this.scratch.say('replaced step ' + index);
          console.log(this.instructions);
        },
        replaceInStep: function(args) {
          var index = args[1];
          var asset = args[2];
          var step = args[3];
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
    onEmpty: function() {
      return new Promise(function(resolve, reject) {
        this.scratch.say('What do you want to call it?');
        resolve();
      })
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
      var matches = utterance.match(pattern);
      if (matches && matches.length > 0) {
        return matches[1].trim();
      } else {
        return utterance.trim();
      }
    },
    handleUtterance: function(utterance) {
      // Name project
      if (this.state == 'empty') {
        this.name = this._getName(utterance);
        this.scratch.projects[this.name] = this.scratch.currentProject;
        delete this.scratch.projects['Untitled-'+this.scratch.untitledCount];
        this.nameProject();
      // Add to or finish project.
      } else if (this.state == 'named' || this.state == 'nonempty') {
        // Detect project completion.
        if (utterance.indexOf("that's it") != -1) {
          this.finishProject();
          return 'exit';
        }

        // Detect and handle explicit edit commands.
        if (this._handleEditCommands(utterance)) {
          return;
        }

        // Parse instruction to add as a last result.
        try {
          var instruction = new ScratchInstruction(utterance);
          this.instructions.push(instruction);
          this.addInstruction();
        } catch (e) {
          console.log(e)
          this.scratch.say("Sorry, that doesn't match any Scratch commands.");
        }
      }
    },
    /**
     * If the utterance matches the form of a supported program editing
     * command, execute the command.
     */
    _handleEditCommands: function(utterance) {
      utterance = utterance.toLowerCase();
      var editCommands = {
        goToStep: /go to step (.*)/,
        nextStep: /go to next step|next step|what's next\?/,
        previousStep: /previous step|go back a step/,
        playStep: /play step|play current step|what does it do\?/,
        insertStepBefore: /(.*) before step (.*)/,
        insertStepAfter: /(.*) after step (.*)/,
        deleteStep: /delete step (.*)/,
        // TODO: distinguish between replacing everywhere and replacing in a
        // specific place.
        replaceStep: /replace step (.*) with (.*)/,
        replaceSound: /replace the (.*) sound with the (.*) sound'/,
        // TODO: address potential complex behavior in line below.
        replaceInStep: /in step (.*) replace (.*) with (.*)/,
        stopEditing: /stop|i\'m done|that\'s it'/
      }

      for (var commandType in editCommands) {
        var args = utterance.match(editCommands[commandType]);
        if (args) {
          this.editCommands[commandType].bind(this)
          this.editCommands[commandType](args);
          return true;
        }
      }
    }
  }
});