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
	 *  @param {String} name - the argument the argument represents
	 *  @param {Function} validator - takes two parameters: ScratchStateMachine
	 *      instance and the value to validate. Returns true if value is valid.
	 *  @param {String} description - how to describe the desired argument
	 */
	constructor(options) {
		this.name = options.name;
		this.value = null;
		this.validator = options.validator ? options.validator : () => {return true};
		this.description = options.description ? options.description : "";
	}

	isSatisfied() {
		return this.value != null;
	}

	validate(ssm, value) {
		var result = this.validator(ssm, value);
		if (result != true) {
			ssm.pm.say(result);
			return false;
		}
		return true;
	}

	/**
	 * If the value is valid for the given argument, set the value.
	 */
	set(ssm, value) {
		var valid = this.validate(ssm, value)
		this.value = valid ? value : this.value;
		return valid;
	}

	/**
	 * Get value associated with the argument.
	 */
	get() {
		return this.value
	}

	/**
	 * Return whether successfully.
	 */
	async handleUtterance(ssm, value) {
  	DEBUG && console.log(`[argument handleUtterance]`);
  	if (this.set(ssm,value)) {
			await ssm.pm.audio.cueSuccess();
			DEBUG && console.log(`[argument handleUtterance] set value`);
			console.log(`set ${this.name} to ${value}`);
			return true;
		} else {
			await ssm.pm.audio.cueMistake();
			DEBUG && console.log(`[argument handleUtterance] could not set value`);
			console.log(`could not set ${this.name} to ${value}`);
			throw Error(`could not set argument ${this.name} to ${value}`);
		}
	}
}

/**
 * The Action class provides a representation for actions that a user may take
 * in the Scratch VUI system.
 */
class Action {
	/**
	 * Create an instance of a Scratch Action.
	 * @param {Object} params containing
	 *      {RegExp} trigger - the regular expression representing the ways to
	 *          recognize an action from a user's utterance and where to extract arguments
	 *      {String} description - how to verbally represent a specific action.
	 *      {Object} arguments - map of argument names to argument objects.
	 *      {Function} contextValidator - given ssm and other arguments, returns true
	 *              if able to execute action given context.
	 */
	constructor(options) {
		if (!options.name) {
			throw "Cannot have an Action without a name";
		}
		this.name = options.name
		this.trigger = options.trigger ? options.trigger : /\*/;
		this.description = options.description ? options.description :  "";
		this.arguments = options.arguments ? options.arguments.map((arg) => new Argument(arg)) : [];
		this.contextValidator = options.contextValidator ? options.contextValidator : () => {return true};
		this.idealTrigger = options.idealTrigger ? options.idealTrigger : () => {return true};
		this.missingArguments = null;
		this.invalidArguments = [];
		// The current argument that is being set or requested.
		this.current = null;
	}

	validInContext(ssm) {
		var result = this.contextValidator(ssm);
	    if (result != true) {
	      // Explain why the context is invalid.
	      ssm.pm.say(result);
	      result = false;
	    }
	    return result;
	}

	/**
	 * Set arguments for the action based on the arguments extracted from the regular
	 * expression.
	 */
	setArguments(ssm, args) {
		this.invalidArguments = [];
		for (var i=1; i<args.length; i++) {
			var valid = this.arguments[i-1].set(ssm, args[i]);
			if (!valid) {
				this.invalidArguments.push({
					argument: this.arguments[i-1],
					invalidValue: args[i]
				});
			}
		}
	}

	/**
	 * Clear arguments for the action once the action has been complete.
	 */
	clearArguments(ssm, args) {
		for (var i=1; i<args.length; i++) {
			this.arguments[i-1].set(ssm, null)
		}
	}

	/**
	 * Return list of missing arguments needed to execute action.
	 */
	_getMissingArguments() {
		return this.arguments.filter((req) => !req.isSatisfied());
	}

	/**
	 * Ask user for arguments and add those arguments to the action.
	 */
	getMissingArgument(ssm) {
		this.missingArguments = this._getMissingArguments()
		var argument = this.missingArguments.shift();
		if (!argument) {
			// Exit early if nothing to request
			return false;
		} else {
			this._requestArgument(ssm.pm, argument)
			return argument;
		}
	}

	/**
	 *
	 */
	handleUtterance(utterance, callback) {
		console.log('todo: handle utterance in action')
	}

	/**
	 * Ask user to satisfy argument.
	 */
	_requestArgument(pm, argument) {
		this.current = argument;
		// pm.say(`What do you want the ${argument.description} to be?`)
		pm.say(`What is the ${argument.name}?`)
	}

	modifyArgument(ssm, name, value) {
		var reqToMod = this.arguments.filter(argument => argument.name == name)
		reqToMod.set(ssm, value)
	}

	getArgs() {
		// We use a filler in the beginning because arguments extracted via
		// regex extract more from you.
		return ['filler'].concat(this.arguments.map((arg) => arg.value).filter((arg) => arg != null));
	}

	execute(ssm, utterance) {
    	DEBUG && console.log(`[action execute]`);
		if (this.name in ssm.pm.actions) {
			DEBUG && console.log(`[action execute] general`);
			ssm[this.name](this.getArgs(), utterance);
		} else if (ssm.pm.currentProject && this.name in ssm.pm.currentProject.editor.actions) {
			DEBUG && console.log(`[action execute] editor`);
			var editor = ssm.pm.currentProject.editor;
			editor.project = editor.project ? editor.project : ssm.pm.currentProject;
			editor[this.name].call(editor, this.getArgs());
		}
	}
}

module.exports = {
	Argument:Argument,
	Action:Action
}