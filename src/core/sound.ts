/**
 * Optional short feedback sounds (correct / wrong / timeout). Players are
 * created lazily on first use and reused. All calls are best-effort and never
 * throw — sound is a nicety, never required. The caller checks the user's
 * `sound` preference.
 */
import { Platform } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

export type SoundCue = 'correct' | 'wrong' | 'timeout';

const players: Partial<Record<SoundCue, AudioPlayer>> = {};
let unavailable = false;

function ensurePlayers(): void {
  if (unavailable || Platform.OS === 'web' || players.correct) return;
  try {
    players.correct = createAudioPlayer(require('../../assets/sounds/correct.wav'));
    players.wrong = createAudioPlayer(require('../../assets/sounds/wrong.wav'));
    players.timeout = createAudioPlayer(require('../../assets/sounds/timeout.wav'));
  } catch {
    unavailable = true;
  }
}

export function playCue(cue: SoundCue): void {
  try {
    ensurePlayers();
    const player = players[cue];
    if (!player) return;
    // Restart from the beginning so rapid answers retrigger the sound.
    void player.seekTo(0);
    player.play();
  } catch {
    // ignore — feedback sound is optional
  }
}
