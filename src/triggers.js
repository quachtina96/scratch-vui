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
	  'editExistingProject': /since i said (.*)|see inside (.*)|the inside (.*)|what's inside (.*)|inside|open project/,
	  'editProject': /see inside|what's inside/,
	  'finishProject': /i'm done|i'm finished|(?:close|leave) (?:the)? ?project/,
	  'playCurrentProject': /play (?:the)? ?(?:current)? ?project|start (?:the)? ?(?:current)? ?project|test (?:the)? ?(?:current)? ?project/,
	  'play': /^play (.*)/,
	  'return': /stop$|go back$|quit$|exit$|cancel$|nevermind$/,
	  'getCurrentProject': /get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project/,
      'getNthProject': /((?:what is|what's)) project (?:number)? ?(.*)/,
	  'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
	  'getProjectCount': /how many projects do i have|how many projects have i made/,
	  'stopBackground': /^stop (?:the)? ?(?:background)? ?(?:music|sounds)$/,
	  'stopCues': /^stop (?:the)? ?audio cues$/,
	  'startBackground': /^(?:start|give me|turn on) the (?:background)? ?(?:music|sounds|sound)$/,
	  'startCues': /^(?:start|give me|turn on) (?:the)? ?audio cues$/,
	  'holdOn': /^hold on|stop listening$/,
	  'listen': /^listen$|^i'm ready$/,
	  'getSounds': /^what sounds are there|what sounds do you have$/,
	  'checkSound': /^do you have (?:a|the|this) (.*) sound?$/,
	  'queryActions': /^what can i do$/,
	  'queryActionTypes': /^what are the kinds of things i can do$/
	}
}

ScratchRegex.getEditProjectTriggers = function() {
	return {
	getStepCount: /how many steps ?(?:are there)?/,
	getAllSteps: /what are all the steps/,
	getCurrentStep: /what (?:step|steps|stop|stops|stuff|step) am i on|what’s my current (?:step|steps|stop|stops|stuff|step)|what (?:step|steps|stop|stops|stuff|step) is this/,
    goToStep: /go to (?:step|steps|stop|stops|stuff|step) (.*)|what's (?:step|steps|stop|stops|stuff|step) (.*)|what is (?:step|steps|stop|stops|stuff|step) (.*)/,
    nextStep: /go to next (?:step|steps|stop|stops|stuff|step)|next (?:step|steps|stop|stops|stuff|step)|what's next|next/,
    previousStep: /previous (?:step|steps|stop|stops|stuff|step)|go back a (?:step|steps|stop|stops|stuff|step)/,
    playStep: /^play (?:step|steps|stop|stops|stuff|step)$|^play current (?:step|steps|stop|stops|stuff|step)$|^what does it do$|^try it$/,
    //TODO: should there be a comma after next (?:step|steps|stop|stops|stuff|step)"
    appendStep: /add (?:the (?:step|steps|stop|stops|stuff|step))? ?(.*)|next (.*)|at the end (.*)|(.*) at the end|next (.*)|after all that (.*)|(.*) after all that/,
    insertStepBefore: /(?:insert)? ?(.*) before (?:step|steps|stop|stops|stuff|step) (.*)/,
    insertStepAfter: /(?:insert)? ?(.*) after (?:step|steps|stop|stops|stuff|step) (.*)/,
    deleteStep: /delete (?:step|steps|stop|stops|stuff|step) (.*)/,
    // TODO: distinguish between replacing everywhere and replacing in a
    // specific place.
    replaceStep: /(?:replace|replaced) (?:step|steps|stop|stops|stuff|step) (.*) with (.*)/,
    replaceSound: /(?:replace|replaced) the (.*) sound with the (.*) sound'/,
    // TODO: address potential complex behavior in line below.
    replaceInStep: /in (?:step|steps|stop|stops|stuff|step) (.*) replace (.*) with (.*)/,
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

