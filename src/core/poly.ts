/**
 * Polyomino transforms for mental rotation (Module 2.2). Pure and testable.
 * Cells are integer grid coordinates; shapes are compared after normalisation
 * (translate to the origin, sort) via their `key`.
 */

export interface Cell {
  x: number;
  y: number;
}

export function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  return cells
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

export function key(cells: Cell[]): string {
  return normalize(cells)
    .map((c) => `${c.x},${c.y}`)
    .join(';');
}

export function rotate90(cells: Cell[]): Cell[] {
  return normalize(cells.map((c) => ({ x: c.y, y: -c.x })));
}

export function mirror(cells: Cell[]): Cell[] {
  return normalize(cells.map((c) => ({ x: -c.x, y: c.y })));
}

/** The 4 rotations (0/90/180/270), each normalised. */
export function rotations(cells: Cell[]): Cell[][] {
  const out: Cell[][] = [normalize(cells)];
  let cur = cells;
  for (let i = 0; i < 3; i++) {
    cur = rotate90(cur);
    out.push(cur);
  }
  return out;
}

/** True when the shape's 4 rotations are all distinct (no rotational symmetry). */
export function hasDistinctRotations(cells: Cell[]): boolean {
  return new Set(rotations(cells).map(key)).size === 4;
}

/** True when the mirror image is NOT reachable by any rotation. */
export function isChiral(cells: Cell[]): boolean {
  const rots = new Set(rotations(cells).map(key));
  return rotations(mirror(cells)).every((m) => !rots.has(key(m)));
}
