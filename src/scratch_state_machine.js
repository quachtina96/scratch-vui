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

// Scratch Sound Recording
const AudioRecorder = require("./audio_recorder.js").default;
const RecordingsManager = require("./recordings_manager.js");

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
    // TODO: disable inside to inside project
    { name: 'editExistingProject', from: ['PlayProject', 'Home','NavigatingAList', 'InsideProject'],  to: 'InsideProject' },
    { name: 'createANewProject', from: ['Home', 'PlayProject', 'NavigatingAList'],  to: 'InsideProject' },
    { name: 'createANewProjectCalled', from: ['Home', 'PlayProject', 'NavigatingAList'],  to: 'InsideProject' },
    // Return should take you back to the last state
    { name: 'return',   from: '*', to: function() {
        return this.history[this.history.length - 2];
      }
    },
    { name: 'goHome', from: '*', to: 'Home'},
    { name: 'finishProject', from: 'InsideProject', to: 'Home'},
    { name: 'play', from: ['Home', 'NavigatingAList','PlayProject'], to: 'PlayProject'},
    { name: 'editProjectWithoutIntro', from: 'PlayProject', to: 'InsideProject'},
    { name: 'editProject', from: ['PlayProject', 'Home', 'NavigatingAList'], to: 'InsideProject'},
    // { name: 'play', from: 'InsideProject', to: 'PlayProject'}, // disable ability to play a project when inside project to prevent conflicts between commands
    { name: 'playCurrentProject', from: ['PlayProject', 'InsideProject'], to: 'PlayProject'},
    { name: 'goto', from: '*', to: function(s) { return s } },
    { name: 'stay', from: '*', to: function() { return this.state} },
    { name: 'getCurrentProject', from: '*', to: function() { return this.state} },
    { name: 'getNthProject', from: '*', to: function() { return this.state} },
    { name: 'getProjectNames', from: '*', to: 'NavigatingAList'},
    { name: 'getProjectCount', from: '*', to: function() { return this.state} },
    { name: 'queryState', from: '*', to: function() { return this.state} },
    { name: 'stopBackground', from: '*', to: function() {return this.state} },
    { name: 'stopCues', from: '*', to: function() {return this.state} },
    { name: 'startBackground', from: '*', to: function() {return this.state} },
    { name: 'startCues', from: '*', to: function() {return this.state} },
    { name: 'holdOn', from: '*', to: function() {return this.state} },
    { name: 'listen', from: '*', to: function() {return this.state} },
    { name: 'getSounds', from: '*', to: 'NavigatingAList'},
    { name: 'checkSound', from: '*', to: 'NavigatingAList'},
    { name: 'stopProject', from: 'PlayProject', to: function() {
        return this.history[this.history.length - 2];
      }
    },
    { name: 'queryActions', from: '*', to: function() {return this.state} }, // todo?:listnav
    { name: 'getKnownCommands', from: '*', to: function() {return this.state} }, // todo?:listnav
    { name: 'getScratchCommands', from: '*', to: function() {return this.state} }, // todo?:listnav
    { name: 'getWhatYouSaid', from: '*', to: function() {return this.state} },
    { name: 'getWhatISaid', from: '*', to: function() {return this.state} },
    { name: 'greet', from: '*', to: function() {return this.state} },
    // Sound Recording State Changes
    { name: 'getRecordings', from: '*', to: 'NavigatingAList'},
    { name: 'recordASound', from: '*', to: 'Recording'},
    { name: 'stopRecording', from: 'Recording', to: function() {
        return this.history[this.history.length - 2];
      } },
    { name: 'playARecording', from: '*', to: function() {return this.state} },
    { name: 'renameRecording', from: '*', to: function() {return this.state} },
        // Go back to the previous state when you're done navigating a list.
    { name: 'finishNavigatingList', from: 'NavigatingAList', to: function() {
        return this.history[this.history.length - 2];
      }
    },
  ],
  data: function() {
    var ssm = this;
    return {
      pm: new ScratchProjectManager(ssm),
      vm: new VirtualMachine(),
      audioRecorder: new AudioRecorder(),
      recordingsManager: new RecordingsManager(),
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
      if (!this.pm.audio.muteBackground) {
        this.pm.audio.cueHomeState()
      }

      this.setupVM('scratch-stage');
      this.pm.load();
      this.setMethods();
      this.pm._updatePlayRegex();

      // // Only introduce if the browser has never interacted with Scratch before.
      // if (window.localStorage.scratchVuiInteractedBefore == "false") {
      //   this.introduceSelf();
      //   console.log('window.localStorage.scratchVuiInteractedBefore is true')
      //   window.localStorage.scratchVuiInteractedBefore = "true";
      // }
      this.introduceSelf();

      this.recordingsManager.vm = this.vm;
      // Start listening and define handlers for the audio recorder.
      var handleStarted = () => {console.log('started recording')};
      var handleLevelUpdate = () => {};
      var handleRecordingError = () => {console.log('recording error')};
      this.audioRecorder.startListening(handleStarted, handleLevelUpdate, handleRecordingError);
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

      this.vm.loadProject(this.recordingsManager.baseProject);
    },
    setSpeechRecognition: function() {
      this.pm.updateGrammarWithProjects.bind(this);
      this.pm.recognition.grammars.addFromString(ScratchGrammar.commands);
      this.pm.recognition.grammars.addFromString(ScratchGrammar.numbers);
      this.pm.recognition.grammars.addFromString(ScratchGrammar.sounds);
    },
    setMethods: function() {
      methodMap = {
        handleUtterance: async (utterance) => {return await this.pm.handleUtterance(utterance)},
        onGetCurrentProject: () => {this.pm.getCurrentProject()},
        onRenameCurrentProject: (lifecycle, args) => {this.pm.renameCurrentProject(lifecycle, args)},
        onRenameProject: (lifecycle, args) => {this.pm.renameSpecifiedProject(lifecycle, args)},
        onDeleteProject: (lifecycle, args, utterance) => {this.pm.deleteProject(lifecycle, args, utterance)},
        onGetProjectNames: () => {this.pm.getProjectNames()},
        onGetProjectCount: () => {this.pm.getProjectCount()},
        onGetNthProject: (lifecycle, args) => {this.pm.getNthProject(lifecycle, args)},
        onCreateANewProjectCalled: (lifecycle, args) => {this.pm.createANewProjectCalled(lifecycle,args)},
        onCreateANewProject: () => {this.pm.createANewProject()},
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
          this.pm.audio.setMute("muteBackground", true);
        },
        onStopCues: () => {this.pm.audio.setMute("muteCues", true)},
        onStopProject: () => {this.vm.stopAll();},
        onStartBackground: () => {
          this.pm.audio.setMute("muteBackground", false);
          this.pm.audio.cueBackground(this.state);
        },
        onStartCues: () => {this.pm.audio.setMute("muteCues", false)},
        onHoldOn: () => {this.pm.listening = false; this.pm.say("I won't respond until you say listen");},
        onListen: () => {
          this.pm.listening = true;
          this.pm.say("listening!");
        },
        onHome: () => {
          if (!this.pm.audio.muteBackground) {
            this.pm.audio.cueHomeState()
          } else {
            this.pm.say("You're in the home state.")
          }
        },
        onPlayProject: () => {this.pm.audio.stopBackground()},
        onGetSounds: () => {this.pm.getSounds()},
        onQueryActions: () => {this.pm.getSuggestedActions()},
        onCheckSound: (lifecycle, args) => {this.pm.checkSound(lifecycle, args)},
        onGetKnownCommands: () => {this.pm.getKnownCommands()},
        onGetScratchCommands: () => {this.pm.getScratchCommands()},
        onGetWhatYouSaid: () => {this.pm.getWhatScratchSaid()},
        onGetWhatISaid: () => {this.pm.getWhatUserSaid()},
        onGreet: () => {this.pm.greet()},
        onRecordASound: (lifecycle, args) => {
          this.pm.say('3, 2, 1, go!', ()=> {
            DEBUG && console.log('start recording');
            var soundName = args[1];
            console.log(`sound to record: ${soundName}`);
            this.audioRecorder.startRecording(soundName);
          });
        },
        onStopRecording: () => {
          DEBUG && console.log('stop recording');
          const {samples, sampleRate, levels, trimStart, trimEnd} = this.audioRecorder.stop();
          console.log({samples, sampleRate, levels, trimStart, trimEnd});
          this.recordingsManager.confirmAndStoreRecording(samples, sampleRate, levels, trimStart, trimEnd, this.audioRecorder.recordingName);
        },
        onGetRecordings: async () => {
          var recordingNames = await this.recordingsManager.getAllRecordings();
          this.pm.listNavigator = new ListNavigator(recordingNames, 3, null, (name) => {return name});
          this.pm.listNavigator.navigate();
        },
        onPlayARecording: async (lifecycle, args) => {
          var soundName = args[1];
          var recordingNames = await this.recordingsManager.play(soundName);
        },
        onRenameRecording: async (lifecycle, args) => {
          var oldName = Utils.titlecase(args[1]);
          var newName = Utils.titlecase(args[2]);
          this.recordingsManager.renameVmSound(oldName, newName)
          .catch((e) => {
            console.log(e);
          }).then(()=> {
            this.pm.say(`renamed ${oldName} to ${newName}`);
          })
        },
        onNavigatingAList: () => {
          this.pm.say(`You are now navigating a list from the start. Say 'next' or 'previous' to move through the list.`);
        },
      }

      for (var method in methodMap) {
        this[method] = methodMap[method];
      }
    },
    introduceSelf: function() {
      this.pm.say("Hi, I’m Scratch! I'm a tool you can use to program and interact with\
        audio projects. Any time you need help or don't know what to do, you can say\
        'Scratch, help' or ask 'what can i do?'. I will try to answer any\
        questions you have. To start, why don't you say 'alarm' to play the alarm project");
      this.pm.recognition.start();
    },
    onLeaveNavigatingAList: function() {
      this.pm.listNavigator = null;
    }
  }
});

module.exports = ScratchStateMachine;
