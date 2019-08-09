/**
 * @fileoverview The SharedAudioContext as implemented in scratch-gui
 * https://github.com/LLK/scratch-gui/blob/4d136c727b03ad52e3b77f040c1b93011700a95e/src/lib/audio/shared-audio-context.js
 */

import StartAudioContext from 'startaudiocontext';
import bowser from 'bowser';

let AUDIO_CONTEXT;
if (!bowser.msie) {
    AUDIO_CONTEXT = new (window.AudioContext || window.webkitAudioContext)({
    	// Sample rate equal to that of the pop sound in Scratch sound library
  		sampleRate: 11025
    });

    StartAudioContext(AUDIO_CONTEXT);
}

/**
 * Wrap browser AudioContext because we shouldn't create more than one
 * @return {AudioContext} The singleton AudioContext
 */
export default function () {
    return AUDIO_CONTEXT;
}