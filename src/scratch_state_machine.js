/**
 * @fileoverview Defines a factory/constructor for the ScratchStateMachine
 *
 * @author quacht@mit.edu (Tina Quach)
 */
var ScratchStateMachine = new StateMachine.factory({
    init: 'Home',
    transitions: [
      { name: 'newProject',     from: 'Home',  to: 'InsideProject' },
      // Return should take you back to the last state
      { name: 'return',   from: '*', to: function() {
          return scratch.history[scratch.history.length - 2];
        }
      }, {
        name: 'finishProject', from: 'InsideProject', to: 'Home'},
      { name: 'play', from: 'Home', to: 'PlayProject'},
      { name: 'playCurrentProject', from: 'InsideProject', to: 'PlayProject'},
      { name: 'editProject', from: 'PlayProject', to: 'InsideProject' },
      // Support scratch.goto(STATE_NAME);
      { name: 'goto', from: '*', to: function(s) { return s } }
    ],
    data: function() {
      // TODO: initialize projects based on data saved in browser.
      return {
        projects: [],
        untitledCount: 0,
        // Project currently being edited
        projectToPlay: null,
        currentProject: null,
        synth: window.speechSynthesis,
        recognition: new webkitSpeechRecognition(),
        _triggers: {
          'newProject': ["new project","create new project", "create project", "make new project", "make project"],
          'editProject': ["see inside"],
          'finishProject': ["i'm done", "i'm finished"],
          'play': [],
          'playCurrentProject': ["play project", "start project"],
          'return': ["stop", "i'm done", "go back", "quit", "exit"]
        }
      }
    },
    plugins: [
      new StateMachineHistory()     //  <-- plugin enabled here
    ],
    methods: {
      onNewProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.currentProject = new ScratchProject(scratch);
          scratch.untitledCount++;
          scratch.projects['Untitled-' + scratch.untitledCount] = scratch.currentProject
          resolve();
        });
      },
      onReturn: function() {
        return new Promise(function(resolve, reject) {
          scratch.say('Returning to previous state: ' + scratch.state);
          resolve();
        });
      },
      // in order to trigger the play project state, the user must just say
      // Scratch, name of existing project.
      onPlay: function() {
        return new Promise(function(resolve, reject) {
          var project = scratch.projectToPlay;
          scratch.say('Playing project ' + project.name);
          scratch.executeProgram(project.getScratchProgram());
          // TODO: cue the start and
          scratch.say('the end');
          resolve();
        })
      },
      onFinishProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.say('We are no longer editing ' + scratch.currentProject.name);
          resolve();
        });
      },
      onEditProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.say('Opening project ' + scratch.currentProject.name + ' for editing');
          // TODO: begin edit project flow.
          resolve();
        });
      },
      onPlayCurrentProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.say('Playing current project ' + scratch.currentProject.name);
          resolve();
        });
      },
      say: function(whatToSay) {
        var whatToSay = new SpeechSynthesisUtterance(whatToSay);
          console.log('saying ' + whatToSay.text);
          scratch.synth.speak(whatToSay);
      },
      executeProgram: function(scratchProgram) {
        // Assuming that the project can only be made of 'say' instructions
        for (var i = 1; i < scratchProgram.length; i++) {
          scratch.say(scratchProgram[i][1]);
        }
      },
      handleUtterance: function(utterance) {
        utterance = utterance.trim();
        // Handle utterances that switch context.
        var triggerType = scratch._getTriggerType(utterance);
        if (triggerType) {
          if (scratch.can(triggerType)) {

            if (triggerType == 'play') {
              scratch.projectToPlay = scratch.projects[utterance];
            }

            scratch[triggerType]();
            console.log('executing code on ' + scratch.state);
          } else {
            console.log('could not make transition: ' + triggerType);
          }
        } else if (scratch.state == 'InsideProject') {
          // Handle utterances in the InsideProject context.
          var result = scratch.currentProject.handleUtterance(utterance);
          if (result == 'exit') {
            scratch.finishProject();
          }

        } else if (utterance.toLowerCase().indexOf('scratch') != -1) {
          // TODO: integrate Scratch, Help!
          console.log('found Scratch in failed utterance');
          scratch.say("I don't know how to do that.");
        }
      },
      _getTriggerType: function(utterance) {
        // Filter utterance for filler words.
        var lowercase = utterance.toLowerCase();
        var trigger = scratch._removeFillerWords(lowercase).trim();

        // Update list of projects that can be triggered.
        this._triggers['play'] = Object.keys(scratch.projects).map((projectName) => scratch._removeFillerWords(projectName.trim()));

        for (var triggerType in this._triggers) {
          var matching_phrases = this._triggers[triggerType];

          // TODO: implement flexibility by accepting a trigger to CONTAIN
          // the matching phrase.
          if (matching_phrases.indexOf(trigger) >= 0 && scratch.can(triggerType)) {
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
      }
    }
  });