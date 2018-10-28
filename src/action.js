/**
 * @fileoverview
 * This file defines the ScratchAction class which will serve to organize
 * information about possible user actions within the ScratchVUI interface.
 *
 * @author Tina Quach (quachtina96)
 */

/**
 * The Argument class provides a representation for arguments needed to
 * accomplish the various actions in the system.
 */
class Argument {
	/**
	 * Create a argument.
	 * @param {Object} options -
	 * 	@param {String} name - the argument the argument represents
	 * 	@param {Function} validator - takes two parameters: ScratchStateMachine
	 * 		instance and the value to validate. Returns true if value is valid.
	 * 	@param {String} description - how to describe the desired argument
	 */
	constructor(options) {
		this.name = options.name;
		this.value = null;
		this.validator = options.validator ? options.validator () => {return true};
		this.description = options.description ? options.description : "" ;
	}

	isSatisfied() {
		return this.value != null;
	}

	validate(value) {
		return this.validator(value)
	}

	/**
	 * If the value is valid for the given argument, set the value.
	 */
	set(value) {
		var valid = this.validate(value)
		this.value = valid ? value : this.value;
		return valid;
	}

	/**
	 * Get value associated with the argument.
	 */
	get() {
		return this.value
	}
}

class Action {
	/**
	 * Create an instance of a Scratch Action.
	 * @param {Object} params containing
	 * 		{RegExp} trigger - the regular expression representing the ways to
	 * 			recognize an action from a user's utterance and where to extract arguments
	 * 		{String} description - how to verbally represent a specific action.
	 * 		{Object} arguments - map of argument names to argument objects.
	 * 		{Function} contextValidator - given ssm and other arguments, returns true
	 * 				if able to execute action given context.
	 */
	constructor(options) {
		this.trigger = options.trigger ? options.trigger : /\*/;
		this.description = options.description ? options.description :  "";
		this.arguments = options.arguments ? options.arguments : [];
		this.contextValidator = options.contextValidator ? options.contextValidator : () => {return true};
	}

	/**
	 * Return list of missing arguments needed to execute action.
	 */
	_getMissingArguments() {
		var missingArgs = {}
		this.arguments.forEach((req) => {
			if (!req.isSatisfied()) {
				missingArgs[req] = this.arguments[req]
			}
		});
		return missingArgs;
	}

	/**
	 * Ask user for arguments and add those arguments to the action.
	 */
	requestMissingArguments() {
		var argsToRequest = this._getMissingArguments
	}

	/**
	 * Ask user to satisfy argument.
	 */
	_requestArgument(synthesis, argument) {
		synthesis.say('What do you want ' + argument.name + 'to be?')
		// TODO: if the user doesn't know, pick something for them? and/or explain
		// further what the thing is by giving them a description. Only do this after
		// introducing the right arrow key as a way to skip the speech. OR maybe
		// pressing the spacebar to start talking (or toggle speech recognition shd
		// be the way to silence the speech)

		// direct speech utterance to the action.
	}

	modifyArgument(name, value) {
		var reqToMod = this.arguments.filter(argument => argument.name == name)
		reqToMod.set(value)
	}
}

export { Argument }
export { Action }