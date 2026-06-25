/**
 * Cube folding core (Module 2.1).
 *
 * A connected hexomino folds into a cube iff "rolling" a die across the net,
 * painting each visited cell onto the die face touching the table, assigns the
 * 6 cells to 6 distinct cube faces. We track orientation as a map
 * localPosition -> fixedFace and roll with physically-derived permutations in a
 * right-handed frame (grid east = +x, grid up/north = +y, out-of-plane = +z,
 * Down = −z). This yields, for each fixed face, the cell (symbol) that lands on
 * it — and the fixed opposite pairs U-D / N-S / E-W give adjacency.
 */

export type Face = 'U' | 'D' | 'N' | 'S' | 'E' | 'W';
export const FACES: Face[] = ['U', 'D', 'N', 'S', 'E', 'W'];
export const OPPOSITE: Record<Face, Face> = { U: 'D', D: 'U', N: 'S', S: 'N', E: 'W', W: 'E' };

export interface NetCell {
  c: number;
  r: number;
}

type Orient = Record<Face, Face>; // localPosition -> fixedFace
const IDENTITY: Orient = { U: 'U', D: 'D', N: 'N', S: 'S', E: 'E', W: 'W' };

// Rolling permutations (see header). N,S unchanged by E/W rolls and vice versa.
const rollEast = (o: Orient): Orient => ({ ...o, U: o.W, E: o.U, D: o.E, W: o.D });
const rollWest = (o: Orient): Orient => ({ ...o, U: o.E, W: o.U, D: o.W, E: o.D });
const rollNorth = (o: Orient): Orient => ({ ...o, N: o.U, D: o.N, S: o.D, U: o.S });
const rollSouth = (o: Orient): Orient => ({ ...o, S: o.U, D: o.S, N: o.D, U: o.N });

export interface CubeFolding {
  /** fixed face -> cell index (symbol) that lands on it */
  faces: Record<Face, number>;
  valid: boolean;
}

/** Fold a net (cell labels are array indices) into a face→cell map. */
export function cubeAdjacency(net: NetCell[]): CubeFolding {
  const faceLabel: Partial<Record<Face, number>> = {};
  const idxAt = (c: number, r: number) => net.findIndex((n) => n.c === c && n.r === r);
  const visited = new Set<number>();
  let overlap = false;

  const dfs = (i: number, o: Orient) => {
    visited.add(i);
    if (faceLabel[o.D] !== undefined) overlap = true;
    faceLabel[o.D] = i;
    const { c, r } = net[i];
    const moves: Array<[number, (o: Orient) => Orient]> = [
      [idxAt(c + 1, r), rollEast],
      [idxAt(c - 1, r), rollWest],
      [idxAt(c, r - 1), rollNorth], // grid up = north
      [idxAt(c, r + 1), rollSouth],
    ];
    for (const [j, roll] of moves) {
      if (j >= 0 && !visited.has(j)) dfs(j, roll(o));
    }
  };

  dfs(0, { ...IDENTITY });

  const valid =
    !overlap &&
    visited.size === net.length &&
    net.length === 6 &&
    FACES.every((f) => faceLabel[f] !== undefined);

  return { faces: faceLabel as Record<Face, number>, valid };
}

function isConnected(net: NetCell[]): boolean {
  const idxAt = (c: number, r: number) => net.findIndex((n) => n.c === c && n.r === r);
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop()!;
    const { c, r } = net[i];
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const j = idxAt(c + dc, r + dr);
      if (j >= 0 && !seen.has(j)) {
        seen.add(j);
        stack.push(j);
      }
    }
  }
  return seen.size === net.length;
}

/** Build candidate hexominoes and keep only those that fold to a cube. */
function buildNets(): NetCell[][] {
  const candidates: NetCell[][] = [];
  // 1-4-1 family: a row of four with one tab above (col i) and one below (col j).
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      candidates.push([
        { c: 0, r: 1 },
        { c: 1, r: 1 },
        { c: 2, r: 1 },
        { c: 3, r: 1 },
        { c: i, r: 0 },
        { c: j, r: 2 },
      ]);
    }
  }
  // 2-2-2 staircases and 2-3-1 shapes.
  candidates.push([
    { c: 0, r: 0 },
    { c: 1, r: 0 },
    { c: 1, r: 1 },
    { c: 2, r: 1 },
    { c: 2, r: 2 },
    { c: 3, r: 2 },
  ]);
  candidates.push([
    { c: 1, r: 0 },
    { c: 2, r: 0 },
    { c: 0, r: 1 },
    { c: 1, r: 1 },
    { c: 2, r: 1 },
    { c: 0, r: 2 },
  ]);
  candidates.push([
    { c: 0, r: 0 },
    { c: 0, r: 1 },
    { c: 1, r: 1 },
    { c: 1, r: 2 },
    { c: 2, r: 1 },
    { c: 2, r: 0 },
  ]);

  // De-duplicate by shape signature and keep only foldable, connected ones.
  const seen = new Set<string>();
  const out: NetCell[][] = [];
  for (const net of candidates) {
    const sig = net
      .map((n) => `${n.c},${n.r}`)
      .sort()
      .join(';');
    if (seen.has(sig)) continue;
    seen.add(sig);
    if (isConnected(net) && cubeAdjacency(net).valid) out.push(net);
  }
  return out;
}

export const CUBE_NETS: NetCell[][] = buildNets();
