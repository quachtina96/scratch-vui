/**
 * @fileoverview Define the various actions and their requirments.
 *
 * @author Tina Quach (quachtina96)
 */
import { Requirement, Action } from './action.js'
import { ScratchRegex } from './triggers.js'

/**
 * Define the ScratchAction namespace.
 */
var ScratchAction = {};

ScratchAction.queryState = Action({
	trigger: /what state am i in|where am i/,
	description: 'figure out what state you are in',
	requirements: {},
});