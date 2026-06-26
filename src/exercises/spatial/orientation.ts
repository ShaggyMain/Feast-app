/**
 * Module 2.3 — Orientacja przestrzenna (compass + position).
 * Two question kinds: the 8-point direction from A to B on a grid, and the
 * resulting facing after a left/right turn. Multiple choice over N/NE/…/NW.
 */
import type { Choice, Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, randInt, shuffle, type Rng } from '@/core/rng';
import { DIR8, type Dir8, bearing, dir8ToDeg, relativeFacing, to8 } from '@/core/geometry';
import { t } from '@/i18n';

const DELTA: Record<Dir8, [number, number]> = {
  N: [0, 1],
  NE: [1, 1],
  E: [1, 0],
  SE: [1, -1],
  S: [0, -1],
  SW: [-1, -1],
  W: [-1, 0],
  NW: [-1, 1],
};

const VARIANT: Record<string, 'bearing8' | 'relative'> = {
  bearing8: 'bearing8',
  relative: 'relative',
};

function dirChoices(rng: Rng, correct: Dir8): { choices: Choice[]; correctChoiceId: string } {
  const others = shuffle(
    rng,
    DIR8.filter((d) => d !== correct),
  ).slice(0, 3);
  const values = shuffle(rng, [correct, ...others]);
  const choices: Choice[] = values.map((d, i) => ({ id: `c${i}`, label: d }));
  return { choices, correctChoiceId: choices[values.indexOf(correct)].id };
}

export function generateOrientation(seed: number, level: Difficulty, variant?: string): GeneratedItem {
  const rng = mulberry32(seed);
  const forced = variant ? VARIANT[variant] : undefined;
  const kind = forced ?? (rng() < 0.55 ? 'bearing8' : 'relative');

  if (kind === 'bearing8') {
    const cells = 6;
    let chosen: { ax: number; ay: number; bx: number; by: number; dir: Dir8 } | null = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const ax = randInt(rng, 1, cells - 1);
      const ay = randInt(rng, 1, cells - 1);
      const t = DIR8[randInt(rng, 0, 7)];
      const [dx, dy] = DELTA[t];
      const mag = randInt(rng, level === 'easy' ? 2 : 1, 3);
      const bx = ax + dx * mag;
      const by = ay + dy * mag;
      if (bx < 0 || by < 0 || bx > cells || by > cells || (bx === ax && by === ay)) continue;
      const dir = to8(bearing(ax, ay, bx, by));
      if (!chosen) chosen = { ax, ay, bx, by, dir };
      if (dir === t) {
        chosen = { ax, ay, bx, by, dir };
        break;
      }
    }
    const c = chosen ?? { ax: 2, ay: 2, bx: 4, by: 2, dir: 'E' as Dir8 };
    const { choices, correctChoiceId } = dirChoices(rng, c.dir);
    return {
      prompt: t('orient.bearing8'),
      mode: 'choice',
      choices,
      correctChoiceId,
      answerLabel: c.dir,
      hint: t('hint.orient.bearing8'),
      figure: {
        type: 'grid',
        cells,
        points: [
          { x: c.ax, y: c.ay, label: 'A', role: 'a' },
          { x: c.bx, y: c.by, label: 'B', role: 'b' },
        ],
        arrow: true,
      },
      category: 'bearing8',
    };
  }

  // relative facing
  const facing = DIR8[randInt(rng, 0, 7)];
  const mags = level === 'easy' ? [90] : level === 'medium' ? [45, 90, 135] : [45, 90, 135, 180];
  const mag = pick(rng, mags);
  const right = rng() < 0.5;
  const signed = right ? mag : -mag;
  const newDir = to8(relativeFacing(dir8ToDeg(facing), signed));
  const { choices, correctChoiceId } = dirChoices(rng, newDir);
  return {
    prompt: t('orient.relative', { facing, dir: t(right ? 'dir.right' : 'dir.left'), mag }),
    mode: 'choice',
    choices,
    correctChoiceId,
    answerLabel: newDir,
    hint: t('hint.orient.relative'),
    figure: { type: 'heading', heading: dir8ToDeg(facing), turn: signed },
    category: 'relative',
  };
}
