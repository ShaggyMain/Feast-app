/**
 * North-up geometry for the radar engine. Scope coordinates: x right, y DOWN
 * (screen), so north = −y. Headings are 0..360, 0 = north, clockwise.
 */
export const rad = (d: number): number => (d * Math.PI) / 180;
export const deg = (r: number): number => (r * 180) / Math.PI;

export const mod360 = (d: number): number => ((d % 360) + 360) % 360;

/** Wrap a degree delta to [-180, 180] (the shorter turn direction). */
export const normalizeDeg = (d: number): number => {
  const m = mod360(d);
  return m > 180 ? m - 360 : m;
};

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Move `cur` toward `target` by at most `maxStep` (no overshoot). */
export function approach(cur: number, target: number, maxStep: number): number {
  const d = target - cur;
  if (Math.abs(d) <= maxStep) return target;
  return cur + Math.sign(d) * maxStep;
}

export const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.hypot(bx - ax, by - ay);

/** Bearing from A to B in degrees, 0 = north (up), clockwise. */
export function bearing(ax: number, ay: number, bx: number, by: number): number {
  return mod360(deg(Math.atan2(bx - ax, -(by - ay))));
}

/** Velocity vector (units/sec) for a heading + speed. */
export function velocity(heading: number, speed: number): { vx: number; vy: number } {
  return { vx: Math.sin(rad(heading)) * speed, vy: -Math.cos(rad(heading)) * speed };
}
