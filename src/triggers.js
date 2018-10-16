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
	  'queryState': /what state am i in|where am i/,
	  'newProject': /new project|create a? new project|create a? project|make a? new project|make a? project/,
	  'deleteProject': /delete (?:the)? ?(.*) project/,
	  'renameCurrentProject': /rename current project to (.*)/,
	  'renameProject': /change (?:the)? ?name of (?:the)? ?(.*) project to (.*)|rename (?:the)? ?(.*) (?:project)? ?to (?:be)? ?(.*)|call (?:the)? ?(.*) project (.*) instead/,
	  'editExistingProject': /see inside (.*)|the inside (.*)|what's inside (.*)|inside|open project/,
	  'editProject': /see inside|what's inside/,
	  'finishProject': /i'm done|i'm finished|(?:close|leave) (?:the)? ?project|go back/,
	  'playCurrentProject': /play (?:the)? ?(?:current)? ?project|start (?:the)? ?(?:current)? ?project|test (?:the)? ?(?:current)? ?project/,
	  'play': /^play (.*)/,
	  'return': /stop|i'm done|go back|quit|exit/,
	  'getCurrentProject': /get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project/,
      'getNthProject': /((?:what is|what's)) project (?:number)? ?(.*)/,
	  'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
	  'getProjectCount': /how many projects do i have|how many projects have i made/
	}
}

ScratchRegex.getEditProjectTriggers = function() {
	return {
	getStepCount: /how many steps ?(?:are there)?/,
	getCurrentStep: /what step am i on|what’s my current step|what step is this/,
    goToStep: /go to step (.*)|what's step (.*)|what is step (.*)/,
    nextStep: /go to next step|next step|what's next/,
    previousStep: /previous step|go back a step/,
    playStep: /play step|play current step|what does it do/,
    //TODO: should there be a comma after next step"
    appendStep: /add (?:the step)? ?(.*)|next (.*)|at the end (.*)|(.*) at the end|next (.*)|after all that (.*)|(.*) after all that/,
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

ScratchRegex._allTriggers = function() {
    return Object.assign({}, ScratchRegex.getEditProjectTriggers(), ScratchRegex.getGeneralTriggers());
}

/**
 * Return whether or not the phrase matches any triggers denoted here.
 */
ScratchRegex.contains = function(phrase) {
	var allTriggers = ScratchRegex._allTriggers;
	for (triggerType in allTriggers) {
		if (Utils.matchRegex(utterance, allTriggers[triggerType]))
			return true;
	}
	return false;
}

module.exports = ScratchRegex;

