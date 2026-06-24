import type { Difficulty, ExerciseDef } from '../types';
import { buildSession } from './session';
import { generateArith } from '../exercises/math/arith';
import { generateVst } from '../exercises/math/vst';
import { generatePercent } from '../exercises/math/percent';
import { generateHeading } from '../exercises/math/heading';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

function makeDef(generate: ExerciseDef['generate'], itemsPerSession: number): ExerciseDef {
  return { id: 'x', module: 'math', title: '', description: '', timePerItemSec: 10, itemsPerSession, generate };
}

describe('buildSession', () => {
  it('returns the requested number of items, deterministically', () => {
    const def = makeDef(generateArith, 10);
    const a = buildSession(def, 12345, 'medium');
    const b = buildSession(def, 12345, 'medium');
    expect(a).toHaveLength(10);
    expect(a.map((i) => i.prompt)).toEqual(b.map((i) => i.prompt));
  });

  it('does not repeat a prompt within the recent window', () => {
    const cases: Array<[ExerciseDef['generate'], number]> = [
      [generateArith, 10],
      [generatePercent, 8],
      [generateHeading, 8],
      [generateVst, 8],
    ];
    for (const [gen, count] of cases) {
      const def = makeDef(gen, count);
      const window = Math.min(8, count);
      for (const level of LEVELS) {
        for (let seed = 0; seed < 40; seed++) {
          const items = buildSession(def, seed * 7 + 1, level);
          expect(items).toHaveLength(count);
          for (let i = 0; i < items.length; i++) {
            for (let j = Math.max(0, i - window + 1); j < i; j++) {
              expect(items[i].prompt).not.toBe(items[j].prompt);
            }
          }
        }
      }
    }
  });

  it('spreads item categories across a session', () => {
    for (let seed = 0; seed < 30; seed++) {
      const arith = buildSession(makeDef(generateArith, 12), seed * 11 + 5, 'medium');
      expect(new Set(arith.map((i) => i.category)).size).toBeGreaterThanOrEqual(3);

      const vst = buildSession(makeDef(generateVst, 8), seed * 13 + 2, 'medium');
      expect(new Set(vst.map((i) => i.category)).size).toBeGreaterThanOrEqual(3);

      const percent = buildSession(makeDef(generatePercent, 8), seed * 17 + 3, 'medium');
      expect(new Set(percent.map((i) => i.category)).size).toBeGreaterThanOrEqual(2);

      const heading = buildSession(makeDef(generateHeading, 8), seed * 19 + 7, 'medium');
      expect(new Set(heading.map((i) => i.category)).size).toBeGreaterThanOrEqual(2);
    }
  });
});
