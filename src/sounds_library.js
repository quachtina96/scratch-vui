/**
 * @fileoverview
 *
 * Implement sound library for the Scratch Voice User Interface (scratch-vui).
 * Utilizing code from scratch-gui.
 * @author Tina Quach (quacht@mit.edu)
 */

const AudioEngine = require('scratch-audio');
// TODO: figure out why this doesn't work
// const soundLibraryContent = require('assets/sound/sounds.json');
const soundLibraryContent = require('./sounds.js');

class SoundLibrary {
  constructor(vm) {
    this.vm = vm;
    /**
     * AudioEngine that will decode and play sounds for us.
     * @type {AudioEngine}
     */
    this.audioEngine = null;
    /**
     * A promise for the sound queued to play as soon as it loads and
     * decodes.
     * @type {Promise<SoundPlayer>}
     */
    this.playingSoundPromise = null;
    this.dict = this._getDict(soundLibraryContent);
  }

  _getDict(soundLibraryContent) {
    var dict = {}
    for (var i; i<soundLibraryContent.length; i++) {
      var item = soundLibraryContent[i];
      dict[item.name] = item;
    }
    return dict;
  }

  /**
   * Return a list of n sound objects from the library starting from
   * optional index (inclusive)
   * @param {int} n - the number of sound objects to return
   * @param {int} opt_index - optional index to start from; if -1, return random
   *   set.
   */
  getNSounds(n, opt_index=0) {
    var soundCount = soundLibraryContent.length;
    if (opt_index == -1) {
      // Return n random sounds
      var randomIndexes = new Set();
      while (randomIndexes.size < n) {
        randomIndexes.add(Math.floor(Math.random() * soundCount));
      }
      var sounds = randomIndexes.map((index) => soundLibraryContent[index]);
    } else {
      var sounds = soundLibraryContent.slice(opt_index, n);
    }
    return sounds;
  }

  /**
   * Return whether or not the sound exists in the sound library.
   */
  has(soundName) {
    return soundName in this.dict;
  }

  /**
   * Search the sound library and return candidates for similar sounds
   */
  getSimilarSounds(soundName) {
    // TODO: ask Eric for help.
    return;
  }

  /**
   * Stop playing sounds using the AudioEngie
   */
  stopPlayingSound () {
    // Playback is queued, playing, or has played recently and finished
    // normally.
    if (this.playingSoundPromise !== null) {
      // Queued playback began playing before this method.
      if (this.playingSoundPromise.isPlaying) {
        // Fetch the player from the promise and stop playback soon.
        this.playingSoundPromise.then(soundPlayer => {
            soundPlayer.stop();
        });
      } else {
        // Fetch the player from the promise and stop immediately. Since
        // the sound is not playing yet, this callback will be called
        // immediately after the sound starts playback. Stopping it
        // immediately will have the effect of no sound being played.
        this.playingSoundPromise.then(soundPlayer => {
            soundPlayer.stopImmediately();
        });
      }
      // No further work should be performed on this promise and its
      // soundPlayer.
      this.playingSoundPromise = null;
    }
  }

  playSound(soundItem) {
    const md5ext = soundItem.md5;
    const idParts = md5ext.split('.');
    const md5 = idParts[0];
    // TODO: how do I refer to the vm, who plays the sound.
    const vm = this.vm;

    // In case enter is called twice without a corresponding leave
    // inbetween, stop the last playback before queueing a new sound.
    this.stopPlayingSound();

    // Save the promise so code to stop the sound may queue the stop
    // instruction after the play instruction.
    this.playingSoundPromise = vm.runtime.storage.load(vm.runtime.storage.AssetType.Sound, md5)
        .then(soundAsset => {
            const sound = {
                md5: md5ext,
                name: soundItem.name,
                format: soundItem.format,
                data: soundAsset.data
            };
            return this.audioEngine.decodeSoundPlayer(sound);
        })
        .then(soundPlayer => {
            soundPlayer.connect(this.audioEngine);
            // Play the sound. Playing the sound will always come before a
            // paired stop if the sound must stop early.
            soundPlayer.play();
            // Set that the sound is playing. This affects the type of stop
            // instruction given if the sound must stop early.
            if (this.playingSoundPromise !== null) {
                this.playingSoundPromise.isPlaying = true;
            }
            return soundPlayer;
        });
  }
}
