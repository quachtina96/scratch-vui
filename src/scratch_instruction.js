/**
 * @fileoverview The ScratchInstruction class serves to hold the appropriate
 *    information about the ScratchInstruction together.
 * to Scratch programs
 * @author Tina Quach (quacht@mit.edu)
 */
const Utils = require('./utils.js');

/**
 * ScratchInstruction class
 */
class ScratchInstruction {
  /**
   * Constructor for the ScratchInstruction
   * @param {!String} rawInstruction - the utterance from the user.
   */
  constructor(rawInstruction) {
    this.raw = rawInstruction.trim();
    this.parse = null;
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
      ScratchInstruction.parse(sentences[i]).then((result) => {
        if (result == "I don't understand.") {
          unknownActions.push(sentences[i]);
        }
      });
    }
    return unknownActions;
  }

  /**
   * Returns a promise representing the result of trying to translate.
   */
  static parse(rawInstruction) {
    var urlSuffix = "translate/" + rawInstruction;
    var method = "get";
    return Utils.requestScratchNLP(urlSuffix, method)
  }
}

module.exports = ScratchInstruction;