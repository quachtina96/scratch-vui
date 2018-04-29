/**
 * @fileoverview Defines the ScratchProject object as a JavaScript state
 * machine.
 *
 * @author quacht@mit.edu (Tina Quach)
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
  data: function(scratchStateMachine) {
    return {
      scratch: scratchStateMachine,
      name: null,
      instructions: [],
      synth: window.speechSynthesis,
    }
  },
  methods: {
    onEmpty: function() {
      return new Promise(function(resolve, reject) {
        this.scratch.say('What do you want to call it?');
        resolve();
      })
    },
    onNameProject: function() {
      return new Promise(function(resolve, reject) {
        // problem w/ using this.name is that this refers to the window--NOT to the scratch project.
        this.scratch.say('Okay. When you say, Scratch, ' + this.scratch.currentProject.name + ', I’ll play the project. What’s the first step?');
        resolve();
      })
    },
    onAddInstruction: function(utterance) {
      return new Promise(function(resolve, reject) {
        this.scratch.say('Okay, what’s the next step?');
        resolve();
      })
    },
    onFinishProject: function(utterance) {
      return new Promise(function(resolve, reject) {
        this.scratch.say('Cool, now you can say, Scratch, ' + this.scratch.currentProject.name + ', to play the project.');
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
        this.scratch.projects[this.name] = this.scratch.currentProject;
        delete this.scratch.projects['Untitled-'+this.scratch.untitledCount];
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
          this.scratch.say("Sorry, that doesn't match any Scratch commands.");
        }
      }
    }
  }
});