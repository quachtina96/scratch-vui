/**
 * @fileoverview ListNavigator
 *
 * @author quacht@mit.edu (Tina Quach)
 */
const StateMachine = require('javascript-state-machine');

var ListNavigator = StateMachine.factory({
	init: 'start',
	transitions: [
		// Support linear project creation process: create, empty, named, nonempty
		{ name: 'moveToSuccessor', from: 'start', to: function() {
			var nextChunk = this.successor(this.list, this.currentPageIndex);
			if (nextChunk) {
				this.currentPageIndex += 1;
				return 'middle';
			} else {
				return 'end';
			}
			}
		},
		{ name: 'moveToSuccessor', from: 'middle', to: function() {
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
		{ name: 'moveToSuccessor', from: 'end', to: 'end'},
		// { name: 'moveToPredecessor', from: 'end', to: 'end'}, // should be valid to enable empty lists
		// { name: 'moveToSuccessor', from: 'start', to: 'start'}, // should be valid to enable empty lists
		{ name: 'moveToPredecessor', from: 'start', to: 'start'},
		{ name: 'moveToPredecessor', from: 'middle', to: function() {
			var nextChunk = this.predecessor(this.list, this.currentPageIndex);
				if (nextChunk) {
					this.currentPageIndex -= 1;
					return 'middle'
				} else {
					return 'start'
				}
			}
		},
		{ name: 'moveToPredecessor', from: 'end', to: function() {
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
	data: function(list, chunksize) {
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
		return {
			list: list,
			chunkedList: list.chunk(chunksize),
			successor: successor,
			predecessor: predecessor,
			currentPageIndex: 0
		}
	},
	methods: {
		current: function() {
			if (this.chunkedList.length < 1) {
				return null;
			}
			return this.chunkedList[this.currentPageIndex];
		}
	}
});

module.exports = ListNavigator;

