import type { Difficulty, GeneratedItem } from '../../types';
import { DIR8, bearing, distance, relativeFacing, to8 } from '../../core/geometry';
import { generateOrientation } from './orientation';
import { generateCoords } from './coords';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const SEEDS = Array.from({ length: 250 }, (_, i) => i);

function expectSingleCorrectChoice(item: GeneratedItem) {
  expect(item.mode).toBe('choice');
  const choices = item.choices!;
  expect(choices.length).toBe(4);
  expect(new Set(choices.map((c) => c.label)).size).toBe(4);
  const correct = choices.filter((c) => c.id === item.correctChoiceId);
  expect(correct).toHaveLength(1);
  expect(correct[0].label).toBe(item.answerLabel);
}

function angularDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

describe('generateOrientation (2.3)', () => {
  it('is deterministic', () => {
    expect(generateOrientation(5, 'medium')).toEqual(generateOrientation(5, 'medium'));
  });

  it('answers the direction consistently with the figure', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const item = generateOrientation(seed, level);
        expectSingleCorrectChoice(item);
        expect(DIR8).toContain(item.answerLabel);

        const fig = item.figure!;
        if (item.category === 'bearing8') {
          expect(fig.type).toBe('grid');
          if (fig.type === 'grid') {
            const [a, b] = fig.points;
            expect(item.answerLabel).toBe(to8(bearing(a.x, a.y, b.x, b.y)));
          }
        } else {
          expect(fig.type).toBe('heading');
          if (fig.type === 'heading') {
            expect(item.answerLabel).toBe(to8(relativeFacing(fig.heading, fig.turn ?? 0)));
          }
        }
      }
    }
  });

  it('honors the variant', () => {
    for (let seed = 0; seed < 60; seed++) {
      expect(generateOrientation(seed, 'medium', 'bearing8').category).toBe('bearing8');
      expect(generateOrientation(seed, 'medium', 'relative').category).toBe('relative');
    }
  });
});

describe('generateCoords (2.4)', () => {
  it('is deterministic', () => {
    expect(generateCoords(9, 'hard')).toEqual(generateCoords(9, 'hard'));
  });

  it('computes distance and bearing consistently with the figure', () => {
    for (const level of LEVELS) {
      const step = level === 'easy' ? 45 : 5;
      for (const seed of SEEDS) {
        const item = generateCoords(seed, level);
        expectSingleCorrectChoice(item);
        const fig = item.figure!;
        expect(fig.type).toBe('grid');
        if (fig.type !== 'grid') continue;
        const [a, b] = fig.points;

        if (item.category === 'distance') {
          expect(Number(item.answerLabel)).toBe(Math.round(distance(a.x, a.y, b.x, b.y)));
        } else {
          const ans = Number(item.answerLabel.replace('°', ''));
          expect(ans % step).toBe(0);
          expect(angularDiff(ans, bearing(a.x, a.y, b.x, b.y))).toBeLessThanOrEqual(step / 2 + 0.001);
        }
      }
    }
  });

  it('honors the variant', () => {
    for (let seed = 0; seed < 60; seed++) {
      expect(generateCoords(seed, 'medium', 'distance').category).toBe('distance');
      expect(generateCoords(seed, 'medium', 'bearing').category).toBe('bearing');
    }
  });
});
