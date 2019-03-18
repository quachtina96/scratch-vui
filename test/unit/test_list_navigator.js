const test = require('tap').test;
const StateMachine = require('javascript-state-machine');
const ListNavigator = require('../../src/list_navigator.js');
const Utils = require('../../src/utils.js');

var chunksize = 2;

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


// TODO: correct test
test('empty list successor', t => {
	var testlist = [];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), null);
	nav.moveToSuccessor();
	t.same(nav.current(), null);
	t.end();
});

test('empty list predecessor', t => {
	var testlist = [];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), null);
	nav.moveToPredecessor();
	t.same(nav.current(), null);
	t.end();
});


test('single element list successor and predecessor', t => {
	var testlist = [1];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1]);
	nav.moveToPredecessor();
	t.same(nav.current(), [1]);
	nav.moveToSuccessor();
	t.same(nav.current(), [1]);
	t.end();
});


test('single element list successor and predecessor', t => {
	var testlist = [1];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1]);
	nav.moveToPredecessor();
	t.same(nav.current(), [1]);
	nav.moveToSuccessor();
	t.same(nav.current(), [1]);
	t.end();
});

test('two element list', t => {
	var testlist = [1,2];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.moveToPredecessor();
	t.same(nav.current(), [1,2]);
	nav.moveToSuccessor();
	t.same(nav.current(), [1,2]);
	t.end();
});

test('two element list', t => {
	var testlist = [1,2];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1]);
	nav.moveToPredecessor();

	// no predecessor
	t.same(nav.currentPageIndex, 0);
	t.same(nav.current(), [1]);
	nav.moveToSuccessor();

	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [2]);
	t.end();
});


test('three element list', t => {
	var testlist = [1,2,3];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.moveToSuccessor();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3]);
	nav.moveToSuccessor();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3]);
	t.end();
});

test('four element list', t => {
	var testlist = [1,2,3,4];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.moveToSuccessor();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3,4]);
	t.end();
});

test('five element list', t => {
	var testlist = [1,2,3,4,5];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.moveToSuccessor();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3,4]);
	nav.moveToSuccessor();
	t.same(nav.currentPageIndex, 2);
	t.same(nav.current(), [5]);
	nav.moveToSuccessor();
	t.same(nav.currentPageIndex, 2);
	t.same(nav.current(), [5]);
	nav.moveToPredecessor();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3,4]);
	nav.moveToPredecessor();
	t.same(nav.currentPageIndex, 0);
	t.same(nav.current(), [1,2]);
	nav.moveToPredecessor();
	t.same(nav.currentPageIndex, 0);
	t.same(nav.current(), [1,2]);
	t.end();
});

