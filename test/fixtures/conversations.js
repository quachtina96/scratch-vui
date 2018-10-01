
/**
 * This file verifies the conversation flows designed for the system.
 */

/**
 * Conversations
 */
Conversations = {
	"linear_create_play_see_inside": [
		// PART 1: CREATE
		["scratch create a new project", ["what do you want to call it?"]],
		["say something nice", ["Okay. When you say, Scratch, say something nice, I’ll play the project. What’s the first step?"]],
		["say something nice", ["I heard you say say something nice", "That doesn't match any Scratch commands"],
		["play the meow sound", ["Okay, what’s the next step?"]],
		["that's it", ["Cool, now you can say, Scratch, say something nice, to play the project."]],
		// PART 2: PLAY
		["say something nice", ["playing project"]],
		// Current issue: playing project is being said at the SAME time that the project is running.
		// TODO: wait for the speech to end before starting the project?
		// Another issue: timing with ending the project
		// PART 3: SEE INSIDE
		["scratch see inside", ["Opening project say something nice for editing", "There is 1 step"]],
		["scratch what is step one", ["Step 1", "play the meow sound"]],
		["scratch replace step one with play the chomp sound"], ["replaced step 1"]],
		["scratch play the project",["Playing current project say something nice", "done playing project"]]
	],
	"see_inside_and_edit_existing": [
		["scratch say something nice", ["playing project"]],
		["scratch see inside", ["Opening project say something nice for editing", "There is 1 step"]],
		// Test all "getCurrentStep"
		["scratch what step am I on",["Step 1", "play the chomp sound"]],
		// TODO: the following line: wrongly gets
		// "I heard you say scratch what's my current step"
		// "That doesn't match any Scratch commands."
		["scratch what's my current step",["Step 1", "play the chomp sound"]],
		["scratch what step is this",["Step 1", "play the chomp sound"]],
		// TODO: enable test of insertion before step 1 here.
		// The problem I'm seeing is that the the whole prefix of the string is selected
		// as the instruction to insert"
		// ["insert play the meow sound before step 1",[]],
    ]
  };

module.exports = Conversations;
