/**
 * @fileoverview Utility functions used across files.
 */
const DiffMatchPatch = require('diff-match-patch');
const natural = require('natural');
const words = require('cmu-pronouncing-dictionary');
const dmp = new DiffMatchPatch();

/**
 * Namespace
 */
class Utils {
  /**
   * Force the utterance to begin with Scratch if triggering a command, and get
   * all defined matches of string to given regular expression.
   */
  static match(utterance, pattern) {
    // Be flexible in how you recognize Scratch at the beginning of an utterance.
    if (Utils.matchRegex(utterance, /^(?:scratch|search)(?:ed)?/)) {
      return Utils.matchRegex(utterance, pattern);
    }
    return null;
  }

  /**
   * Get all defined matches of string to given regular expression.
   */
  static matchRegex(utterance, pattern) {
    var matches = utterance.match(pattern, "i");
    return matches ? matches.filter(word => word != undefined && word != "") : null
  }

  /**
   * Given a grammar list, generate a dictionary of words contained in grammar
   * mapped to their pronunciations
   */
  static getRhymes(grammarList) {
    var rhymes = {}
    var tokenizer = new natural.WordTokenizer();
    for (let source of grammarList.map(x => x.src)) {
      var tokens = tokenizer.tokenize(decodeURIComponent(source))
      for (let token of tokens) {
        if (token in words) {
          rhymes[token] = words[token];
        }
      }
    }
    return rhymes;
  }

  /**
   * Given a list of tuples of phonetic matches and their location, create a
   * string joining them in the correct order.
   * @param {!Array} matches - An array of arrays of the format [word,
   *    match_location, levenshtein.substring.length]
   * @return {string} the matches strung together
   */
  static getOrderedMatchString(matches) {
    matches.sort(function(first, second) {
      return first[1] - second[1];
    });

    var result = matches.map(x => x[0])
    return result.join(' ');
  }

  /**
   * Given text, get list of viable phonetic matches from grammarList
   */
  static getRhymeMatches(text, grammarList) {
    var rhymes = Utils.getRhymes(grammarList);
    var tokenizer = new natural.WordTokenizer();
    var tokens = tokenizer.tokenize(text);
    var phoneticTokens = tokens.map(token => words[token])
    var phoneticText = phoneticTokens.join(' ');
    let phoneticTextLength  = phoneticText.length
    console.log('text: ' + text)
    console.log('phoneticText: ' + phoneticText);
    console.log('phoneticTextLength: ' + phoneticTextLength);

    // Build map of each word from the grammar to a list of match locations
    // found within the phonetic text.
    var matches = []

    for (var word in rhymes) {
      if (tokenizer.tokenize('what one of it is step six s m in').indexOf(word) != -1) {
      console.log('word: ' + word)

      // a dictionary containing the substring and the distance
      var levenshtein = natural.LevenshteinDistance(rhymes[word], phoneticText, {search: true});
      console.log('levenshtein')
      console.log(levenshtein)
      // Create a score based on a scale from 0-1, where higher is better.
      var score = 1 - levenshtein.distance/Math.max(rhymes[word].length, levenshtein.substring.length);
      console.log('natural score using search')
      console.log(score)

      var match_location = dmp.match_main(phoneticText, rhymes[word], parseInt(phoneticText.length/2));
      console.log('match_location')
      console.log(match_location)

      if (match_location != -1 && score > .77) {
        matches.push([word, match_location, levenshtein.substring.length])
      }
      }
    }

    return Utils.getOrderedMatchString(matches)
  }


  /**
   * Get the grammar rules in JSFG V1.0 format.
   * @param {!Object} triggerMap - map of trigger types to regular expressions
   * @return {!String} the grammar rules
   */
  static getTargets(triggerMap) {
    var targets = {}
    for (var triggerType in triggerMap) {
      var regexString = triggerMap[triggerType].toString().replace(/\(\.\*\)/g,"");
      var matches = regexString.substring(1,regexString.length-1).split('|');
      targets[triggerType] = matches;
    }
    return targets
  }

  /**
   * Match utterance to a desired action based on word distance.
   * @param {!String} utterance - the text to match to triggers
   * @param {!Object} triggers - dict mapping trigger types to the regular
   *    expressions that allow text to match to that trigger.
   * @return {!Array} a tuple consisting of the triggerType and the score
   */
  static fuzzyMatch(utterance, triggers) {
    // Get Levenshtein and JaroWinkler Distances between the utterance and the
    // potential triggers.

    // Rank the trigger types by the shortest distance between its triggers and
    // the utterance
    targetMap = Utils.getTargets(triggers)

    // triggerScores is an array of tuples (trigger, score)
    var getTriggerScoreDict = function(utterance, targets) {
      var triggerScores = {}

      targets.forEach((target) => {
        var jaro = natural.JaroWinklerDistance(target, utterance);
        var leven = natural.LevenshteinDistance(target, utterance);
        triggerScores[target] = {'jaro': jaro, 'leven': leven}
      });
      return triggerScores
    }

    var getMinDistance = function(triggerScores) {
      triggerScores.sort(function(first, second) {
          return first[1]- second[1];
      });
      return triggerScores[0]
    }

    var getMaxDistance = function(triggerScores) {
      triggerScores.sort(function(first, second) {
          return second[1] - first[1];
      });
      return triggerScores[0]
    }

    // Build array of [triggerType, 1-JaroWinkler Score, Target Phrase]
    var triggerScores = []
    for (var triggerType in targetMap) {
      var targets = targetMap[triggerType]
      var triggerScoreDict = getTriggerScoreDict(utterance, targets);
      var minLeven = getMinDistance(Object.entries(triggerScoreDict).map(x => [x[0], x[1].leven]))
      var minJaro = getMinDistance(Object.entries(triggerScoreDict).map(x => [x[0], 1 - x[1].jaro]))
      triggerScores.push([triggerType, minJaro[1], minJaro[0]])
      // Alternative ways we can calculate trigger scores are below. I chose
      // JaroWinkler to start with because it is the simplest and the other
      // measures have the same results.

      // triggerScores.push([triggerType, minLeven[1]])
      // triggerScores.push([triggerType, 15*minJaro[1] + minLeven[1]])
    }
    return getMinDistance(triggerScores)
  }

  /**
   * Get all defined matches of string to given regular expression.
   */
  static match(utterance, pattern) {
    var matches = utterance.match(pattern, "i");
    return matches ? matches.filter(word => word != undefined && word != "") : null
  }

  static text2num(numberWord) {
    var parseResult = parseInt(numberWord);
    if (!isNaN(parseResult)) {
      return numberWord;
    }

    var a, n, g;
    a = numberWord.toString().split(/[\s-]+/);
    n = 0;
    g = 0;

    var Small = {
      'zero': 0,
      'one': 1,
      'two': 2,
      'three': 3,
      'four': 4,
      'five': 5,
      'six': 6,
      'seven': 7,
      'eight': 8,
      'nine': 9,
      'ten': 10,
      'eleven': 11,
      'twelve': 12,
      'thirteen': 13,
      'fourteen': 14,
      'fifteen': 15,
      'sixteen': 16,
      'seventeen': 17,
      'eighteen': 18,
      'nineteen': 19,
      'twenty': 20,
      'thirty': 30,
      'forty': 40,
      'fifty': 50,
      'sixty': 60,
      'seventy': 70,
      'eighty': 80,
      'ninety': 90
    };

    var Magnitude = {
      'thousand':     1000,
      'million':      1000000,
      'billion':      1000000000,
      'trillion':     1000000000000,
      'quadrillion':  1000000000000000,
      'quintillion':  1000000000000000000,
      'sextillion':   1000000000000000000000,
      'septillion':   1000000000000000000000000,
      'octillion':    1000000000000000000000000000,
      'nonillion':    1000000000000000000000000000000,
      'decillion':    1000000000000000000000000000000000,
    };

    function feach(w) {
      var x = Small[w];
      if (x != null) {
          g = g + x;
      }
      else if (w == "hundred") {
          g = g * 100;
      }
      else {
          x = Magnitude[w];
          if (x != null) {
              n = n + g * x
              g = 0;
          }
          else {
              return null;
          }
      }
    }

    a.forEach(feach);
    return n + g;
  }

  static removeFillerWords(utterance) {
    var filler_words = ["um", "uh", "er", "ah", "like"];

    var utterance = utterance.toLowerCase();
    var stripped = utterance.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, "");
    var tokens = stripped.split(' ');
    var result = tokens.filter(token => filler_words.indexOf(token) == -1);
    return result.join(' ');
  }
}

module.exports = {
  Utils: Utils
};