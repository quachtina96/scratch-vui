/**
 * @fileoverview
 *
 * JavaScript for the Scratch Voice User Interface prototype.
 * @author Tina Quach (quacht@mit.edu)
 */

var projects = []


var fsm = new StateMachine({
    init: 'Home',
    transitions: [
      { name: 'newProject',     from: 'Home',  to: 'InsideProject' },
      // Return should take you back to the last state
      { name: 'return',   from: '*', to: function() {
          return fsm.history[fsm.history.length - 2];
        }
      }, {
        name: 'finishProject', from: 'InsideProject', to: 'Home'},
      { name: 'play', from: 'Home', to: 'PlayProject'},
      { name: 'playCurrentProject', from: 'InsideProject', to: 'PlayProject'},
      { name: 'editProject', from: 'PlayProject', to: 'InsideProject' },
      // Support fsm.goto(STATE_NAME);
      { name: 'goto', from: '*', to: function(s) { return s } }
    ],
    data: {
      projects: [],
      synth: window.speechSynthesis
    },
    plugins: [
      new StateMachineHistory()     //  <-- plugin enabled here
    ],
    methods: {
      onNewProject: function() {
        fsm.say('Creating a new project');
        console.log('Creating a new project');
      },
      onReturn: function() {
        fsm.say('Returning to previous state: ' + fsm.state);
        console.log('Returning to previous state: ' + fsm.state);
      },
      onPlayProject: function() {
        fsm.say('Playing project');
        console.log('Playing project');
      },
      onFinishProject: function() {
        fsm.say('Great! You can say the name of any project to play it');
        console.log('Great! You can say the name of any project to play it');
      },
      onEditProject: function() {
        fsm.say('Opening project for editing');
        console.log('Opening project for editing');
      },
      onPlayCurrentProject: function() {
        fsm.say('Playing current project');
        console.log('Playing current project');
      },
    }
  });

fsm.observe('onAfterTransition', function() {
  console.log('transitioning.....')
  console.log(fsm.state)
  document.getElementById("current_state").innerHTML = fsm.state;
});

fsm.say = function(whatToSay) {
  var whatToSay = new SpeechSynthesisUtterance(whatToSay);
  fsm.synth.speak(whatToSay);
}

fsm.removeFillerWords = function(utterance) {
  var filler_words = ["the", "a", "um", "uh", "er", "ah", "like"];

  var utterance = utterance.toLowerCase();
  var stripped = utterance.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, "");
  var tokens = stripped.split(' ');
  var result = tokens.filter(token => filler_words.indexOf(token) == -1);
  return result.join(' ');
}

// This function might want to belong to Scratch Cat
fsm.getTriggerType = function (utterance) {
  // TODO: detect project names in utterance.

  var triggers = {
    'newProject': ["new project","create new project", "create project", "make new project", "make project"],
    'editProject': ["see inside"],
    'finishProject': ["i'm done", "i'm finished"],
    'play': fsm.projects.map((project) => project.name),
    'playCurrentProject': ["play project", "start project"],
    'return': ["stop", "i'm done", "go back", "quit", "exit"]
  }

  // Filter utterance for filler words.
  var lowercase = utterance.toLowerCase();
  var trigger = fsm.removeFillerWords(lowercase).trim();

  for (var triggerType in triggers) {
    var matching_phrases = triggers[triggerType];
    if (matching_phrases.indexOf(trigger) >= 0 && fsm.can(triggerType)) {
      return triggerType;
    }
  }
  return null;
  console.log('no matches for ' + utterance);
}

fsm.handleUtterance = function(utterance) {
  var triggerType = fsm.getTriggerType(utterance);
  if (triggerType) {
    if (fsm.can(triggerType)) {
      fsm[triggerType]();
      console.log('executing code on ' + fsm.state);
    } else {
      console.log('could not make transition: ' + triggerType);
    }
  }
}

showInfo('info_start');

var final_transcript = '';
var recognizing = false;
var ignore_onend;
var start_timestamp;

if (!('webkitSpeechRecognition' in window)) {
  upgrade();
} else {
  start_button.style.display = 'inline-block';
  var recognition = new webkitSpeechRecognition();
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
      var range = document.createRange();
      range.selectNode(document.getElementById('final_span'));
      window.getSelection().addRange(range);
    }

  };

  // Since recognition is continuous, we will get interim results based on the
  // partial utterance.
  // The API still helps us recognize when a pause has occured.
  recognition.onresult = function(event) {
    var interim_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript = event.results[i][0].transcript;
        console.log(event.results[i][0].transcript)
        // Analyze utterance.
        fsm.handleUtterance(event.results[i][0].transcript)
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

function upgrade() {
  start_button.style.visibility = 'hidden';
  showInfo('info_upgrade');
}

var two_line = /\n\n/g;
var one_line = /\n/g;
function linebreak(s) {
  return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
}

var first_char = /\S/;
function capitalize(s) {
  return s.replace(first_char, function(m) { return m.toUpperCase(); });
}

function startButton(event) {
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

function showInfo(s) {
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

var current_style;
function showButtons(style) {
  if (style == current_style) {
    return;
  }
  current_style = style;
}