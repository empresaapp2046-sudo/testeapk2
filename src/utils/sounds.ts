// @ts-nocheck
export const sounds = [
  { id: 'chime1', name: 'Sino Suave' },
  { id: 'chime2', name: 'Alerta Duplo' },
  { id: 'synth1', name: 'Digital Pluck' },
  { id: 'synth2', name: 'Acorde Positivo' },
  { id: 'alert1', name: 'Alerta Grave' },
];

let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playNotificationSound = (soundId: string) => {
  try {
    const ctx = initAudio();
    const t = ctx.currentTime;
    
    const playOscillator = (type: OscillatorType, freq: number, startTime: number, duration: number, vol = 0.5) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    };

    switch (soundId) {
      case 'chime1':
        playOscillator('sine', 880, t, 0.5); // A5
        playOscillator('sine', 1318.51, t + 0.1, 0.5); // E6
        break;
      case 'chime2':
        playOscillator('triangle', 523.25, t, 0.2); // C5
        playOscillator('triangle', 523.25, t + 0.2, 0.4); // C5
        break;
      case 'synth1':
        playOscillator('square', 659.25, t, 0.1, 0.1); // E5
        playOscillator('square', 880, t + 0.1, 0.3, 0.1); // A5
        break;
      case 'synth2':
        // Major chord
        playOscillator('sine', 440, t, 0.5, 0.2);
        playOscillator('sine', 554.37, t, 0.5, 0.2);
        playOscillator('sine', 659.25, t, 0.5, 0.2);
        break;
      case 'alert1':
        playOscillator('sawtooth', 300, t, 0.3, 0.2);
        playOscillator('sawtooth', 250, t + 0.3, 0.5, 0.2);
        break;
      default:
        playOscillator('sine', 880, t, 0.5);
    }
  } catch (err) {
    console.error('Audio playback failed', err);
  }
};
