/**
 * @fileoverview Define the various actions and their requirments.
 *
 * @author Tina Quach (quachtina96)
 */
const ActionImport = require('./action.js');
const Argument = ActionImport.Argument;
const Action = ActionImport.Action;
const ScratchRegex = require('./triggers.js');
const Utils = require('./utils.js');
const soundLibraryContent = require('./sounds.js');

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
  const punctuationless = projectName.replace(/['.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  const instruction = punctuationless.replace(/\s{2,}/g," ");
  const urlSuffix = "translate/" + instruction;
  const method = "get";
  return Utils.requestScratchNLP(urlSuffix, method).then((result) => {
    if (result != "I don't understand.") {
      // The project name maps to an existing scratch command
      return false;
    } else {
    	return true;
    }
  })
}

ScratchAction.Validator.existingProject = (ssm, projectName) => {
  // project must be in user's list of projects
  return ssm.pm.has(projectName);
}

ScratchAction.Validator.currentProjectDefined = (ssm) => {
  // project must be in user's list of projects
  if (ssm.pm.currentProject)
  	return true;
}

ScratchAction.Validator.scratchCommand = (ssm, step) => {
	// Must be a project name OR a Scratch command
	if (ScratchAction.Validator.existingProject(ssm, step)) {
		return true;
	}
  var punctuationless = step.replace(/['.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  var step = punctuationless.replace(/\s{2,}/g," ");
  return ScratchInstruction.parse(step).then((result) => {
  	if (!result) {
  		return false;
  	} else {
  		return true;
  	}
  });
}

ScratchAction.Validator.currentProjectStepNumber = (ssm, number) => {
	return Utils.checkBounds(number - 1, ssm.pm.currentProject.instructions)
}

/**
 * Namespace for general commands
 */
ScratchAction.General = {};

ScratchAction.General.getTriggers = function() {
	var triggerMap = {}
	for (var triggerName in ScratchAction.General) {
		triggerMap[triggerName] = ScratchAction.General[triggerName].trigger;
	}
	return Object.keys(ScratchAction.General).map((triggerName) => ScratchAction.General[triggerName].trigger);
}

//queryState
ScratchAction.General.queryState = new Action({
	"trigger": /what state am i in| here am i/,
	"idealTrigger": "what state am i in",
	"description": "figure out what state you are in",
});

//newProject
ScratchAction.General.newProject = new Action({
	"trigger":/new project|create a? new project|create a? project|make a? new project|make a? project/,
	"idealTrigger": "new project",
	"description":"create a new project",
});

//deleteProject
ScratchAction.General.deleteProject = new Action({
	"trigger":/delete (?:the)? ?(.*) project/,
	"idealTrigger":"delete the BLANK project",
	"description":"delete a project",
	"arguments":[new Argument({
			name: 'projectName',
			validator: (ssm, projectName) => {
				// project must be in user's list of projects
				return ssm.pm.has(projectName);
			},
			description: 'name of the project to delete'
		})
	]
});

//renameCurrentProject
ScratchAction.General.renameCurrentProject = new Action({
	"trigger":/call this project (.*)/,
	"idealTrigger":"call this project NEW_NAME",
	"description":"rename the current project ",
	"arguments": [new Argument({
			name:'newName',
			validator: ScratchAction.Validator.unconflictingProjectName,
			description: 'the new name'
		})
	]
});

//renameProject
ScratchAction.General.renameProject = new Action({
	"trigger":/change (?:the)? ?name of (?:the)? ?(.*) project to (.*)|rename (?:the)? ?(.*) (?:project)? ?to (?:be)? ?(.*)|call (?:the)? ?(.*) project (.*) instead/,
	"idealTrigger":"call the OLD_NAME project NEW_NAME instead",
	"description":"change the name of one of your projects",
	"arguments": [
		new Argument({
			name: 'oldName',
			validator: ScratchAction.Validator.existingProject,
			description: 'project to rename'
		}),
		new Argument({
			name: 'newName',
			validator: ScratchAction.Validator.unconflictingProjectName,
			description: 'new project name'
		})
	]
});

//editExistingProject
ScratchAction.General.editExistingProject = new Action({
	"trigger":/since i said (.*)|see inside (.*)|the inside (.*)|what's inside (.*)|open project (.*)/,
	"idealTrigger":"what's inside alarm",
	"description":"check out what the alarm project is made of",
	"arguments":[
		new Argument({
				name: 'projectName',
				validator: (ssm, projectName) => {
					// project must be in user's list of projects
					return ssm.pm.has(projectName);
				},
				description: 'project to explore'
		})
	]
});

//editProject
ScratchAction.General.editProject = new Action({
	"trigger":/see inside|what's inside|open project|since i said|what inside the project|what is inside/,
	"idealTrigger":"what's inside",
	"description":"edit the current project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

//finishProject
ScratchAction.General.finishProject = new Action({
	"trigger":/i'm done|i'm finished|(?:close|leave) (?:the)? ?project|that's it/,
	"idealTrigger":"i'm done",
	"description":"leave the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

//playCurrentProject
ScratchAction.General.playCurrentProject = new Action({
	"trigger":/play (?:the)? ?(?:current)? ?project|start (?:the)? ?(?:current)? ?project|test (?:the)? ?(?:current)? ?project/,
	"idealTrigger":"play project",
	"description":"play the current project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

//play
ScratchAction.General.play = new Action({
	"trigger":/^play (.*)/,
	"idealTrigger":"give me a compliment",
	"description":"play a project made by tina called give me a compliment.",
	"arguments": [
		new Argument({
			name: 'projectToPlay',
			validator: ScratchAction.Validator.existingProject,
			description: 'name of the project to play'
		}),
	]
});

//return
ScratchAction.General.return = new Action({
	"trigger":/go back$|quit$|exit$|cancel$|nevermind$|nevermind/,
	"idealTrigger":"go back",
	"description":"go back to the last state you were in",
});

//getCurrentProject
ScratchAction.General.getCurrentProject = new Action({
	"trigger":/get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project|what is this project ?(?:called)?/,
	"idealTrigger":"what project am i on",
	"description":"find out what project you are on",
});

//getNthProject
ScratchAction.General.getNthProject = new Action({
	"trigger":/((?:what is|what's)) project (?:number)? ?(.*)/,
	"idealTrigger":"what's project number one'",
	"description":"get the first project",
	"arguments":[new Argument({
			name: 'projectNumber',
			validator: (ssm, projectNumber) => {
				return projectNumber <= ssm.pm.projects.length_ && 0 < projectNumber
			},
			description: 'the project number'
		})]
});

//getProjectNames
ScratchAction.General.getProjectNames = new Action({
	"trigger":/what (?:projects|project) do i have|what have i made so far|what are my projects called|what are the names of my projects/,
	"idealTrigger":"what projects do i have",
	"description":"hear a list of all the projects",
});

//getProjectCount
ScratchAction.General.getProjectCount = new Action({
	"trigger":/how many projects do i have|how many projects have i made/,
	"idealTrigger":"how many projects do i have'",
	"description":"hear how many projects there are",
});

//stopBackground
ScratchAction.General.stopBackground = new Action({
	"trigger":/^stop (?:the)? ?(?:background)? ?(?:music|sounds)$/,
	"idealTrigger":"stop the background music",
	"description":"stop the background music",
});

//stopCues
ScratchAction.General.stopCues = new Action({
	"trigger":/^stop (?:the)? ?audio cues$/,
	"idealTrigger":"stop audio cues",
	"description":"stop the audio cues",
});

//stopProject
ScratchAction.General.stopProject = newAction({
	"trigger":/stop playing|stop playing (?:the)? ?project|stop (?:the)? ?project/,
	"idealTrigger":"stop",
	"description":"stop playing a project"
});

//stopTalking
ScratchAction.General.stopTalking = newAction({
	"trigger":/stop talking playing|stop playing (?:the)? ?project|stop (?:the)? ?project/,
	"idealTrigger":"stop the project",
	"description":"skip what Scratch is saying"
});

//stop
ScratchAction.General.stop = newAction({
	"trigger":/^stop$/,
	"idealTrigger":"stop",
	"description":"get scratch to stop talking or playing a project"
});

//startBackground
ScratchAction.General.startBackground = new Action({
	"trigger":/^(?:start|give me|turn on) the (?:background)? ?(?:music|sounds|sound)$/,
	"idealTrigger":"start background music",
	"description":"start the background music",
});

//startCues
ScratchAction.General.startCues = new Action({
	"trigger":/^(?:start|give me|turn on) (?:the)? ?audio cues$/,
	"idealTrigger":"start audio cues",
	"description":"start the audio cues",
});

//holdOn
ScratchAction.General.holdOn = new Action({
	"trigger":/^hold on|stop listening$/,
	"idealTrigger":"hold on",
	"description":"make me ignore you until you say 'listen'",
});

//listen
ScratchAction.General.listen = new Action({
	"trigger":/^listen$|^i'm ready$/,
	"idealTrigger":"listen",
	"description":"get me to start listening until you say 'hold on'",
});

//getSounds
ScratchAction.General.getSounds = new Action({
	"trigger":/^what sounds are there|what (?:other)? ?sounds do you have|more sounds|other sounds$/,
	"idealTrigger":"what sounds are there",
	"description":"discover what sounds there are",
});

//checkSound
ScratchAction.General.checkSound = new Action({
	"trigger":/^do you have (?:a|the|this) (.*) sound?$/,
	"idealTrigger":"do you have a boing sound?",
	"description":"check if there's a boing sound",
	"arguments": [
		new Argument({
			name: 'soundName',
			validator: (ssm, soundName) => {
				return ssm.pm.soundLibrary.has(soundName);
			},
			description: 'the name of the sound you want to hear'
		})
	]
});

//queryActions
ScratchAction.General.queryActions = new Action({
	"trigger":/^what can i do|^what do i do/,
	"idealTrigger":"what can i do",
	"description":"get a suggestion for what to try next",
});

//queryActionTypes
ScratchAction.General.queryActionTypes = new Action({
	"trigger":/^what are the kinds of things i can do|^inspire me/,
	"idealTrigger":"what kinds of things can i do",
	"description":"explore different kinds of actions",
});

//////// EDIT PROJECT COMMANDS
/**
 * Edit command namespace
 */
ScratchAction.Edit = {};

//getStepCount
ScratchAction.Edit.getStepCount = new Action({
	"trigger":/how many steps ?(?:are there)?/,
	"idealTrigger":"how many steps are there",
	"description":"get the number of steps in the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//getAllSteps
ScratchAction.Edit.getAllSteps = new Action({
	"trigger":/what are all the steps|what does (?:my|the)? ?project do right now/,
	"idealTrigger":"what are all the steps",
	"description":"hear me say all the steps in the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//getCurrentStep
ScratchAction.Edit.getCurrentStep = new Action({
	"trigger":/what (?:step|steps|stop|stops|stuff|step) am i on|what’s my current (?:step|steps|stop|stops|stuff|step)|what (?:step|steps|stop|stops|stuff|step) is this/,
	"idealTrigger":"what step am i on",
	"description":"get the number and description of the current step",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

//goToStep
ScratchAction.Edit.goToStep = new Action({
	"trigger":/go to (?:step|steps|stop|stops|stuff|step) (.*)|what's (?:step|steps|stop|stops|stuff|step) (.*)|what is (?:step|steps|stop|stops|stuff|step) (.*)/,
	"idealTrigger":"go to step number 2",
	"description":"jump to and hear step number 2 of the project",
	"arguments": [
		new Argument({
			name: 'stepNumber',
			// skip the validator, because _describeCurrentStep already does validation.
			description: 'the name step to go to'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//nextStep
ScratchAction.Edit.nextStep = new Action({
	"trigger":/go to next (?:step|steps|stop|stops|stuff|step)|next (?:step|steps|stop|stops|stuff|step)|what's next|next/,
	"idealTrigger":"next step",
	"description":"go to the next step",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//previousStep
ScratchAction.Edit.previousStep = new Action({
	"trigger":/previous (?:step|steps|stop|stops|stuff|step)|go back a (?:step|steps|stop|stops|stuff|step)/,
	"idealTrigger":"previous step",
	"description":"go to the step before",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//playStep
ScratchAction.Edit.playStep = new Action({
	"trigger":/^play (?:step|steps|stop|stops|stuff|step)$|^play (?:the)? ?current (?:step|steps|stop|stops|stuff|step)$|^what does it do$|^try it$/,
	"idealTrigger":"try it",
	"description":"play the current step",
	"arguments": [],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//appendStep
ScratchAction.Edit.appendStep = new Action({
	"trigger":/add (?:the (?:step|steps|stop|stops|stuff|step))? ?(.*)|next (.*)|at the end (.*)|(.*) at the end|after all that (.*)|(.*) after all that/,
	"idealTrigger":"next, play the chomp sound",
	"description":"to add a new instruction, 'play the chomp sound', to the end of the project",
	"arguments": [new Argument({
		'name': 'instruction',
		'validator': ScratchAction.Validator.scratchCommand,
		'description':'the instruction you want to add to the end of the project'
	})],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//insertStepBefore
ScratchAction.Edit.insertStepBefore = new Action({
	"trigger":/(?:insert)? ?(.*) before (?:step|steps|stop|stops|stuff|step) (.*)/,
	// TODO: what are other commands that would be good to try to insert.
	// could we design these commands to be more exciting.
	"idealTrigger":"insert 'play the bark sound' before step number '1'",
	"description":"insert a new command before step number 1",
	"arguments": [
		new Argument({
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'the instruction to insert'
		}),
		new Argument({
			name: 'stepNumber',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'the step to insert before'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//insertStepAfter
ScratchAction.Edit.insertStepAfter = new Action({
	"trigger":/(?:insert)? ?(.*) after (?:step|steps|stop|stops|stuff|step|at) (?:number) ?(.*)/,
	// TODO: there is so much potential to make these triggers and descriptions
	// contextual based on the current step.
	"idealTrigger":"insert 'play the meow sound' after step number '1'",
	"description":"insert a new command after step number 1",
	"arguments": [
		new Argument({
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'the instruction to insert'
		}),
		new Argument({
			name: 'stepNumber',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'the step to insert after'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//deleteStep
ScratchAction.Edit.deleteStep = new Action({
	"trigger":/delete (?:step|steps|stop|stops|stuff|step|at) (?:number) ?(.*)/,
	"idealTrigger":"delete step 1",
	"description":"delete the first step",
	"arguments": [
	new Argument({
		'name': 'stepNumber',
		'validator': ScratchAction.Validator.scratchCommand,
		'description':'the number of the step to delete'
	})],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//replaceStep
ScratchAction.Edit.replaceStep = new Action({
	"trigger":/(?:replace|replaced) (?:step|steps|stop|stops|stuff|step|at) (?:number) ?(.*) with (.*)/,
	"idealTrigger":"replace step 1 with say hello",
	"description":"change step to say hello",
	"arguments": [
		new Argument({
			name: 'stepNumber',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'the number of the step to replace'
		}),
		new Argument({
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'the new instruction'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

ScratchAction.Edit.getTriggers = () => {
	return Object.keys(ScratchAction.Edit);
}

module.exports = ScratchAction;