/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const ScratchInstruction = require('./scratch_instruction.js');
const ScratchProject = require('./scratch_project.js');
const ScratchStateMachine = require('./scratch_state_machine.js');
const ScratchAction = require('./scratch_action.js');
const Action = require('./action.js').Action;
const ScratchAudio = require('./audio.js');

/**
 * ScratchProjectEditor class
 */
class ScratchProjectEditor {

	/**
	 * Constructor for ScratchProjectEditor
	 */
	constructor() {
    this.actions = ScratchAction.Edit;
		this.project = null;
    this.audio = new ScratchAudio();
	}

  /**
   * If the utterance matches the form of a supported program editing
   * command, execute the command.
   */
  handleUtterance(utterance, project) {
    return new Promise((resolve,reject) => {
      this.project = project;
      utterance = Utils.removeFillerWords(utterance.toLowerCase());

      var editor = this;
      var pm = editor.project.pm;
      for (var triggerType in editor.actions) {

        var args = Utils.match(utterance, editor.actions[triggerType].trigger);
        if (args && args.length > 0) {
          var action = new Action(editor.actions[triggerType]);
          // The current actions and arguments are maintained at the project manager
          // level to simplify management since there can only be one current action
          // and argument to focus on.
          pm.currentAction = action;

          return pm.audio.cueSuccess().then(()=> {
            if (pm.triggerAction(action, args, utterance)) {
              // Successfully triggered action.
              pm.currentAction = null;
              pm.currentArgument = null;
            } else {
              console.log('[PROJECT EDITOR] You are currently in ' + editor.project.state + ' mode and cannot '
                + triggerType + ' from here.');
            }
            pm.save();
            // We return 'exit' on executing the finish project command because we
            // need to signal to the state machine that the project is finished.
            if (triggerType === 'finishProject') {
              resolve('exit');
            }
            return resolve('true');
          });
        }
      }
    });
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

  /**
   * List all the steps in the project.
   */
  getAllSteps(args) {
    var steps = this.project.instructions.map((instruction) => instruction.raw)
    steps.forEach((step) => {
      this.project.pm.say(step);
    });
    }

  /**
   * Jump to and describe a single step given index (under 1-based index).
   */
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

  /**
   * Play the current step.
   */
  playStep() {
    this.project.pm.executeCurrentProjectWithVM('SingleStepWhereILeftOff');
  }

  // Add new instruction to the end of the project.
  // Note: Tricky because what is "the end" of the project? In the scoped down
  // version in Scratch VUI, we don't expect to think about this in terms of
  // multiple stacks, and this can get tricky with event-based stuff (which
  // Scratch implements as multiple stacks)
  appendStep(args) {
    var step = args[1];
    var voicedScratch = Utils.matchRegex(step, /^(?:scratch|search)(?:ed)?/);
    var command = step;
    if (voicedScratch) {
      // Only match the triggers to the step without the voiced scratch.
      var start = step.indexOf(voicedScratch[0]);
      var end = start + voicedScratch[0].length + 1;
      var command = step.substring(end, step.length);
    }
    var punctuationless = command.replace(/['.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    var command = punctuationless.replace(/\s{2,}/g," ");
    ScratchInstruction.parse(command).then((result) => {
      if (!result) {
        // Failed to parse the command using ScratchNLP. Alert failure.
        this.audio.cueMistake().then(()=>{
          this.project.pm.say("I heard you say " + step + ". That's not a Scratch command.");
        });
      } else {
        // Success!
        var instruction = new ScratchInstruction(command);
        instruction.parse = result
        this.instructions.push(instruction);
        this.addInstruction();
      }
    });
  }

  /**
   * In order to support
   */
  insertStep(options) {
    var direction = options.direction;
    var referenceStepNumber = options.referenceStepNumber;
    var utterance = options.utterance;

    var step = new ScratchInstruction(utterance);
    ScratchInstruction.parse(step.no_punctuation).then((parse) => {
      if (parse) {
        this._insertStep(step, referenceStepNumber);
      }
    });
  }

  /**
   * Helper function for inserting.
   */
  _insertStep(step, location) {
    this.project.instructions.splice(location, 0, step);
    this.project.instructionPointer = location;
  }

  insertStepBefore(args, invertedArguments=false) {
    // TODO: use try catch to handle inability to convert the Scratch
    // instruction.
    // Get the new step.
    if (invertedArguments) {
      var options = {
        direction: 'before',
        utterance: args[2],
        referenceStepNumber: this._getNumber(args[1])-1
      }
    } else {
      var options = {
        direction: 'before',
        utterance: args[1],
        referenceStepNumber: this._getNumber(args[2])-1
      }
    }
    this.insertStep(options);
  }

  insertStepAfter(args, invertedArguments=false) {
    if (invertedArguments) {
      var options = {
        direction: 'after',
        utterance: args[2],
        referenceStepNumber: this._getNumber(args[1])
      }
    } else {
      var options = {
        direction: 'after',
        utterance: args[1],
        referenceStepNumber: this._getNumber(args[2])
      }
    }
    this.insertStep(options);
  }

  beforeInsertStep(args) {
    this.insertStepBefore(args, true);
  }

  afterInsertStep(args) {
    this.insertStepAfter(args, true);
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
    ScratchInstruction.parse(step.no_punctuation).then((result) => {
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