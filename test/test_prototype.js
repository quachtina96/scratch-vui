const test = require('tap').test;
const Instruction = require('../../src/prototype.js');

/**
 * Deeply compare the two given arrays.
 * @param {!Array} array1 - The first array
 * @param {!Array} array2 - The second array
 * @return {boolean} true if the two are deeply equal, false otherwise
 */
var arraysEqual = function(array1, array2) {
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

// TODO: correct test
test('Give me a compliment', t => {

  t.end();
});
