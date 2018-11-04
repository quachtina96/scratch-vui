/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const ScratchProject = require('./scratch_project.js');
const ScratchStateMachine = require('./scratch_state_machine.js');
const ScratchVUIStorage = require('./storage.js');
const ScratchAction = require('./scratch_action.js');
const ScratchAudio = require('./audio.js');
const SoundLibrary = require('./sound_library.js');

/**
 * ScratchProjectManager class
 */
class ScratchProjectManager {

  /**
   * Constructor for ScratchProjectManager
   */
  constructor(scratchStateMachine) {
    this.ssm = scratchStateMachine;
    this.storage = new ScratchVUIStorage();
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
    this.actions = ScratchAction.General;
    // Whether currently listening for a yes or no answer.
    this.yesOrNo = false;
    // Whether the user already said "Scratch".
    this.scratchVoiced = false;
    this.listening = true;
    this.audio = new ScratchAudio();
    this.soundLibrary = new SoundLibrary(this.ssm.vm);
  }

  load() {
    var savedProjects = this.storage.getProjects();
    for (var name in savedProjects) {
      this.projects[name] = new ScratchProject(this);
      this.projects[name].name = name;
      this.projects[name].instructions = savedProjects[name];
    }
  }

  // Return whether it has project of given naem.
  has(projectName) {
    return projectName in this.ssm.pm.projects;
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
    this.storage.removeProject(projName)
  }

  /**
   * Save project.
   */
  save() {
    // Save project to local storage.
    this.storage.save(this.projects)
  }

  /**
   * Speak aloud given text.
   * @param {!String} whatToSay - text to say aloud.
   * @param {Function} opt_on_end - optional callback function to run when the
   *  speech  synthesis is complete.
   */
  say(whatToSay, opt_on_end) {
    var whatToSay = new SpeechSynthesisUtterance(whatToSay);

    // Stop speech recognition during speech synthesis.
    var scratch = this;
    whatToSay.onstart = function(event) {
      scratch.recognition.stop();
    }
    whatToSay.onend = function(event) {
      if (opt_on_end) {
        opt_on_end();
      }
      scratch.recognition.start();
    }

    // Synthesize speech!
    this.synth.speak(whatToSay);
    console.log('saying' + whatToSay.text);
  }

  /**
   * Execute current project with VM
   */
   executeCurrentProjectWithVM(mode) {
    var pm = this;
    return new Promise(((resolve, reject) => {
      pm.audio.stopBackground();
      if (!pm.currentProject) {
        throw Error('pm.currentProject is ' + pm.currentProject);
      }

      var totalInstructionCount = pm.currentProject.instructions.length

      // Set bounds for which steps to execute
      var endIndex, startIndex;
      if (mode == 'WhereItLeftOff') {
        startIndex = pm.currentProject.instructionPointer;
        endIndex = totalInstructionCount;
      } else if (mode == 'FromStart') {
        // TODO: change to indexing by 0 + make sure the changes are
        // consistent in supporting the project editor.
        startIndex = 1;
        endIndex = totalInstructionCount;
      } else if (mode == 'SingleStepWhereILeftOff') {
        startIndex = pm.currentProject.instructionPointer;
        endIndex = startIndex;
      }

      // The Scratch program returned includes the code to execute
      // the desired subsection of the program.
      pm.currentProject.getScratchProgram(startIndex-1, endIndex)
      .then((scratchProgram) => {
        // NOTE: We do not need to JSON.stringify the scratch program before
        // passing it to the vm because it is already a string.
        console.log(JSON.parse(scratchProgram))
        this.ssm.vm.loadProject(scratchProgram).then(()=> {
          this.ssm.vm.greenFlag();
        });

        // Return whether the project is finished or not.
        resolve(endIndex == totalInstructionCount);
      });
    }))
  }

  /**
   * Return whether or not this triggerType is valid with the arguments
   * As the system grows to support a wider range of commands of greater complexity,
   * false positives become common (w/ the general 'play' trigger for example).
   * Even if a regular expression successfully extracts arguments from the input
   * it may not be correct.
   * @param {String} triggerType
   * @param {Array<String>} args -- the result of matching an utterance to the
   *    regex corresponding to the trigger.
   * @return {Object} representing whether the trigger was valid
   */
  // TODO: rather than encode these rules in a single function, maybe we could
  // expose them in a single file as a reference that could be checked. (triggers.js)
  _validateTrigger(triggerType, args) {
    // As a certain rules come up, add them here.
    switch (triggerType) {
      case 'play':
        // argument must be name of an existing project
        var projectToPlayName = args[1].trim();
        return projectToPlayName in this.projects;
      case 'playCurrentProject':
        // cannot play nonexisting project
        return this.currentProject; // TODO: could ask the user what project they want to play.
      default:
        return true;
    }
  }

  /**
   * Handle the utterance only when Scratch should be listening.
   */
  handleUtterance(utterance) {
    if (this.listening) {
      return this._handleUtterance(utterance);
    } else if (Utils.match(utterance, this.actions['listen'].trigger)) {
      this.listening = true;
    }
  }

  /**
   * Handle utterance on the general navigation level.
   */
  _handleUtterance(utterance) {
    // NOTE: 'this' refers to the ScratchStateMachine that calls this function
    var lowercase = utterance.toLowerCase();
    var utterance = Utils.removeFillerWords(lowercase).trim();
    console.log('utterance: ' + utterance)

    if (this.yesOrNo) {
      // Handle response to yes/no question.
      this.handleYesOrNo(utterance, this.yesOrNo.yesCallback, this.yesOrNo.noCallback)
      // Reset yes or no state.
      this.yesOrNo = null;
    }

    // Handle interrupt of speech.
    if (Utils.matchesScratch(utterance)) {
      this.synth.cancel();
      // Remember that the user said "Scratch" and give them a cue so they know
      // they've been heard.
      this.scratchVoiced = true;
      this.say("I'm listening.")
      return;
    }

    // Attempt to match utterance to general triggers.
    for (var triggerType in this.actions) {

      // If the user already said Scratch at the end of the previous utterance,
      // do not require the user to say it again.
      var args = this.scratchVoiced ? Utils.matchRegex(utterance, this.actions[triggerType].trigger) : Utils.match(utterance, this.actions[triggerType].trigger);

      // If trigger was matched, attempt to execute associated command.
      if (args && args.length > 0) {
        DEBUG && console.log('triggerType:' + triggerType)
        DEBUG && console.log('args:' + args)

        // Validate the match.
        if (this._validateTrigger(triggerType, args)) {
          if (this.ssm.can(triggerType)) {
            this.triggerAction(triggerType, args, utterance);
          } else {
            this.say('You are currently in ' + this.ssm.state + ' mode and cannot '
              + triggerType + ' from here.');
          }
          return;
        }
      }
    }

    // Pass the utterance to the project to handle.
    if (this.ssm.state == 'PlayProject') {
        this.currentProject.handleUtteranceDuringExecution(utterance, this.scratchVoiced);
    } else if (this.ssm.state == 'InsideProject') {
      // There needs to be a current project to handle the utterance.
      if (this.currentProject) {
        var result = this.currentProject.handleUtterance(utterance, this.scratchVoiced);
        if (result == 'exit') {
          this.ssm.finishProject();
        }
      } else {
        // TODO: Instead of throwing error, ask the user for the appropriate
        // information.
        // this.say('What project would you like to see inside?')
        throw "In InsideProject state, but there is no current project"
      }
    } else if (Utils.containsScratch(utterance)) {
      // TODO: integrate Scratch, Help!
      this.say("I heard you say " + utterance);

      // Suggest a close match if there exists one via fuzzy matching.
      var result = Utils.fuzzyMatch(utterance, this.triggers)
      console.log('fuzzy match result: ' + result)
      var jaroWinklerScore = result[1] // 1 - JaroWinkler Distance
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
        this.say("I don't understand.");
      }
    }

    // TODO: rip out this state variable, because we are no longer requiring
    // scratch to always be voiced.
    this.scratchVoiced = false;
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
   *    the regex associated with the trigger. See ScratchRegex in triggers.js
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

  // In order to properly detect playing projects, add project names to
  // match phrases for the play triggerType.
  _updatePlayRegex() {
    var pattern = this.triggers['play'].toString();
    var prefix = pattern.substring(1,pattern.length-1);
    var regexString = prefix + '|^(' + Object.keys(this.projects).map((projectName) => Utils.removeFillerWords(projectName).trim()).join(')$|^(') + ')$';
    this.triggers['play'] = new RegExp(regexString, "i");
    this.actions['play'].trigger = new RegExp(regexString, "i");
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
          this.storage.removeProject(projectName);
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
    var names = Object.keys(pm.projects);
    return new Promise(((resolve, reject) => {
      if (names.length == 1) {
        pm.say("One project called " + names[0]);
      } else if (names.length) {
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
      pm.audio.cueInsideProject();
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
          pm.audio.cueProjectStarted();
          // TODO: Do we need a promise here to ensure that we've waited until
          // the project has been executed? (block further execution until the
          // game is complete? How might that affect the ability to listen to
          // the user (starting and stopping a project))
          return pm.executeCurrentProjectWithVM('FromStart').then(()=>{
            resolve();
          });
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
      this.storage.save();
      pm._updatePlayRegex();
      pm.currentProject.finishProject();
      resolve();
    }));
  }
  announceProjectToEdit(project) {
    if (project) {
      this.say('Opening project ' + project.name + ' for editing');
      var stepCount = project.instructions.length;
      if (stepCount != 1) {
        this.say('There are ' + stepCount + ' steps');
      } else {
        this.say('There is 1 step');
      }
    }
  }
  editExistingProject(lifecycle, args) {
    var pm = this;
    return new Promise(((resolve, reject) => {
      pm.audio.cueInsideProject();
      var projectName = args[1];
      var projectName = projectName ? projectName : pm.currentProject.name;
      pm.announceProjectToEdit(pm.projects[projectName])
      pm.currentProject = pm.projects[projectName];
      resolve();
    }));
  }
  editProject() {
    var pm = this;
    return new Promise(((resolve, reject) => {
      pm.audio.cueInsideProject();
      pm.announceProjectToEdit(pm.currentProject)
      resolve();
    }));
  }
  playCurrentProject() {
    var pm = this;
    return new Promise(((resolve, reject) => {
      this.storage.save();
      pm.say('Playing current project ' + pm.currentProject.name, () => {
        pm.executeCurrentProjectWithVM('FromStart').then(() => {
          // pm.say('done playing project');
          resolve();
        });
      });
    }));
  }
  queryState() {
    var pm = this;
    return new Promise((resolve, reject) => {
      pm.say('You are in the ' + this.ssm.state + ' state');
      if (pm.currentProject) {
        pm.say('Your current project is ' + pm.currentProject.name);
      }
      resolve();
    });
  }
  getSounds() {
    var pm = this;
    if (!pm.soundLibrary.vm) {
    // Set up the vm for the sound library to play sound previews if the vm
    // wasn't set in the constructor.
      pm.soundLibrary.vm =this.ssm.vm;
    }
    return new Promise((resolve, reject) => {
      pm.say('I have many sounds. Here are 3');
      // Build promise chain to present each sound in order.
      var funcs = pm.soundLibrary.getNSounds(3, -1).map((item) => new Promise((resolve, reject) => {
        pm.say('Here is ' + item.name, () => {
          pm.soundLibrary.playSound(item)
        });
      }));
      var promise = funcs[0];
      for (var i = 1; i < funcs.length; i++) {
        promise = promise.then(funcs[i]);
      }
      return promise.then(() => {
        resolve();
      });
    });
  }
  checkSound(lifecycle, args) {
    var pm = this;
    if (!pm.soundLibrary.vm) {
    // Set up the vm for the sound library to play sound previews if the vm
    // wasn't set in the constructor.
      pm.soundLibrary.vm = this.ssm.vm;
    }
    return new Promise((resolve, reject) => {
      var soundToFind = args[1].trim();
      var soundItem = pm.soundLibrary.get(soundToFind)
      if (soundItem) {
        pm.soundLibrary.playSound(soundItem);
      } else {
        var randomSound = pm.soundLibrary.getRandomSound();
        pm.say('No, but here is ' + randomSound.name, () => {
          pm.soundLibrary.playSound(randomSound);
        });
      }
      resolve();
    });
  }
  getSuggestedActions(lifecycle, args) {
    var pm = this;
    return new Promise((resolve, reject) => {
      // For every state, include a curated set of possible actions to take.
      // These actions are in order.
      // TODO: consider how to introduce state transition specific verbage to
      // the system.
      var suggestedActions = [];
      switch(pm.ssm.state) {
        case 'Home':
          suggestedActions = [
            ScratchAction.General.play,
            ScratchAction.General.editExistingProject,
            ScratchAction.General.newProject,
          ];
          break;
        case 'PlayProject':
          suggestedActions = [
            ScratchAction.General.editProject,
            ScratchAction.General.play,
          ]
          break;
        case 'InsideProject':
          var suggestedActions = [
            ScratchAction.Edit.getCurrentStep,
            ScratchAction.Edit.getStepCount,
            ScratchAction.Edit.nextStep,
            ScratchAction.Edit.goToStep,
            ScratchAction.Edit.playStep,
            ScratchAction.Edit.insertStepAfter,
            ScratchAction.General.getSounds,
            ScratchAction.General.play,
          ]
          break;
      }
      // TODO: suggest the actions in the order that they are listed instead of
      // at random.
      var action = suggestedActions[Math.floor(Math.random()*suggestedActions.length)];

      // Present action.
      this.say(`say ${action.idealTrigger} to ${action.description}`);
      resolve();
    });
  }
}

module.exports = ScratchProjectManager;