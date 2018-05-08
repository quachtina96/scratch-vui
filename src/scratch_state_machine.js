/**
 * @fileoverview Defines a factory/constructor for the ScratchStateMachine
 *
 * @author quacht@mit.edu (Tina Quach)
 */
var ScratchStateMachine = new StateMachine.factory({
    init: 'Home',
    transitions: [
      { name: 'deleteProject', from: '*', to: function() { return this.state} },
      { name: 'editExistingProject', from: 'Home',  to: 'InsideProject' },
      { name: 'newProject', from: 'Home',  to: 'InsideProject' },
      // Return should take you back to the last state
      { name: 'return',   from: '*', to: function() {
          return this.history[this.history.length - 2];
        }
      }, {
        name: 'finishProject', from: 'InsideProject', to: 'Home'},
      { name: 'play', from: 'Home', to: 'PlayProject'},
      { name: 'play', from: 'PlayProject', to: 'PlayProject'},
      { name: 'newProject', from: 'PlayProject',  to: 'InsideProject' },
      { name: 'playCurrentProject', from: 'InsideProject', to: 'PlayProject'},
      { name: 'editProject', from: 'PlayProject', to: 'InsideProject' },
      // Support this.goto(STATE_NAME);
      { name: 'goto', from: '*', to: function(s) { return s } },
      { name: 'stay', from: '*', to: function() { return this.state} },
      { name: 'getCurrentProject', from: '*', to: function() { return this.state} },
      { name: 'getProjectNames', from: '*', to: function() { return this.state} },
      { name: 'getProjectCount', from: '*', to: function() { return this.state} },

    ],
    data: function() {
      return {
        projects: {},
        untitledCount: 0,
        // Project currently being edited
        projectToPlay: null,
        currentProject: null,
        synth: window.speechSynthesis,
        recognition: new webkitSpeechRecognition(),
        _triggers: {
          'newProject': /new project|create a? new project|create a? project|make a? new project|make a? project/,
          'deleteProject': /delete (.*) project/,
          'editExistingProject': /see inside (.*)|what's inside (.*)/,
          'editProject': /see inside|what's inside/,
          'finishProject': /i'm done|i'm finished/,
          'play': /scratch (.*)|scratch play (.*)|play (.*)/,
          'playCurrentProject': /play (?:the)? ?project|start (?:the)? ?project|play c(?:the)? ?urrent project|test (?:the)? ?project/,
          'return': /stop|i'm done|go back|quit|exit/,
          'getCurrentProject': /get (?:the)? ?current project|what project am i on|what’s my current project|what is my current project/,
          'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
          'getProjectCount': /how many projects do i have|how many projects have i made/
        }
      }
    },
    plugins: [
      new StateMachineHistory()     //  <-- plugin enabled here
    ],
    methods: {
      onGetCurrentProject: (lifecycle, scratch) => {
        if (scratch.currentProject) {
          scratch.say('The current project is ' + scratch.currentProject.name);
        } else {
          scratch.say('You are not currently on a project');
        }
      },
      onDeleteProject: (lifecycle, scratch, args, utterance) => {
        return new Promise(function(resolve, reject) {
          var projectToPlayName = args[1].trim();

          // play the project that matches!
          for (var projectName in scratch.projects) {
            if (Utils.removeFillerWords(projectName) == projectToPlayName) {
              scratch.say(projectName + ' project deleted.')
              delete scratch.projects[projectName];
              scratch.removeFromLocalStorage();
              resolve();
              return;
            }
          }

          // TODO: Does args[1] actually contain the project name as it is said?
          // or will the filler words be removed.
          scratch.say("You said " + utterance);
          scratch.say("I can't delete a project I don't have");
          resolve();
          scratch.return();
        })
      },
      onGetProjectNames: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          var whatToSay = Object.keys(scratch.projects);
          whatToSay.splice(whatToSay.length-1, 0, 'and');
          whatToSay.join(',')
          scratch.say(whatToSay);
          resolve();
        });
      },
      onGetProjectCount: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          var count = Object.keys(scratch.projects).length;
          scratch.say('You have ' + count + ' projects');
          resolve();
        });
      },
      onNewProject: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          console.log(scratch);
          scratch.currentProject = new ScratchProject(scratch);
          scratch.untitledCount++;
          scratch.projects['Untitled-' + scratch.untitledCount] = scratch.currentProject;
          scratch.currentProject.startProjectCreation();
          resolve();
        });
      },
      onReturn: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          scratch.say('Returning to previous state: ' + scratch.state);
          resolve();
        });
      },
      // Play existing project
      onPlay: (lifecycle, scratch, args, utterance) => {
        return new Promise(function(resolve, reject) {
          var projectToPlayName = args[1].trim();

          // play the project that matches!
          for (var projectName in scratch.projects) {
            if (Utils.removeFillerWords(projectName) == projectToPlayName) {
              scratch.currentProject = scratch.projects[projectName];
              scratch.say('playing project');
              scratch.executeProgram(scratch.currentProject.getScratchProgram());
              scratch.say('done playing project');
              resolve();
              return;
            }
          }

          // TODO: Does args[1] actually contain the project name as it is said?
          // or will the filler words be removed.
          scratch.say("You said " + utterance);
          scratch.say("I don't have a project called " + args[1]);
          resolve();
          scratch.return();
        })
      },
      onFinishProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.saveToLocalStorage();
          scratch._updatePlayRegex();
          // TODO: cue exiting project
          // Save project.
          resolve();
        });
      },
      onEditExistingProject: (lifecycle, scratch, args) => {
        return new Promise(function(resolve, reject) {
          console.log(args);
          var projectName = args[1];
          var stepCount = scratch.projects[projectName].instructions.length;
          scratch.say('Opening project ' + projectName + ' for editing');
          scratch.say('There are ' + stepCount + ' steps');
          resolve();
        });
      },
      onEditProject: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          scratch.say('Opening project ' + scratch.currentProject.name + ' for editing');
          // TODO: begin edit project flow.
          resolve();
        });
      },
      onPlayCurrentProject: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          scratch.saveToLocalStorage();
          scratch.say('Playing current project ' + scratch.currentProject.name);
          scratch.executeProgram(scratch.currentProject.getScratchProgram());
          scratch.say('done playing project');
          resolve();
        });
      },
      /**
       * Speak aloud given text.
       * @param {!String} whatToSay - text to say aloud.
       */
      say: function(whatToSay) {
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
      },
      executeProgram: function(scratchProgram) {
        // Assuming that the project can only be made of 'say' instructions
        for (var i = 1; i < scratchProgram.length; i++) {
          this.say(scratchProgram[i][1]);
        }
      },
      handleUtterance: function(utterance) {
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
            }
          }
        }

        if (this.state == 'PlayProject') {
          if (utterance == 'scratch stop') {
            this.synth.cancel();
          } else if (utterance == 'scratch pause') {
            this.synth.pause();
          } else if (utterance == 'scratch resume' || utterance == 'scratch unpause') {
            this.synth.resume();
          }
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
      },
      removeFromLocalStorage: function(projectName) {
        if (window.localStorage.scratchProjects) {
          var savedProjects = JSON.parse(window.localStorage.scratchProjects);
          delete savedProjects[projectName];
          window.localStorage.scratchProjects = JSON.stringify(savedProjects);
        }
      },
      saveToLocalStorage: function() {
        if (!window.localStorage.scratchProjects) {
          window.localStorage.scratchProjects = JSON.stringify({});
        }
        for (var projectName in this.projects) {
          var savedProjects = JSON.parse(window.localStorage.scratchProjects);
          savedProjects[projectName] = this.projects[projectName].instructions;
          window.localStorage.scratchProjects = JSON.stringify(savedProjects);
        }
      },
      loadFromLocalStorage: function() {
        var savedProjects = JSON.parse(window.localStorage.scratchProjects);
        for (var name in savedProjects) {
          this.projects[name] = new ScratchProject(scratch);
          this.projects[name].name = name;
          this.projects[name].instructions = savedProjects[name];
        }
      },
      // In order to properly detect playing projects, add project names to
      // match phrases for the play triggerType.
      _updatePlayRegex: function() {
        var pattern = this._triggers['play'].toString();
        var prefix = pattern.substring(1,pattern.length-1);
        var regexString = prefix + '|(' + Object.keys(this.projects).map((projectName) => Utils.removeFillerWords(projectName).trim()).join(')|(') + ')';
        this._triggers['play'] = new RegExp(regexString, "i");
      },
      updateGrammarWithProjects: () => {
        var grammar = `#JSGF V1.0;
        grammar scratch_state_machine.project; \n
        <project> =` + Object.keys(this.projects).join('|') + ';\n';
        this.recognition.grammars.addFromString(grammar, 1);
      }
    }
  });