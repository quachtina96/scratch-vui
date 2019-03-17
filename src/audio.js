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
 		if (!window.localStorage.scratchAudioSettings) {
	 		window.localStorage.scratchAudioSettings = JSON.stringify({
	 			'muteCues': false,
	 			'muteBackground': false
	 		});
	 	}
	 	this._setMuteFromLocalStorage();
	}

	/**
	 * Set the property and save it to local storage.
	 */
	_setMuteFromLocalStorage() {
 		if (window.localStorage.scratchAudioSettings) {
 			var settings = JSON.parse(window.localStorage.scratchAudioSettings);
	 		this.muteCues = settings.muteCues;
	 		this.muteBackground = settings.muteBackground;
	 	}
	}

	/**
	 * Set the property and save it to local storage.
	 */
	setMute(property, value) {
		this[property] = value;
		var settings = JSON.parse(window.localStorage.scratchAudioSettings);
		settings[property] = value;
		window.localStorage.scratchAudioSettings = JSON.stringify(settings);
	}

	_newChannel() {
		var channel = document.createElement('audio');
 		channel.type = "audio/wav";
 		channel.volume -= 0.5
 		return channel;
	}

	// @deprecated.
	_simplePlayCue(url) {
		if (!this.muteCues) {
			this.cue.src = url;
			this.cue.play();
		}
	}

	_playCue(url) {
		var scratchAudio = this;
		return new Promise(function(resolve, reject) {   // return a promise                    // autoplay when loaded
		   scratchAudio.cue.onerror = reject;                      // on error, reject
		   scratchAudio.cue.onended = resolve;                     // when done, resolve

			if (!scratchAudio.muteCues) {
				scratchAudio.cue.src = url;
				scratchAudio.cue.play();
			}
		});
	}

	cueMistake() {
		// https://www.soundboard.com/sb/Hanna_Barbera_sound_effec
		return this._playCue('assets/sound/bonk.wav');
	}

	cueSuccess() {
		// https://freesound.org/people/Mattix/sounds/402288/
		return this._playCue('assets/sound/v2/magicspell.mp3');
	}

	cueProjectStarted() {
		// sound came from reversing the Scratch 3.0 Coin sound
		return this._playCue('assets/sound/coin.wav');
	}

	// Here, we define a cue for the project ending. Hesitant to actually enable
	// this because it distracts from the composability of the projects
	cueProjectFinished() {
		// sound came from reversing the Scratch 3.0 Coin sound
		this._playCue('assets/sound/coin_reverse.wav');
	}

	cueListening() {
		// sound came from Scratch sound assets
		this._playCue('assets/sound/v2/startListening.wav');
	}

	cueDoneListening() {
		// sound came from Scratch sound assets
		this._playCue('assets/sound/v2/stopListening.wav');
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

// Note from Tina: I found this function that wraps an audio element's play
// function as a promise. Could be useful in the future so it's here for reference.
// https://stackoverflow.com/questions/30069988/how-can-i-create-a-promise-for-the-end-of-playing-sound
function play(url) {
  return new Promise(function(resolve, reject) { // return a promise
    var audio = new Audio();                     // create audio wo/ src
    audio.preload = "auto";                      // intend to play through
    audio.autoplay = true;                       // autoplay when loaded
    audio.onerror = reject;                      // on error, reject
    audio.onended = resolve;                     // when done, resolve

    audio.src = url
  });
}

module.exports = ScratchAudio;