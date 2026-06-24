/**
 * Optional short feedback sounds (correct / wrong). Players are created lazily
 * on first use and reused. All calls are best-effort and never throw — sound is
 * a nicety, never required. The caller checks the user's `sound` preference.
 */
import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let correctPlayer: AudioPlayer | null = null;
let wrongPlayer: AudioPlayer | null = null;
let unavailable = false;

function ensurePlayers(): void {
  if (unavailable || Platform.OS === 'web' || (correctPlayer && wrongPlayer)) return;
  try {
    correctPlayer = createAudioPlayer(require('../../assets/sounds/correct.wav'));
    wrongPlayer = createAudioPlayer(require('../../assets/sounds/wrong.wav'));
  } catch {
    unavailable = true;
  }
}

export function playFeedback(isCorrect: boolean): void {
  try {
    ensurePlayers();
    const player = isCorrect ? correctPlayer : wrongPlayer;
    if (!player) return;
    // Restart from the beginning so rapid answers retrigger the sound.
    void player.seekTo(0);
    player.play();
  } catch {
    // ignore — feedback sound is optional
  }
}
