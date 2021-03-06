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
    var punctuationless = rawInstruction.replace(/[',\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    var instruction = punctuationless.replace(/\s{2,}/g," ");
    this.no_punctuation = instruction;
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
      var result = ScratchInstruction.parse(sentences[i])
      if (!result) {
        unknownActions.push(sentences[i]);
      }
    }
    return unknownActions;
  }

  /**
   * Returns a promise representing the result of trying to translate.
   */
  static parse(instruction) {
    // Strip punctutation.
    var punctuationless = instruction.replace(/[',\/#!$%\^&\*;:{}=\-_`~()]/g,"");
    var instruction = punctuationless.replace(/\s{2,}/g," ");

    // Send request to ScratchNLP via websockets.
    var getTranslation = () => {
      return wsp.sendRequest({
        'type': 'translation',
        'instruction': instruction
      }).then((result) => {
        console.log('RESULT OF SEND REQUEST IN SCRATCH INSTRUCTION');
        console.log(result.response);
        if (result.response == "I don't understand.") {
          return false
        } else {
          return result.response
        }
      })
    }

    // Send request to ScratchNLP via websockets.
    if (wsp.isClosed) {
      return wsp.open().then(getTranslation)
    }
    return getTranslation();
  }
  }

  //TODO(quacht): reworking the grammar COULD help w/ this. might go along with
  // generating documentation.
  /**
   * Given an instruction, reworks the instruction if it corresponds to known
   * mistranscriptions.
   */
  // static _handleSpecialCases(utterance) {
  //   // For now, this method only handles a single kind of common
  //   // mistranscriptions related to the Scratch music extension.

  //   // This command often fails because a number is used to identify the note
  //   // and a number is used to specify the number of beats and for is a homonym
  //   // for "four"
  //   var regex = /play (?:note|No.|no) (.*) beat/;
  //   var matches = Utils.matchRegex(utterance, regex);
  //   if (matches) {
  //       return;
  //     var toFix = matches[1];
  //     //  4 --> for
  //     // 2 --> to
  //     //    the note #
  //     //    the number of beats
  //     // A great way to get this would be to ask the user, but can we infer this
  //     // information.
  //     // "94 one" // 541

  //   }
  //   // "90 for misheard as 94"
  //   return;
  // }
// }

module.exports = ScratchInstruction;