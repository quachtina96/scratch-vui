/**
 * @fileoverview Define the various actions and their requirments.
 *
 * @author Tina Quach (quachtina96)
 */
import { Argument, Action } from './action.js'
import { ScratchRegex } from './triggers.js'
import { Utils } from './utils.js'
import { soundLibraryContent } from './sop  undsp  .js'
/**
 * Define the ScratchAction namespace.
 */
var ScratchAction = {};

/**
 * Namespace for validators
 */
var ScratchAction.Validator = {};

// Given a scratch state machine, validates the potential project name against
// existing projects and scratch commands.

ScratchAction.Validator.unconflictingProjectName = (ssm, projectName) => {
  // Should not already be an existing project
  if ssm.pm.has(projectName) {
    return false;
  }

  // Should not match existing UI commands (whether or not they start with Scratch)
  for (var triggerType in ssm.pm.triggers) {

    var args = Utils.matchRegex(projectName, this.triggers[triggerType];
    if (args && args.length > 0) {
      return false
    }

    var args = Utils.match(projectName, this.triggers[triggerType];
    if (args && args.length > 0) {
      return false
    }
	}

  // Should not already be a Scratch command
  const punctuationless = instruction.replace(/['.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
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
  }
}

ScratchAction.Validator.currentProjectStepNumber = (ssm, number) => {
	return Utils.checkBounds(number - 1, ssm.pm.currentProject.instructions)
}

// Helper Utility to programmatically generate skeleton for the code below.
ScratchAction._generateSpecs = (triggers) => {
	general = getGeneralTriggers();
	list = [];
	for (var trigger in general) {
		console.log(general[trigger])
		list.push("//"+ trigger + '\nScratchAction.' + trigger + ' = Action(' +
				JSON.stringify({
					trigger: general[trigger].toString(),
					description: '',
					arguments: []
	}) + ');')
	}
	result = list.join('\n\n')
};


/**
 * Namespace for general commands
 */
ScratchAction.General = {}

ScratchAction.General.getTriggers() = {
	return Object.keys(ScratchAction.General);
}

//queryState
ScratchAction.General.queryState = Action({
	"trigger": /what state am i in|where am i/,
	"description": 'figure out what state you are in',
});

//newProject
ScratchAction.General.newProject = Action({
	"trigger":/new project|create a? new project|create a? project|make a? new project|make a? project/,
	"description":"create a new project",
	"arguments": []
});

//deleteProject
ScratchAction.General.deleteProject = Action({
	"trigger":/delete (?:the)? ?(.*) project/,
	"description":"delete a project",
	"arguments":[Argument({
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
ScratchAction.General.renameCurrentProject = Action({
	"trigger":/rename current project to (.*)/,
	"description":"rename the current project ",
	"arguments": [Argument({
			name:'newName',
			validator: ScratchAction.Validator.unconflictingProjectName,
			description: 'the new name'
		})
	]
});

//renameProject
ScratchAction.General.renameProject = Action({
	"trigger":/change (?:the)? ?name of (?:the)? ?(.*) project to (.*)|rename (?:the)? ?(.*) (?:project)? ?to (?:be)? ?(.*)|call (?:the)? ?(.*) project (.*) instead/,
	"description":"change the name of one of your projects",
	"arguments": [
		Argument({
			name: 'oldName',
			validator: ScratchAction.Validator.existingProject,
			description: 'project to rename'
		}),
		Argument({
			name: 'newName',
			validator: ScratchAction.Validator.unconflictingProjectName,
			description: 'new project name'
		})
	]
});

//editExistingProject
ScratchAction.General.editExistingProject = Action({
	"trigger":/since i said (.*)|see inside (.*)|the inside (.*)|what's inside (.*)|inside|open project/,
	"description":"check out the inside of the project",
	"arguments":[Argument({
			name: 'projectName',
			validator: (ssm, projectName) => {
				// project must be in user's list of projects
				return ssm.pm.has(projectName);
			},
			description: 'project to explore'
		})
});

//editProject
ScratchAction.General.editProject = Action({
	"trigger":/see inside|what's inside/,
	"description":"edit the current project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

//finishProject
ScratchAction.General.finishProject = Action({
	"trigger":/i'm done|i'm finished|(?:close|leave) (?:the)? ?project/,
	"description":"leave the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

//playCurrentProject
ScratchAction.General.playCurrentProject = Action({
	"trigger":/play (?:the)? ?(?:current)? ?project|start (?:the)? ?(?:current)? ?project|test (?:the)? ?(?:current)? ?project/,
	"description":"play the current project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

//play
ScratchAction.General.play = Action({
	"trigger":/^play (.*)/,
	"description":"play a project",
	"arguments": [
		Argument({
			name: 'projectToPlay',
			validator: ScratchAction.Validator.existingProject,
			description: 'name of the project to play'
		}),
	]
});

//return
ScratchAction.General.return = Action({
	"trigger":/stop$|go back$|quit$|exit$|cancel$|nevermind$/,
	"description":"go back to the last state you were in",
});

//getCurrentProject
ScratchAction.General.getCurrentProject = Action({
	"trigger":/get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project/,
	"description":"ask me what project you are on",
});

//getNthProject
ScratchAction.General.getNthProject = Action({
	"trigger":/((?:what is|what's)) project (?:number)? ?(.*)/,
	"description":"ask me for the name of project number 1, 2, etcetera",
	"arguments":[Argument({
			name: 'projectNumber',
			validator: (ssm, projectNumber) => {
				return projectNumber =< ssm.pm.projects.length && 0 < projectNumber
			},
			description: 'the project number'
		})
});

//getProjectNames
ScratchAction.General.getProjectNames = Action({
	"trigger":/what projects do i have|what have i made so far|what are my projects called/,
	"description":"say 'what projects do i have'",
});

//getProjectCount
ScratchAction.General.getProjectCount = Action({
	"trigger":/how many projects do i have|how many projects have i made/,
	"description":"say 'how many projects do i have'",
});

//stopBackground
ScratchAction.General.stopBackground = Action({
	"trigger":/^stop (?:the)? ?(?:background)? ?(?:music|sounds)$/,
	"description":"stop the background music",
});

//stopCues
ScratchAction.General.stopCues = Action({
	"trigger":/^stop (?:the)? ?audio cues$/,
	"description":"stop the audio cues",
});

//startBackground
ScratchAction.General.startBackground = Action({
	"trigger":/^(?:start|give me|turn on) the (?:background)? ?(?:music|sounds|sound)$/,
	"description":"start the background music",
});

//startCues
ScratchAction.General.startCues = Action({
	"trigger":/^(?:start|give me|turn on) (?:the)? ?audio cues$/,
	"description":"start the audio cues",
});

//holdOn
ScratchAction.General.holdOn = Action({
	"trigger":/^hold on|stop listening$/,
	"description":"say 'hold on' to make me ignore you until you say 'listen'",
});

//listen
ScratchAction.General.listen = Action({
	"trigger":/^listen$|^i'm ready$/,
	"description":"say 'listen' to get me to start listening until you say 'hold on'",
});

//getSounds
ScratchAction.General.getSounds = Action({
	"trigger":/^what sounds are there|what sounds do you have$/,
	"description":"ask me what sounds there are",
});

//checkSound
ScratchAction.General.checkSound = Action({
	"trigger":/^do you have (?:a|the|this) (.*) sound?$/,
	"description":"say 'do you have the boing sound?'",
	"arguments": [
		Argument({
			name: 'soundName',
			validator: (ssm, soundName) => {
				return ssm.pm.soundLibrary.has(soundName);
			},
			description: 'the name of the sound you want to hear'
		})
	]
});

//queryActions
ScratchAction.General.queryActions = Action({
	"trigger":/^what can i do$/,
	"description":"ask me what you can do",
});

//queryActionTypes
ScratchAction.General.queryActionTypes = Action({
	"trigger":/^what are the kinds of things i can do$/,
	"description":"ask me what kinds of things you can do",
});

//////// EDIT PROJECT COMMANDS
/**
 * Edit command namespace
 */
ScratchAction.Edit

//getStepCount
ScratchAction.Edit.getStepCount = Action({
	"trigger":/how many steps ?(?:are there)?/,
	"description":"say 'how many steps' to ask me how many steps are the in the project",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//getAllSteps
ScratchAction.Edit.getAllSteps = Action({
	"trigger":/what are all the steps/,
	"description":"ask me what all the steps are",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//getCurrentStep
ScratchAction.Edit.getCurrentStep = Action({
	"trigger":/what (?:step|steps|stop|stops|stuff|step) am i on|what’s my current (?:step|steps|stop|stops|stuff|step)|what (?:step|steps|stop|stops|stuff|step) is this/,
	"description":"say 'what step am i on' to get the number and description of the current step.",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//goToStep
ScratchAction.Edit.goToStep = Action({
	"trigger":/go to (?:step|steps|stop|stops|stuff|step) (.*)|what's (?:step|steps|stop|stops|stuff|step) (.*)|what is (?:step|steps|stop|stops|stuff|step) (.*)/,
	"description":"go to step number BLANK",
	"arguments": [
		Argument({
			name: 'stepNumber',
			// skip the validator, because _describeCurrentStep already does validation.
			description: 'the name step to go to'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//nextStep
ScratchAction.Edit.nextStep = Action({
	"trigger":/go to next (?:step|steps|stop|stops|stuff|step)|next (?:step|steps|stop|stops|stuff|step)|what's next|next/,
	"description":"ask me what's the next step",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//previousStep
ScratchAction.Edit.previousStep = Action({
	"trigger":/previous (?:step|steps|stop|stops|stuff|step)|go back a (?:step|steps|stop|stops|stuff|step)/,
	"description":"ask me what's the previous step",
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//playStep
ScratchAction.Edit.playStep = Action({
	"trigger":/^play (?:step|steps|stop|stops|stuff|step)$|^play current (?:step|steps|stop|stops|stuff|step)$|^what does it do$|^try it$/,
	"description":"play the current step",
	"arguments": [],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//appendStep
ScratchAction.Edit.appendStep = Action({
	"trigger":/add (?:the (?:step|steps|stop|stops|stuff|step))? ?(.*)|next (.*)|at the end (.*)|(.*) at the end|after all that (.*)|(.*) after all that/,
	"description":"to add a new instruction to the end of the project, say 'next, BLANK'",
	"arguments": [Argument({
		'name': 'instruction',
		'validator': ScratchAction.Validator.scratchCommand,
		'description':'the instruction you want to add to the end of the project'
	})],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//insertStepBefore
ScratchAction.Edit.insertStepBefore = Action({
	"trigger":/(?:insert)? ?(.*) before (?:step|steps|stop|stops|stuff|step) (.*)/,
	"description":"insert a new command before step number BLANK",
	"arguments": [
		Argument({
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'the instruction to insert'
		}),
		Argument({
			name: 'stepNumber',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'the step to insert before'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//insertStepAfter
ScratchAction.Edit.insertStepAfter = Action({
	"trigger":/(?:insert)? ?(.*) after (?:step|steps|stop|stops|stuff|step) (.*)/,
	"description":"insert a new command after step number BLANK",
	"arguments": [
		Argument({
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'the instruction to insert'
		}),
		Argument({
			name: 'stepNumber',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'the step to insert after'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//deleteStep
ScratchAction.Edit.deleteStep = Action({
	"trigger":/delete (?:step|steps|stop|stops|stuff|step) (.*)/,
	"description":"delete step number BLANK",
	"arguments": [
	Argument({
		'name': 'stepNumber',
		'validator': ScratchAction.Validator.scratchCommand,
		'description':'the number of the step to delete'
	})],
	"contextValidator": ScratchAction.Validator.currentProjectDefined

});

//replaceStep
ScratchAction.Edit.replaceStep = Action({
	"trigger":/(?:replace|replaced) (?:step|steps|stop|stops|stuff|step) (.*) with (.*)/,
	"description":"replace step with a new instruction",
	"arguments": [
		Argument({
			name: 'stepNumber',
			validator: ScratchAction.Validator.currentProjectStepNumber,
			description: 'the number of the step to replace'
		}),
		Argument({
			'name': 'instruction',
			'validator': ScratchAction.Validator.scratchCommand,
			'description':'the new instruction'
		})
	],
	"contextValidator": ScratchAction.Validator.currentProjectDefined
});

ScratchAction.Edit.getTriggers() = {
	return Object.keys(ScratchAction.Edit);
}

module.exports = ScratchAction;