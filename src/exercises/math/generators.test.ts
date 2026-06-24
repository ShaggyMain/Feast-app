import type { Difficulty, GeneratedItem } from '../../types';
import { generateArith } from './arith';
import { generateVst } from './vst';
import { generatePercent } from './percent';
import { generateHeading } from './heading';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const SEEDS = Array.from({ length: 250 }, (_, i) => i);

function expectSingleCorrectChoice(item: GeneratedItem) {
  expect(item.mode).toBe('choice');
  const choices = item.choices!;
  expect(choices.length).toBe(4);
  expect(new Set(choices.map((c) => c.label)).size).toBe(4); // unique labels
  const correct = choices.filter((c) => c.id === item.correctChoiceId);
  expect(correct).toHaveLength(1);
  expect(correct[0].label).toBe(item.answerLabel);
}

/** Evaluate "a op b [op c] = ?" left-to-right (ops: + − × ÷). */
function evalArith(prompt: string): number {
  const tokens = prompt.replace(' = ?', '').trim().split(' ');
  let acc = Number(tokens[0]);
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const n = Number(tokens[i + 1]);
    acc = op === '×' ? acc * n : op === '÷' ? acc / n : op === '+' ? acc + n : acc - n;
  }
  return acc;
}

describe('generateArith (1.1)', () => {
  it('is deterministic', () => {
    expect(generateArith(7, 'medium')).toEqual(generateArith(7, 'medium'));
  });

  it('has one correct, non-negative option whose value matches the prompt', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const item = generateArith(seed, level);
        expectSingleCorrectChoice(item);
        const answer = Number(item.answerLabel);
        expect(answer).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(answer)).toBe(true);
        expect(answer).toBe(evalArith(item.prompt));
      }
    }
  });
});

describe('generateVst (1.2)', () => {
  it('is deterministic', () => {
    expect(generateVst(11, 'hard')).toEqual(generateVst(11, 'hard'));
  });

  it('asks for a positive integer with a unit', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const item = generateVst(seed, level);
        expect(item.mode).toBe('numeric');
        expect(item.correctValue).toBeGreaterThan(0);
        expect(Number.isInteger(item.correctValue)).toBe(true);
        expect(item.answerLabel).toMatch(/^\d+ (km|min|km\/h)$/);
        expect(item.answerLabel.startsWith(String(item.correctValue))).toBe(true);
      }
    }
  });
});

describe('generatePercent (1.3)', () => {
  it('is deterministic', () => {
    expect(generatePercent(3, 'easy')).toEqual(generatePercent(3, 'easy'));
  });

  it('produces an integer result equal to the stated percent/fraction', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const item = generatePercent(seed, level);
        expectSingleCorrectChoice(item);
        const result = Number(item.answerLabel);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);

        const pct = item.prompt.match(/^(\d+)% z (\d+) = \?$/);
        const frac = item.prompt.match(/^(\d+)\/(\d+) z (\d+) = \?$/);
        if (pct) {
          expect(result).toBe((Number(pct[1]) * Number(pct[2])) / 100);
        } else if (frac) {
          expect(result).toBe((Number(frac[1]) * Number(frac[3])) / Number(frac[2]));
        } else {
          throw new Error(`unexpected percent prompt: ${item.prompt}`);
        }
      }
    }
  });
});

describe('generateHeading (1.4)', () => {
  it('is deterministic', () => {
    expect(generateHeading(5, 'medium')).toEqual(generateHeading(5, 'medium'));
  });

  it('computes turns and reciprocals correctly, 0..359, 3-digit labels', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const item = generateHeading(seed, level);
        expectSingleCorrectChoice(item);
        for (const c of item.choices!) expect(c.label).toMatch(/^\d{3}°$/);

        const answer = Number(item.answerLabel.replace('°', ''));
        expect(answer).toBeGreaterThanOrEqual(0);
        expect(answer).toBeLessThanOrEqual(359);

        const recip = item.prompt.match(/^Kurs przeciwny do (\d{3})°\?$/);
        const turn = item.prompt.match(/^Kurs (\d{3})°, w (prawo|lewo) o (\d+)°\. Nowy kurs\?$/);
        if (recip) {
          expect(answer).toBe((Number(recip[1]) + 180) % 360);
        } else if (turn) {
          const x = Number(turn[1]);
          const y = Number(turn[3]);
          const signed = turn[2] === 'prawo' ? y : -y;
          expect(answer).toBe(((x + signed) % 360 + 360) % 360);
        } else {
          throw new Error(`unexpected heading prompt: ${item.prompt}`);
        }
        expect(item.figure?.type).toBe('heading');
      }
    }
  });
});
