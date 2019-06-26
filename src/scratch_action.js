/**
 * @fileoverview Define the various actions and their requirments.
 *
 * @author Tina Quach (quachtina96)
 */
const ActionImport = require('./action.js');
const Argument = ActionImport.Argument;
const Action = ActionImport.Action;
const Utils = require('./utils.js');

/**
 * Define the ScratchAction namespace.
 */
ScratchAction = {};

/**
 * Namespace for validators
 */
ScratchAction.Validator = {};

// Given a scratch state machine, validates the potential project name against
// existing projects and scratch commands.

ScratchAction.Validator.unconflictingProjectName = (ssm, projectName) => {
	// Should not already be an existing project
	if (ssm.pm.has(projectName)) {
		return false;
	}

	// Should not match existing UI commands (whether or not they start with Scratch)
	for (var triggerType in ssm.pm.triggers) {

		var args = Utils.matchRegex(projectName, ssm.pm.triggers[triggerType]);
		if (args && args.length > 0) {
			return false
		}

		var args = Utils.match(projectName, ssm.pm.triggers[triggerType]);
		if (args && args.length > 0) {
			return false
		}
	}

	// Should not already be a Scratch command
	const punctuationless = projectName.replace(/[',\/#!$%\^&\*;:{}=\-_`~()]/g,"");
	const instruction = punctuationless.replace(/\s{2,}/g," ");

	// Send request to ScratchNLP via websockets.
	var checkProjectName = () => {
		return wsp.sendRequest({
			'type': 'translation',
			'instruction': instruction
		}).then((result) => {
			console.log('RESULT OF SEND REQUEST IN SCRATCH ACTION');
	    	console.log(result.response);
			if (result.response != "I don't understand.") {
				// The project name maps to an existing scratch command
				return false;
			} else {
				return true;
			}
		});
	}

	// Websocket must be open before request is made.
	if (wsp.isClosed) {
		return wsp.open().then(checkProjectName)
	}
	return checkProjectName();
}

ScratchAction.Validator.existingProject = (ssm, projectName) => {
	// project must be in user's list of projects
	if (ssm.pm.has(projectName)) {
		return true;
	} else {
		return `I don't have a project called ${projectName}`
	}
}

ScratchAction.Validator.currentProjectDefined = (ssm) => {
	// project must be in user's list of projects
	if (ssm.pm.currentProject)
		return true
	else {
		return "You don't have a current project. create, open, or play a project to set a current project"
	}
};

ScratchAction.Validator.scratchCommand = (ssm, step) => {
	// Must be a project name OR a Scratch command
	if (ScratchAction.Validator.existingProject(ssm, step)) {
		return true;
	}
	var punctuationless = step.replace(/[',\/#!$%\^&\*;:{}=\-_`~()]/g,"");
	var step = punctuationless.replace(/\s{2,}/g," ");
	return ScratchInstruction.parse(step).then((result) => {
		if (!result) {
			return "That is not a Scratch command";
		} else {
			return true;
		}
	});
}

ScratchAction.Validator.currentProjectStepNumber = (ssm, number) => {
	if (Utils.checkBounds(number - 1, ssm.pm.currentProject.instructions)) {
		return true;
	} else {
		return `There is no step ${number}`;
	}
}

ScratchAction.allActions = () => {
	var actionItems = Object.entries(ScratchAction.General).concat(Object.entries(
			ScratchAction.Edit).concat(Object.entries(
				ScratchAction.Help).concat(Object.entries(
					ScratchAction.ListNavigator))));
	return actionItems.map((b) => b[1]);
}

ScratchAction.getAllTriggers = () => {
	return ScratchAction.getTriggers('Edit').concat(
			ScratchAction.getTriggers('General')).concat(
			ScratchAction.getTriggers('Interrupt')).concat(
			ScratchAction.getTriggers('Help').concat(
			ScratchAction.getTriggers('ListNavigator')));
}

/**
 * Return a list of trigger types belonging to the given category.
 */
ScratchAction.getTriggers = (category) => {
	return Object.keys(ScratchAction[category]);
}

/**
 * Return a list of trigger types belonging to the given category.
 */
ScratchAction.getTriggersFromCategories = (categoryList) => {
	if (categoryList.length < 1 || categoryList.constructor != Array) {
		return;
	}
	var result = ScratchAction.getTriggers(categoryList[0]);
	for (var i = 1; i < categoryList.length; i++) {
		result = result.concat(ScratchAction.getTriggers(categoryList[i]))
	}
	return result;
}

/**
 * Return a map of trigger types to their ScratchAction objects belonging to
 * the given category.
 */
ScratchAction.getTriggerMap = (category) => {
	var triggerMap = {}
	for (var triggerName in ScratchAction[category]) {
		triggerMap[triggerName] = ScratchAction[category][triggerName].trigger;
	}
	return triggerMap;
}

/**
 * Return a map of trigger types to their ScratchAction objects.
 */
ScratchAction.getGeneralTriggers = function() {
	var triggerMap = {}
	for (var triggerName in ScratchAction.General) {
		triggerMap[triggerName] = ScratchAction.General[triggerName].trigger;
	}
	return triggerMap;
}

/**
 * Namespace for Interrupt commands
 */
ScratchAction.Interrupt = {};

ScratchAction.Interrupt.cancel = {
	"name": "cancel",
	"trigger": /cancel/,
	"idealTrigger": "cancel",
	"description": "stop an action that you were in the middle of",
};

/**
 * Namespace for general commands
 */
ScratchAction.General = {};

//queryState
ScratchAction.General.queryState = {
	"name": "queryState",
	"trigger": /what state am i in|where am i/,
	"idealTrigger": "what state am i in",
	"description": "figure out what state you are in",
	"question": true
};

//createAnewProjectCalled
ScratchAction.General.createANewProjectCalled = {
	"name": "createANewProjectCalled",
	"trigger":/(?:new project|create a? new project|create a? project|make a? new project|make a? project)(?: called (.*))/,
	"idealTrigger": "new project called",
	"description":"create a new project with a name",
	"arguments":[{
		name: 'project name',
		validator: (ssm, projectName) => {
			// project must be in user's list of projects
			if (ssm.pm.has(projectName)) {
				return 'A project called that already exists'
			} else {
				return true;
			}
		},
		description: 'name of the project to create'
	}]
};

//createAnewProject
ScratchAction.General.createANewProject = {
	"name": "createANewProject",
	"trigger":/new project|create a? new project|create a? project|make a? new project|make a? project/,
	"idealTrigger": "new project",
	"description":"create a new project",
};

//deleteProject
ScratchAction.General.deleteProject = {
	"name": "deleteProject",
	"trigger":/delete (?:the)? ?(.*) project/,
	"idealTrigger":"delete the BLANK project",
	"description":"delete a project",
	"arguments":[{
			name: 'project name',
			validator: (ssm, projectName) => {
				// project must be in user's list of projects
				if (ssm.pm.has(projectName)) {
					return true;
				} else {
					return `I don't have a project called ${projectName}`;
				}
			},
			description: 'name of the project to delete'
		}
	]
};

//renameCurrentProject
ScratchAction.General.renameCurrentProject = {
	"name": "renameCurrentProject",
	"trigger":/call this project (.*)/,
	"idealTrigger":"call this project NEW_NAME",
	"description":"rename the current project ",
	"arguments": [{
			name:'newName',
			validator: ScratchAction.Validator.unconflictingProjectName,
			description: 'new name'
		}
	]
};

//renameProject
ScratchAction.General.renameProject = {
	"name": "renameProject",
	"trigger":/rename project| rename (?:a|the) project|change (?:the)? ?name of (?:the)? ?(.*) project to (.*)|rename (?:the)? ?(.*) (?:project)? ?to (?:be)? ?(.*)|call (?:the)? ?(.*) project (.*) instead/,
	"idealTrigger":"call the OLD_NAME project NEW_NAME instead",
	"description":"change the name of one of your projects",
	"arguments": [
		{
			name: 'oldName',
			validator: ScratchAction.Validator.existingProject,
			description: 'project to rename'
		},
		{
			name: 'newName',
			validator: ScratchAction.Validator.unconflictingProjectName,
			description: 'new project name'
		}
	]
};

//editExistingProject
ScratchAction.General.editExistingProject = {
	"name":'editExistingProject',
	"trigger":/since i said (.*)|see inside (.*)|the inside (.*)|what's inside (.*)|open (?:project)? ?(.*)/,
	"idealTrigger":"what's inside alarm",
	"description":"check out what the alarm project is made of",
	"arguments":[
		{
				name: 'project name',
				validator: ScratchAction.Validator.existingProject,
				description: 'project to explore'
		}
	]
};

//editProject
ScratchAction.General.editProject = {
	"name":'editProject',
	"trigger":/edit ?:(the)? project|see inside|what's inside|open project|since i said|what inside the project|what is inside/,
	"idealTrigger":"what's inside",
	"description":"edit the current project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

//finishProject
ScratchAction.General.finishProject = {
	"name":"finishProject",
	"trigger":/those are all the steps|exit project|leave project|no next steps|no more steps|i'm done|i'm finished|(?:close|leave) (?:the)? ?project|end project|finish project/,
	"idealTrigger":"i'm done",
	"description":"leave the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

//playCurrentProject
ScratchAction.General.playCurrentProject = {
	"name":"playCurrentProject",
	"trigger":/play (?:the)? ?(?:current)? ?project|start (?:the)? ?(?:current)? ?project|test (?:the)? ?(?:current)? ?project/,
	"idealTrigger":"play project",
	"description":"play the current project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

//play
ScratchAction.General.play = {
	"name":"play",
	"trigger":/^play (.*)/,
	"idealTrigger":"give me a compliment",
	"description":"play a project made by tina called give me a compliment.",
	"arguments": [
		{
			name: 'project to play',
			validator: ScratchAction.Validator.existingProject,
			description: 'name of the project to play'
		},
	]
};

//return
ScratchAction.General.return = {
	"name":"return",
	"trigger":/go back$|nevermind$|nevermind/,
	"idealTrigger":"go back",
	"description":"go back to the last state you were in",
};

//return
ScratchAction.General.goHome = {
	"name":"goHome",
	"trigger":/go home|quit$|exit$/,
	"idealTrigger":"go home",
	"description":"go back to the home state",
};

//getCurrentProject
ScratchAction.General.getCurrentProject = {
	"name":"getCurrentProject",
	"trigger":/get (?:the)? ?current project|what project am i on|what's the current project|what is the current project|what's my current project|what is my current project|what is this project ?(?:called)?/,
	"idealTrigger":"what project am i on",
	"description":"find out what project you are on",
	"question": true
};

//getNthProject
ScratchAction.General.getNthProject = {
	"name":"getNthProject",
	"trigger":/((?:what is|what's)) project (?:number)? ?(.*)/,
	"idealTrigger":"what's project number one'",
	"description":"get the first project",
	"arguments":[{
			name: 'project number',
			validator: (ssm, projectNumber) => {
				return projectNumber <= ssm.pm.projects.length_ && 0 < projectNumber
			},
			description: 'project number'
		}],
	"question": true
};

//getProjectNames
ScratchAction.General.getProjectNames = {
	"name":"getProjectNames",
	"trigger":/do you have any (?:other)? ?projects|what (?:other)? ?projects are there|what (?:other)? ?(?:projects|project) do (?:i|you) have|what have i made so far|what are (?:my|the) (?:other)? ?projects called|what are (?:the names of)? ?my (?:other)? ?projects/,
	"idealTrigger":"what projects do i have",
	"description":"hear a list of all the projects",
	"question": true
};

//getProjectCount
ScratchAction.General.getProjectCount = {
	"name": "getProjectCount",
	"trigger":/how many projects do i have|how many projects have i made/,
	"idealTrigger":"how many projects do i have'",
	"description":"hear how many projects there are",
	"question": true
};

//stopBackground
ScratchAction.General.stopBackground = {
	"name": "stopBackground",
	"trigger":/^stop (?:the)? ?(?:background)? ?(?:music|sounds)$/,
	"idealTrigger":"stop the background music",
	"description":"stop the background music",
};

//stopCues
ScratchAction.General.stopCues = {
	"name": "stopCues",
	"trigger":/^stop (?:the)? ?audio cues$/,
	"idealTrigger":"stop audio cues",
	"description":"stop the audio cues",
};

//stopProject
ScratchAction.General.stopProject = {
	"name": "stopProject",
	"trigger":/^stop$|stop playing|stop playing (?:the)? ?project|stop (?:the)? ?project/,
	"idealTrigger":"stop",
	"description":"stop playing a project"
};

//startBackground
ScratchAction.General.startBackground = {
	"name": "startBackground",
	"trigger":/^(?:start|give me|turn on) the (?:background)? ?(?:music|sounds|sound)$/,
	"idealTrigger":"start background music",
	"description":"start the background music",
};

//startCues
ScratchAction.General.startCues = {
	"name": "startCues",
	"trigger":/^(?:start|give me|turn on) (?:the)? ?audio cues$/,
	"idealTrigger":"start audio cues",
	"description":"start the audio cues",
};

//holdOn
ScratchAction.General.holdOn = {
	"name": "holdOn",
	"trigger":/^hold on|stop listening$/,
	"idealTrigger":"hold on",
	"description":"make me ignore you until you say 'listen'",
};

//listen
ScratchAction.General.listen = {
	"name": "listen",
	"trigger":/^listen$|^i'm ready$|^start listening$/,
	"idealTrigger":"listen",
	"description":"get me to start listening until you say 'hold on'",
};

//getSounds
ScratchAction.General.getSounds = {
	"name": "getSounds",
	"trigger":/^what sounds (?:are there|do you (?:know|have))|what (?:other)? ?sounds do you (?:know|have)|more sounds|other sounds$/,
	"idealTrigger":"what sounds are there",
	"description":"discover what sounds there are",
	"question": true
};

//checkSound
ScratchAction.General.checkSound = {
	"name": "checkSound",
	"trigger":/^do you (?:have|know) (?:a|an|the|this|any) (.*) sound/,
	"idealTrigger":"do you have a boing sound?",
	"description":"check if there's a boing sound",
	"arguments": [
		{
			name: 'sound name',
			description: 'name of the sound you want to hear'
		}
	],
	"question": true
};

//queryActions
ScratchAction.General.queryActions = {
	"name":"queryActions",
	"trigger":/what can i do|what do i do|help|what should i do/,
	"idealTrigger":"what can i do",
	"description":"get a suggestion for what to try next",
	"question": true

};

//queryActionTypes
ScratchAction.General.queryActionTypes = {
	"name":"queryActionTypes",
	"trigger":/what are the kinds of things i can do|inspire me/,
	"idealTrigger":"what kinds of things can i do",
	"description":"explore different kinds of actions",
	"question": true
};

ScratchAction.General.recordASound = {
	"name":"recordASound",
	"trigger": /start ?a? recording|start recording me|(?:make|record) (?:a|the) sound|make a recording|record (?:a|the) (.*) sound|record (?:a|the) sound called (.*)|(?:start|make) ?a? (?:new)? (?:sound|recording) called (.*)|start recording ?a? ?(?:new)? sound called (.*)/,
	"idealTrigger": "record a sound called soundName",
	"description": "start recording a sound to use in projects",
	"arguments": [
		{
			name: 'sound name',
			description: 'name of the sound'
		}
	],
};

ScratchAction.General.stopRecording = {
	"name":"stopRecording",
	"trigger": /(?:end|stop) recording|stop recording me/,
	"idealTrigger": "stop recording",
	"description": "end the recording of a sound to use in projects"
};

ScratchAction.General.getRecordings = {
	"name":"getRecordings",
	"trigger":/what recordings do you have|what recordings do i have|list ?(?:all|the)? recordings|get ?(?:all|the)? recordings|^what recordings (?:are there|do you (?:know|have))|what (?:other)? ?recordings do you (?:know|have)|list all the recordings ?(?:that)? ?(?:i've made)$/,
	"idealTrigger": "list recordings",
	"description": "hear me list all the recordings"
};

ScratchAction.General.playARecording = {
	"name":"playARecording",
	"trigger":/hear ?(?:a|the)? ?(.*)? recording|what's ?(?:a|the)? ?(.*)? recording/,
	"idealTrigger": "hear recording",
	"description": "hear the last recording",
	"arguments": [
		{
			name: 'recording name',
			description: 'recording'
		}
	],
};

ScratchAction.General.renameRecording = {
	"name":"renameRecording",
	"trigger": /rename recording/,
	"idealTrigger": "rename recording",
	"description": "rename recording",
	"arguments": [
		{
			name: 'recording to rename',
			description: 'recording'
		},
		{
			name: 'new name',
			description: 'recording'
		}
	],
};

/**
 * ListNavigator namespace for Scratch Actions
 */
ScratchAction.ListNavigator = {};

ScratchAction.ListNavigator.finishNavigatingList = {
	"name":"finishNavigatingList",
	"trigger": /exit list/,
	"idealTrigger": "go back",
	"description": "to finish navigating the list and return to previous state",
};

ScratchAction.ListNavigator.getNextPart = {
	"name":"getNextPart",
	"trigger": /more|other|next/, // what are others, are there others, what's next, what is next, do you have more, give me more, show me more, tell me more -- these might even have arguments passed into them
	"idealTrigger": "next",
	"description": "to get the next part of the list",
};

ScratchAction.ListNavigator.getPreviousPart = {
	"name":"getPreviousPart",
	"trigger":  /previous|before/,
	"idealTrigger": "go back",
	"description": "to get the previous part of the list",
};

//////// EDIT PROJECT COMMANDS
/**
 * Edit command namespace
 */
ScratchAction.Edit = {};

//getStepCount
ScratchAction.Edit.getStepCount = {
	"name":"getStepCount",
	"trigger":/how many steps ?(?:are there)?/,
	"idealTrigger":"how many steps are there",
	"description":"get the number of steps in the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined,
	"question": true
};

//getAllSteps
ScratchAction.Edit.getAllSteps = {
	"name":"getAllSteps",
	"trigger":/what steps are there|what are (?:all)? ?the steps|what does (?:my|the)? ?project do right now/,
	"idealTrigger":"what are all the steps",
	"description":"hear me say all the steps in the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined,
	"question": true
};

//getCurrentStep
ScratchAction.Edit.getCurrentStep = {
	"name":"getCurrentStep",
	"trigger":/what (?:step|steps|stop|stops|stuff|step) am i on|what’s my current (?:step|steps|stop|stops|stuff|step)|what (?:step|steps|stop|stops|stuff|step) is this/,
	"idealTrigger":"what step am i on",
	"description":"get the number and description of the current step",
	"contextValidator": ScratchAction.Validator.currentProjectDefined,
	"question": true
};

//goToStep
ScratchAction.Edit.goToStep = {
	"name":"goToStep",
	"trigger":/^step (?:number)? ?(.*)|go to (?:step|steps|stop|stops|stuff|step) (.*)|what's (?:step|steps|stop|stops|stuff|step) (.*)|what (?:is)? ?(?:step|steps|stop|stops|stuff|step) (.*)/,
	"idealTrigger":"go to step number 2",
	"description":"jump to and hear step number 2 of the project",
	"arguments": [
		{
			'name': 'step number',
			'validator': ScratchAction.Validator.currentProjectStepNumber,
			'description': 'name step to go to'
		}
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined,

};

//nextStep
ScratchAction.Edit.nextStep = {
	"name":"nextStep",
	"trigger":/go to next (?:step|steps|stop|stops|stuff|step)|next (?:step|steps|stop|stops|stuff|step)|what's next|next/,
	"idealTrigger":"next step",
	"description":"go to the next step",
	"contextValidator": ScratchAction.Validator.currentProjectDefined,
	"question": true
};

//previousStep
ScratchAction.Edit.previousStep = {
	"name":"previousStep",
	"trigger":/previous (?:step|steps|stop|stops|stuff|step)|go back a (?:step|steps|stop|stops|stuff|step)/,
	"idealTrigger":"previous step",
	"description":"go to the step before",
	"contextValidator": ScratchAction.Validator.currentProjectDefined,
	"question": true
};

//playStep
ScratchAction.Edit.playStep = {
	"name":"playStep",
	"trigger":/^play (?:step|steps|stop|stops|stuff|step)$|^play (?:the)? ?current (?:step|steps|stop|stops|stuff|step)$|^what does it do$|^try it$|^test it$|/,
	"idealTrigger":"try it",
	"description":"play the current step",
	"arguments": [],
	"contextValidator": ScratchAction.Validator.currentProjectDefined,
};

//appendStep
ScratchAction.Edit.appendStep = {
	"name":"appendStep",
	"trigger":/append (?:a)? ?step|^a stop$|add (?:a|another)? ?step|add (?:the (?:step|steps|stop|stops|stuff|step))? ?(.*)|^next (.*)|(.*) next$|^at the end (.*)|(.*) at the end$|^after (?:all)? ?that (.*)|(.*) after (?:all)? ?that$/,
	"idealTrigger":"next, play the chomp sound",
	"description":"to add a new instruction, 'play the chomp sound', to the end of the project",
	"arguments": [{
		'name': 'instruction',
		'validator': ScratchAction.Validator.scratchCommand,
		'description':'instruction you want to add to the end of the project'
	}],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

};

//insertStepBefore
ScratchAction.Edit.insertStepBefore = {
	"name":"insertStepBefore",
	"trigger":/(?:insert)? ?(.*) before (?:step|steps|stop|stops|stuff|step) (?:number)? ?(.*)/,
	// TODO: what are other commands that would be good to try to insert.
	// could we design these commands to be more exciting.
	"idealTrigger":"insert 'play the bark sound' before step number '1'",
	"description":"insert a new command before step number 1",
	"arguments": [
		{
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'instruction to insert'
		},
		{
			name: 'step number',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'step number to insert before'
		}
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

//insertStepAfter
ScratchAction.Edit.insertStepAfter = {
	"name":"insertStepAfter",
	"trigger":/(?:insert)? ?(.*) after (?:step|steps|stop|stops|stuff|step|at) (?:number)? ?(.*)/,
	// TODO: there is so much potential to make these triggers and descriptions
	// contextual based on the current step.
	"idealTrigger":"insert 'play the meow sound' after step number '1'",
	"description":"insert a new command after step number 1",
	"arguments": [
		{
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'instruction to insert'
		},
		{
			name: 'step number',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'step number to insert after'
		}
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

ScratchAction.Edit.afterInsertStep = {
	"name":"afterInsertStep",
	"trigger":/after (?:step|steps|stop|stops|stuff|step|at) (?:number)? ?(.*?) (?:insert)? ?(.*)/,
	// TODO: there is so much potential to make these triggers and descriptions
	// contextual based on the current step.
	"idealTrigger":"after step number '1' insert 'play the meow sound'",
	"description":"insert a new command after step number 1",
	"arguments": [
		{
			name: 'step number',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'step number to insert after'
		},
		{
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'instruction to insert'
		}
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

ScratchAction.Edit.beforeInsertStep = {
	"name": "beforeInsertStep",
	"trigger":/before (?:step|steps|stop|stops|stuff|step|at) (?:number)? ?(.*?) (?:insert)? ?(.*)/,
	// TODO: what are other commands that would be good to try to insert.
	// could we design these commands to be more exciting.
	"idealTrigger":"before step number '1'insert 'play the bark sound'",
	"description":"insert a new command before step number 1",
	"arguments": [
		{
			name: 'step number',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'step number to insert before'
		},
		{
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'instruction to insert'
		}
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

//insertStep
ScratchAction.Edit.insertStep = {
	"name":"insertStep",
	"trigger":/insert (?:a)? ?(?:step|steps|stop|stops|stuff|step)/,
	// TODO: what are other commands that would be good to try to insert.
	// could we design these commands to be more exciting.
	"idealTrigger":"insert step",
	"description":"insert a new command",
	"arguments": [
		{
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'instruction to insert'
		},
		{
			'name': 'step number',
			'validator': ScratchAction.Validator.currentProjectStepNumber,
			'description': 'step number to insert next to'
		},
		{
			'name': 'direction',
			'validator': (ssm, direction) => {
				if(['before', 'after'].includes(direction)) {
					return true;
				} else {
					return 'the direction must be before or after'
				}
			},
			'description':'before or after'
		},
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};

//deleteStep
ScratchAction.Edit.deleteStep = {
	"name":"deleteStep",
	"trigger":/delete (?:step|steps|stop|stops|stuff|step|at) (?:number)? ?(.*)|delete ?(?:a)? (?:step|steps|stop|stops|stuff|step)/,
	"idealTrigger":"delete step 1",
	"description":"delete the first step",
	"arguments": [
	{
		'name': 'step number',
		'validator': ScratchAction.Validator.scratchCommand,
		'description':'number of the step to delete'
	}],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

};

//replaceStep
ScratchAction.Edit.replaceStep = {
	"name":"replaceStep",
	// Note: subtle bugs can occur based on the ordering of the possible phrases in the regular expression.
	// The system accepts the first match moving left to right.
	"trigger":/(?:replace|replaced) (?:step|steps|stop|stops|stuff|step at) (?:number)? ?(.*)|(?:replace|replaced) (?:step|steps|stop|stops|stuff|step at) (?:number)? ?(.*) with (.*)|replace (?:step|steps|stop|stops|stuff)|replace steps/,
	"idealTrigger":"replace step 1 with say hello",
	"description":"change step to say hello",
	"arguments": [
		{
			name: 'step number',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'number of the step to replace'
		},
		{
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'new instruction'
		}
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
};


/**
 * Namespace for Interrupt commands
 */
ScratchAction.Help = {};

ScratchAction.Help.cancel = {
	"name": "cancel",
	"trigger": /cancel/,
	"idealTrigger": "cancel",
	"description": "stop an action that you were in the middle of",
};


ScratchAction.Help.getKnownCommands = {
	"name":"getKnownCommands",
	"trigger": /what can you do|what do you know (?:how to do)/,
	"idealTrigger": "what can you do",
	"description": "hear what things I can do",
	"question": true
};

ScratchAction.Help.getScratchCommands = {
	"name":"getScratchCommands",
	"trigger":/what commands do you (?:know|have)|(?:tell me|what are) (?:the|some ?(?:of the)?) commands (?:that you know|you know)?|what (?:(?:kinds|kind) of)? ?commands (?:are there|do you know)|what are the command categories|what (?:(?:kind|kinds) of)? ?categories (?:are there|do you (?:have|know))/,
	"idealTrigger":"what commands are there",
	"description":"learn about what commands you can use in your projects",
	"question": true
};

// Help users understand what Scratch thought they said.
ScratchAction.Help.getWhatISaid = {
	"name":"getWhatISaid",
	"trigger":/what did i say|what did you hear|what did I (?:just)? ?say|what did you think i (?:just)? ?said|can you tell me what you thought I (?:just)? ?said|can you tell me what I (?:just)? ?said/,
	"idealTrigger":"what did you hear me say",
	"description":"hear what I thought you said",
	"question": true
};

// Help users remember what Scratch said (if they didn't catch it)
ScratchAction.Help.getWhatYouSaid = {
	"name":"getWhatYouSaid",
	"trigger":/what did you (?:just)? ?say|(?:could you)? ?repeat (?:that|yourself)|(?:can you)? ?repeat (?:that|yourself)|(?:can you)? ?repeat (?:that|yourself)|say that again|(?:can you)? ?say what you (?:just)? ?said ?(?:again)?|tell me what you (?:just)? ?said/,
	"idealTrigger":"say that again",
	"description":"get me to repeat what you just said",
	"question": true
};


ScratchAction.General.greet = {
	"name":"greet",
	"trigger":/^hello$|^what's up$|^hey$|^hi$|^yo$|^sup$/,
	"idealTrigger":"hi",
	"description":"greet me",
};

// ScratchAction.Project.
			// "respond to certain events", "play a sound", "repeat actions",
	 //    "if statements", "do basic math", "get random numbers",
	 //    "say words out loud in different accents and in different voices",
	 //    "listen for words", "make and modify lists and variables", "control a timer."

// TODO: Investigate + implement ScratchAction.General.search for searching
// assets, code, commands, categories, whatever.

module.exports = ScratchAction;