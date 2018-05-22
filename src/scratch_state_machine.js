/**
 * @fileoverview Defines a factory/constructor for the ScratchStateMachine
 *
 * @author quacht@mit.edu (Tina Quach)
 */
const StateMachine = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const ScratchStorage = require('./storage.js');
const ScratchProjectManager = require('./scratch_project_manager.js');
const Utils = require('./utils.js');

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
    var ssm = this;
    console.log('hieeee')
    console.log('ssm')
    console.log(ssm)
    console.log('this')
    console.log(this)
    return {
      pm: new ScratchProjectManager(ssm)
    };
  },
  plugins: [
    new StateMachineHistory()     //  <-- plugin enabled here
  ],
  methods: {
    // Initialize the state machine.
    onHome: function() {
      if (!window.localStorage.scratchProjects) {
        window.localStorage.scratchProjects = JSON.stringify({});
      } else {
        ScratchStorage.load();
      }
      this.setMethods();
      this.pm._updatePlayRegex();
    },
    setSpeechRecognition: function() {
      this.pm.updateGrammarWithProjects.bind(this);
      this.pm.recognition.grammars.addFromString(ScratchGrammar.commands);
      this.pm.recognition.grammars.addFromString(ScratchGrammar.numbers);
      this.pm.recognition.grammars.addFromString(ScratchGrammar.sounds);
    },
    setMethods: function() {
      methodMap = {
        handleUtterance: (utterance) => {this.pm.handleUtterance(utterance)},
        onHome: (lifecycle, args) => {this.pm.initialize},
        onGetCurrentProject: (lifecycle, args) => {this.pm.getCurrentProject},
        onRenameCurrentProject: (lifecycle, args) => {this.pm.renameCurrentProject},
        onRenameProject: (lifecycle, args) => {this.pm.renameSpecifiedProject},
        onDeleteProject: (lifecycle, args) => {this.pm.deleteProject},
        onGetProjectNames: (lifecycle, args) => {this.pm.getProjectNames},
        onGetProjectCount: (lifecycle, args) => {this.pm.getProjectCount},
        onNewProject: (lifecycle, args) => {this.pm.newProject},
        onReturn: (lifecycle, args) => {this.pm.returnToPreviousState},
        // Play existing project
        onPlay: (lifecycle, args, utterance) => {this.pm.play},
        onFinishProject: (lifecycle, args) => {this.pm.finishProject},
        onEditExistingProject: (lifecycle, args) => {this.pm.editExistingProject},
        onEditProject: (lifecycle, args) => {this.pm.editProject},
        onPlayCurrentProject: (lifecycle, args) => {this.pm.playCurrentProject},
      }
      for (var method in methodMap) {
        this[method] = methodMap[method];
      }
    }
  }
});

module.exports = ScratchStateMachine;
