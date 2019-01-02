/**
 * @fileoverview attempt to factor out the methods from the Scratch State Machine.
 */

const Action = require('./action.js').Action;

const ScratchProject = require('./scratch_project.js');
const ScratchStateMachine = require('./scratch_state_machine.js');
const ScratchVUIStorage = require('./storage.js');
const ScratchAction = require('./scratch_action.js');
const ScratchAudio = require('./audio.js');
const SoundLibrary = require('./sound_library.js');
const ScratchCommands = require('./scratch_commands.js')

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
    this.triggers = ScratchAction.getTriggers('General');
    this.actions = ScratchAction.General;
    // Whether currently listening for a yes or no answer.
    this.yesOrNo = false;
    // Whether the user already said "Scratch".
    this.scratchVoiced = false;
    this.listening = true;
    this.audio = new ScratchAudio();
    this.soundLibrary = new SoundLibrary(this.ssm.vm);
    this.lastUserUtterance = null;
    this.currentUserUtterance = null;
    this.lastThingSaid = null;
    // When you want to short-circuit the utterance to facilitate a follow up
    // conversation regarding a question, you can use the utteranceHandler.
    this.currentAction = null;
    this.currentArgument = null;
  }

  load() {
    var savedProjects = this.storage.getProjects();
    for (var name in savedProjects) {
      this.projects[name] = new ScratchProject(this);
      this.projects[name].name = name;
      this.projects[name].instructions = savedProjects[name];
      this.projects[name].setState();
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
    this.lastThingSaid = whatToSay;
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

  _handleCurrentAction(utterance) {
    DEBUG && console.log(`[pm handle utterance][_finishUtterance] executing current action`)
    this.currentAction.execute(this.ssm, utterance)
    this.currentAction = null;
    return true;
  }

  async _handleCurrentProject(utterance) {
    // Current project
    DEBUG && console.log(`[handle utterance][_finishUtterance] current project handling utterance`)

    var result = await this.currentProject.handleUtterance(utterance, this.scratchVoiced);
    if (result == 'exit') {
        DEBUG && console.log(`[pm handle utterance][_finishUtterance] finish project`)
        this.ssm.finishProject();
        return true;
    } else if (result == true) {
      DEBUG && console.log(`[pm handle utterance][_finishUtterance] current project successfully handled`)
        // current project successfully handled it.
      return true;
    }
    return false
  }

  /**
   * Handle the utterance only when Scratch should be listening.
   */
  async handleUtterance(utterance) {
    if (this.listening) {
      if (this._isInterrupt(utterance)) {
        DEBUG && console.log(`[pm handle utterance] is interrupt`)
        this.currentAction = null;
        this.currentArgument = null;
        this.say('Canceled action.')
        return;
      }

      // Handle questions + requests before answer questions to arguments and stuff.
      if (this._handleQuestion(utterance)) {
        DEBUG && console.log(`[pm handle utterance] handled question`)
        return;
      }

      // The current argument takes priority.
      if (this.currentArgument) {
        var handledByArgument = await this.currentArgument.handleUtterance(this.ssm, utterance);
        if (handledByArgument) {
            // The utterance handler already finished its job.
            // reset the handler to use the default flow.
            this.triggerAction(this.currentAction, this.currentAction.getArgs(), utterance);
            return;
        }
      }

      if (this.currentAction && this._handleCurrentAction(utterance)) {
        return;
      }

      if (this.ssm.state == 'InsideProject' && this.currentProject && await this._handleCurrentProject(utterance)) {
        return;
      }

      DEBUG && console.log(`[pm handle utterance][_finishUtterance] no action or project to handle `)
      return this._handleUtterance(utterance);

    } else if (Utils.match(utterance, this.actions['listen'].trigger)) {
      // If Scratch wasn't listening before and the command is to tell Scratch
      // to listen, start listening!
      this.listening = true;
    }
  }

  /**
   * Return whether the utterance is an interrupt
   */
  _isInterrupt(utterance) {
    var interruptTrigger = ScratchAction.Interrupt.cancel.trigger
    var args = this.scratchVoiced ? Utils.matchRegex(utterance, interruptTrigger) : Utils.match(utterance, interruptTrigger);

    // If trigger was matched, attempt to execute associated command.
    return (args && args.length > 0)
  }

  /**
   * Handle question
   *
   * @param {!String} utterance - what the user said
   * @return {boolean} true if the utterance was handled, false if the utterance
   *    was not a question.
   */
  _handleQuestion(utterance) {
    // Get all the ScratchActions that are about getting information in any
    // category (Edit, General, Interrupt, Help)
    var allActions = ScratchAction.allActions();
    var questionActions = allActions.filter((action) => action.question);

    // Handle the question if there is a match to the utterance.
    for (var action of questionActions) {
      var trigger = action.trigger;
      var args = this.scratchVoiced ? Utils.matchRegex(utterance, trigger) : Utils.match(utterance, trigger);
      // If trigger was matched, attempt to execute associated command.
      if (args && args.length > 0) {
        var actionToExecute = new Action(action);
        actionToExecute.execute(this.ssm, utterance);
        return true;
      }
    }
  }

  /**
   * Handle utterance on the general navigation level.
   */
  async _handleUtterance(utterance) {
    // NOTE: 'this' refers to the ScratchStateMachine that calls this function
    var lowercase = utterance.toLowerCase();
    var utterance = Utils.removeFillerWords(lowercase).trim();
    console.log('utterance: ' + utterance)

    // Update our short-term user utterance history.
    this.lastUserUtterance = this.currentUserUtterance;
    this.currentUserUtterance =  utterance;

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
        if (this.ssm.can(triggerType)) {
          var action = new Action(ScratchAction.General[triggerType])
          this.currentAction = action;
          if (this.triggerAction(action, args, utterance)) {
            // Successfully triggered action.
            this.currentAction = null;
            this.currentArgument = null;
          }
        } else {
          this.say('You are currently in ' + this.ssm.state + ' mode and cannot '
            + triggerType + ' from here.');
        }
        return;
      }
    }

    // Pass the utterance to the project to handle.
    if (this.ssm.state == 'PlayProject') {
        this.currentProject.handleUtteranceDuringExecution(utterance, this.scratchVoiced);
    }
    else if (Utils.containsScratch(utterance)) {
      // TODO: figure out whether i should force this section to contain Scratch or not!
      this.say("I heard you say " + utterance);

      // Suggest a close match if there exists one via fuzzy matching.
      var triggers = ScratchAction.getTriggerMap('General');
      var result = Utils.fuzzyMatch(utterance, triggers)
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
          yesCallback: () => {this.triggerAction(new Action(ScratchAction.General.triggerType))},
          noCallback: () => {this.say("Please try again.")}
        }
      } else {
        this.say("I don't understand.");
      }
      return;
    }

    // Alert failure.
    await this.audio.cueMistake();
    this.say("I heard you say " + utterance);

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
   * @param {!Action} action - the action to execute.
   * @param {Array<string>} args - the arguments extracted from utterance using
   *    the regex associated with the trigger. See ScratchRegex in triggers.js
   * @param {string} - utterance - user input
   */
  triggerAction(action, opt_args, opt_utterance) {
    opt_args = opt_args ? opt_args : [];
    opt_utterance = opt_utterance ? opt_utterance : "";
    this.action = action;

    // Validate context
    if (!action.validInContext(this.ssm)) {
      return;
    }

    // Validate arguments
    console.log(`[pm triggerAction] set arguments: ${opt_args}`)
    action.setArguments(this.ssm, opt_args);
    console.log(`[pm triggerAction] result: ${action.arguments}`)
    // TINA: what happens when one argument has been satisfied.
    var missingArgument = action.getMissingArgument(this.ssm);
    if (missingArgument) {
      // Let the argument handle the utterances until the argument is filled.
      this.currentArgument = missingArgument;
      return;
    } else {
      this.currentArgument = null;
    }

    // Attempt action
    try {
      action.execute(this.ssm, opt_utterance);
      return true;
    } catch(e) {
      // Handle failure based on transition type.
      console.log(e)
    }
  }

  // In order to properly detect playing projects, add project names to
  // match phrases for the play triggerType.
  _updatePlayRegex() {
    var pattern =this.actions['play'].trigger.toString();
    var prefix = pattern.substring(1,pattern.length-1);
    var regexString = prefix + '|^(' + Object.keys(this.projects).map((projectName) => Utils.removeFillerWords(projectName).trim()).join(')$|^(') + ')$';
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
  // Communicate what a user can do at a given state.
  getSuggestedActions() {
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
      pm.say(`Here's something you can try. Say ${action.idealTrigger} to ${action.description}`);
      resolve();
    });
  }
  // Communicate the kinds of things Scratch can do.
  getKnownCommands() {
    var pm = this;
    return new Promise((resolve, reject) => {
      // Present action.
      var scratchCommandAbilities = ["respond to certain events", "play a sound"
      , "repeat actions", "execute if statements", "do basic math", "get random numbers",
      "say words out loud in different accents and in different voices",
      "listen for words", "make and modify lists and variables", "control a timer."]
      pm.say(`I know how to execute projects when you say the name of the project. I also know different Scratch commands. You can tell me to ${scratchCommandAbilities.join(', ')}`);
      // if (false) {
      //   // TODO: present paginated results instead of random.
      //   // var commandsChunked = someScratchCommands.chunk(3);
      //   // console.log(`chunked commands: ${commandsChunked}`);
      //   pm.say(`I can do lots of things. Here's 3 ${Utils.getNFromList(someScratchCommands, 3, -1)}`);
      //   // TODO: handle if the user asks "how do i tell you  to "scratch command".

      //   // TODO: another idea for how to approach this feature:
      //   // generate or expose examples of different commands.
      //   // how do i expose / organize that data
      // } else if (false) {
      //   // TODO: explore this?
      //   pm.say(`I have Scratch commands organized into N categories...`);
      // }
      resolve();
    });
  }
  // Communicate what Scratch commands are available.
  getScratchCommands() {
    var pm = this;
    return new Promise((resolve, reject) => {
      // Pick a random command from the Scratch Commands.
      let random_command = Utils.getNFromList(ScratchCommands, 1, -1)[0];
      // Present action. pick random thing from scratch_commands.json
      let possiblePrefixes = ['One thing I can do is', "Here's one. I can"];
      let prefix = Utils.getNFromList(possiblePrefixes, 1, -1)[0];
      pm.say(`${prefix} ${random_command.description}. Try by saying ${random_command.example_statement}`);
      resolve();
    });
  }
  getWhatScratchSaid() {
    this.say(`I said ${this.lastThingSaid}`);
  }
  getWhatUserSaid() {
    if (this.lastUserUtterance) {
      this.say(`I heard you say ${this.lastUserUtterance}`);
    } {
      this.say(`I didn't hear you say anything`);
    }
  }
}

module.exports = ScratchProjectManager;