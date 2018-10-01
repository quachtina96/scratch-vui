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
  if (Utils.matchRegex(utterance, /^(?:scratch|search)(?:ed)?/)) {
    return Utils.matchRegex(utterance, pattern);
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

/**
 * Deeply compare the two given arrays.
 * @param {!Array} array1 - The first array
 * @param {!Array} array2 - The second array
 * @return {boolean} true if the two are deeply equal, false otherwise
 */
Utils.arraysEqual = function(array1, array2) {
    // if the other array is a falsy value, return
    if (!array2)
        return false;

    // compare lengths - can save a lot of time
    if (array1.length !== array2.length)
        return false;

    for (var i = 0, l=array1.length; i < l; i++) {
        // Check if we have nested array2s
        if (array1[i] instanceof Array && array2[i] instanceof Array) {
            // recurse into the nested array2s
            if (!array1[i].equals(array2[i]))
                return false;
        }
        else if (array1[i] !== array2[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
};


module.exports = Utils;