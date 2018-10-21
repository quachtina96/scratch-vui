/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const ScratchInstruction = require('./scratch_instruction.js');
const ScratchProject = require('./scratch_project.js');
const ScratchStateMachine = require('./scratch_state_machine.js');
const ScratchRegex = require('./triggers.js');
const ScratchAudio = require('./audio.js');

/**
 * ScratchProjectEditor class
 */
class ScratchProjectEditor {

	/**
	 * Constructor for ScratchProjectEditor
	 */
	constructor() {
		this.triggers = ScratchRegex.getEditProjectTriggers();
		this.project = null;
    this.audio = new ScratchAudio();
	}

  /**
   * If the utterance matches the form of a supported program editing
   * command, execute the command.
   */
  handleUtterance(utterance, project) {
  	this.project = project;
    utterance = Utils.removeFillerWords(utterance.toLowerCase());

    var scratchProject = this;
    for (var commandType in this.triggers) {
      var args = Utils.match(utterance, this.triggers[commandType]);
      if (args) {
        this[commandType].call(scratchProject, args);
        this.project.pm.save();
        // We return 'exit' on executing the finish project command because we
        // need to signal to the state machine that the project is finished.
        if (commandType === 'finishProject') {
          return 'exit';
        }
        return true;
      }
    }
  }

  _describeCurrentStep() {
    // Subtract 1 from the instruction pointer because it presents as 1-indexed
    // to the user.
    if (Utils.checkBounds(this.project.instructionPointer-1, this.project.instructions)) {
      this.project.pm.say('Step ' + this.project.instructionPointer);
      this.project.pm.say(this.project.instructions[this.project.instructionPointer-1].raw)
      return true;
    } else {
      return false;
    }
  }

  goToStep(args) {
    this.project.instructionPointer = Utils.text2num(args[1]);
    if (this.project.instructionPointer == null) {
      this.project.instructionPointer = parseInt(args[1]);
    }
    if (!this._describeCurrentStep()) {
      this.project.pm.say('there is no step ' + this.project.instructionPointer);
    }
  }

  nextStep() {
    this.project.instructionPointer++;
    if (this.project.instructionPointer <= this.project.instructions.length) {
      this._describeCurrentStep();
    } else {
      this.project.instructionPointer--;
      this.project.pm.say('No more steps');
    }
  }

  previousStep() {
    this.project.instructionPointer--;
    if (this.project.instructionPointer > 0) {
      this._describeCurrentStep();
    } else {
      this.project.instructionPointer++;
      this.project.pm.say('No more steps');
    }
  }

  playStep() {
  	this._describeCurrentStep()
    this.project.pm.executeCurrentProjectWithVM('SingleStepWhereILeftOff');
  }

  // Add new instruction to the end of the project.
  // Note: Tricky because what is "the end" of the project? In the scoped down
  // version in Scratch VUI, we don't expect to think about this in terms of
  // multiple stacks, and this can get tricky with event-based stuff (which
  // Scratch implements as multiple stacks)
  appendStep(args) {
    var stepToInsert = ScratchInstruction.parse(args[1]);
    if (!stepToInsert) {
      this.audio.cueMistake();
      this.project.pm.say("I heard you say " + args[1]);
      // this.project.pm.say("That doesn't match any Scratch commands.");
      return false;
    } else {
      var newInstruction = new ScratchInstruction(args[1]);
      this.project.instructions.push(newInstruction)
      this.project.pm.say("I added " + newInstruction.raw + " to the end of the project");
      // Induce the state transition in the project.
      this.project.goto("nonempty");
      this.project.addInstruction();
      return true;
    }
  }

  insertStepBefore(args) {
    // TODO: use try catch to handle inability to convert the Scratch
    // instruction.
        // Get the new step.
    var utterance = args[1];
    var step = new ScratchInstruction(utterance);
    ScratchInstruction.parse(utterance.no_punctuation).then((parse) => {
      if (parse) {
        var referenceStepNumber = this._getNumber(args[2])-1;
        this._insertStep(step, referenceStepNumber);
      }
    });
  }

  insertStepAfter(args) {
    var utterance = args[1];
    var step = new ScratchInstruction(utterance);
    ScratchInstruction.parse(utterance.no_punctuation).then((parse) => {
      var referenceStepNumber = this._getNumber(args[2])-1;
      this._insertStep(step, referenceStepNumber + 1);
    });
  }

  /**
   * Helper function for inserting.
   */
  _insertStep(step, location) {
    this.project.instructions.splice(location, 0, step);
    this.project.instructionPointer = location;
    this.project.pm.say('inserted step');
  }

  /**
   * Convert string representation of a number to the integer representation.
   * "one" or "1" to 1 (and likewise for all other numbers).
   */
  _getNumber(stringOrInt) {
    var number = Utils.text2num(stringOrInt);
    if (number == null) {
      number = parseInt(stringOrInt);
    }
    return number
  }

  deleteStep(args) {
    if (this.project.instructions.length == 0) {
      this.project.pm.say('There are no instructions to remove!');
    } else {
      // Get the step number.
      var index = this._getNumber(args[1])-1;

      // Only remove steps that are in bounds.
      if (Utils.checkBounds(index, this.project.instructions)) {
        var removedScratchInstruction = this.project.instructions.splice(index, 1);
        this.project.pm.say('Removed step ' + (index+1));
      }
    }
    console.log(this.project.instructions);
  }

  replaceStep(args) {
    // Get the step number to replace.
    var index = this._getNumber(args[1])-1;

    // Get the new step.
    var utterance = args[2];
    var step = new ScratchInstruction(utterance);
    ScratchInstruction.parse(utterance.no_punctuation).then((result) => {
      if (!result) {
        this.project.pm.say(utterance + 'is not a Scratch command');
      } else {
        this.project.instructions.splice(index, 1, step);
        this.project.pm.say('replaced step ' + (index+1));
      }
    console.log(this.project.instructions);
    });
  }

  replaceInStep(args) {
    var index = this._getNumber(args[1])-1;
    var oldWord = args[2];
    var newWord = args[3];
    var instructionToModify = this.project.instructions[index];
    // TODO: determine how to replace things w/in a step.
  }

  replaceSound(args) {
    var oldSound = args[1];
    var newSound = args[2];
    // TODO: how does sound work in Scratch Programs.
  }

  getCurrentStep() {
    if (this.project.instructions.length == 0) {
      this.project.pm.say("There are no steps in " + this.project.name);
    }
  	// If the user is not currently on a step, put them at step 1 by default.
  	if (!this.project.instructionPointer) {
  		this.project.instructionPointer = 1;
  	}
  	this._describeCurrentStep();
  }

  getStepCount() {
    this.project.announceStepCount();
  }
}

module.exports = ScratchProjectEditor;