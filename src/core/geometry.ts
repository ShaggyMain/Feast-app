/**
 * Pure 2D geometry helpers for the spatial module (bearings, distance, 8-point
 * compass). Grid convention: x to the right, y up, north = +y, bearings measured
 * clockwise from north (0..360).
 */

export const DIR8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type Dir8 = (typeof DIR8)[number];

/** Bearing A→B in degrees, 0 = north (up), clockwise. */
export function bearing(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return (((Math.atan2(dx, dy) * 180) / Math.PI) + 360) % 360;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay);
}

/** Nearest 8-point compass direction for a bearing. */
export function to8(deg: number): Dir8 {
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return DIR8[idx];
}

export function dir8ToDeg(d: Dir8): number {
  return DIR8.indexOf(d) * 45;
}

/** Apply a signed turn (right = +, left = −) to a heading, wrapped to 0..360. */
export function relativeFacing(facingDeg: number, signedTurn: number): number {
  return (((facingDeg + signedTurn) % 360) + 360) % 360;
}
