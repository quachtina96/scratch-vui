/**
 * @fileoverview Manage storage of projects in browser.
 */
const ScratchProject = require('./scratch_project.js');

class ScratchStorage {

	static removeProject(projectName) {
		if (window.localStorage.scratchProjects) {
			var savedProjects = JSON.parse(window.localStorage.scratchProjects);
			delete savedProjects[projectName];
			window.localStorage.scratchProjects = JSON.stringify(savedProjects);
		}
	}

	/**
	 * Save map of project names to ScratchProjects.
	 */
	static save(projects) {
		if (!window.localStorage.scratchProjects) {
			window.localStorage.scratchProjects = JSON.stringify({});
		}
		for (var projectName in projects) {
			var savedProjects = JSON.parse(window.localStorage.scratchProjects);
			savedProjects[projectName] = projects[projectName].instructions;
			window.localStorage.scratchProjects = JSON.stringify(savedProjects);
		}
	}
}

module.exports = ScratchStorage;