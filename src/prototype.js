/**
 * @fileoverview
 *
 * JavaScript for the Scratch Voice User Interface prototype.
 * @author Tina Quach (quacht@mit.edu)
 */
global.ScratchStateMachine = require('./scratch_state_machine.js');
global.scratch = new ScratchStateMachine();

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

// Audio element for basic audio cues.
global.audioElement = document.createElement('audio');
audioElement.type = "audio/wav";

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
    audioElement.src = 'assets/sound/snap.wav'
    audioElement.play()
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
      audioElement.src = 'assets/sound/coin_reverse.wav';
      audioElement.play();
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
