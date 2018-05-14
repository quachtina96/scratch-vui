/**
 * @fileoverview Defines a factory/constructor for the ScratchStateMachine
 *
 * @author quacht@mit.edu (Tina Quach)
 */
const StateMachine = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const ScratchProjectManager = require('./scratch_project_manager.js');
const Utils = require('./utils.js');
const ScratchGrammar = require('./grammar.js');


var ScratchStateMachine = new StateMachine.factory({
  init: 'Home',
  transitions: [
    { name: 'renameCurrentProject', from: '*', to: function() { return this.state} },
    { name: 'renameProject', from: '*', to: function() { return this.state} },
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
      // Triggers should be listed from more specific to more general to
      // ensure that the best fit trigger gets matched to the utterance.
      _triggers: {
        'newProject': /new project|create a? new project|create a? project|make a? new project|make a? project/,
        'deleteProject': /delete (.*) project/,
        'renameCurrentProject': /rename current project to (.*)/,
        'renameProject': /change name of (.*) project to (.*)/,
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
    onRenameCurrentProject: (lifecycle, scratch, args) => {
      if (scratch.currentProject) {
        var newName = args[1];
        scratch.renameProject(scratch, scratch.currentProject.name, newName);
        scratch.say('The current project is now called ' + scratch.currentProject.name);
      } else {
        scratch.say('You are not currently on a project');
        // TODO(quacht): support an interaction where instead of the above,
        // scratch also says and responds to
        // What project would you like to rename?
      }
    },
    onRenameProject: (lifecycle, scratch, args) => {
        var oldName = args[1];
        var newName = args[2];

        // play the project that matches!
        for (var projectName in scratch.projects) {
          if (scratch._removeFillerWords(projectName) == oldName) {
            scratch.renameProject(scratch, projectName, newName)
            scratch.say('Renamed ' + projectName + ' to ' + newName)
            return;
          }
        }

        scratch.say('The current project is ' + scratch.currentProject.name);
        scratch.say('You are not currently on a project');
        // TODO(quacht): support an interaction where instead of the above,
        // scratch also says and responds to
        // What project would you like to rename?
    },
    onDeleteProject: (lifecycle, scratch, args, utterance) => {
      return new Promise(function(resolve, reject) {
        var projectToPlayName = args[1].trim();

        // play the project that matches!
        for (var projectName in scratch.projects) {
          if (Utils.removeFillerWords(projectName) == projectToPlayName) {
            scratch.say(projectName + ' project deleted.')
            delete scratch.projects[projectName];
            scratch.removeFromLocalStorage(projectName);
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
            scratch.executeCurrentProject(scratch, 'FromStart');
            // TODO(quacht): saying I'm done playing the project doesnt work
            // here when doing event handling.
            // scratch.say('done playing project');
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
        scratch.executeCurrentProject(scratch, 'FromStart');
        scratch.say('done playing project');
        resolve();
      });
    },
  }
});

module.exports = ScratchStateMachine;
