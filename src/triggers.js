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
	  'renameProject': /change name of (.*) project to (.*)|rename (.*) to (?:be)? ?(.*)/,
	  'editExistingProject': /see inside (.*)|what's inside (.*)/,
	  'editProject': /see inside|what's inside/,
	  'finishProject': /i'm done|i'm finished/,
	  'play': /scratch (.*)|scratch play (.*)|play (.*)/,
	  'playCurrentProject': /play (?:the)? ?project|start (?:the)? ?project|play (?:the)? ?current project|test (?:the)? ?project/,
	  'return': /stop|i'm done|go back|quit|exit/,
	  'getCurrentProject': /get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project/,
	  'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
	  'getProjectCount': /how many projects do i have|how many projects have i made/
	}
}

ScratchRegex.getEditProjectTriggers = function() {
	return {
	getCurrentStep: /what step am i on|what’s my current step|what step is this/,
    goToStep: /go to step (.*)|what's step (.*)|what is step (.*)/,
    nextStep: /go to next step|next step|what's next/,
    previousStep: /previous step|go back a step/,
    playStep: /play step|play current step|what does it do/,
    insertStepBefore: /insert (.*) before step (.*)|(.*) before step (.*)/,
    insertStepAfter: /insert (.*) after step (.*)|(.*) after step (.*)/,
    deleteStep: /delete step (.*)/,
    // TODO: distinguish between replacing everywhere and replacing in a
    // specific place.
    replaceStep: /replace step (.*) with (.*)/,
    replaceSound: /replace the (.*) sound with the (.*) sound'/,
    // TODO: address potential complex behavior in line below.
    replaceInStep: /in step (.*) replace (.*) with (.*)/,
    stopEditing: /stop|i\'m done|that\'s it'/
  }
}

module.exports = ScratchRegex;

