/**
 * This file defines and generates the speech recognition grammar for improved
 * accuracy.
 */

/**
 * ScratchGrammar namespace.
 */
ScratchGrammar = {}


ScratchGrammar.commands = `#JSGF V1.0;
	grammar scratch_state_machine.command;
	public <newProject> = new project|create new project|create project|make new project|make project;

	public <editExistingProject> = see inside ;

	public <editProject> = see inside;

	public <finishProject> = i'm done|i'm finished;

	public <play> = scratch <project>|scratch play <project>|play <project>|;

	public <playCurrentProject> = play project|start project|play current project|test project;

	public <return> = stop|i'm done|go back|quit|exit;

	public <getProjectNames> = what projects do i have|what have i made so far|what are my projects called;

	public <getProjectCount> = how many projects do i have|how many projects have i made;
	public <goToStep> = go to step |what's step |what is step ;

	public <nextStep> = go to next step|next step|what's next;

	public <previousStep> = previous step|go back a step;

	public <playStep> = play step|play current step|what does it do;

	public <insertStepBefore> = insert  before step | before step ;

	public <insertStepAfter> = insert  after step | after step ;

	public <deleteStep> = delete step ;

	public <replaceStep> = replace step <number> with ;

	public <replaceSound> = replace the <sound_name> sound with the <sound_name> sound;

	public <replaceInStep> = in step <number> replace  with ;

	public <stopEditing> = stop|i'm done|that's it;`

// TODO: programmatically populate numbers?.
ScratchGrammar.numbers = `#JSGF V1.0;
grammar scratch_state_machine.numbers;
public <number> =  one | two | three | four | five | six | seven | eight |
nine | ten | eleven | twelve | thirteen | fourteen | fifteen | sixteen |
seventeen | eighteen | nineteen | twenty;\n`

// TODO: programmatically populate with more sounds.
ScratchGrammar.sounds = `#JSGF V1.0;
grammar scratch_state_machine.sounds;
public <sound_name> = meow|moo|boing|droplet';`

/**
 * Get the grammar rules in JSFG V1.0 format.
 * @param {!Object} triggerMap - map of trigger types to regular expressions
 * @return {!String} the grammar rules
 */
function getRules(triggerMap) {
	var rules = []
	for (var triggerType in triggerMap) {
		var regexString = triggerMap[triggerType].toString().replace(/\(\.\*\)/g,"");
		var matches = regexString.substring(1,regexString.length-1)
		var rule = 'public <' + triggerType + '> = ' + matches + ';\n'
		rules.push(rule);
	}
	return rules.join('\n');
}

// Upon using the system, you want the grammar to recognize expected phrases more
// easily.
function generateGrammar(scratch) {
	var header = `#JSGF V1.0;
	grammar scratch_state_machine; \n`

	var stateMachineRules = getRules(scratch._triggers);

	var dummyProject = new ScratchProject();
	var projectRules = getRules(dummyProject.editTriggers);
	var projectNameRule = 'public <project_name> = ' +
			Object.keys(scratch.projects).join('|') + ';\n';

	var grammar = header + stateMachineRules + projectRules + projectNameRule;
	return grammar.replace(/\\/g,"")
}

function test_getRules() {
	var triggers = {
    'newProject': /new project|create new project|create project|make new project|make project/,
    'editExistingProject': /see inside (.*)/,
    'editProject': /see inside/,
    'finishProject': /i'm done|i'm finished/,
    'play': /scratch (.*)|scratch play (.*)|play (.*)|(.*)/,
    'playCurrentProject': /play project|start project|play current project|test project/,
    'return': /stop|i'm done|go back|quit|exit/,
    'getProjectNames': /what projects do i have|what have i made so far|what are my projects called/,
    'getProjectCount': /how many projects do i have|how many projects have i made/
  }
  console.log(getRules(triggers))
}


