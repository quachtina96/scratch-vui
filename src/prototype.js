/**
 * @fileoverview
 *
 * JavaScript for the Scratch Voice User Interface prototype.
 * @author Tina Quach (quacht@mit.edu)
 */
global.ScratchStateMachine = require('./scratch_state_machine.js');
global.VirtualMachine = require("scratch-vm");
global.ScratchStorage = require("scratch-storage");
global.ScratchRender = require("scratch-render");
global.AudioEngine = require("scratch-audio");
global.scratch = new ScratchStateMachine();
global.vm = null;

scratch.observe('onAfterTransition', () => {
  document.getElementById("current_state").innerHTML = scratch.state;
});

global.final_transcript = '';
global.recognizing = false;
global.ignore_onend = false;
global.start_timestamp;

global.upgrade = function() {
  start_button.style.visibility = 'hidden';
  showInfo('info_upgrade');
}

global.two_line = /\n\n/g;
global.one_line = /\n/g;
global.linebreak = function(s) {
  return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
}

global.first_char = /\S/;
global.capitalize = function(s) {
  return s.replace(first_char, (m) => { return m.toUpperCase(); });
}

document.getElementById("start_button").onclick =  function(event) {
  if (recognizing) {
    recognition.stop();
    return;
  }
  final_transcript = '';
  recognition.start();
  ignore_onend = false;
  final_span.innerHTML = '';
  interim_span.innerHTML = '';
  start_img.src = 'assets/mic-slash.gif';
  showInfo('info_allow');
  showButtons('none');
  start_timestamp = event.timeStamp;
}

global.showInfo = function(s) {
  if (s) {
    for (var child = info.firstChild; child; child = child.nextSibling) {
      if (child.style) {
        child.style.display = child.id == s ? 'inline' : 'none';
      }
    }
    info.style.visibility = 'visible';
  } else {
    info.style.visibility = 'hidden';
  }
}

global.current_style;
global.showButtons = function(style) {
  if (style == global.current_style) {
    return;
  }
  global.current_style = style;
}

if (!('webkitSpeechRecognition' in window)) {
  upgrade();
} else {
  start_button.style.display = 'inline-block';
  global.recognition = scratch.pm.recognition;
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = function() {
    recognizing = true;
    showInfo('info_speak_now');
    start_img.src = 'assets/mic-animate.gif';
  };

  recognition.onerror = function(event) {
    if (event.error == 'no-speech') {
      start_img.src = 'assets/mic.gif';
      showInfo('info_no_speech');
      ignore_onend = true;
    }
    if (event.error == 'audio-capture') {
      start_img.src = 'assets/mic.gif';
      showInfo('info_no_microphone');
      ignore_onend = true;
    }
    if (event.error == 'not-allowed') {
      if (event.timeStamp - start_timestamp < 100) {
        showInfo('info_blocked');
      } else {
        showInfo('info_denied');
      }
      ignore_onend = true;
    }
  };

  recognition.onend = function() {
    recognizing = false;
    if (ignore_onend) {
      return;
    }
    start_img.src = 'assets/mic.gif';
    if (!final_transcript) {
      showInfo('info_start');
      return;
    }
    showInfo('');
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
      global.range = document.createRange();
      range.selectNode(document.getElementById('final_span'));
      window.getSelection().addRange(range);
    }

  };

  // Since recognition is continuous, we will get interim results based on the
  // partial utterance.
  // The API still helps us recognize when a pause has occured.
  recognition.onresult = function(event) {
    global.interim_transcript = '';
    for (global.i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript = event.results[i][0].transcript;
        console.log(event.results[i][0].transcript)
        // Analyze utterance.
        scratch.handleUtterance(event.results[i][0].transcript)
      } else {
        interim_transcript += event.results[i][0].transcript;
      }
    }

    final_transcript = capitalize(final_transcript);
    final_span.innerHTML = linebreak(final_transcript);
    interim_span.innerHTML = linebreak(interim_transcript);
    if (final_transcript || interim_transcript) {
      showButtons('inline-block');
    }
  };
}


// ------ Code pulled from scratch-vm/src/playground/benchmark.js -------- //
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

global.setupVM = function () {
    // Lots of global variables to make debugging easier
    // Instantiate the VM.
    const vm = new window.VirtualMachine();
    global.vm = vm;

    const storage = new ScratchStorage(); /* global ScratchStorage */
    const AssetType = storage.AssetType;
    storage.addWebSource([AssetType.Project], getProjectUrl);
    storage.addWebSource([AssetType.ImageVector, AssetType.ImageBitmap, AssetType.Sound], getAssetUrl);
    vm.attachStorage(storage);

    this.vm.on('workspaceUpdate', () => {
      // TODO(tquach): What is the purpose of setting a timeout
      setTimeout(() => {
          this.vm.greenFlag();
      }, 100);
    });

    // Instantiate the renderer and connect it to the VM.
    const canvas = document.getElementById('scratch-stage');
    // TODO(tquach): How do I import the Scratch Render. Does it already get
    // included with the requirement of scratch-vm
    const renderer = new window.ScratchRender(canvas);
    global.renderer = renderer;
    vm.attachRenderer(renderer);
    bitmapAdapter = new ScratchSVGRenderer.BitmapAdapter();
    svgAdapter = new ScratchSVGRenderer.SVGAdapter();
    vm.attachV2BitmapAdapter(bitmapAdapter);
    vm.attachV2SVGAdapter(svgAdapter);
    const audioEngine = new window.AudioEngine();
    vm.attachAudioEngine(audioEngine);

    // Feed mouse events as VM I/O events.
    document.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        const coordinates = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            canvasWidth: rect.width,
            canvasHeight: rect.height
        };
        global.vm.postIOData('mouse', coordinates);
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
        global.vm.postIOData('mouse', data);
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
        global.vm.postIOData('mouse', data);
        e.preventDefault();
    });

    // Feed keyboard events as VM I/O events.
    document.addEventListener('keydown', e => {
        // Don't capture keys intended for Blockly inputs.
        if (e.target !== document && e.target !== document.body) {
            return;
        }
        global.vm.postIOData('keyboard', {
            keyCode: e.keyCode,
            isDown: true
        });
        e.preventDefault();
    });
    document.addEventListener('keyup', e => {
        // Always capture up events,
        // even those that have switched to other targets.
        global.vm.postIOData('keyboard', {
            keyCode: e.keyCode,
            isDown: false
        });
        // E.g., prevent scroll.
        if (e.target !== document && e.target !== document.body) {
            e.preventDefault();
        }
    });

    // Run threads
    vm.start();
};

global.testProject = function () {
  testJSON = {
  "objName": "Stage",
  "sounds": [{
      "soundName": "pop",
      "soundID": 7,
      "md5": "83a9787d4cb6f3b7632b4ddfebf74367.wav",
      "sampleCount": 258,
      "rate": 11025,
      "format": ""
    }],
  "costumes": [{
      "costumeName": "backdrop1",
      "baseLayerID": 3,
      "baseLayerMD5": "739b5e2a2435f6e1ec2993791b423146.png",
      "bitmapResolution": 1,
      "rotationCenterX": 240,
      "rotationCenterY": 180
    }],
  "currentCostumeIndex": 0,
  "penLayerMD5": "5c81a336fab8be57adc039a8a2b33ca9.png",
  "penLayerID": 0,
  "tempoBPM": 60,
  "videoAlpha": 0.5,
  "children": [{
      "objName": "Sprite1",
      "scripts": [[5,
          90,
          [["whenGreenFlag"],
            ["setVolumeTo:", 50],
            ["doPlaySoundAndWait", "drum"],
            ["changeVolumeBy:", ["*", 30, -1]],
            ["broadcast:", "shush"]]]],
      "sounds": [{
          "soundName": "meow",
          "soundID": 0,
          "md5": "83c36d806dc92327b9e7049a565c6bff.wav",
          "sampleCount": 18688,
          "rate": 22050,
          "format": ""
        },
        {
          "soundName": "cave",
          "soundID": 1,
          "md5": "881f1bf5f301a36efcce4204a44af9ab.wav",
          "sampleCount": 163584,
          "rate": 22050,
          "format": "adpcm"
        },
        {
          "soundName": "boing",
          "soundID": 2,
          "md5": "53a3c2e27d1fb5fdb14aaf0cb41e7889.wav",
          "sampleCount": 6804,
          "rate": 22050,
          "format": "adpcm"
        },
        {
          "soundName": "chomp",
          "soundID": 3,
          "md5": "0b1e3033140d094563248e61de4039e5.wav",
          "sampleCount": 2912,
          "rate": 11025,
          "format": ""
        },
        {
          "soundName": "drum",
          "soundID": 4,
          "md5": "f730246174873cd4ae4127c83e475b50.wav",
          "sampleCount": 107136,
          "rate": 22050,
          "format": "adpcm"
        },
        {
          "soundName": "jungle",
          "soundID": 5,
          "md5": "b234a04cc3958437c43ed3d93f34a345.wav",
          "sampleCount": 76032,
          "rate": 22050,
          "format": "adpcm"
        },
        {
          "soundName": "hey",
          "soundID": 6,
          "md5": "ec7c272faa862c9f8f731792e686e3c9.wav",
          "sampleCount": 5414,
          "rate": 22050,
          "format": "adpcm"
        }],
      "costumes": [{
          "costumeName": "costume1",
          "baseLayerID": 1,
          "baseLayerMD5": "f9a1c175dbe2e5dee472858dd30d16bb.svg",
          "bitmapResolution": 1,
          "rotationCenterX": 47,
          "rotationCenterY": 55
        },
        {
          "costumeName": "costume2",
          "baseLayerID": 2,
          "baseLayerMD5": "6e8bd9ae68fdb02b7e1e3df656a75635.svg",
          "bitmapResolution": 1,
          "rotationCenterX": 47,
          "rotationCenterY": 55
        }],
      "currentCostumeIndex": 0,
      "scratchX": 0,
      "scratchY": 0,
      "scale": 1,
      "direction": 90,
      "rotationStyle": "normal",
      "isDraggable": false,
      "indexInLibrary": 1,
      "visible": true,
      "spriteInfo": {
      }
    }],
  "info": {
    "swfVersion": "v461",
    "spriteCount": 1,
    "flashVersion": "MAC 28,0,0,126",
    "scriptCount": 1,
    "userAgent": "Scratch 2.0 Offline Editor",
    "videoOn": false
  }
}

  testJSON2 = {"info": {"spriteCount": 1, "scriptCount": 0, "flashVersion": "MAC 28,0,0,126", "swfVersion": "v460", "userAgent": "Scratch 2.0 Offline Editor", "videoOn": false}, "costumes": [{"baseLayerMD5": "739b5e2a2435f6e1ec2993791b423146.png", "bitmapResolution": 1, "costumeName": "backdrop1", "baseLayerID": 3, "rotationCenterX": 240, "rotationCenterY": 180}], "currentCostumeIndex": 0, "videoAlpha": 0.5, "penLayerID": 0, "tempoBPM": 60, "objName": "Stage", "sounds": [{"format": "", "sampleCount": 258, "soundName": "pop", "soundID": 7, "rate": 11025, "md5": "83a9787d4cb6f3b7632b4ddfebf74367.wav"}], "penLayerMD5": "5c81a336fab8be57adc039a8a2b33ca9.png", "children": [{"spriteInfo": {}, "direction": 90, "scale": 1, "isDraggable": false, "indexInLibrary": 1, "costumes": [{"baseLayerMD5": "f9a1c175dbe2e5dee472858dd30d16bb.svg", "bitmapResolution": 1, "costumeName": "costume1", "baseLayerID": 1, "rotationCenterX": 47, "rotationCenterY": 55}, {"baseLayerMD5": "6e8bd9ae68fdb02b7e1e3df656a75635.svg", "bitmapResolution": 1, "costumeName": "costume2", "baseLayerID": 2, "rotationCenterX": 47, "rotationCenterY": 55}], "currentCostumeIndex": 0, "visible": true, "rotationStyle": "normal", "lists": [], "scripts": [[5, 128, []]], "variables": [], "sounds": [{"format": "", "sampleCount": 18688, "soundName": "meow", "soundID": 0, "rate": 22050, "md5": "83c36d806dc92327b9e7049a565c6bff.wav"}, {"format": "adpcm", "sampleCount": 163584, "soundName": "cave", "soundID": 1, "rate": 22050, "md5": "881f1bf5f301a36efcce4204a44af9ab.wav"}, {"format": "adpcm", "sampleCount": 6804, "soundName": "boing", "soundID": 2, "rate": 22050, "md5": "53a3c2e27d1fb5fdb14aaf0cb41e7889.wav"}, {"format": "", "sampleCount": 2912, "soundName": "chomp", "soundID": 3, "rate": 11025, "md5": "0b1e3033140d094563248e61de4039e5.wav"}, {"format": "adpcm", "sampleCount": 107136, "soundName": "drum", "soundID": 4, "rate": 22050, "md5": "f730246174873cd4ae4127c83e475b50.wav"}, {"format": "adpcm", "sampleCount": 76032, "soundName": "jungle", "soundID": 5, "rate": 22050, "md5": "b234a04cc3958437c43ed3d93f34a345.wav"}, {"format": "adpcm", "sampleCount": 5414, "soundName": "hey", "soundID": 6, "rate": 22050, "md5": "ec7c272faa862c9f8f731792e686e3c9.wav"}], "scratchY": 0, "scratchX": 0, "objName": "Sprite1"}]}
  global.vm.loadProject(JSON.stringify(testJSON));
  // global.vm.loadProject(JSON.stringify(testJSON2));
}
