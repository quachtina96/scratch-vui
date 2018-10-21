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
	}

	_newChannel() {
		var channel = document.createElement('audio');
 		channel.type = "audio/wav";
 		channel.volume -= 0.3
 		return channel;
	}

	cueMistake() {
		this.cue.src = 'assets/sound/hightom.wav'
		this.cue.play();
	}

	cueProjectStarted() {
		this.cue.src = 'assets/sound/coin_reverse.wav'
		this.cue.play();
	}

	cueProjectFinished() {
    this.cue.src = 'assets/sound/coin_reverse.wav'
    this.cue.play();
	}

	cueListening() {
    this.cue.src = 'assets/sound/snap.wav'
    this.cue.play();
	}

	cueDoneListening() {
    this.cue.src = 'assets/sound/pop.wav'
    this.cue.play();
	}

	// Ambient sounds to characterize different contexts
	cueInsideProject() {
		console.log("cue inside project func")
		this.background.src = "";
    this.background.src = 'assets/sound/beats.mp3'
    this.background.play();
	}

	// Ambient sounds to characterize different contexts
	cueHomeState() {
		this.background.src = "";
    this.background.src = 'assets/sound/blipblop.mp3'
    this.background.play();
	}

	stopBackground() {
		this.background.pause();
	}
}

module.exports = ScratchAudio;