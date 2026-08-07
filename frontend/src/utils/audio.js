// Utility to play subtle UI sound effects

// You can replace these with actual base64 or paths to short mp3/wav files
// For now, using empty Audio objects to prevent errors if files don't exist yet, 
// or using tiny silent base64 if needed. Let's use simple Web Audio API synthesis for a true "zero dependency" premium feel without needing assets!

let audioCtx = null;
try {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    audioCtx = new AudioContext();
  }
} catch (e) {
  console.warn("AudioContext not supported or blocked");
}

export const playClickSound = () => {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();

  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch click
  oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.05);
  
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
  
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    console.warn("Audio playback failed");
  }
};

export const playSuccessChime = () => {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();

  // Play a pleasant "ding-ding" chord
  const playNote = (freq, startTime, duration) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.value = freq;
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

    const now = audioCtx.currentTime;
    playNote(523.25, now, 0.4); // C5
    playNote(659.25, now + 0.1, 0.5); // E5
    playNote(783.99, now + 0.2, 0.6); // G5
  } catch (e) {
    console.warn("Audio playback failed");
  }
};

export const playHoverSound = () => {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    // Ignore
  }
};
