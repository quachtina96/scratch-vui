/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const ScratchProject = require('./scratch_project.js');
const ScratchStateMachine = require('./scratch_state_machine.js');
const ScratchStorage = require('./storage.js');
const Triggers = require('./triggers.js');
const Utils = require('./utils.js').Utils;

/**
 * ScratchProjectManager class
 */
class ScratchProjectManager {

	/**
	 * Constructor for ScratchProjectManager
	 */
	constructor(scratchStateMachine, excludeWindow) {
		this.ssm = scratchStateMachine;
		this.storage = new ScratchStorage();
		this.projects = {};
		this.untitledCount = 0;
		// Project currently being edited
		this.projectToPlay = null;
		this.currentProject = null;
		if (!excludeWindow) {
			this.synth = window.speechSynthesis;
			this.recognition = new webkitSpeechRecognition();
		}
		// Triggers should be listed from more specific to more general to
		// ensure that the best fit trigger gets matched to the utterance.
		this.triggers = Triggers.general();
		// Whether currently listening for a yes or no answer.
		this.yesOrNo = false;
		// Whether the user has already said Scratch to trigger listening.
		this.scratchVoiced = false;
	}

	load() {
		if (!window.localStorage.scratchProjects) {
			window.localStorage.scratchProjects = JSON.stringify({});
		}
		var savedProjects = JSON.parse(window.localStorage.scratchProjects);
		for (var name in savedProjects) {
			this.projects[name] = new ScratchProject(this);
			this.projects[name].name = name;
			this.projects[name].instructions = savedProjects[name];
		}
	}

	renameProject(oldName, newName) {
		this.projects[newName] = this.projects[oldName]
		this.projects[newName].name = newName;
		delete this.projects[oldName];
		this.removeProject(oldName);
		this.save();
		this._updatePlayRegex();
	}

	/**
	 * Delete project.
	 */
	removeProject(projName) {
		ScratchStorage.removeProject(projName)
	}

	/**
	 * Save project.
	 */
	save() {
		// Save project to local storage.
		ScratchStorage.save(this.projects)
	}

	/**
	 * Speak aloud given text.
	 * @param {!String} whatToSay - text to say aloud.
	 */
	say(whatToSay) {
		var whatToSay = new SpeechSynthesisUtterance(whatToSay);

		// Stop speech recognition during speech synthesis.
		var scratch = this;
		whatToSay.onstart = function(event) {
			scratch.recognition.stop();
		}
		whatToSay.onend = function(event) {
			scratch.recognition.start();
		}

		// Synthesize speech!
		this.synth.speak(whatToSay);
		console.log('saying' + whatToSay.text);
	}

	/**
	 * Execute current project.
	 * @param {string} mode - 'FromStart' to execute the project from the first
	 *    or 'WhereItLeftOff'.
	 */
	executeCurrentProject(mode) {
		if (!this.currentProject) {
			throw Error('this.currentProject is ' + this.currentProject);
		}

		var scratchProgram = this.currentProject.getScratchProgram();

		// Set bounds for which steps to execute
		var endIndex, startIndex;
		if (mode == 'WhereItLeftOff') {
			startIndex = this.currentProject.instructionPointer;
			endIndex = scratchProgram.length;
		} else if (mode == 'FromStart') {
			// Start at index 1 to skip the "when green flag clicked instruction"
			startIndex = 1;
			endIndex = scratchProgram.length;
		} else if (mode == 'SingleStepWhereILeftOff') {
			startIndex = this.currentProject.instructionPointer;
			endIndex = startIndex + 1;
		}

		for (var i = startIndex; i < endIndex; i++) {
			var opcode = scratchProgram[i][0];
			var args = scratchProgram[i][1];
			if (opcode == 'say:') {
					this.say(scratchProgram[i][1]);
			} else if (Array.isArray(opcode)) {
				if (opcode[0] == 'doAsk')
					if (opcode[1] == '') {
					// Handle 'when i say event'
					var whatToListenFor = args[1][2];
					var whatToSay = args[2][0][1];
					this.currentProject.tempTrigger = whatToListenFor;
					this.currentProject.tempResponse= whatToSay;
					this.currentProject.instructionPointer = i + 1;
					return;
				}
			}
		}
		// Return whether the project is finished or not.
		return i == scratchProgram.length;
	}

	/**
	 * Given callback functions, handle a yes or no response from the user.
	 * @param {boolean} yesOrNo - the user's choice or answer to the question
	 * @param {function} yesCallback - the function to execute if user says yes.
	 * @param {function} noCallback - the function to execute if user says no.
	 */
	handleYesOrNo(utterance, yesCallback, noCallback) {
		// TODO: make this more flexible (handling different forms of yes or no)
		if (utterance == 'yes') {
			yesCallback();
		} else if (utterance == 'no') {
			noCallback();
		}
	}

	/**
	 * Execute action associated with trigger type with given arguments and
	 * utterance.
	 * @param {!string} triggerType - the kind of action to execute.
	 * @param {Array<string>} args - the arguments extracted from utterance using
	 * 		the regex associated with the trigger. See Triggers (triggers.js).
	 * @param {string} - utterance - user input
	 */
	triggerAction(triggerType, opt_args, opt_utterance) {
		opt_args = opt_args ? opt_args : [];
		opt_utterance = opt_utterance ? opt_utterance : "";

		// Attempt action
		try {
			this.ssm[triggerType](opt_args, opt_utterance);
			return true;
		} catch(e) {
			// Handle failure based on transition type.
			console.log(e)
			switch (triggerType) {
				case 'editExistingProject':
					// If attempting to open a nonexistent project, stay in
					// current state.
					this.say("There's no project called that.");
					triggerType = 'stay';
					break;
				case 'play':
					if (this.ssm.state == 'InsideProject') {
						if (this.ssm.currentProject.state == 'empty') {
							// User is trying to give a project the same name as a previous
							// project.
							this.say('You already have a project called that.')
						} else {
							// User is composing a Scratch program from other Scratch programs.
							var result = this.ssm.currentProject.handleUtterance(opt_utterance);
						}
					}
			}
		}
	}

	/**
	 * Handle utterance on the general navigation level.
	 */
	handleUtterance(utterance) {
		// NOTE: 'this' refers to the ScratchStateMachine that calls this function
		var lowercase = utterance.toLowerCase();
		var utterance = Utils.removeFillerWords(lowercase).trim();
		console.log('utterance: ' + utterance)

		if (this.yesOrNo) {
			this.handleYesOrNo(utterance, this.yesOrNo.yesCallback, this.yesOrNo.noCallback)
			// Reset yes or no state.
			this.yesOrNo = null;
		}

		if (Utils.matchesScratch(utterance)) {
			this.scratchVoiced = true;
			this.say("I'm listening.")
			return;
		}

		// Attempt to match utterance to trigger.
		for (var triggerType in this.triggers) {

			// If the user already said Scratch at the end of the previous utterance,
			// do not require the user to say it again.
			var args = this.scratchVoiced ? Utils.matchRegex(utterance, this.triggers[triggerType]) : Utils.match(utterance, this.triggers[triggerType]);

			// The command type was matched attempt to execute.
			if (args && args.length > 0) {
				if (this.ssm.can(triggerType)) {
					this.triggerAction(triggerType, args, utterance);
				} else {
					this.say('You are current in ' + this.ssm.state + ' mode and cannot '
						+ triggerType + ' from here.');
				}
				return;
			}
		}

		if (this.ssm.state == 'PlayProject') {
			this.currentProject.handleUtteranceDuringExecution(utterance, this.scratchVoiced);
		} else if (this.ssm.state == 'InsideProject') {
		 // Handle utterances in the InsideProject context.
			if (this.currentProject) {
				var result = this.currentProject.handleUtterance(utterance, this.scratchVoiced);
				if (result == 'exit') {
					this.ssm.finishProject();
				}
			}
		} else if (utterance.toLowerCase().indexOf('scratch') != -1) {
			// TODO: integrate Scratch, Help!
			console.log('found Scratch in failed utterance');
			this.say("I heard you say " + utterance);

			// Suggest a close match if there exists one via fuzzy matching.
			var result = Utils.fuzzyMatch(utterance, Triggers.general())
			console.log('fuzzy match result: ' + result)
			var jaroWinklerScore = result[1] //1 - JaroWinkler Distance
			var triggerType = result[0]
			if (jaroWinklerScore < .25) {
				// TODO: enable the line below.
				// this.say("Did you mean to say " + spoken version of detected trigger type + "?");
				this.say("Did you want to " + triggerType + "?");
				// TODO: integrate way to ask for additional arguments to pass to
				// triggerAction.
				// Set handle utterance mode to listen for yes or no.
				this.yesOrNo = {
					yesCallback: () => {this.triggerAction(triggerType)},
					noCallback: () => {this.say("Please try again.")}
				}
			} else {
				this.say("I don't know how to do that.");
			}
		}

		this.scratchVoiced = false;
	}

	// In order to properly detect playing projects, add project names to
	// match phrases for the play triggerType.
	_updatePlayRegex() {
		var pattern = this.triggers['play'].toString();
		var prefix = pattern.substring(1,pattern.length-1);
		var regexString = prefix + '|(' + Object.keys(this.projects).map((projectName) => Utils.removeFillerWords(projectName).trim()).join(')|(') + ')';
		this.triggers['play'] = new RegExp(regexString, "i");
	}

  _describeProject(projectNumber) {
 		var projectList = Object.keys(this.projects)
 		projectList.sort()
    // this does not refer to the state machine, but to the editCommands
    // object holding these functions.
    if (0 < projectNumber &&
        projectNumber <= projectList.length) {
      this.say('Project ' + projectNumber + ' is ' + projectList[projectNumber-1])
      return true;
    } else {
      return false;
    }
  }

  getNthProject(lifecycle, args) {
  	var numberArg = args.pop();
    var projectNumber = Utils.text2num(numberArg);
    if (projectNumber == null) {
      projectNumber = parseInt(numberArg);
    }
    if (!this._describeProject(projectNumber)) {
      this.say('there is no project number ' + projectNumber.toString());
    }
  }

	getCurrentProject() {
		if (this.currentProject) {
			this.say('The current project is ' + this.currentProject.name);
		} else {
			this.say('You are not currently on a project');
		}
	}

	renameCurrentProject(lifecycle, args) {
		if (this.currentProject) {
			var newName = args[1];
			this.renameProject(this.currentProject.name, newName);
			this.say('The current project is now called ' + this.currentProject.name);
		} else {
			this.say('You are not currently on a project');
			// TODO(quacht): support an interaction where instead of the above,
			// scratch also says and responds to
			// What project would you like to rename?
		}
	}
	renameSpecifiedProject(lifecycle, args) {
			var oldName = args[1];
			var newName = args[2];

			// play the project that matches!
			for (var projectName in this.projects) {
				if (Utils.removeFillerWords(projectName) == oldName) {
					this.renameProject(projectName, newName)
					this.say('Renamed ' + projectName + ' to ' + newName)
					return;
				}
			}

			this.say('The current project is ' + this.currentProject.name);
			this.say('You are not currently on a project');
			// TODO(quacht): support an interaction where instead of the above,
			// scratch also says and responds to
			// What project would you like to rename?
	}
	deleteProject(lifecycle, args, utterance) {
		var pm = this;
		return new Promise(((resolve, reject) => {
			var projectToPlayName = args[1].trim();

			// play the project that matches!
			for (var projectName in pm.projects) {
				if (Utils.removeFillerWords(projectName) == projectToPlayName) {
					pm.say(projectName + ' project deleted.')
					delete pm.projects[projectName];
					ScratchStorage.removeProject(projectName);
					resolve();
					return;
				}
			}

			// TODO: Does args[1] actually contain the project name as it is said?
			// or will the filler words be removed.
			pm.say("You said " + utterance);
			pm.say("I can't delete a project I don't have");
			resolve();
			scratch.return();
		}))
	}
	getProjectNames() {
		var pm = this;
		return new Promise(((resolve, reject) => {
			if (Object.keys(pm.projects).length) {
				var whatToSay = Object.keys(pm.projects);
				whatToSay.splice(whatToSay.length-1, 0, 'and');
				whatToSay.join(',')
				pm.say(whatToSay);
			} else {
				pm.say("You don't have any projects.");
			}
			resolve();
		}));
	}
	getProjectCount() {
		var pm = this;
		return new Promise(((resolve, reject) => {
			var count = Object.keys(pm.projects).length;
			pm.say('You have ' + count + ' projects');
			resolve();
		}));
	}
	newProject() {
		var pm = this;
		return new Promise(((resolve, reject) => {
			pm.currentProject = new ScratchProject(pm);
			pm.untitledCount++;
			pm.projects['Untitled-' + pm.untitledCount] = pm.currentProject;
			pm.currentProject.startProjectCreation(pm.currentProject);
			resolve();
		}));
	}
	returnToPreviousState() {
		var pm = this;
		return new Promise(((resolve, reject) => {
			pm.say('Returning to previous state: ' + pm.ssm.state);
			resolve();
		}));
	}
	// Play existing project
	play(lifecycle, args, utterance) {
		var pm = this;
		return new Promise(function(resolve, reject) {
			var projectToPlayName = args[1].trim();

			// play the project that matches!
			for (var projectName in pm.projects) {
				if (Utils.removeFillerWords(projectName) == projectToPlayName) {
					pm.currentProject = pm.projects[projectName];
					pm.say('playing project');
					let finished = pm.executeCurrentProject('FromStart');
					if (finished) {
						pm.say('done playing project');
					} else {
						// TODO: cue that the program is waiting for you to say something...
						// and/or that it's not finished.
					}
					resolve();
					return;
				}
			}

			pm.say("You said " + utterance);
			pm.say("I don't have a project called " + args[1]);
			resolve();
			this.ssm.return();
		})
	}
	finishProject() {
		var pm = this;
		return new Promise(((resolve, reject) => {
			ScratchStorage.save();
			pm._updatePlayRegex();
			// TODO: cue exiting project
			// Save project.
			resolve();
		}));
	}
	announceProjectToEdit(project) {
		this.say('Opening project ' + project.name + ' for editing');
		var stepCount = project.instructions.length;
		if (stepCount != 1) {
			this.say('There are ' + stepCount + ' steps');
		} else {
			this.say('There is 1 step');
		}
	}

	editExistingProject(lifecycle, args) {
		var pm = this;
		return new Promise(((resolve, reject) => {
			var projectName = args[1];
			pm.announceProjectToEdit(pm.projects[projectName])
			pm.currentProject = pm.projects[projectName];
			resolve();
		}));
	}
	editProject() {
		var pm = this;
		return new Promise(((resolve, reject) => {
			pm.announceProjectToEdit(pm.currentProject)
			resolve();
		}));
	}
	playCurrentProject() {
		var pm = this;
		return new Promise(((resolve, reject) => {
			ScratchStorage.save();
			pm.say('Playing current project ' + pm.currentProject.name);
			pm.executeCurrentProject('FromStart');
			pm.say('done playing project');
			resolve();
		}));
	}
}

module.exports = ScratchProjectManager;