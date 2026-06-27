import type { Difficulty, GeneratedItem } from '../../types';
import { key, rotations } from '../../core/poly';
import { generateCube } from './cube';
import { generateRotation } from './rotation';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const SEEDS = Array.from({ length: 150 }, (_, i) => i);

function baseChecks(item: GeneratedItem) {
  expect(item.mode).toBe('choice');
  const choices = item.choices!;
  expect(choices).toHaveLength(4);
  expect(new Set(choices.map((c) => c.label)).size).toBe(4);
  const correct = choices.filter((c) => c.id === item.correctChoiceId);
  expect(correct).toHaveLength(1);
  expect(correct[0].label).toBe(item.answerLabel);
}

// --- Independent cube fold (rotation matrices). Deliberately NOT the rolling
// method used by cubeAdjacency: this validates the chirality of the rendered
// answer instead of echoing the generator's own formula (a tautological check
// previously let a mirror-image bug through). ---
type Mat = number[][];
type Vec = number[];
type NetCellSym = { x: number; y: number; sym: number };
const MI: Mat = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mmul = (A: Mat, B: Mat): Mat =>
  A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
const mvec = (M: Mat, v: Vec): Vec => M.map((row) => Math.round(row[0] * v[0] + row[1] * v[1] + row[2] * v[2]));
const RX = (s: number): Mat => [[1, 0, 0], [0, 0, -s], [0, s, 0]];
const RY = (s: number): Mat => [[0, 0, s], [0, 1, 0], [-s, 0, 0]];
// Folding a child in net-direction d turns its outward normal into +x/-x/+y/-y.
const FOLD: Record<string, Mat> = { E: RY(1), W: RY(-1), N: RX(-1), S: RX(1) };

/** Outward normal of every face, keyed by symbol, from an independent 3D fold. */
function foldNormals(cells: NetCellSym[]): Map<number, Vec> {
  const at = (x: number, y: number) => cells.findIndex((c) => c.x === x && c.y === y);
  const rot: Mat[] = [];
  const seen = new Set<number>();
  const dfs = (i: number, m: Mat) => {
    rot[i] = m;
    seen.add(i);
    const { x, y } = cells[i];
    const nb: Array<[string, number]> = [
      ['E', at(x + 1, y)], ['W', at(x - 1, y)], ['N', at(x, y - 1)], ['S', at(x, y + 1)],
    ];
    for (const [d, j] of nb) if (j >= 0 && !seen.has(j)) dfs(j, mmul(m, FOLD[d]));
  };
  dfs(0, MI);
  const out = new Map<number, Vec>();
  cells.forEach((c, i) => out.set(c.sym, mvec(rot[i], [0, 0, 1])));
  return out;
}

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const isOpp = (a: Vec, b: Vec) => a[0] === -b[0] && a[1] === -b[1] && a[2] === -b[2];
const mag = (v: Vec) => Math.hypot(v[0], v[1], v[2]);
function rotToTop(n: Vec): Mat {
  if (n[2] === 1) return MI;
  if (n[2] === -1) return [[1, 0, 0], [0, -1, 0], [0, 0, -1]];
  if (n[0] === 1) return RY(-1);
  if (n[0] === -1) return RY(1);
  if (n[1] === 1) return RX(1);
  return RX(-1);
}

/** True iff {top,left,right} is a real, correctly-handed isometric view. */
function isRealView(norm: Map<number, Vec>, view: { top: number; left: number; right: number }): boolean {
  const nt = norm.get(view.top)!;
  const nl = norm.get(view.left)!;
  const nr = norm.get(view.right)!;
  if (isOpp(nt, nl) || isOpp(nt, nr) || isOpp(nl, nr)) return false; // need three adjacent faces
  const Rt = rotToTop(nt);
  const T = mvec(Rt, nt);
  const L = mvec(Rt, nl);
  const R = mvec(Rt, nr);
  const corner = [T[0] + L[0] + R[0], T[1] + L[1] + R[1], T[2] + L[2] + R[2]];
  const d = corner.map((q) => q / mag(corner));
  const uRaw = [0, 0, 1].map((q, i) => q - dot([0, 0, 1], d) * d[i]);
  const u = uRaw.map((q) => q / mag(uRaw));
  const s = cross(u, d); // real right-handed camera: right × up = toward camera
  return dot(T, u) > 0.5 && dot(L, s) < 0 && dot(R, s) > 0;
}

describe('generateCube (2.1)', () => {
  it('is deterministic', () => {
    expect(generateCube(3, 'medium')).toEqual(generateCube(3, 'medium'));
  });

  it('has exactly one option that is the true fold of the net', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const item = generateCube(seed, level);
        baseChecks(item);

        const pf = item.promptFigure!;
        expect(pf.type).toBe('net');
        if (pf.type !== 'net') continue;
        const norm = foldNormals(pf.cells);

        const cubeViews = item.choices!.map((ch) => ch.figure);
        // all four rendered cubes are distinct
        expect(new Set(cubeViews.map((f) => (f && f.type === 'cube' ? `${f.top}|${f.left}|${f.right}` : '?'))).size).toBe(4);

        // Independently: exactly one rendered cube is a real, correctly-handed fold.
        const real = item.choices!.filter((ch) => {
          const f = ch.figure;
          return f != null && f.type === 'cube' && isRealView(norm, { top: f.top, left: f.left, right: f.right });
        });
        expect(real).toHaveLength(1);
        expect(real[0].id).toBe(item.correctChoiceId);
      }
    }
  });
});

describe('generateRotation (2.2)', () => {
  it('is deterministic', () => {
    expect(generateRotation(8, 'hard')).toEqual(generateRotation(8, 'hard'));
  });

  it('has exactly one option that is a rotation of the target', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const item = generateRotation(seed, level);
        baseChecks(item);

        const pf = item.promptFigure!;
        expect(pf.type).toBe('shape2d');
        if (pf.type !== 'shape2d') continue;
        const rotKeys = new Set(rotations(pf.cells).map(key));

        const shapeKeys = item.choices!.map((ch) => (ch.figure && ch.figure.type === 'shape2d' ? key(ch.figure.cells) : '?'));
        expect(new Set(shapeKeys).size).toBe(4); // all distinct shapes

        const rotMatches = item.choices!.filter((ch) => ch.figure && ch.figure.type === 'shape2d' && rotKeys.has(key(ch.figure.cells)));
        expect(rotMatches).toHaveLength(1);
        expect(rotMatches[0].id).toBe(item.correctChoiceId);
      }
    }
  });
});
