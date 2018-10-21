/**
 * @fileoverview
 *
 * Consolidate audio cue management for the Scratch Voice User Interface (scratch-vui)
 * @author Tina Quach (quacht@mit.edu)
 */

class ScratchAudio {
	constructor() {
 		this.audioElement = document.createElement('audio');
 		this.audioElement.type = "audio/wav";
	}

	cueMistake() {
		this.audioElement.src = 'assets/sound/hightom.wav'
		this.audioElement.play();
	}

	cueProjectStarted() {
		this.audioElement.src = 'assets/sound/coin_reverse.wav'
		this.audioElement.play();
	}

	cueProjectFinished() {
    this.audioElement.src = 'assets/sound/coin_reverse.wav'
    this.audioElement.play();
	}

	cueListening() {
    this.audioElement.src = 'assets/sound/snap.wav'
    this.audioElement.play();
	}

	cueDoneListening() {
    this.audioElement.src = 'assets/sound/pop.wav'
    this.audioElement.play();
	}

	// Ambient sounds to characterize different contexts
	cueInsideProject() {
    this.audioElement.src = 'assets/sound/beats.wav'
    this.audioElement.play();
	}

	// Ambient sounds to characterize different contexts
	cueHomeState() {
    this.audioElement.src = 'assets/sound/blipblop.wav'
    this.audioElement.play();
	}
}

module.exports = ScratchAudio;