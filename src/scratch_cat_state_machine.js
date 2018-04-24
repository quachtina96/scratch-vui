// The state machine manages state so that the core logic exists outside of
// contexts within dialogflow.

// TODO: programmatically generate the transition objects because this
// isn't scalable.
// TODO: investigate how to save state such as current project.
var fsm = new StateMachine({
    init: 'Home',
    transitions: [
      { name: 'NewProject',     from: 'Home',  to: 'InsideProject' },
      // Return should take you back to the last state
      { name: 'ReturnFromInsideProjectToHome',   from: 'InsideProject', to: 'Home'  },
      { name: 'ReturnFromPlayProjectToHome',   from: 'PlayProject', to: 'Home'  },
      { name: 'ReturnFromInsidetoPlayProject',   from: 'InsideProject', to: 'PlayProject'  },
      { name: 'ReturnFromPlaytoInsideProject',   from: 'PlayProject', to: 'InsideProject'  },
      { name: 'PlayProject', from: 'Home', to: 'PlayProject'},
      { name: 'PlayCurrentProject', from: 'InsideProject', to: 'PlayProject'},
      { name: 'EditProject', from: 'PlayProject', to: 'InsideProject' }
    ],
    methods: {
      onNewProject: function() {
      	console.log('What do you want to call it?')
      },
      onReturnFromPlayProjectToHome: function() {
       console.log('Okay.');
   	  },
      onReturnFromInsidetoPlayProject: function() {
      	console.log('Playing Project Now...');
      },
      onReturnFromInsideProjectToHome: function() {
      	console.log('No longer seeing inside project.');
      },
      onReturnFromPlaytoInsideProject: function() { console.log('Seeing inside current project.')     },
      onPlayProject: function() { console.log('Playing previously saved project') },
      onPlayCurrentProject: function() { console.log('Playing current project') },
      onEditProject: function() { console.log('I condensed'); }
    }
  });