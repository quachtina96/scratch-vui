/**
 * @fileoverview
 *
 * Consolidate audio cue management for the Scratch Voice User Interface (scratch-vui)
 * @author Tina Quach (quacht@mit.edu)
 */

class ScratchAudio {
	constructor() {
 		this.cue = this._newChannel();
 		this.background = this._newChannel();
 		this.background.setAttributeNode(document.createAttribute('loop'));
 		this.muteCues = false;
 		this.muteBackground = false;
	}

	_newChannel() {
		var channel = document.createElement('audio');
 		channel.type = "audio/wav";
 		channel.volume -= 0.5
 		return channel;
	}

	_playCue(filepath) {
		if (!this.muteCues) {
			this.cue.src = filepath;
			this.cue.play();
		}
	}

	cueMistake() {
		this._playCue('assets/sound/hightom.wav');
	}

	cueProjectStarted() {
		this._playCue('assets/sound/coin_reverse.wav');
	}

	cueProjectFinished() {
		this._playCue('assets/sound/coin_reverse.wav');
	}

	cueListening() {
		this._playCue('assets/sound/snap.wav');
	}

	cueDoneListening() {
		this._playCue('assets/sound/pop.wav');
	}

	// Ambient sounds to characterize different contexts
	cueBackground(state) {
		if (state == 'InsideProject') {
			this.cueInsideProject();
		} else if (state == 'Home') {
			this.cueHomeState();
		}
	}

	cueInsideProject() {
		if (!this.muteBackground) {
			this.stopBackground();
	    this.background.src = 'assets/sound/beats.mp3';
	    this.background.play();
		}
	}

	// Ambient sounds to characterize different contexts
	cueHomeState() {
		if (!this.muteBackground) {
			this.stopBackground();
	    this.background.src = 'assets/sound/blipblop.mp3';
	    this.background.play();
	  }
	}

	stopBackground() {
		this.background.src = '';
	}
}

module.exports = ScratchAudio;