/**
 * @fileoverview
 *
 * JavaScript for the Scratch Voice User Interface prototype.
 * @author Tina Quach (quacht@mit.edu)
 */
global.ScratchStateMachine = require('./scratch_state_machine.js');
global.ScratchAudio = require('./audio.js');
global.wsp = require('./vui_web_socket.js');

global.scratch = new ScratchStateMachine();
global.audio = new ScratchAudio();

global.DEBUG = true;

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

  // Handlers for logging
  recognition.onaudioend = function() {
    console.log('[RECOGNITION] Audio capturing ended');
  }

  recognition.onaudiostart = function() {
    console.log('[RECOGNITION] Audio capturing started');
  }

  recognition.onnomatch = function() {
    console.log('[RECOGNITION] Speech not recognised');
  }

  recognition.onsoundend = function() {
    console.log('[RECOGNITION] Sound has stopped being received');
  }

  recognition.onsoundstart = function() {
    console.log('[RECOGNITION] Some sound is being received');
  }

  recognition.onspeechend = function() {
    console.log('[RECOGNITION] Speech has stopped being detected');
  }

  recognition.onspeechstart = function() {
    console.log('[RECOGNITION] Speech has been detected');
  }

  recognition.onstart = function() {
    console.log('[RECOGNITION] Speech recognition service has started');
    recognizing = true;
    showInfo('info_speak_now');
    start_img.src = 'assets/mic-animate.gif';
    audio.cueListening();
  };

  recognition.onerror = function(event) {
    console.log('[RECOGNITION] error encountered; event:');
    console.log(event);
    if (event.error == 'no-speech') {
      start_img.src = 'assets/mic.gif';
      showInfo('info_no_speech');
      // ignore_onend = true;
    }
    if (event.error == 'audio-capture') {
      start_img.src = 'assets/mic.gif';
      showInfo('info_no_microphone');
      // ignore_onend = true;
    }
    if (event.error == 'not-allowed') {
      if (event.timeStamp - start_timestamp < 100) {
        showInfo('info_blocked');
      } else {
        showInfo('info_denied');
      }
      // ignore_onend = true;
    }
  };

  recognition.onend = function() {
    console.log('[RECOGNITION] Speech recognition service disconnected');

    recognizing = false;
    if (ignore_onend) {
      recognition.start();
      return;
    }
    start_img.src = 'assets/mic.gif';
    if (!final_transcript) {
      showInfo('info_start');
      // NOTE: Force speech recognition to always be happening.
      // recognition.start();
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
        console.log(`[RECOGNITION] result: ${event.results[i][0].transcript}`)
        scratch.pm.audio.cueListening();
        // Analyze utterance.
        var history = document.getElementById("history");
        history.value = history.value + "\n" + "You: "+ event.results[i][0].transcript;
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

  // Handle keypresses!
  var typeToCodeHandlesSpace = false;

  document.onkeydown = function(evt) {
    evt = evt || window.event;
    if (!typeToCodeHandlesSpace) {
      if (evt.code == 'Space') {
        if (scratch.state == "Recording") {
          scratch.stopRecording();
          return;
        }
        if (recognizing) {
          recognition.stop();
          // play sound cue for stopping listening.
          scratch.pm.audio.cueDoneListening();
          return;
        } else {
          scratch.vm.stopAll();
          scratch.pm.synth.cancel();
          recognition.start();
        }
      }
    }

  };

  var typeToCode = document.getElementById("type-to-code");
  var history = document.getElementById("history");
  typeToCode.onkeydown = function(evt) {
    evt = evt || window.event;
    // If the user has pressed enter
    if (evt.code === 'Enter') {
        var newUtterance = typeToCode.value.trim();
        scratch.handleUtterance(newUtterance);
        typeToCode.value = "";
        typeToCode.value = typeToCode.value.trim();
        history.value = history.value + "\n" + "You: "+ newUtterance;
    }
  }

  // When the user leaves the text area for typing to Scratch give the document
  // permission to handle the spacebar as usual.
  typeToCode.onblur = function() {
    typeToCodeHandlesSpace = false;
  }

  typeToCode.onfocus = function() {
    typeToCodeHandlesSpace = true;
  }
}
