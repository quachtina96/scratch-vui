/**
 * @fileoverview
 *
 * Consolidate audio recording for the Scratch Voice User Interface (scratch-vui)
 * @author Tina Quach (quacht@mit.edu)
 */
const AudioBufferPlayer = require("./audio-buffer-player.js").default;
const WavEncoder = require('wav-encoder');
const WavDecoder = require('wav-decoder');
const Utils = require('./utils.js');

class RecordingsManager {
	constructor() {
		// the virtual machine that will play the recordings
		this.vm = null;
		// this will allow recorded sounds to be used across multiple projects
		this.baseProject = {"info": {"spriteCount": 1, "scriptCount": 0, "flashVersion": "MAC 28,0,0,126", "swfVersion": "v460", "userAgent": "tina", "videoOn": false}, "penLayerID": 0, "tempoBPM": 60, "objName": "Stage", "sounds": [{"format": "", "sampleCount": 258, "soundName": "pop", "soundID": 7, "rate": 11025, "md5": "83a9787d4cb6f3b7632b4ddfebf74367.wav"}], "penLayerMD5": "5c81a336fab8be57adc039a8a2b33ca9.png", "children": [{"direction": 90, "isDraggable": false, "indexInLibrary": 1, "costumes": [{"baseLayerMD5": "f9a1c175dbe2e5dee472858dd30d16bb.svg", "bitmapResolution": 1, "costumeName": "costume1", "baseLayerID": 1, "rotationCenterX": 47, "rotationCenterY": 55}, {"baseLayerMD5": "6e8bd9ae68fdb02b7e1e3df656a75635.svg", "bitmapResolution": 1, "costumeName": "costume2", "baseLayerID": 2, "rotationCenterX": 47, "rotationCenterY": 55}], "currentCostumeIndex": 0, "visible": true, "rotationStyle": "normal", "lists": [], "scripts": [[5, 128, []]], "sounds": [], "spriteInfo": {}, "scale": 1, "objName": "Sprite1", "scratchX": 0, "scratchY": 0, "variables": []}], "costumes": [{"baseLayerMD5": "739b5e2a2435f6e1ec2993791b423146.png", "bitmapResolution": 1, "costumeName": "backdrop1", "baseLayerID": 3, "rotationCenterX": 240, "rotationCenterY": 180}], "currentCostumeIndex": 0, "videoAlpha": 0.5}
	}

	/** Given the vmSound that gets created when the user stops recording,
	 * create a project that will use the recording.
	 * @param {!Object} vmSound - an object containing relevant information about
	 *   a sound recording.
	 * @return {String} stringified sb2 json of the scratch project
	 */
	_getProjectPlayingSoundCalled(vmSound) {
		var project = Object.assign({}, this.baseProject)
		var sprite = project.children[0];
		var codeBlock = sprite.scripts[0][2];
		codeBlock.push([
										 "whenGreenFlag"
									]);
		codeBlock.push([
										 "doPlaySoundAndWait",
										 vmSound.name
									]);
				sprite.sounds.push({
			"soundName": vmSound.name,
			"soundID": sprite.sounds.length,
			"md5": vmSound.assetId + ".wav",
			"sampleCount": vmSound.sampleCount,
			"rate": vmSound.rate,
			"format": ""
				});
				return JSON.stringify(project);
	}

	/**
	 * Given a sound name, get the vmSound object from local storage.
	 * @param {!String} soundName - name of the sound
	 * @return {Object} the object representing the vmSound
	 */
	async _getVmSound(soundName) {
		// Recordings are stored with titlecase
		soundName = Utils.titlecase(soundName);
		// Get sound from local storage to get the information.
		var vmSound = await this.vm.runtime.storage.localStorageHelper.loadVmSound(soundName);
		console.log('got vmSound in _getVmSound. here it is:')
		console.log(vmSound)
		return vmSound
	}

	/**
	 * rename sound
	 * @param {!String} soundName - name of the sound
	 * @return {Object} the object representing the vmSound
	 */
	async renameVmSound(soundName, newSoundName) {
		// Get sound from local storage to get the information.
		var storage = this.vm.runtime.storage.localStorageHelper;
		var vmSound = await storage.loadVmSound(soundName);
		// Delete old entry
		await storage.deleteVmSound(soundName);
		// Create new entry
		vmSound.name = newSoundName;
		storage.storeVmSound(vmSound);
		return vmSound
	}

	async addRecordingsToProject(projectJson) {
		// Replace placeholder sound recordings in the project json with real
		// sound objects
		var sprite = projectJson.children[0];
		var candidateRecordings = sprite.sounds.filter((soundObject) => 'isRecording' in soundObject)
		var sounds = sprite.sounds.filter((soundObject) => !('isRecording' in soundObject))

    return Promise.all(candidateRecordings.map(async (soundPlaceholder) => {
				var soundName = soundPlaceholder.name;
				var vmSound = await this._getVmSound(soundName);
				if (vmSound) {
					sounds.push({
						"soundName": vmSound.name,
						"soundID": sprite.sounds.length,
						"md5": vmSound.assetId + ".wav",
						"sampleCount": vmSound.sampleCount,
						"rate": vmSound.rate,
						"format": ""
							});
				} else {
					console.log(`failed to get the vm sound for ${soundName}`);
				}
			})
    ).catch(function(e) {
      console.log(e);
    }).then(function() {
      sprite.sounds = sounds;
      return projectJson;
    });
	}

	// Create a project json that will the get loaded into the vm so we can verify that we can play the recorded sound in a project.
	playRecording(vmSound) {
		DEBUG && console.log('RecordingsManager [playRecording]')
		// Create a project json for playing the recording
		var projectJson = this._getProjectPlayingSoundCalled(vmSound);
			this.vm.loadProject(projectJson).then(()=> {
				this.vm.greenFlag();
			});
	}

	stopPlayingRecording() {
		DEBUG && console.log('RecordingsManager [stopPlayingRecording]')
		// Stop the current project.
		this.vm.stopAll();
	}

	confirmAndStoreRecording(samples, sampleRate, levels, trimStart, trimEnd, recordingName) {
		const sampleCount = samples.length;
		const startIndex = Math.floor(trimStart * sampleCount);
		const endIndex = Math.floor(trimEnd * sampleCount);
		const clippedSamples = samples.slice(startIndex, endIndex);

		WavEncoder.encode({
				sampleRate: sampleRate,
				channelData: [clippedSamples]
		}).then(wavBuffer => {
				const vmSound = {
						format: '',
						dataFormat: 'wav',
						rate: sampleRate,
						sampleCount: clippedSamples.length
				};

				// Create an asset from the encoded .wav and get resulting md5
				const storage = this.vm.runtime.storage;
				vmSound.asset = new storage.Asset(
						storage.AssetType.Sound,
						null,
						storage.DataFormat.WAV,
						new Uint8Array(wavBuffer),
						true // generate md5
				);
				vmSound.assetId = vmSound.asset.assetId;

				// update vmSound object with md5 property
				vmSound.md5 = `${vmSound.assetId}.${vmSound.dataFormat}`;

				// The VM will update the sound name to a fresh name
				// if the following is already taken
				// TODO(quacht): prompt the user for the recording name.
				vmSound.name = Utils.titlecase(recordingName);

				// Create and use and AudioBufferPlayer
				// The thing about the audio buffer player is that it uses the clipped samples and not the web encoded.
				// var player = new AudioBufferPlayer(clippedSamples, sampleRate);
				// player.play(trimStart, trimEnd, () => {console.log('audiobufferplayerUPDATE')}, () => {console.log('audiobufferplayerEND')});

				// Store the sound in Scratch Storage.

				// Pass an empty string as the assetId in order to force the
				// store to create a new sound asset for the recording.
				// TODO: not sure if the wav buffer is supposed to be converted to a uint array before storing..
				storage.store(storage.AssetType.Sound, vmSound.dataFormat, new Uint8Array(wavBuffer), vmSound.assetId, vmSound).then((assetMetadata) => {

					console.log(assetMetadata);
					// Get target on which to attach the sound and set it on the
					// virtual machine.
					var target = this.vm.runtime.targets[1];
					this.vm.editingTarget = target;

					this.vm.addSound(vmSound).then(() => {
							console.log('vm has added sound')
							console.log('now playing sound via recordings manager');
							this.playRecording(vmSound)
					});
				});
		});
	}

	async getAllRecordings() {
		var storage = this.vm.runtime.storage.localStorageHelper;
		return await storage.getAllRecordings();
	}

	async play(soundName) {
		var vmSound = await this._getVmSound(soundName);
		var wavBuffer = vmSound.asset.data;
		WavDecoder.decode(wavBuffer.buffer).then((bufferToPlay) => {
			var player = new AudioBufferPlayer(bufferToPlay.channelData[0], 44140);

			var start = 0;
			var end = bufferToPlay.channelData[0].length;
			player.play(start, end);
		})
	}
}

module.exports = RecordingsManager;