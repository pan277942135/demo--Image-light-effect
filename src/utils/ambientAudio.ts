/**
 * Web Audio ambient underwater sound generator.
 * Completely procedural, no external audio files required.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isPlaying = false;
let noiseNode: AudioNode | null = null;

export function toggleAmbientSound(enable?: boolean): boolean {
  if (enable === undefined) {
    enable = !isPlaying;
  }

  if (!enable) {
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
      setTimeout(() => {
        isPlaying = false;
      }, 350);
    }
    isPlaying = false;
    return false;
  }

  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (!masterGain) {
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }

    if (!noiseNode) {
      // Create 5 seconds of pink/brown noise
      const bufferSize = audioCtx.sampleRate * 4;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      const whiteNoiseSource = audioCtx.createBufferSource();
      whiteNoiseSource.buffer = noiseBuffer;
      whiteNoiseSource.loop = true;

      // Lowpass filter for underwater muffled depth
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, audioCtx.currentTime);
      filter.Q.setValueAtTime(3.5, audioCtx.currentTime);

      // LFO for wave ebb and flow
      const lfo = audioCtx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, audioCtx.currentTime);
      const lfoGain = audioCtx.createGain();
      lfoGain.gain.setValueAtTime(100, audioCtx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();

      whiteNoiseSource.connect(filter);
      filter.connect(masterGain);
      whiteNoiseSource.start();
      noiseNode = whiteNoiseSource;
    }

    masterGain.gain.setTargetAtTime(0.25, audioCtx.currentTime, 0.4);
    isPlaying = true;
    return true;
  } catch (err) {
    console.warn("Ambient audio failed to initialize:", err);
    isPlaying = false;
    return false;
  }
}

export function isAmbientSoundPlaying(): boolean {
  return isPlaying;
}
