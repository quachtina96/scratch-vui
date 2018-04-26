// The state machine manages state so that the core logic exists outside of
// contexts within dialogflow.

// TODO: programmatically generate the transition objects because this
// isn't scalable.
// TODO: investigate how to save state such as current project.
var fsm = new StateMachine({
    init: 'Home',
    transitions: [
      { name: 'newProject',     from: 'Home',  to: 'InsideProject' },
      // Return should take you back to the last state
      { name: 'returnFromInsideProjectToHome',   from: 'InsideProject', to: 'Home'  },
      { name: 'returnFromPlayProjectToHome',   from: 'PlayProject', to: 'Home'  },
      { name: 'returnFromInsidetoPlayProject',   from: 'InsideProject', to: 'PlayProject'  },
      { name: 'returnFromPlaytoInsideProject',   from: 'PlayProject', to: 'InsideProject'  },
      { name: 'playProject', from: 'Home', to: 'PlayProject'},
      { name: 'playCurrentProject', from: 'InsideProject', to: 'PlayProject'},
      { name: 'editProject', from: 'PlayProject', to: 'InsideProject' }
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
      onReturnFromPlaytoInsideProject: function() {
        console.log('Seeing inside current project.');
      },
      onPlayProject: function() {
        console.log('Playing previously saved project');
      },
      onPlayCurrentProject: function() {
        console.log('Playing current project');
      },
      onEditProject: function() {
        console.log('Opening project for editing');
      }
    }
  });
