/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const ScratchProject = require('./scratch_project.js');

/**
 * ScratchProjectManager class
 */
class ScratchProjectManager {

	/**
	 * Constructor for ScratchProjectManager
	 */
	constructor() {
		// todo?
	}
		renameProject(scratch, oldName, newName) {
			scratch.projects[newName] = scratch.projects[oldName]
			scratch.projects[newName].name = newName;
			delete scratch.projects[oldName];
			scratch.removeFromLocalStorage(oldName);
			scratch.saveToLocalStorage();
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
		executeCurrentProject(scratch, mode) {
			if (!scratch.currentProject) {
				console.log(scratch);
				throw Error('scratch.currentProject is ' + scratch.currentProject);
			}
			if (mode == 'WhereItLeftOff') {
				var startIndex = scratch.currentProject.instructionPointer;
			} else if ('FromStart') {
				// Start at index 1 to skip the "when green flag clicked instruction"
				var startIndex = 1;
			}

			var scratchProgram = scratch.currentProject.getScratchProgram();
			for (var i = startIndex; i < scratchProgram.length; i++) {
				var opcode = scratchProgram[i][0];
				var args = scratchProgram[i][1];
				if (opcode == 'say:') {
						scratch.say(scratchProgram[i][1]);
				} else if (Array.isArray(opcode)) {
					if (opcode[0] == 'doAsk')
						if (opcode[1] == '') {
						// Handle 'when i say event'
						var whatToListenFor = args[1][2];
						var whatToSay = args[2][0][1];
						scratch.currentProject.tempTrigger = whatToListenFor;
						scratch.currentProject.tempResponse= whatToSay;
						scratch.currentProject.instructionPointer = i + 1;
						return;
					}
				}
			}
		}

		handleUtterance(utterance) {
			var lowercase = utterance.toLowerCase();
			var utterance = Utils.removeFillerWords(lowercase).trim();

			var scratch = this;

			// Attempt to match utterance to trigger.
			for (var commandType in this._triggers) {
				var args = Utils.match(utterance, this._triggers[commandType]);
				if (args) {
					if (this.can(commandType)) {
						try {
							this[commandType](scratch, args, utterance);
							return true;
						} catch(e) {
							// Handle failure based on transition type.
							console.log(e)
							switch (commandType) {
								case 'editExistingProject':
									// If attempting to open a nonexistent project, stay in
									// current state.
									this.say("There's no project called " + nameOfDesiredProject);
									commandType = 'stay';
									break;
								case 'play':
									if (this.state == 'InsideProject') {
										if (this.currentProject.state == 'empty') {
											// User is trying to give a project the same name as a previous
											// project.
											this.say('You already have a project called that.')
										} else {
											// User is composing a Scratch program from other Scratch programs.
											var result = this.currentProject.handleUtterance(utterance);
										}
									}
							}
						}
					} else {
						console.log('could not make transition: ' + commandType);
						console.log('current state: ' + scratch.state);
					}
				}
			}

			if (this.state == 'PlayProject') {
					this.currentProject.handleUtteranceDuringExecution(utterance);
			} else if (this.state == 'InsideProject') {
			 // Handle utterances in the InsideProject context.
				if (this.currentProject) {
					var result = this.currentProject.handleUtterance(utterance);
					if (result == 'exit') {
						this.finishProject();
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
			var pattern = this._triggers['play'].toString();
			var prefix = pattern.substring(1,pattern.length-1);
			var regexString = prefix + '|(' + Object.keys(this.projects).map((projectName) => Utils.removeFillerWords(projectName).trim()).join(')|(') + ')';
			this._triggers['play'] = new RegExp(regexString, "i");
		}

		updateGrammarWithProjects() {
			var grammar = `#JSGF V1.0;
			grammar scratch_state_machine.project; \n
			<project> =` + Object.keys(this.projects).join('|') + ';\n';
			this.recognition.grammars.addFromString(grammar, 1);
		}
}

module.exports = ScratchProjectManager;