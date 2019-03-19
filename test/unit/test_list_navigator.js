const test = require('tap').test;
const StateMachine = require('javascript-state-machine');
const ListNavigator = require('../../src/list_navigator.js');
const Utils = require('../../src/utils.js');

test('empty list successor', t => {
	var testlist = [];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), null);
	nav.next();
	t.same(nav.current(), null);
	t.end();
});

test('empty list predecessor', t => {
	var testlist = [];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), null);
	nav.previous();
	t.same(nav.current(), null);
	t.end();
});


test('single element list successor and predecessor', t => {
	var testlist = [1];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1]);
	nav.previous();
	t.same(nav.current(), [1]);
	nav.next();
	t.same(nav.current(), [1]);
	t.end();
});


test('single element list successor and predecessor', t => {
	var testlist = [1];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1]);
	nav.previous();
	t.same(nav.current(), [1]);
	nav.next();
	t.same(nav.current(), [1]);
	t.end();
});

test('two element list', t => {
	var testlist = [1,2];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.previous();
	t.same(nav.current(), [1,2]);
	nav.next();
	t.same(nav.current(), [1,2]);
	t.end();
});

test('two element list', t => {
	var testlist = [1,2];
	var chunksize = 1;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1]);
	nav.previous();

	// no predecessor
	t.same(nav.currentPageIndex, 0);
	t.same(nav.current(), [1]);
	nav.next();

	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [2]);
	t.end();
});


test('three element list', t => {
	var testlist = [1,2,3];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.next();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3]);
	nav.next();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3]);
	t.end();
});

test('four element list', t => {
	var testlist = [1,2,3,4];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.next();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3,4]);
	t.end();
});

test('five element list', t => {
	var testlist = [1,2,3,4,5];
	var chunksize = 2;
	var nav = new ListNavigator(testlist, chunksize);
	t.same(nav.current(), [1,2]);
	nav.next();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3,4]);
	nav.next();
	t.same(nav.currentPageIndex, 2);
	t.same(nav.current(), [5]);
	nav.next();
	t.same(nav.currentPageIndex, 2);
	t.same(nav.current(), [5]);
	nav.previous();
	t.same(nav.currentPageIndex, 1);
	t.same(nav.current(), [3,4]);
	nav.previous();
	t.same(nav.currentPageIndex, 0);
	t.same(nav.current(), [1,2]);
	nav.previous();
	t.same(nav.currentPageIndex, 0);
	t.same(nav.current(), [1,2]);
	t.end();
});

