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

  getProjects() {
    if (this.useLocalStorage) {
      var locallySavedProjects = {}
      if (!window.localStorage.scratchProjects) {
        window.localStorage.scratchProjects = JSON.stringify({});
      }
      locallySavedProjects = JSON.parse(window.localStorage.scratchProjects);
    }
    if (this.saveToServer) {
      var projectsSavedToServer = {}
      // TODO: send http request to the URL hosting the server side to get all
      // projects belonging to the particular user.
      // /user/<user_name>/allprojects
      // Process the result to ensure that the format is correct for the
      // ScratchProjectManager
    }

    // If the two project dictionaries share the same keys (same project names),
    // the locally saved projects take precedent.
    return Object.assign({}, projectsSavedToServer, locallySavedProjects);
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
      this._saveToLocalStorage(projects);
    }
    if (this.saveToServer) {
      this._saveToServer(projects);
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