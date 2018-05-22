/**
 * @fileoverview Manage storage of projects in browser.
 */

class ScratchStorage {

	static removeProject(projectName) {
		if (window.localStorage.scratchProjects) {
			var savedProjects = JSON.parse(window.localStorage.scratchProjects);
			delete savedProjects[projectName];
			window.localStorage.scratchProjects = JSON.stringify(savedProjects);
		}
	}

	static save(scratch) {
		if (!window.localStorage.scratchProjects) {
			window.localStorage.scratchProjects = JSON.stringify({});
		}
		for (var projectName in this.projects) {
			var savedProjects = JSON.parse(window.localStorage.scratchProjects);
			savedProjects[projectName] = this.projects[projectName].instructions;
			window.localStorage.scratchProjects = JSON.stringify(savedProjects);
		}
	}

	static load() {
		if (!window.localStorage.scratchProjects) {
			window.localStorage.scratchProjects = JSON.stringify({});
		}
		var savedProjects = JSON.parse(window.localStorage.scratchProjects);
		for (var name in savedProjects) {
			this.projects[name] = new ScratchProject(this);
			this.projects[name].name = name;
			this.projects[name].instructions = savedProjects[name];
		}
	}
}

module.exports = ScratchStorage;