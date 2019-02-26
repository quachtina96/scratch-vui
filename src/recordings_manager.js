/**
 * @fileoverview
 *
 * Consolidate audio cue management for the Scratch Voice User Interface (scratch-vui)
 * @author Tina Quach (quacht@mit.edu)
 */

class RecordingsManager {
	constructor() {
 		this.vm = null;
    // TODO: implement methods for updating the baseProject as new sounds are recorded.
    // this will allow recorded sounds to be used across multiple projects
    this.baseProject = `{"info": {"spriteCount": 1, "scriptCount": 0, "flashVersion": "MAC 28,0,0,126", "swfVersion": "v460", "userAgent": "Scratch 2.0 Offline Editor", "videoOn": false}, "penLayerID": 0, "tempoBPM": 60, "objName": "Stage", "sounds": [{"format": "", "sampleCount": 258, "soundName": "pop", "soundID": 7, "rate": 11025, "md5": "83a9787d4cb6f3b7632b4ddfebf74367.wav"}], "penLayerMD5": "5c81a336fab8be57adc039a8a2b33ca9.png", "children": [{"direction": 90, "isDraggable": false, "indexInLibrary": 1, "costumes": [{"baseLayerMD5": "f9a1c175dbe2e5dee472858dd30d16bb.svg", "bitmapResolution": 1, "costumeName": "costume1", "baseLayerID": 1, "rotationCenterX": 47, "rotationCenterY": 55}, {"baseLayerMD5": "6e8bd9ae68fdb02b7e1e3df656a75635.svg", "bitmapResolution": 1, "costumeName": "costume2", "baseLayerID": 2, "rotationCenterX": 47, "rotationCenterY": 55}], "currentCostumeIndex": 0, "visible": true, "rotationStyle": "normal", "lists": [], "scripts": [[5, 128, []]], "sounds": [], "spriteInfo": {}, "scale": 1, "objName": "Sprite1", "scratchX": 0, "scratchY": 0, "variables": []}], "costumes": [{"baseLayerMD5": "739b5e2a2435f6e1ec2993791b423146.png", "bitmapResolution": 1, "costumeName": "backdrop1", "baseLayerID": 3, "rotationCenterX": 240, "rotationCenterY": 180}], "currentCostumeIndex": 0, "videoAlpha": 0.5}`
	}

	_getProjectPlayingSoundCalled(soundName) {
		var projectJson = `{"info": {"spriteCount": 1, "scriptCount": 0, "flashVersion": "MAC 28,0,0,126", "swfVersion": "v460", "userAgent": "Scratch 2.0 Offline Editor", "videoOn": false}, "penLayerID": 0, "tempoBPM": 60, "objName": "Stage", "sounds": [{"format": "", "sampleCount": 258, "soundName": "pop", "soundID": 7, "rate": 11025, "md5": "83a9787d4cb6f3b7632b4ddfebf74367.wav"}], "penLayerMD5": "5c81a336fab8be57adc039a8a2b33ca9.png", "children": [{"direction": 90, "isDraggable": false, "indexInLibrary": 1, "costumes": [{"baseLayerMD5": "f9a1c175dbe2e5dee472858dd30d16bb.svg", "bitmapResolution": 1, "costumeName": "costume1", "baseLayerID": 1, "rotationCenterX": 47, "rotationCenterY": 55}, {"baseLayerMD5": "6e8bd9ae68fdb02b7e1e3df656a75635.svg", "bitmapResolution": 1, "costumeName": "costume2", "baseLayerID": 2, "rotationCenterX": 47, "rotationCenterY": 55}], "currentCostumeIndex": 0, "visible": true, "rotationStyle": "normal", "lists": [], "scripts": [[5, 128, [["whenGreenFlag"], ["doPlaySoundAndWait", "${soundName}"]]], [5, 128, []]], "sounds": [{"format": "", "sampleCount": 18688, "tags": ["animals", "cat"], "soundName": "Meow", "soundID": 230, "rate": 22050, "md5": "83c36d806dc92327b9e7049a565c6bff.wav"}], "spriteInfo": {}, "scale": 1, "objName": "Sprite1", "scratchX": 0, "scratchY": 0, "variables": []}], "costumes": [{"baseLayerMD5": "739b5e2a2435f6e1ec2993791b423146.png", "bitmapResolution": 1, "costumeName": "backdrop1", "baseLayerID": 3, "rotationCenterX": 240, "rotationCenterY": 180}], "currentCostumeIndex": 0, "videoAlpha": 0.5}`
		return projectJson;
	}

	playRecording(recordingName) {
		DEBUG && console.log('RecordingsManager [playRecording]')
		// Create a project json for playing the recording
		var projectJson = this._getProjectPlayingSoundCalled(recordingName);
		// TODO: determine whether the green flag gets added the project or not?
    this.vm.loadProject(projectJson).then(()=> {
      this.vm.greenFlag();
    });
	}

	stopPlayingRecording() {
		DEBUG && console.log('RecordingsManager [stopPlayingRecording]')
		// Stop the current project.
		this.vm.stopAll();
	}

}

module.exports = RecordingsManager;