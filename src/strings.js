/**
 * This file consolidates various strings used by the system to parameterize
 * the system.
 * TODO: There are many instances where the string being created is not static.
 * 		 To deal with thie issue, I've made it so that these strings are actually
 * 		 functions that take in some input and return the appropriate string.
 * 		 Still, there exists the question:
 */

/**
 * ScratchVUIStrings namespace.
 */
ScratchVUIStrings = {};

ScratchVUIStrings.askForProjectName = function() {
	return "what do you want to call it?"
};

ScratchVUIStrings.confirmProjectName = function(name) {
	return "Okay. When you say, Scratch, " + name + ", I’ll play the project. What’s the first step?"
}

ScratchVUIStrings.confirmHeard = function(utterance) {
	return "I heard you say " + utterance
}

ScratchVUIStrings.rejectScratchCommand = function() {
	return "That doesn't match any Scratch commands."
}

ScratchVUIStrings.askForNextStep = function() {
	return "Okay, what’s the next step?"
};

ScratchVUIStrings.acceptFinishProject = function(projectName) {
	return "Cool, now you can say, Scratch, say " + projectName + ", to play the project."
};

ScratchVUIStrings.notifyPlayingProject = function() {
	return "playing project"
};

ScratchVUIStrings.notifyOpeningProject = function(projectName) {
	return "Opening project " + projectName + " for editing"
};

ScratchVUIStrings.donePlayingProject = function() {
	return "Done playing project"
};


module.exports = ScratchVUIStrings;

