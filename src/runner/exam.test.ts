import type { ExerciseDef } from '../types';
import { buildExamItems } from './exam';
import { generateArith } from '../exercises/math/arith';
import { generateSeries } from '../exercises/reaction/series';
import { generateVst } from '../exercises/math/vst';

const defs: ExerciseDef[] = [
  { id: 'arith', module: 'math', title: '', description: '', timePerItemSec: 12, itemsPerSession: 10, generate: generateArith },
  { id: 'vst', module: 'math', title: '', description: '', timePerItemSec: 15, itemsPerSession: 8, generate: generateVst },
  { id: 'series', module: 'reaction', title: '', description: '', timePerItemSec: 25, itemsPerSession: 8, generate: generateSeries },
];

describe('buildExamItems', () => {
  it('builds the requested count, deterministically', () => {
    const a = buildExamItems(123, 'medium', 20, defs);
    const b = buildExamItems(123, 'medium', 20, defs);
    expect(a).toHaveLength(20);
    expect(a.map((x) => x.item.prompt)).toEqual(b.map((x) => x.item.prompt));
  });

  it('every item is well-formed and time is capped', () => {
    const items = buildExamItems(7, 'hard', 24, defs);
    for (const ex of items) {
      expect(ex.timeLimitMs).toBeLessThanOrEqual(18000);
      const it = ex.item;
      if (it.mode === 'choice') {
        expect(it.choices!.filter((c) => c.id === it.correctChoiceId)).toHaveLength(1);
      } else {
        expect(typeof it.correctValue).toBe('number');
      }
    }
  });

  it('draws from more than one exercise', () => {
    const ids = new Set(buildExamItems(99, 'medium', 24, defs).map((x) => x.exerciseId));
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });

  it('returns nothing without usable generators', () => {
    expect(buildExamItems(1, 'easy', 10, [])).toEqual([]);
  });
});
