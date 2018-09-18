/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const ScratchInstruction = require('./scratch_instruction.js');
const ScratchProject = require('./scratch_project.js');
const ScratchStateMachine = require('./scratch_state_machine.js');
const ScratchRegex = require('./triggers.js');

/**
 * ScratchProjectEditor class
 */
class ScratchProjectEditor {

	/**
	 * Constructor for ScratchProjectEditor
	 */
	constructor() {
		this.triggers = ScratchRegex.getEditProjectTriggers();
		this.project = null
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
        return true;
      }
    }
  }

  _describeCurrentStep() {
    // this does not refer to the state machine, but to the editCommands
    // object holding these functions.
    if (0 < this.project.instructionPointer &&
        this.project.instructionPointer <= this.project.instructions.length) {
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
    this.project.pm.executeCurrentProject('SingleStepWhereILeftOff');
  }

  insertStepBefore(args) {
    // TODO: use try catch to handle inability to convert the Scratch
    // instruction.
    var stepToInsert = new ScratchInstruction(args[1]);
    var referenceStepNumber = Utils.text2num(args[2])-1;
    if (referenceStepNumber == null) {
      referenceStepNumber = parseInt(args[2])-1;
    }
    this.project.instructions.splice(referenceStepNumber, 0, stepToInsert);
    this.project.instructionPointer = referenceStepNumber;
    console.log(this.project.instructions);
  }

  insertStepAfter(args) {
    var referenceStepNumber = Utils.text2num(args[2])-1;
    if (referenceStepNumber == null) {
      referenceStepNumber = parseInt(args[2])-1;
    }
    this.project.instructions.splice(referenceStepNumber + 1, 0, stepToInsert);
    this.project.instructionPointer = referenceStepNumber + 1;
    this.project.pm.say('inserted step');
    console.log(this.project.instructions);
  }

  deleteStep(args) {
    console.log(this);
    var index = Utils.text2num(args[1])-1;
    if (index == null) {
      index = parseInt(args[1])-1;
    }
    var removedScratchInstruction = this.project.instructions.splice(index, 1);
    this.project.pm.say('Removed step ' + (index+1));
    console.log(this.project.instructions);
  }

  replaceStep(args) {
    var index = Utils.text2num(args[1])-1;
    if (index == null) {
      index = parseInt(args[1])-1;
    }
    var step = new ScratchInstruction(args[2]);
    if (!step) {
      this.project.pm.say(step + 'is not a Scratch command');
    }
    this.project.instructions.splice(index, 1, step);
    this.project.pm.say('replaced step ' + (index+1));
    console.log(this.project.instructions);
  }

  replaceInStep(args) {
    var index = Utils.text2num(args[1])-1;
    if (index == null) {
      index = parseInt(args[1])-1;
    }
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
  	// If the user is not currently on a step, put them at step 1 by default.
  	if (this.project.instructionPointer) {
  		this.project.instructionPointer = 1;
  	}
  	this._describeCurrentStep();
  }
}

module.exports = ScratchProjectEditor;