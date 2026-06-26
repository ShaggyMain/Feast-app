/**
 * RCT scoring → raw 0–100 and a stanine 1–9 (reuses the radar stanine bands).
 *
 * Two weighted components: getting aircraft out at the right exit fix, flight
 * level and time (75% when there are radio instructions, otherwise the full
 * 100%), and complying with radio instructions (the remaining 25%). Active
 * separation loss is then subtracted so a conflict always costs.
 */
import { clamp } from '../../radar/engine/geometry';
import { rawToStanine, stanineLabel } from '../../radar/engine/scoring';
import type { RctStats } from './types';

export { rawToStanine, stanineLabel };

/** Score lost per second of active separation loss. */
export const K_CONFLICT = 4;

export interface RctScore {
  raw: number;
  stanine: number;
  exitPoints: number;
  instrPoints: number;
  conflictPenalty: number;
}

export function scoreRct(stats: RctStats, aircraftCount: number, instrCount: number): RctScore {
  const exitWeight = instrCount > 0 ? 75 : 100;
  // Per-aircraft credit: on-time & correct FL = 1, correct FL but late = 0.5,
  // wrong FL = 0.25, lost = 0.
  const lateButAltOk = Math.max(0, stats.exits - stats.onTimeExits - stats.wrongAlt);
  const exitCredit = stats.onTimeExits + lateButAltOk * 0.5 + stats.wrongAlt * 0.25;
  const exitPoints = aircraftCount > 0 ? (exitWeight * exitCredit) / aircraftCount : 0;

  const instrPoints = instrCount > 0 ? ((100 - exitWeight) * stats.instrComplied) / instrCount : 0;
  const conflictPenalty = stats.conflictSeconds * K_CONFLICT;

  const raw = clamp(exitPoints + instrPoints - conflictPenalty, 0, 100);
  return {
    raw: Math.round(raw),
    stanine: rawToStanine(raw),
    exitPoints,
    instrPoints,
    conflictPenalty,
  };
}
