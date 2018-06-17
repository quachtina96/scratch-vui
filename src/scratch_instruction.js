/**
 * @fileoverview Define ScratchInstruction class for converting sentences
 * to Scratch programs
 * @author Tina Quach (quacht@mit.edu)
 */
const Utils = require('./utils.js').Utils;


/**
 * ScratchInstruction class
 */
class ScratchInstruction {
  /**
   * Constructor for the ScratchInstruction
   * @param {!String} rawInstruction - the utterance from the user.
   * @param {!ScratchAction} action - the action to which this instruction
   *    belongs.
   */
  constructor(rawInstruction) {
    this.raw = rawInstruction.trim();
    try {
      this.steps = this.getSteps();
    } catch(e) {
      this.steps = null;
    }
  }

  /**
   * Get the sentences in the instruction that use undefined actions.
   * @param {!String} instruction - String containing the instruction
   * @return {!Array<!String>} an array of unsupported sentences.
   */
  static getUnsupportedSteps(instruction) {
    // Detect multiple statements and split them.
    let sentences = instruction.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    var unknownActions = [];
    for (var i = 0; i < sentences.length; i++) {
      try {
        var instructionJson = ScratchInstruction.extractArgs(sentences[i]);
        var scratchInstruction = ScratchInstruction.jsonToScratch(instructionJson);
      } catch (e) {
        unknownActions.push(sentences[i]);
      }
    }
    return unknownActions;
  }

  /**
   * Returns the steps of the Scratch program.
   */
  getSteps() {
    // Detect multiple statements and split them.
    let sentences = this.raw.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
    var steps = [];
    for (var i = 0; i < sentences.length; i++) {
      try {
        var instructionJson = ScratchInstruction.extractArgs(sentences[i]);
        var scratchInstruction = ScratchInstruction.jsonToScratch(instructionJson);
        steps.push(scratchInstruction);
      } catch (e) {
        console.log(e);
        throw new Error("Failed to get steps from instruction: " + this.raw);
      }
    }
    return steps;
  }

  /**
   * Helper function for getSteps. Returns a JSON representing the instruction.
   * @param {!String} instruction A sentence that may contain a command.
   * @return JSON object encoding information for generating Scratch program.
   */
  static extractArgs(sentence) {
    sentence = sentence.trim();
    var instructionJson = {
      original: sentence
    };

    if (!sentence) {
      return instructionJson;
    }

    let commandTemplates = {
      'when EVENT, you CMD': /[wW]hen (.*),? you (.*)/,
      'then/next/after, CMD': /([Tt]hen|[nN]ext|[aA]fter),? (.*)/,
      'first, CMD': /[fF]irst,? (.*)/,
    };
    var keys = Object.keys(commandTemplates);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var matches = Utils.matchRegex(sentence, commandTemplates[key]);
      if (matches) {
        switch (key) {
          case 'when EVENT, you CMD':
            instructionJson.event = matches[1];
            instructionJson.command = matches[2];
            return instructionJson;
          case 'then/next/after, CMD':
            instructionJson.event = 'after last command';
            instructionJson.command = matches[2];
            return instructionJson;
          case 'first, CMD':
            instructionJson.event = 'first';
            instructionJson.command = matches[1];
            return instructionJson;
        }
      }
    }

    instructionJson.command = sentence;

    return instructionJson;
  }

  /**
   * Helper function for getSteps. Returns a JSON representing the instruction.
   * @param {!String} instruction A sentence that may contain a command.
   */
  static jsonToScratch(instructionJson) {
    if (!instructionJson.command) {
      return null;
    }

    // Process command.
    var instructionTokens = instructionJson.command.split(' ');
    if (instructionTokens) {
      // Assume first word is the verb and the rest of the command is an
      // argument.
      var verb = instructionTokens[0];

      // Check for all built in commands, mapped to Scratch programs.
      // TODO: add more cases to handle wider variety of possible scratch
      // commands.
      if (verb.toLowerCase() === 'say') {
        var opcode = 'say:';
      } else {
        // Verb is not recognized
        throw new Error("Scratch does not know how to '" + verb + "'");
      }
      var command = [opcode, instructionTokens.slice(1).join(' ')];
    }

    if (instructionJson.event) {
      if (instructionJson.event.toLowerCase().startsWith('i say')) {
        let argument = instructionJson.event.substring(6);
        command = [["doAsk", ""],["doIf", ["=", ["answer"], argument], [command]]];
      }
      // else if (instructionJson.event == 'first') {
      //   // TODO: Need some way to pass this information to Scratch model for building the progam.
      // } else if (instructionJson.event == 'after last command') {
      //   // TODO: Need some way to pass this information to Scratch model for building the progam.
      // }
    }

    return command;
  }
}

module.exports = ScratchInstruction;