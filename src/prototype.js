/**
 * @fileoverview
 *
 * JavaScript for the Scratch Voice User Interface prototype.
 * @author Tina Quach (quacht@mit.edu)
 */

var ScratchProject = StateMachine.factory({
  init: 'empty',
  transitions: [
    { name: 'nameProject', from: 'empty', to: 'named'},
    { name: 'addInstruction', from: 'named', to: 'nonempty'},
    { name: 'addInstruction', from: 'nonempty', to: 'nonempty'},
    { name: 'finishProject', from: 'nonempty', to: 'nonempty'},
    { name: 'goto', from: '*', to: function(s) { return s } }
  ],
  data: function() {
    return {
      name: null,
      instructions: [],
      synth: window.speechSynthesis,
    }
  },
  methods: {
    onEmpty: function() {
      return new Promise(function(resolve, reject) {
        scratch.say('What do you want to call it?');
        resolve();
      })
    },
    onNameProject: function() {
      return new Promise(function(resolve, reject) {
        // problem w/ using this.name is that this refers to the window--NOT to the scratch project.
        scratch.say('Okay. When you say, Scratch, ' + scratch.currentProject.name + ', I’ll play the project. What’s the first step?');
        resolve();
      })
    },
    onAddInstruction: function(utterance) {
      return new Promise(function(resolve, reject) {
        scratch.say('Okay, what’s the next step?');
        resolve();
      })
    },
    onFinishProject: function(utterance) {
      return new Promise(function(resolve, reject) {
        scratch.say('Cool, now you can say, Scratch, ' + scratch.currentProject.name + ', to play the project.');
        resolve();
      })
    },
    /**
     * Return Scratch program.
     * @return {Array<Array>} Scratch program generated from instructions
     */
    getScratchProgram: function() {
      let steps = this.instructions.map(instruction => instruction.steps[0]);
      // Everytime you want to execute the program, you add a
      // when green flag block to start it.
      return [['whenGreenFlag']].concat(steps);
    },
    _getName: function(utterance) {
      var pattern = /call the project(.*)/;
      var matches = utterance.match(pattern);
      if (matches && matches.length > 0) {
        return matches[1].trim();
      } else {
        return utterance.trim();
      }
    },
    handleUtterance: function(utterance) {
      // TODO: determine whether I need a promise here?
      if (this.state == 'empty') {
        this.name = this._getName(utterance);
        scratch.projects[this.name] = scratch.currentProject;
        delete scratch.projects['Untitled-'+scratch.untitledCount];
        this.nameProject();
      } else if (this.state == 'named' || this.state == 'nonempty') {
        // detect project completion.
        if (utterance.indexOf("that's it") != -1) {
          this.finishProject();
          return 'exit';
        } else {
          console.log(utterance + " doesnt match that's it");
        }
        // parse instruction
        try {
          var instruction = new ScratchInstruction(utterance);
          this.instructions.push(instruction);
          this.addInstruction();
        } catch (e) {
          console.log(e)
          scratch.say("Sorry, that doesn't match any Scratch commands.");
        }
      }
    }
  }
});

var scratch = new StateMachine({
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
    data: {
      projects: [],
      untitledCount: 0,
      // Project currently being edited
      projectToPlay: null,
      currentProject: null,
      synth: window.speechSynthesis,
      recognition: new webkitSpeechRecognition(),
    },
    plugins: [
      new StateMachineHistory()     //  <-- plugin enabled here
    ],
    methods: {
      onNewProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.currentProject = new ScratchProject();
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
          console.log('HELLO PLAYING PROJECT');
          scratch.say('Playing project ' + project.name);
          scratch.executeProgram(project.getScratchProgram());
          // TODO: cue the start and
          scratch.say('the end');
          scratch.goto('Home');
          resolve();
        });
      },
      onFinishProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.say('We are no longer editing ' + scratch.currentProject.name);
          resolve();
        });
      },
      onEditProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.say('Opening project for editing');
          resolve();
        });
      },
      onPlayCurrentProject: function() {
        return new Promise(function(resolve, reject) {
          scratch.say('Playing current project ' + scratch.currentProject.name);
          resolve();
        });
      },
    }
  });

scratch._triggers = {
  'newProject': ["new project","create new project", "create project", "make new project", "make project"],
  'editProject': ["see inside"],
  'finishProject': ["i'm done", "i'm finished"],
  'play': Object.keys(scratch.projects),
  'playCurrentProject': ["play project", "start project"],
  'return': ["stop", "i'm done", "go back", "quit", "exit"]
};

scratch.observe('onAfterTransition', function() {
  document.getElementById("current_state").innerHTML = scratch.state;
});

scratch.say = function(whatToSay) {
  // scratch.recognition.stop();
  var whatToSay = new SpeechSynthesisUtterance(whatToSay);
  // var promise = new Promise(function(resolve, reject) {
    console.log('saying ' + whatToSay.text);
    scratch.synth.speak(whatToSay);
  //   resolve();
  // });
  // promise.then(function() {
  //   console.log('THEN!!!!')
  //   scratch.recognition.start();
  // }, function() {
  //   console.log('promise failed');
  // });
}

scratch.executeProgram = function(scratchProgram) {
  // Assuming that the project can only be made of 'say' instructions
  for (var i = 1; i < scratchProgram.length; i++) {
    scratch.say(scratchProgram[i][1]);
  }
}

scratch.handleUtterance = function(utterance) {
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
  }
}

scratch._getTriggerType = function(utterance) {
  // Filter utterance for filler words.
  var lowercase = utterance.toLowerCase();
  var trigger = scratch._removeFillerWords(lowercase).trim();

  // Update list of projects that can be triggered.
  this._triggers['play'] = Object.keys(scratch.projects).map((projectName) => scratch._removeFillerWords(projectName.trim()));
  console.log(this._triggers['play']);

  for (var triggerType in this._triggers) {
    var matching_phrases = this._triggers[triggerType];
    if (triggerType == 'play') {
      console.log('matching_phrases');
      console.log(matching_phrases);
      console.log(matching_phrases.indexOf('give me a compliment') >=0)
    }
    // TODO: implement flexibility by accepting a trigger to CONTAIN
    // the matching phrase.
    if (matching_phrases.indexOf(trigger) >= 0 && scratch.can(triggerType)) {
      return triggerType;
    }
  }
  return null;
  console.log('no matches for ' + utterance);
}

scratch._removeFillerWords = function(utterance) {
  var filler_words = ["the", "a", "um", "uh", "er", "ah", "like"];

  var utterance = utterance.toLowerCase();
  var stripped = utterance.replace(/\b[-.,()&$#!\[\]{}"']+\B|\B[-.,()&$#!\[\]{}"']+\b/g, "");
  var tokens = stripped.split(' ');
  var result = tokens.filter(token => filler_words.indexOf(token) == -1);
  return result.join(' ');
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
  var recognition = scratch.recognition;
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