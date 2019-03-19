/**
 * @fileoverview audio utils as implemented in scratch-gui
 * https://github.com/LLK/scratch-gui/blob/4d136c727b03ad52e3b77f040c1b93011700a95e/src/lib/audio/audio-util.js
 */

const SOUND_BYTE_LIMIT = 10 * 1000 * 1000; // 10mb

const computeRMS = function (samples, scaling = 0.55) {
    if (samples.length === 0) return 0;
    // Calculate RMS, adapted from https://github.com/Tonejs/Tone.js/blob/master/Tone/component/Meter.js#L88
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        const sample = samples[i];
        sum += Math.pow(sample, 2);
    }
    const rms = Math.sqrt(sum / samples.length);
    const val = rms / scaling;
    return Math.sqrt(val);
};

const computeChunkedRMS = function (samples, chunkSize = 1024) {
    const sampleCount = samples.length;
    const chunkLevels = [];
    for (let i = 0; i < sampleCount; i += chunkSize) {
        const maxIndex = Math.min(sampleCount, i + chunkSize);
        chunkLevels.push(computeRMS(samples.slice(i, maxIndex)));
    }
    return chunkLevels;
};

export {
    computeRMS,
    computeChunkedRMS,
    SOUND_BYTE_LIMIT
};