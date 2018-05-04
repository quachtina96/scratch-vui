/**
 * @fileoverview Utility functions used across files.
 */

/**
 * Namespace
 */
 Utils = {}

 /**
  * Get all defined matches of string to given regular expression.
  */
 Utils.match = (utterance, pattern) => {
 	var matches = utterance.match(pattern);
 	return matches ? matches.filter(word => word != undefined) : null;
 }