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
const ListNavigator = require('./list_navigator.js');

class SoundLibrary {
  constructor(vm) {
    this.vm = vm;
    /**
     * AudioEngine that will decode and play sounds for us.
     * @type {AudioEngine}
     */
    this.audioEngine = new AudioEngine();
    /**
     * A promise for the sound queued to play as soon as it loads and
     * decodes.
     * @type {Promise<SoundPlayer>}
     */
    this.playingSoundPromise = null;
    this.dict = this._getDict(soundLibraryContent);
    // The last set of sounds returned by a call to this.getNSounds may be
    // requested by a user who missed it the first time.
    this.lastNSounds = null;
    this.lastQuery = null;

    this.unwrapper = (soundList, ssm) => {
      // Build promise chain to present each sound in order.
      var pm = ssm.pm;
      var funcs = soundList.map((item) => new Promise((resolve, reject) => {
        pm.soundLibrary.stopPlayingSound();
        pm.say('Here is ' + item.name, () => {
          pm.soundLibrary.playSound(item)
        });
      }));
      var promise = funcs[0];
      for (var i = 1; i < funcs.length; i++) {
        promise = promise.then(funcs[i]);
      }
      return promise.then(() => {
        resolve();
      });
    }
    this.listNavigator = new ListNavigator(soundLibraryContent, 3, null, this.unwrapper);
  }

  /**
   * Return the sound item with given name.
   */
  get(name) {
    var title = this._titleCase(name);
    return this.dict[title];
  }

  /**
   * Return the sound item with given name.
   */
  getRandomSound(name) {
    var randomSoundList = this.getNSounds(1, -1);
    return randomSoundList[0];
  }


  _getDict(soundLibraryContent) {
    var dict = {}
    for (var i = 0; i<soundLibraryContent.length; i++) {
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
   * @return {Array} list of n sound items.
   */
  getNSounds(n, opt_index=0) {
    var soundCount = soundLibraryContent.length;
    if (opt_index == -1) {
      // Return n random sounds
      var randomIndexes = new Set();
      while (randomIndexes.size < n) {
        randomIndexes.add(Math.floor(Math.random() * soundCount));
      }
      var sounds = Array.from(randomIndexes).map((index) => soundLibraryContent[index]);
    } else {
      var sounds = soundLibraryContent.slice(opt_index, n);
    }
    this.lastNSounds = sounds;
    return sounds;
  }

  _titleCase(str) {
    var splitStr = str.toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
      // You do not need to check if i is larger than splitStr length, as your for does that for you
      // Assign it back to the array
      splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    // Directly return the joined string
    return splitStr.join(' ');
  }

  /**
   * Return whether or not the sound exists in the sound library.
   */
  has(soundName) {
    return this._titleCase(soundName) in this.dict;
  }

  getSoundTags() {
    var tagListList = Object.values(this.dict).map((soundItem) => soundItem.tags);
    var reducer = (accumulator, currentValue) => currentValue.concat(accumulator);
    var masterTagList = tagListList.reduce(reducer);
    return new Set(masterTagList);
  }

  /**
   * Get a list of sounds with given tag.
   */
  getSoundsTagged(tag) {
    if (this.getSoundTags().has(tag)) {
      var taggedSounds = Object.values(this.dict).filter((soundItem) => {return soundItem.tags.includes(tag)});
      return taggedSounds.map((sound) => sound.name);
    }
    return [];
  }

  /**
   * Search the sound library and return candidates for sounds.
   */
  search(query) {
    this.lastQuery = query;
    var soundList = Object.keys(this.dict)
    if (this.has(query)) {
      return this.get(query)
    } else {
      // Conduct a substring search among the sound names
      var candidates = soundList.filter((soundName) => soundName.toLowerCase().includes(query.toLowerCase()))
      if (this.getSoundTags().has(query)) {
        candidates = candidates.concat(this.getSoundsTagged(query));
      }
      if (candidates.length > 0) {
        return candidates;
      } else {
        // fuzzy search tags
        var fuzzySearchResults = Utils.fuzzySearch(query, soundList);
        var fuzzyTagSearchResults = Utils.fuzzySearch(query, Array.from(this.getSoundTags()));

        var fullCandidateList = Array.from(this.getSoundTags()).concat(Object.keys(this.dict));
        var fuzzyFullSearchResults = Utils.fuzzySearch(query, fullCandidateList);

        // Replace all resulting tags with the sounds that have the given tag.
        var finalResults = [];
        fuzzyFullSearchResults.forEach((result) => {
          if (fuzzyTagSearchResults.includes(result)) {
            finalResults = finalResults.concat(this.getSoundsTagged(result))
          } else {
            finalResults.push(result)
          }
        })

        return finalResults
      }
    }
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
        }).catch((e) => {
          console.log(e)
          console.log(e.message)
          console.log(e.name)
        });
  }
}

module.exports = SoundLibrary;