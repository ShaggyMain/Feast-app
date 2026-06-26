/**
 * Module 2.2 — Rotacja (mental rotation, 2D MVP).
 * Shows a target polyomino; exactly one option is a true rotation of it. The
 * distractors are mirror images in various orientations (the classic trap) —
 * guaranteed wrong because the target is generated chiral.
 */
import type { Choice, Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, randInt, shuffle, type Rng } from '@/core/rng';
import {
  type Cell,
  hasDistinctRotations,
  isChiral,
  key,
  mirror,
  normalize,
  rotate90,
  rotations,
} from '@/core/poly';
import { t } from '@/i18n';

const STEPS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function growPolyomino(rng: Rng, n: number): Cell[] {
  const cells: Cell[] = [{ x: 0, y: 0 }];
  const has = (x: number, y: number) => cells.some((c) => c.x === x && c.y === y);
  let guard = 0;
  while (cells.length < n && guard++ < 500) {
    const base = pick(rng, cells);
    const [dx, dy] = pick(rng, STEPS);
    const nx = base.x + dx;
    const ny = base.y + dy;
    if (!has(nx, ny)) cells.push({ x: nx, y: ny });
  }
  return normalize(cells);
}

function rotateK(cells: Cell[], k: number): Cell[] {
  let cur = cells;
  for (let i = 0; i < k; i++) cur = rotate90(cur);
  return normalize(cur);
}

function bounds(cells: Cell[]): { cols: number; rows: number } {
  return {
    cols: Math.max(...cells.map((c) => c.x)) + 1,
    rows: Math.max(...cells.map((c) => c.y)) + 1,
  };
}

const FALLBACK: Cell[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
]; // L tetromino (chiral)

export function generateRotation(seed: number, level: Difficulty): GeneratedItem {
  const rng = mulberry32(seed);
  const n = level === 'easy' ? 4 : level === 'medium' ? 5 : 6;

  let target: Cell[] = FALLBACK;
  for (let attempt = 0; attempt < 200; attempt++) {
    const cand = growPolyomino(rng, n);
    if (cand.length === n && isChiral(cand) && hasDistinctRotations(cand)) {
      target = cand;
      break;
    }
  }

  // Correct: a non-trivial rotation of the target.
  const correct = rotateK(target, randInt(rng, 1, 3));
  // Distractors: three distinct mirror orientations (reflections, never rotations).
  const mirrorRotations = shuffle(
    rng,
    Array.from(new Map(rotations(mirror(target)).map((c) => [key(c), c])).values()),
  ).slice(0, 3);

  const options: Cell[][] = [correct, ...mirrorRotations];
  const order = shuffle(rng, options.map((_, i) => i));
  const choices: Choice[] = order.map((oi, i) => {
    const cells = options[oi];
    const { cols, rows } = bounds(cells);
    return { id: `c${i}`, label: String(i + 1), figure: { type: 'shape2d', cols, rows, cells } };
  });
  const correctPos = order.indexOf(0);

  const tb = bounds(target);
  return {
    prompt: t('rotation.prompt'),
    mode: 'choice',
    choices,
    correctChoiceId: choices[correctPos].id,
    answerLabel: String(correctPos + 1),
    hint: t('hint.rotation'),
    promptFigure: { type: 'shape2d', cols: tb.cols, rows: tb.rows, cells: target },
    category: 'rotation',
  };
}
