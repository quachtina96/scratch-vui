/**
 * @fileoverview Utility functions used across files.
 */

/**
 * Namespace
 */
 Utils = {}

/**
 * This corresponds to the url where ScratchNLP is hosted.
 */
Utils.ScratchNLPEndpointURL = "http://127.0.0.1:5000/"

/**
 * Get all defined matches of string to given regular expression.
 */
Utils.matchRegex = (utterance, pattern) => {
  var matches = utterance.match(pattern, "i");
  return matches ? matches.filter(word => word != undefined && word != "") : null
}

/**
 * Force the utterance to begin with Scratch if triggering a command.
 */
Utils.match = (utterance, pattern) => {
  // Be flexible in how you recognize Scratch at the beginning of an utterance.
  var voicedScratch = Utils.matchRegex(utterance, /^(?:scratch|search)(?:ed)?/);
  if (voicedScratch) {
    // Only match the triggers to the utterance without the voiced scratch.
    var start = utterance.indexOf(voicedScratch[0]);
    var end = start + voicedScratch[0].length + 1;
    return Utils.matchRegex(utterance.substring(end, utterance.length), pattern);
  }
  return null;
}

Utils.text2num = (numberWord) => {
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

Utils.removeFillerWords = function(utterance) {
  var filler_words = ["um", "uh", "er", "ah", "like"];

  var utterance = utterance.toLowerCase();
  var stripped = utterance.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, "");
  var tokens = stripped.split(' ');
  var result = tokens.filter(token => filler_words.indexOf(token) == -1);
  return result.join(' ');
};

/**
 * Given an array and an index into the array, return whether the index is valid.
 */
Utils.checkBounds = function(index, array) {
  return index >= 0 && index < array.length;
}

Utils.createCORSRequest = function(method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr){
      xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined"){
      xhr = new XDomainRequest();
      xhr.open(method, url);
  } else {
      xhr = null;
  }
  return xhr;
}

/**
 * Send an HTTP request to the ScratchNLP endpoint.
 */
Utils.requestScratchNLP = function(urlSuffix, method, opt_contents) {
  return new Promise((resolve,reject) => {
    var url = Utils.ScratchNLPEndpointURL + urlSuffix;
    var request = Utils.createCORSRequest(method, url);
    if (request) {
      request.onload = () => {
        resolve(request.responseText);
      };
      request.onerror = () => {
        console.log(request.statusText);
        reject(null);
      };
      request.send(JSON.stringify(opt_contents));
    }
  });
}

module.exports = Utils;