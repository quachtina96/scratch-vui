/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const ScratchProject = require('./scratch_project.js');
const ScratchStateMachine = require('./scratch_state_machine.js');
const ScratchStorage = require('./storage.js');
const ScratchRegex = require('./triggers.js');

/**
 * ScratchProjectManager class
 */
class ScratchProjectManager {

	/**
	 * Constructor for ScratchProjectManager
	 */
	constructor(scratchStateMachine) {
		this.ssm = scratchStateMachine;
		this.storage = new ScratchStorage();
    this.projects = {};
    this.untitledCount = 0;
    // Project currently being edited
    this.projectToPlay = null;
    this.currentProject = null;
    this.synth = window.speechSynthesis;
    this.recognition = new webkitSpeechRecognition();
    // Triggers should be listed from more specific to more general to
    // ensure that the best fit trigger gets matched to the utterance.
		this.triggers = ScratchRegex.getGeneralTriggers();
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

		// Synthesis speech!
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
	}

	/**
	 * Handler utterance on the general navigation level.
	 */
	handleUtterance(utterance) {
		// NOTE: 'this' refers to the ScratchStateMachine that calls this function
		var lowercase = utterance.toLowerCase();
		var utterance = Utils.removeFillerWords(lowercase).trim();

		// Attempt to match utterance to trigger.
		for (var commandType in this.triggers) {
			var args = Utils.match(utterance, this.triggers[commandType]);
			if (args && args.length > 0) {
				if (this.ssm.can(commandType)) {
					try {
						// TODO: HAVING TROUBLE HERE W/ THE REFACTOR...
						this.ssm[commandType](args, utterance);
						return true;
					} catch(e) {
						// Handle failure based on transition type.
						console.log(e)
						switch (commandType) {
							case 'editExistingProject':
								// If attempting to open a nonexistent project, stay in
								// current state.
								pm.say("There's no project called " + nameOfDesiredProject);
								commandType = 'stay';
								break;
							case 'play':
								if (this.ssm.state == 'InsideProject') {
									if (this.ssm.currentProject.state == 'empty') {
										// User is trying to give a project the same name as a previous
										// project.
										pm.say('You already have a project called that.')
									} else {
										// User is composing a Scratch program from other Scratch programs.
										var result = this.ssm.currentProject.handleUtterance(utterance);
									}
								}
						}
					}
				} else {
					console.log('could not make transition: ' + commandType);
					console.log('current state: ' + this.ssm.state);
				}
			}
		}

		if (this.ssm.state == 'PlayProject') {
				this.currentProject.handleUtteranceDuringExecution(utterance);
		} else if (this.ssm.state == 'InsideProject') {
		 // Handle utterances in the InsideProject context.
			if (this.currentProject) {
				var result = this.currentProject.handleUtterance(utterance);
				if (result == 'exit') {
					this.ssm.finishProject();
				}
			}
		} else if (utterance.toLowerCase().indexOf('scratch') != -1) {
			// TODO: integrate Scratch, Help!
			console.log('found Scratch in failed utterance');
			this.say("I heard you say " + utterance);
			this.say("I don't know how to do that.");
		}
	}

	// In order to properly detect playing projects, add project names to
	// match phrases for the play triggerType.
	_updatePlayRegex() {
		var pattern = this.triggers['play'].toString();
		var prefix = pattern.substring(1,pattern.length-1);
		var regexString = prefix + '|(' + Object.keys(this.projects).map((projectName) => Utils.removeFillerWords(projectName).trim()).join(')|(') + ')';
		this.triggers['play'] = new RegExp(regexString, "i");
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
			var whatToSay = Object.keys(pm.projects);
			whatToSay.splice(whatToSay.length-1, 0, 'and');
			whatToSay.join(',')
			pm.say(whatToSay);
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
			console.log(pm);
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
					pm.executeCurrentProject('FromStart');
					// TODO(quacht): saying I'm done playing the project doesnt work
					// here when doing event handling.
					pm.say('done playing project');
					resolve();
					return;
				}
			}

			// TODO: Does args[1] actually contain the project name as it is said?
			// or will the filler words be removed.
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
			console.log(args);
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