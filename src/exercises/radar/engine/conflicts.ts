/** Separation / conflict detection in 3D: horizontal CPA gated by vertical
 * separation. When tracks share one flight level the vertical test is always
 * satisfied, so detection reduces to the 2D horizontal case. */
import type { Aircraft } from './types';
import { clamp, dist, velocity } from './geometry';

/** Horizontal closest point of approach over the next `T` seconds (linear). */
export function closestApproach(a: Aircraft, b: Aircraft, T: number): { dist: number; t: number } {
  const va = velocity(a.heading, a.speed);
  const vb = velocity(b.heading, b.speed);
  const rpx = b.x - a.x;
  const rpy = b.y - a.y;
  const rvx = vb.vx - va.vx;
  const rvy = vb.vy - va.vy;
  const rv2 = rvx * rvx + rvy * rvy;
  const t = rv2 > 1e-9 ? clamp(-(rpx * rvx + rpy * rvy) / rv2, 0, T) : 0;
  return { dist: Math.hypot(rpx + rvx * t, rpy + rvy * t), t };
}

/** Horizontal-only CPA distance (kept for callers/tests that ignore altitude). */
export function cpaDistance(a: Aircraft, b: Aircraft, T: number): number {
  return closestApproach(a, b, T).dist;
}

/** Signed vertical rate a track will climb/descend at (0 if level or uncontrolled). */
function vRate(ac: Aircraft, climbRate: number): number {
  if (!ac.controllable || ac.altitude === ac.targetAltitude) return 0;
  return Math.sign(ac.targetAltitude - ac.altitude) * climbRate;
}

export interface ConflictResult {
  /** ids currently within separation (active, red). */
  active: Set<string>;
  /** ids predicted to lose separation within T (amber). */
  warn: Set<string>;
  activePairs: Array<[string, string]>;
}

export function detectConflicts(
  aircraft: Aircraft[],
  sepH: number,
  sepV: number,
  T: number,
  climbRate: number,
): ConflictResult {
  const active = new Set<string>();
  const warn = new Set<string>();
  const activePairs: Array<[string, string]> = [];

  for (let i = 0; i < aircraft.length; i++) {
    for (let j = i + 1; j < aircraft.length; j++) {
      const a = aircraft[i];
      const b = aircraft[j];
      const vSepNow = Math.abs(a.altitude - b.altitude);
      if (dist(a.x, a.y, b.x, b.y) < sepH && vSepNow < sepV) {
        active.add(a.id);
        active.add(b.id);
        activePairs.push([a.id, b.id]);
        continue;
      }
      const cpa = closestApproach(a, b, T);
      if (cpa.dist < sepH) {
        const vSepAtCpa = Math.abs(
          a.altitude + vRate(a, climbRate) * cpa.t - (b.altitude + vRate(b, climbRate) * cpa.t),
        );
        if (vSepAtCpa < sepV) {
          warn.add(a.id);
          warn.add(b.id);
        }
      }
    }
  }
  return { active, warn, activePairs };
}
