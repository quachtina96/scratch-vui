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
      { name: 'stay', from: '*', to: function() { return this.state} }
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
          'newProject': ["new project","create new project", "create project", "make new project", "make project"],
          'editExistingProject': ["see inside"],
          'editProject': ["see inside"],
          'finishProject': ["i'm done", "i'm finished"],
          'play': [],
          'playCurrentProject': ["play project", "start project"],
          'return': ["stop", "i'm done", "go back", "quit", "exit"],
          'getProjectNames': ["what projects do i have", "what have i made so far"],
          'getProjectCount': ["how many projects do i have", "how many projects have i made"]
        }
      }
    },
    plugins: [
      new StateMachineHistory()     //  <-- plugin enabled here
    ],
    methods: {
      getProjectNames: function() {
        var whatToSay = Object.keys(this.projects);
        whatToSay.splice(whatToSay.length-1, 0, 'and');
        whatToSay.join(',')
        this.say(whatToSay);
      },
      getProjectCount: function() {
        var count = Object.keys(this.projects).length;
        this.say('You have ' + count + ' projects');
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
      // in order to trigger the play project state, the user must just say
      // Scratch, name of existing project.
      onPlay: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          var project = scratch.projectToPlay;
          scratch.currentProject = scratch.projectToPlay;
          scratch.say('playing project');
          scratch.executeProgram(project.getScratchProgram());
          // TODO: cue the start and
          scratch.say('done playing project');
          resolve();
        })
      },
      onFinishProject: function() {
        return new Promise(function(resolve, reject) {
          // TODO: cue exiting project
          // Save project.
          resolve();
        });
      },
      onEditExistingProject: (lifecycle, scratch) => {
        return new Promise(function(resolve, reject) {
          scratch.say('Opening project ' + scratch.currentProject.name + ' for editing');
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
          scratch.say('Playing current project ' + scratch.currentProject.name);
          resolve();
        });
      },
      say: function(whatToSay) {
        var whatToSay = new SpeechSynthesisUtterance(whatToSay);
        var scratch = this;
        this.recognition.stop();
        this.synth.speak(whatToSay);
        whatToSay.onend = function(event) {
          scratch.recognition.start();
        }
      },
      executeProgram: function(scratchProgram) {
        // Assuming that the project can only be made of 'say' instructions
        for (var i = 1; i < scratchProgram.length; i++) {
          this.say(scratchProgram[i][1]);
        }
      },
      _setCurrentProject: function(projectName) {
        for (var name in this.projects) {
          if (projectName == name) {
            this.currentProject = this.projects[name];
            return true;
          }
        }
        return false;
      },
      handleUtterance: function(utterance)  {
        utterance = utterance.trim();
        // Handle utterances that switch context.
        var triggerType = this._getTriggerType(utterance);
        if (triggerType) {
          if (this.can(triggerType) || triggerType.startsWith('get')) {

            if (triggerType == 'editExistingProject') {
              // see if the utterance asks to see inside a specific project.
              var matches = utterance.match('see inside (.*)')
              if (matches) {
                var nameOfDesiredProject = matches[1];
                success = this._setCurrentProject(nameOfDesiredProject);
                if (!success) {
                  this.say("There's no project called " + nameOfDesiredProject);
                }
              } else {
                triggerType = 'stay';
              }
            }

            this[triggerType](this);
            console.log('executing code on ' + this.state);
          } else if (triggerType == 'play' && this.state == 'InsideProject') {
            if (this.currentProject.state == 'empty') {
              // User is trying to give a project the same name as a previous
              // project.
              this.say('You already have a project called that.')
            } else {
              // User is composing a Scratch program from other Scratch programs.
              var result = this.currentProject.handleUtterance(utterance);
            }
          } else {
            console.log('could not make transition: ' + triggerType);
          }
        } else if (this.state == 'PlayProject') {
          if (utterance == 'scratch stop') {
            this.synth.cancel();
          } else if (utterance == 'scratch pause') {
            this.synth.pause();
          } else if (utterance == 'scratch resume' || utterance == 'scratch unpause') {
            this.synth.resume();
          }
        } else if (this.state == 'InsideProject') {
          // Handle utterances in the InsideProject context.
          var result = this.currentProject.handleUtterance(utterance);
          if (result == 'exit') {
            this.finishProject();
          }
        } else if (utterance.toLowerCase().indexOf('scratch') != -1) {
          // TODO: integrate Scratch, Help!
          console.log('found Scratch in failed utterance');
          this.say("I don't know how to do that.");
        }
      },
      _matches: (matching_phrases, trigger) => {
        for (let phrase of matching_phrases) {
          if (trigger.indexOf(phrase) != -1) {
            return true;
          }
        }
        return false;
      },
      _getTriggerType: function(utterance) {
        // Filter utterance for filler words.
        var lowercase = utterance.toLowerCase();
        var trigger = this._removeFillerWords(lowercase).trim();

        // Update list of projects that can be triggered.
        this._triggers['play'] = Object.keys(this.projects).map(
            (projectName) => 'scratch ' + this._removeFillerWords(projectName.trim()));
        this._triggers['play'] = this._triggers['play'].concat(
          Object.keys(this.projects).map(
            (projectName) => this._removeFillerWords(projectName.trim())));

        for (var triggerType in this._triggers) {
          var matching_phrases = this._triggers[triggerType];

          // TODO: implement flexibility by accepting a trigger to CONTAIN
          // the matching phrase.
          if (this._matches(matching_phrases, trigger)) {
            if (triggerType == 'play') {
              var getName = function(string) {
                var pattern = /scratch (.*)/;
                var matches = utterance.match(pattern);
                if (matches && matches.length > 0) {
                  return matches[1].trim();
                } else {
                  return utterance.trim();
                }
              }
              this.projectToPlay = this.projects[getName(utterance)];
            }
            return triggerType;
          }
        }
        return null;
        console.log('no matches for ' + utterance);
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
      }
    }
  });