/**
 * @fileoverview Defines a factory/constructor for the ScratchStateMachine
 *
 * @author quacht@mit.edu (Tina Quach)
 */
var ScratchStateMachine = new StateMachine.factory({
    init: 'Home',
    transitions: [
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
      { name: 'getProjectNames', from: '*', to: function() { return this.state} },
      { name: 'getProjectCount', from: '*', to: function() { return this.state} }
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
          'newProject': /new project|create new project|create project|make new project|make project/,
          'editExistingProject': /see inside (.*)/,
          'editProject': /see inside/,
          'finishProject': /i'm done|i'm finished/,
          'play': /scratch (.*)|scratch play (.*)|play (.*)|(.*)/,
          'playCurrentProject': /play project|start project|play current project|test project/,
          'return': /stop|i'm done|go back|quit|exit/,
          'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
          'getProjectCount': /how many projects do i have|how many projects have i made/
        }
      }
    },
    plugins: [
      new StateMachineHistory()     //  <-- plugin enabled here
    ],
    methods: {
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
      onNewProject: (lifecycle, scratc) => {
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
      onPlay: (lifecycle, scratch, args) => {
        return new Promise(function(resolve, reject) {
          var projectName = args[1].trim();
          if (projectName in scratch.projects) {
            scratch.currentProject = scratch.projects[projectName];
            scratch.say('playing project');
            scratch.executeProgram(scratch.currentProject.getScratchProgram());
            // TODO: cue the start and
            scratch.say('done playing project');
            resolve();
          } else {
            resolve();
            scratch.return();
          }
        })
      },
      onFinishProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.saveToLocalStorage();
          // TODO: cue exiting project
          // Save project.
          resolve();
        });
      },
      onEditExistingProject: (lifecycle, scratch, projectName) => {
        return new Promise(function(resolve, reject) {
          scratch.say('Opening project ' + projectName + ' for editing');
          // TODO: begin edit project flow.
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
      say: function(whatToSay) {
        var whatToSay = new SpeechSynthesisUtterance(whatToSay);
        var scratch = this;
        console.log('stopping recognition')
        this.recognition.stop();
        this.synth.speak(whatToSay);
        console.log(whatToSay.text)
        whatToSay.onend = function(event) {
          console.log('starting recog')
          scratch.recognition.start();
        }
      },
      executeProgram: function(scratchProgram) {
        // Assuming that the project can only be made of 'say' instructions
        for (var i = 1; i < scratchProgram.length; i++) {
          this.say(scratchProgram[i][1]);
          while (this.synth.speaking) {
            // block execution?
          }
        }
      },
      handleUtterance: function(utterance) {
        var lowercase = utterance.toLowerCase();
        var trigger = this._removeFillerWords(lowercase).trim();

        var scratch = this;

        // Attempt to match utterance to trigger.
        for (var commandType in this._triggers) {
          var args = Utils.match(utterance, this._triggers[commandType]);
          if (args) {

            if (this.can(commandType)) {
              try {
                this[commandType](scratch, args);
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
      _removeFillerWords: function(utterance) {
        var filler_words = ["the", "a", "um", "uh", "er", "ah", "like"];

        var utterance = utterance.toLowerCase();
        var stripped = utterance.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, "");
        var tokens = stripped.split(' ');
        var result = tokens.filter(token => filler_words.indexOf(token) == -1);
        return result.join(' ');
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
      updateGrammarWithProjects: () => {
        var grammar = `#JSGF V1.0;
        grammar scratch_state_machine.project; \n
        <project> =` + Object.keys(this.projects).join('|') + ';\n';
        this.recognition.grammars.addFromString(grammar, 1);
      }
    }
  });