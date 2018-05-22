/**
 * This file specifies the forms of commands supported by the Scratch Voice
 * User Interface.
 */

/**
 * ScratchRegex namespace.
 */
ScratchRegex = {};

ScratchRegex.getGeneralTriggers = function() {
	return {
	  'newProject': /new project|create a? new project|create a? project|make a? new project|make a? project/,
	  'deleteProject': /delete (.*) project/,
	  'renameCurrentProject': /rename current project to (.*)/,
	  'renameProject': /change name of (.*) project to (.*)/,
	  'editExistingProject': /see inside (.*)|what's inside (.*)/,
	  'editProject': /see inside|what's inside/,
	  'finishProject': /i'm done|i'm finished/,
	  'play': /scratch (.*)|scratch play (.*)|play (.*)/,
	  'playCurrentProject': /play (?:the)? ?project|start (?:the)? ?project|play c(?:the)? ?urrent project|test (?:the)? ?project/,
	  'return': /stop|i'm done|go back|quit|exit/,
	  'getCurrentProject': /get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project/,
	  'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
	  'getProjectCount': /how many projects do i have|how many projects have i made/
	}
}

ScratchRegex.getEditProjectTriggers = function() {
	return {
	  'newProject': /new project|create a? new project|create a? project|make a? new project|make a? project/,
	  'deleteProject': /delete (.*) project/,
	  'renameCurrentProject': /rename current project to (.*)/,
	  'renameProject': /change name of (.*) project to (.*)/,
	  'editExistingProject': /see inside (.*)|what's inside (.*)/,
	  'editProject': /see inside|what's inside/,
	  'finishProject': /i'm done|i'm finished/,
	  'play': /scratch (.*)|scratch play (.*)|play (.*)/,
	  'playCurrentProject': /play (?:the)? ?project|start (?:the)? ?project|play c(?:the)? ?urrent project|test (?:the)? ?project/,
	  'return': /stop|i'm done|go back|quit|exit/,
	  'getCurrentProject': /get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project/,
	  'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
	  'getProjectCount': /how many projects do i have|how many projects have i made/
	}
}

module.exports = ScratchRegex;

