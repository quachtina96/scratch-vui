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
const WavEncoder = require('wav-encoder');

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
    { name: 'editExistingProject', from: 'PlayProject',  to: 'InsideProject' },
    { name: 'editExistingProject', from: 'Home',  to: 'InsideProject' },
    { name: 'createANewProject', from: 'Home',  to: 'InsideProject' },
    // Return should take you back to the last state
    { name: 'return',   from: '*', to: function() {
        return this.history[this.history.length - 2];
      }
    },
    { name: 'goHome', from: '*', to: 'Home'},
    { name: 'finishProject', from: 'InsideProject', to: 'Home'},
    { name: 'play', from: 'Home', to: 'PlayProject'},
    { name: 'play', from: 'InsideProject', to: 'PlayProject'},
    { name: 'play', from: 'PlayProject', to: 'PlayProject'},
    { name: 'createANewProject', from: 'PlayProject',  to: 'InsideProject' },
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
    { name: 'startCues', from: '*', to: function() {return this.state} },
    { name: 'holdOn', from: '*', to: function() {return this.state} },
    { name: 'listen', from: '*', to: function() {return this.state} },
    { name: 'getSounds', from: '*', to: function() {return this.state} },
    { name: 'checkSound', from: '*', to: function() {return this.state} },
    { name: 'stopProject', from: 'PlayProject', to: function() {
        return this.history[this.history.length - 2];
      }
    },
    { name: 'queryActions', from: '*', to: function() {return this.state} },
    { name: 'getKnownCommands', from: '*', to: function() {return this.state} },
    { name: 'getScratchCommands', from: '*', to: function() {return this.state} },
    { name: 'getWhatYouSaid', from: '*', to: function() {return this.state} },
    { name: 'getWhatISaid', from: '*', to: function() {return this.state} },
    { name: 'greet', from: '*', to: function() {return this.state} },
    { name: 'startRecording', from: '*', to: 'Recording'},
    { name: 'stopRecording', from: 'Recording', to: function() {
        return this.history[this.history.length - 2];
      } }
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
      } else {
        // TODO: implement a tutorial state machine.
        // this.pm.say("You're in the home state.")
      }

      this.setupVM('scratch-stage');
      this.pm.load();
      this.setMethods();
      this.pm._updatePlayRegex();

      // Only introduce if the browser has never interacted with Scratch before.
      if (!window.localStorage.scratchVuiInteractedBefore) {
        this.introduceSelf();
        console.log('window.localStorage.scratchVuiInteractedBefore is true')
        window.localStorage.scratchVuiInteractedBefore = true;
      }
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
        onHoldOn: () => {this.pm.listening = false},
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
        onStartRecording: () => {
          DEBUG && console.log('start recording');
          this.audioRecorder.startRecording();
        },
        onStopRecording: () => {
          DEBUG && console.log('stop recording');
          const {samples, sampleRate, levels, trimStart, trimEnd} = this.audioRecorder.stop();
          console.log({samples, sampleRate, levels, trimStart, trimEnd});
          this.confirmRecorded(samples, sampleRate, levels, trimStart, trimEnd);
        },
        confirmRecorded: (samples,sampleRate, levels, trimStart, trimEnd) => {
          var ssm = this;
          const sampleCount = samples.length;
          const startIndex = Math.floor(trimStart * sampleCount);
          const endIndex = Math.floor(trimEnd * sampleCount);
          const clippedSamples = samples.slice(startIndex, endIndex);
          WavEncoder.encode({
              sampleRate: sampleRate,
              channelData: [clippedSamples]
          }).then(wavBuffer => {
              const vmSound = {
                  format: '',
                  dataFormat: 'wav',
                  rate: sampleRate,
                  sampleCount: clippedSamples.length
              };

              // Create an asset from the encoded .wav and get resulting md5
              const storage = ssm.vm.runtime.storage;
              vmSound.asset = new storage.Asset(
                  storage.AssetType.Sound,
                  null,
                  storage.DataFormat.WAV,
                  new Uint8Array(wavBuffer),
                  true // generate md5
              );
              vmSound.assetId = vmSound.asset.assetId;

              // update vmSound object with md5 property
              vmSound.md5 = `${vmSound.assetId}.${vmSound.dataFormat}`;
              // The VM will update the sound name to a fresh name
              // if the following is already taken
              vmSound.name = 'recording1';

              // Store the sound in Scratch Storage.
              storage.store(storage.AssetType.Sound, vmSound.dataFormat, wavBuffer, vmSound.assetId).then((assetMetadata) => {
                console.log(assetMetadata);
                // Get target on which to attach the sound and set it on the
                // virtual machine.
                console.log('ssm.vm.runtime.targets');
                console.log(ssm.vm.runtime.targets);
                var target = ssm.vm.runtime.targets[1];
                ssm.vm.editingTarget = target;

                ssm.vm.addSound(vmSound).then(() => {
                    console.log('vm has added sound')
                    console.log('now playing sound via recordings manager');
                    ssm.recordingsManager.playRecording(vmSound.name)
                });
              });
          });
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
  }
});

module.exports = ScratchStateMachine;
