/**
 * @fileoverview Manage storage of projects in browser.
 */
const ScratchProject = require('./scratch_project.js');

class ScratchVUIStorage {
  /**
   * Constructor for ScratchVUIStorage class
   * @param {!String} rawInstruction - the utterance from the user.
   * @param {!ScratchAction} action - the action to which this instruction
   *    belongs.
   */
  constructor() {
    this.saveToServer = true;
    this.useLocalStorage = true;
  }

  removeProject(projectName) {
    if (this.useLocalStorage) {
      _removeProjectFromLocalStorage(projectName)
    }
    if (this.saveToServer = true) {
      _removeProjectFromServer(projectName)
    }
  }

  /**
   * Save map of project names to storage.
   */
  save(projects) {
    if (this.useLocalStorage) {
      savedToLocal = this._saveToLocalStorage(projects);
    }
    if (this.saveToServer) {
      savedToServer = this._saveToServer(projects);
    }
  }

  /**
   * Save map of project names to local storage.
   */
  _saveToLocalStorage(projects) {
    if (!window.localStorage.scratchProjects) {
      window.localStorage.scratchProjects = JSON.stringify({});
    }
    for (var projectName in projects) {
      var savedProjects = JSON.parse(window.localStorage.scratchProjects);
      savedProjects[projectName] = projects[projectName].instructions;
      window.localStorage.scratchProjects = JSON.stringify(savedProjects);
    }
  }

  _removeProjectFromLocalStorage(projectName) {
    if (window.localStorage.scratchProjects) {
      var savedProjects = JSON.parse(window.localStorage.scratchProjects);
      delete savedProjects[projectName];
      window.localStorage.scratchProjects = JSON.stringify(savedProjects);
    }
  }

  /**
   * Save map of project names to server.
   */
  _saveToServer(projects) {
    // TODO: not sure this is necessary if I'll be updating the server
    // instruction by instruction.
    return;
  }

  _removeProjectFromServer(project) {
    // TODO: not sure this is necessary if I'll be updating the server
    // instruction by instruction.
    return;
  }
}

module.exports = ScratchVUIStorage;