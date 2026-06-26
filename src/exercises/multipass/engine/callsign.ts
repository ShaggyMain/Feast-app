/** Audio sub-task: 3-letter + 3-digit callsigns (e.g. "KDB937"). Pure & seeded. */
import { randInt, type Rng } from '@/core/rng';

/** Letters minus the ones easily confused by ear/eye (I, O, Q). */
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

export interface Callsign {
  /** Display form, e.g. "KDB937". */
  text: string;
  /** Spelled-out form for TTS, e.g. "K D B 9 3 7". */
  spoken: string;
}

export function genCallsign(rng: Rng): Callsign {
  let text = '';
  for (let i = 0; i < 3; i++) text += LETTERS[Math.floor(rng() * LETTERS.length)];
  for (let i = 0; i < 3; i++) text += String(randInt(rng, 0, 9));
  return { text, spoken: text.split('').join(' ') };
}

/**
 * Pick the callsign to read out next: with probability `matchRate` it is the
 * controller's own (target) callsign — the "go" trial — otherwise a fresh one.
 */
export function nextSpoken(rng: Rng, target: Callsign, matchRate: number): Callsign {
  if (rng() < matchRate) return target;
  let other = genCallsign(rng);
  // Guarantee a real "no-go" (the random draw could coincide with the target).
  if (other.text === target.text) other = genCallsign(rng);
  return other;
}
