/**
 * Module 2.4 — Układ współrzędnych (radar-style).
 * Estimate the bearing or distance between two points (aircraft → target).
 * Multiple choice. Pure & deterministic per (seed, level, variant).
 */
import type { Difficulty, GeneratedItem } from '@/types';
import { mulberry32, randInt, type Rng } from '@/core/rng';
import { bearing, distance } from '@/core/geometry';
import { buildChoices } from '@/exercises/_shared/choices';

const VARIANT: Record<string, 'bearing' | 'distance'> = {
  bearing: 'bearing',
  distance: 'distance',
};

function norm(d: number): number {
  return (((d % 360) + 360) % 360);
}

function fmtDeg(d: number): string {
  return String(norm(d)).padStart(3, '0') + '°';
}

/** Pick two distinct points with a usable separation. */
function placePoints(rng: Rng, cells: number): { ax: number; ay: number; bx: number; by: number } {
  for (let attempt = 0; attempt < 40; attempt++) {
    const ax = randInt(rng, 1, cells - 1);
    const ay = randInt(rng, 1, cells - 1);
    const bx = randInt(rng, 0, cells);
    const by = randInt(rng, 0, cells);
    const dist = distance(ax, ay, bx, by);
    if (dist >= 2 && dist <= cells) return { ax, ay, bx, by };
  }
  return { ax: 2, ay: 2, bx: 6, by: 5 };
}

export function generateCoords(seed: number, level: Difficulty, variant?: string): GeneratedItem {
  const rng = mulberry32(seed);
  const forced = variant ? VARIANT[variant] : undefined;
  const kind = forced ?? (rng() < 0.5 ? 'bearing' : 'distance');
  const cells = level === 'easy' ? 8 : 10;
  const { ax, ay, bx, by } = placePoints(rng, cells);

  const figure = {
    type: 'grid' as const,
    cells,
    points: [
      { x: ax, y: ay, label: 'S', role: 'a' as const },
      { x: bx, y: by, label: 'C', role: 'b' as const },
    ],
    arrow: true,
  };

  if (kind === 'distance') {
    const answer = Math.round(distance(ax, ay, bx, by));
    const { choices, correctChoiceId } = buildChoices(
      rng,
      answer,
      [answer + 1, answer - 1, answer + 2, answer - 2, answer + 3],
      String,
      (n) => n >= 1,
    );
    return {
      prompt: 'Odległość między samolotem (S) a celem (C)?',
      mode: 'choice',
      choices,
      correctChoiceId,
      answerLabel: String(answer),
      hint: 'Po przekątnej ≈ pierwiastek z sumy kwadratów.',
      figure,
      category: 'distance',
    };
  }

  // bearing
  const step = level === 'easy' ? 45 : 5;
  const answer = norm(Math.round(bearing(ax, ay, bx, by) / step) * step);
  const { choices, correctChoiceId } = buildChoices(
    rng,
    answer,
    [norm(answer + 20), norm(answer - 20), norm(answer + 40), norm(answer - 40), norm(answer + 180)],
    fmtDeg,
    (n) => n >= 0 && n <= 359,
  );
  return {
    prompt: 'Przybliżony kurs z samolotu (S) do celu (C)?',
    mode: 'choice',
    choices,
    correctChoiceId,
    answerLabel: fmtDeg(answer),
    hint: 'Kurs liczony od północy (góra), zgodnie z zegarem.',
    figure,
    category: 'bearing',
  };
}
