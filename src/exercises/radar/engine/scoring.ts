/**
 * Radar scoring: turn accumulated `RadarStats` into a 0–100 raw score and a
 * FEAST-style **stanine** (1–9, 9 = best).
 *
 * Model: every aircraft is worth an equal share of 100, earned in full for a
 * handoff to its **assigned gate** (reaching the right gate is the job — and
 * since resolving a conflict always means vectoring, which adds time, timeliness
 * must not cap a clean run below 100). A wrong gate or a track lost off the
 * sector edge earns nothing. Time spent in active separation loss is then
 * subtracted. Keeping the bonus as a *share of 100*
 * (instead of a flat additive bonus the SPEC pseudocode clamps away) means the
 * ceiling stays 100 regardless of traffic count and a conflict can never be
 * masked — it always costs points.
 */
import type { RadarStats } from './types';
import { clamp } from './geometry';
import { t } from '@/i18n';

/** Score lost per second of active separation loss. */
export const K_CONFLICT = 4;
/** Fraction of an aircraft's share kept for a correct-gate but late handoff.
 *  Full credit: a correct handoff is a success; lateness is tracked for feedback
 *  but never docks the score (you can't avoid it while resolving conflicts). */
export const ETA_CREDIT = 1;

export interface RadarScore {
  /** 0..100, rounded. */
  raw: number;
  /** 1..9. */
  stanine: number;
  /** Points one aircraft is worth (100 / traffic count). */
  share: number;
  onTimePoints: number;
  latePoints: number;
  conflictPenalty: number;
}

export function scoreRadar(stats: RadarStats, aircraftCount: number): RadarScore {
  const share = aircraftCount > 0 ? 100 / aircraftCount : 0;
  const onTimePoints = stats.onTimeHandoffs * share;
  const latePoints = stats.missedEta * share * ETA_CREDIT;
  const conflictPenalty = stats.conflictSeconds * K_CONFLICT;
  const raw = clamp(onTimePoints + latePoints - conflictPenalty, 0, 100);
  return {
    raw: Math.round(raw),
    stanine: rawToStanine(raw),
    share,
    onTimePoints,
    latePoints,
    conflictPenalty,
  };
}

/**
 * Map a 0–100 raw score onto a 9-point stanine using the standard cumulative
 * band widths (4/7/12/17/20/17/12/7/4 %). Monotonic and total over [0,100].
 */
export function rawToStanine(raw: number): number {
  const r = clamp(raw, 0, 100);
  if (r >= 96) return 9;
  if (r >= 89) return 8;
  if (r >= 77) return 7;
  if (r >= 60) return 6;
  if (r >= 40) return 5;
  if (r >= 23) return 4;
  if (r >= 11) return 3;
  if (r >= 4) return 2;
  return 1;
}

/** Short label for a stanine band (shown on the results screen). */
export function stanineLabel(stanine: number): string {
  if (stanine >= 8) return t('stanine.excellent');
  if (stanine >= 6) return t('stanine.good');
  if (stanine >= 5) return t('stanine.average');
  if (stanine >= 3) return t('stanine.below');
  return t('stanine.poor');
}
