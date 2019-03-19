/**
 * @fileoverview ListNavigator
 *
 * @author quacht@mit.edu (Tina Quach)
 */
const StateMachine = require('javascript-state-machine');
const ScratchAction = require('./scratch_action.js');
const Action = require('./action.js').Action;
const Utils = require('./utils.js');

var ListNavigator = StateMachine.factory({
	init: 'start',
	transitions: [
		// Support linear  creation process: create, empty, named, nonempty
		{ name: 'next', from: 'start', to: function() {
			var nextChunk = this.successor(this.list, this.currentPageIndex);
			if (nextChunk) {
				this.currentPageIndex += 1;
				return 'middle';
			} else {
				return 'end';
			}
			}
		},
		{ name: 'next', from: 'middle', to: function() {
				// TODO: fix the current page index stuff.
				var nextChunk = this.successor(this.list, this.currentPageIndex);
				if (nextChunk) {
					this.currentPageIndex += 1;
					return 'middle';
				} else {
					return 'end';
				}
			}
		},
		{ name: 'next', from: 'end', to: 'end'},
		// { name: 'moveToPredecessor', from: 'end', to: 'end'}, // should be valid to enable empty lists
		// { name: 'moveToSuccessor', from: 'start', to: 'start'}, // should be valid to enable empty lists
		{ name: 'previous', from: 'start', to: 'start'},
		{ name: 'previous', from: 'middle', to: function() {
			var nextChunk = this.predecessor(this.list, this.currentPageIndex);
				if (nextChunk) {
					this.currentPageIndex -= 1;
					return 'middle'
				} else {
					return 'start'
				}
			}
		},
		{ name: 'previous', from: 'end', to: function() {
				var previousChunk = this.predecessor(this.list, this.currentPageIndex);
				if (previousChunk) {
					this.currentPageIndex -= 1;
					return 'middle';
				} else {
					return 'start';
				}
			}
		},
	],
	data: function(list, chunksize, opt_ssm, opt_unwrapper) {
		var getNavigatorFunctions = (list, chunksize, opt_current) => {
			// Return a successor if it exists. Otherwise, return null.
			var current = opt_current ? opt_current : 0;
			var successor = (list, current) => {
				// return chunks of chunksize
				var pages = list.chunk(chunksize);
				if (pages.length -1 == current) {
					return null;
				} else {
					return pages[current + 1]
				}
			};

			// Return a predecessor if it exists. Otherwise, return null.
			var predecessor = (list, current) => {
				// return chunks of chunksize
				var pages = list.chunk(chunksize);
				if (0 == current) {
					return null;
				} else {
					return pages[current - 1]
				}
			};

			return {
				successor: successor,
				predecessor: predecessor
			}
		};
		var {successor, predecessor} = getNavigatorFunctions(list, chunksize)
		var ssm = opt_ssm ? opt_ssm : null;
		var unwrapper = opt_unwrapper ? opt_unwrapper : null;
		return {
			list: list,
			chunkedList: list.chunk(chunksize),
			successor: successor,
			predecessor: predecessor,
			currentPageIndex: 0,
			actions: ScratchAction.ListNavigator,
			ssm: ssm,
			unwrapper: unwrapper,
		}
	},
	methods: {
		setScratchStateMachine: function(ssm) {
			this.ssm = ssm;
		},
		current: function() {
			if (this.chunkedList.length < 1) {
				return null;
			}
			return this.chunkedList[this.currentPageIndex];
		},
		/**
	   * Handle action. Return true if successful or  false if unable to trigger
	   * action.
	   */
		handleUtterance: async function(utterance) {
		    var action = await this._getAction(utterance);
		    if (!action) {
		    	this.ssm.pm.audio.cueMistake();
		    	this.ssm.pm.say(`You are navigating a list from the start. Say 'next' or 'previous' to move through the list or say 'exit list' to go back to where you were before`);
		      // throw Error('listNavigator could not get action from utterance');
		    }
		    return this._handleAction(action, utterance);
		},
	  /**
	   * Return action and arguments corresponding to utterance if there's a match.
	   */
	  async _getAction(utterance) {
	    utterance = Utils.removeFillerWords(utterance.toLowerCase());

	    var listNavigator = this;

	    for (var triggerType in listNavigator.actions) {
	      var args = Utils.match(utterance, listNavigator.actions[triggerType].trigger);
	      if (args && args.length > 0) {
	        DEBUG && console.log(`[listNavigator handleUtterance] trigger type matched and action created`);

	        var action = new Action(listNavigator.actions[triggerType]);
	        // action.setArguments(listNavigator.ssm, args);
	        // console.log(`set arguments for action ${action.arguments.map((argument) => argument.value)}`)

	        // // The current actions and arguments are maintained at the  manager
	        // // level to simplify management since there can only be one current action
	        // // and argument to focus on.
	        // listNavigator.ssm.pm.currentAction = action;

	        // Await the synchronous audio cue
	        await listNavigator.ssm.pm.audio.cueSuccess();

	        return action;
	      }
	    }
	  },
	  /**
	   * Handle action. Return true if successful, False if unable to trigger
	   * action, exit if leaving list navigtor.
	   */
	  _handleAction(action, utterance) {
	  	try {
	  		// execute the action
	  		this[action.name]();
	  		if (action.name == 'finishNavigatingList') {
	  			return 'exit';
	  		}
	  		return true;
	  	} catch (e) {
	  		if (action) {
	  			console.log(`failed to handle action ${action.name}`)
	  		}
	  		console.log(e)
	  		return false;
	  	}
	  },
	  getNextPart() {
	  	this.next();
	  	this.unwrapper(this.current(), this.ssm);
	  },
	  getPreviousPart() {
	  	this.previous();
	  	this.unwrapper(this.current(), this.ssm);
	  },
	  // TODO: utilize getPart so that we can index into specific pages of the
	  // list.
	  getPart(number) {
	  	if (Utils.checkBounds(number, this.chunkedList)) {
	  		this._setCurrent(number);
	  		this.unwrapper(this.current(), this.ssm);
	  	}
	  	this.ssm.pm.say(`There is no part ${number} of the list`);
	  },
	  _setCurrent() {
	  	this.previous();
	  	this.unwrapper(this.current(), this.ssm);
	  },
	  finishNavigatingList() {
	  	this.ssm.pm.listNavigator = null;
	  	this.ssm.pm.say("Exiting list")
	  	this.ssm.finishNavigatingList();
	  }
	}
});

module.exports = ListNavigator;

