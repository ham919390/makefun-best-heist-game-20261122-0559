// Tiny sounds, made with the Web Audio oscillator — no audio files, no
// network. Everything is guarded: if the browser has no audio, or the player
// never interacted, the game stays silent and keeps playing.
export function createSounds() {
  let context = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(frequency, duration, type, gainValue) {
    const audio = ensure();
    if (audio === null) return;
    try {
      if (audio.state === 'suspended') void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(gainValue, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    } catch {
      // Silence is fine: a sound must never break the game.
    }
  }

  return {
    /** A soft chime when a gem is pocketed. */
    gem() {
      tone(880, 0.12, 'sine', 0.08);
    },
    /** A bright arpeggio when the sapphire is grabbed. */
    loot() {
      tone(660, 0.1, 'triangle', 0.1);
      setTimeout(() => tone(990, 0.16, 'triangle', 0.1), 90);
    },
    /** A low buzz when the alarm trips the run. */
    caught() {
      tone(140, 0.5, 'sawtooth', 0.08);
    },
    /** A rising fanfare for the getaway. */
    win() {
      tone(523, 0.12, 'triangle', 0.1);
      setTimeout(() => tone(659, 0.12, 'triangle', 0.1), 110);
      setTimeout(() => tone(784, 0.22, 'triangle', 0.1), 220);
    },
  };
}
