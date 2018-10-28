/**
 * @fileoverview
 * This file defines the ScratchAction class which will serve to organize
 * information about possible user actions within the ScratchVUI interface.
 *
 * @author Tina Quach (quachtina96)
 */

/**
 * The Requirement class provides a representation for arguments needed to
 * accomplish the various actions in the system.
 */
class Requirement {
	constructor(name, validator) {
		this.name = name;
		this.value = null;
		this.validator = validator;
		this.description = description;
	}

	isSatisfied() {
		return this.value != null;
	}

	validate(value) {
		return this.validator(value)
	}

	/**
	 * If the value is valid for the given requirement, set the value.
	 */
	set(value) {
		var valid = this.validate(value)
		this.value = valid ? value : this.value;
		return valid;
	}

	/**
	 * Get value associated with the requirement.
	 */
	get() {
		return this.value
	}
}

class Action {
	/**
	 * Create an instance of a Scratch Action.
	 * @param {Object} params containing
	 * 		@param {RegExp} trigger - the regular expression representing the ways to
	 * 			recognize an action from a user's utterance and where to extract arguments
	 * 		@param {String} description - how to verbally represent a specific action.
	 * 		@param {Object} requirements - map of requirement names to requirement objects.
	 */
	constructor(options) {
		this.trigger = options.trigger;
		this.description = options.description;
		this.requirements = options.requirements;
	}

	/**
	 * Return list of missing arguments needed to execute action.
	 */
	_getMissingArguments() {
		var missingArgs = {}
		for req in this.requirements {
			if (!req.isSatisfied()) {
				missingArgs[req] = this.requirements[req]
			}
		}
		return missingArgs;
	}

	/**
	 * Ask user for arguments and add those arguments to the action.
	 */
	requestMissingArguments() {
		var argsToRequest = this._getMissingArguments
	}

	/**
	 * Ask user to satisfy requirement.
	 */
	_requestArgument(synthesis, requirement) {
		synthesis.say('What do you want ' + requirement.name + 'to be?')
		// TODO: if the user doesn't know, pick something for them? and/or explain
		// further what the thing is by giving them a description. Only do this after
		// introducing the right arrow key as a way to skip the speech. OR maybe
		// pressing the spacebar to start talking (or toggle speech recognition shd
		// be the way to silence the speech)

		// direct speech utterance to the action.
	}

	modifyRequirement(name, value) {
		this.requirements[name].set(value)
	}
}

export { Requirement }
export { Action }