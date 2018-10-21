/**
 * @fileoverview Defines a factory/constructor for the ScratchStateMachine
 *
 * @author quacht@mit.edu (Tina Quach)
 */
const StateMachine = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const ScratchVUIStorage = require('./storage.js');
const ScratchProjectManager = require('./scratch_project_manager.js');
const Utils = require('./utils.js');
const ScratchGrammar = require('./grammar.js')

// ScratchVM Dependencies
const VirtualMachine = require("scratch-vm");
const ScratchStorage = require("scratch-storage");
const ScratchRender = require("scratch-render");
const SB2BitmapAdapter = require("scratch-svg-renderer").BitmapAdapter;
const SB2SVGAdapter = require("scratch-svg-renderer").SVGRenderer;
const AudioEngine = require("scratch-audio");


const ScratchNLPEndpointURL = "http://127.0.0.1:5000/"
const ASSET_SERVER = 'https://cdn.assets.scratch.mit.edu/';
const PROJECT_SERVER = 'https://cdn.projects.scratch.mit.edu/';

/**
 * @param {Asset} asset - calculate a URL for this asset.
 * @returns {string} a URL to download a project file.
 */
const getProjectUrl = function (asset) {
    const assetIdParts = asset.assetId.split('.');
    const assetUrlParts = [PROJECT_SERVER, 'internalapi/project/', assetIdParts[0], '/get/'];
    if (assetIdParts[1]) {
        assetUrlParts.push(assetIdParts[1]);
    }
    return assetUrlParts.join('');
};

/**
 * @param {Asset} asset - calculate a URL for this asset.
 * @returns {string} a URL to download a project asset (PNG, WAV, etc.)
 */
const getAssetUrl = function (asset) {
    const assetUrlParts = [
        ASSET_SERVER,
        'internalapi/asset/',
        asset.assetId,
        '.',
        asset.dataFormat,
        '/get/'
    ];
    return assetUrlParts.join('');
};

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
    { name: 'play', from: 'InsideProject', to: 'PlayProject'},
    { name: 'play', from: 'PlayProject', to: 'PlayProject'},
    { name: 'newProject', from: 'PlayProject',  to: 'InsideProject' },
    { name: 'playCurrentProject', from: 'PlayProject', to: 'PlayProject'},
    { name: 'playCurrentProject', from: 'InsideProject', to: 'PlayProject'},
    { name: 'editProject', from: 'PlayProject', to: 'InsideProject' },
    // Support this.goto(STATE_NAME);
    { name: 'goto', from: '*', to: function(s) { return s } },
    { name: 'stay', from: '*', to: function() { return this.state} },
    { name: 'getCurrentProject', from: '*', to: function() { return this.state} },
    { name: 'getNthProject', from: '*', to: function() { return this.state} },
    { name: 'getProjectNames', from: '*', to: function() { return this.state} },
    { name: 'getProjectCount', from: '*', to: function() { return this.state} },
    { name: 'queryState', from: '*', to: function() { return this.state} },
    { name: 'stopBackground', from: '*', to: function() {return this.state} },
    { name: 'stopCues', from: '*', to: function() {return this.state} },
    { name: 'startBackground', from: '*', to: function() {return this.state} },
    { name: 'startCues', from: '*', to: function() {return this.state} }
  ],
  data: function() {
    var ssm = this;
    return {
      pm: new ScratchProjectManager(ssm),
      vm: new VirtualMachine(),
      // TODO: add flow for asking for the user's name when working with the
      // Scratch...
      user: "tina"
    };
  },
  plugins: [
    new StateMachineHistory()     //  <-- plugin enabled here
  ],
  methods: {
    // Initialize the state machine.
    onHome: function() {
      this.pm.audio.cueHomeState()
      this.setupVM('scratch-stage')
      this.pm.load();
      this.setMethods();
      this.pm._updatePlayRegex();
    },
    setupVM: function(scratch_stage_canvas_id) {
      const storage = new ScratchStorage(); /* global ScratchStorage */
      const AssetType = storage.AssetType;
      storage.addWebSource([AssetType.Project], getProjectUrl);
      storage.addWebSource([AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound], getAssetUrl);
      this.vm.attachStorage(storage);

      // Instantiate the renderer and connect it to the VM.
      const canvas = document.getElementById('scratch-stage');
      const renderer = new ScratchRender(canvas);
      this.vm.attachRenderer(renderer);
      const bitmapAdapter = new SB2BitmapAdapter();
      const svgAdapter = new SB2SVGAdapter();
      this.vm.attachV2BitmapAdapter(bitmapAdapter);
      this.vm.attachV2SVGAdapter(svgAdapter);
      const audioEngine = new AudioEngine();
      this.vm.attachAudioEngine(audioEngine);

      // Feed mouse events as VM I/O events.
      document.addEventListener('mousemove', e => {
          const rect = canvas.getBoundingClientRect();
          const coordinates = {
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              canvasWidth: rect.width,
              canvasHeight: rect.height
          };
          this.vm.postIOData('mouse', coordinates);
      });
      canvas.addEventListener('mousedown', e => {
          const rect = canvas.getBoundingClientRect();
          const data = {
              isDown: true,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              canvasWidth: rect.width,
              canvasHeight: rect.height
          };
          this.vm.postIOData('mouse', data);
          e.preventDefault();
      });
      canvas.addEventListener('mouseup', e => {
          const rect = canvas.getBoundingClientRect();
          const data = {
              isDown: false,
              x: e.clientX - rect.left,
              y: e.clientY - rect.top,
              canvasWidth: rect.width,
              canvasHeight: rect.height
          };
          this.vm.postIOData('mouse', data);
          e.preventDefault();
      });

      // Feed keyboard events as VM I/O events.
      document.addEventListener('keydown', e => {
          // Don't capture keys intended for Blockly inputs.
          if (e.target !== document && e.target !== document.body) {
              return;
          }
          this.vm.postIOData('keyboard', {
              keyCode: e.keyCode,
              isDown: true
          });
          e.preventDefault();
      });
      document.addEventListener('keyup', e => {
          // Always capture up events,
          // even those that have switched to other targets.
          this.vm.postIOData('keyboard', {
              keyCode: e.keyCode,
              isDown: false
          });
          // E.g., prevent scroll.
          if (e.target !== document && e.target !== document.body) {
              e.preventDefault();
          }
      });

      // Add scratch-vm event listeners.
      this.vm.runtime.on('SCRIPT_GLOW_OFF', () => {
        // Play the sound cue when the project stops playing.
        this.pm.audio.cueProjectFinished();
      });


      // Run threads
      this.vm.start();
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
        onGetCurrentProject: () => {this.pm.getCurrentProject()},
        onRenameCurrentProject: (lifecycle, args) => {this.pm.renameCurrentProject(lifecycle, args)},
        onRenameProject: (lifecycle, args) => {this.pm.renameSpecifiedProject(lifecycle, args)},
        onDeleteProject: (lifecycle, args, utterance) => {this.pm.deleteProject(lifecycle, args, utterance)},
        onGetProjectNames: () => {this.pm.getProjectNames()},
        onGetProjectCount: () => {this.pm.getProjectCount()},
        onGetNthProject: (lifecycle, args) => {this.pm.getNthProject(lifecycle, args)},
        onNewProject: () => {this.pm.newProject()},
        onReturn: (lifecycle, args) => {this.pm.returnToPreviousState(lifecycle, args)},
        // Play existing project
        onPlay: (lifecycle, args, utterance) => {this.pm.play(lifecycle, args, utterance)},
        onFinishProject: () => {this.pm.finishProject()},
        onEditExistingProject: (lifecycle, args) => {this.pm.editExistingProject(lifecycle, args)},
        onEditProject: () => {this.pm.editProject()},
        onPlayCurrentProject: () => {this.pm.playCurrentProject()},
        onQueryState: () => {this.pm.queryState()},
        onStopBackground: () => {
          this.pm.audio.stopBackground();
          this.pm.audio.muteBackground = true;
        },
        onStopCues: () => {this.pm.audio.muteCues = true},
        onStartBackground: () => {
          this.pm.audio.muteBackground = false;
          this.pm.audio.cueBackground(this.state);
        },
        onStartCues: () => {this.pm.audio.muteCues = false},
        onHome: () => {this.pm.audio.cueHomeState()},
        onPlayProject: () => {this.pm.audio.stopBackground()},
      }
      for (var method in methodMap) {
        this[method] = methodMap[method];
      }
    }
  }
});

module.exports = ScratchStateMachine;
