import type { Difficulty, GeneratedItem } from '../../types';
import { generateSeries } from './series';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

function parseTerms(prompt: string): number[] {
  return prompt
    .replace(/,\s*\?$/, '')
    .split(',')
    .map((s) => Number(s.trim()));
}

function expectSingleCorrectChoice(item: GeneratedItem) {
  expect(item.mode).toBe('choice');
  const choices = item.choices!;
  expect(choices.length).toBe(4);
  expect(new Set(choices.map((c) => c.label)).size).toBe(4);
  const correct = choices.filter((c) => c.id === item.correctChoiceId);
  expect(correct).toHaveLength(1);
  expect(correct[0].label).toBe(item.answerLabel);
}

function verifyRule(item: GeneratedItem) {
  const terms = parseTerms(item.prompt);
  const answer = Number(item.answerLabel);
  const last = terms[terms.length - 1];

  switch (item.category) {
    case 'arithmetic': {
      const d = terms[1] - terms[0];
      for (let i = 1; i < terms.length; i++) expect(terms[i] - terms[i - 1]).toBe(d);
      expect(answer - last).toBe(d);
      break;
    }
    case 'geometric': {
      const r = terms[1] / terms[0];
      expect(Number.isInteger(r)).toBe(true);
      for (let i = 1; i < terms.length; i++) expect(terms[i] / terms[i - 1]).toBe(r);
      expect(answer).toBe(last * r);
      break;
    }
    case 'second-diff': {
      const diffs = terms.slice(1).map((t, i) => t - terms[i]);
      const e = diffs[1] - diffs[0];
      for (let i = 1; i < diffs.length; i++) expect(diffs[i] - diffs[i - 1]).toBe(e);
      expect(answer - last).toBe(diffs[diffs.length - 1] + e);
      break;
    }
    case 'alternating': {
      // even indices share a step, odd indices share a step; answer continues odd.
      expect(terms[2] - terms[0]).toBe(terms[4] - terms[2]);
      const db = terms[3] - terms[1];
      expect(answer).toBe(terms[3] + db);
      break;
    }
    case 'fibonacci': {
      for (let i = 2; i < terms.length; i++) expect(terms[i]).toBe(terms[i - 1] + terms[i - 2]);
      expect(answer).toBe(last + terms[terms.length - 2]);
      break;
    }
    case 'squares': {
      for (const t of terms) expect(Number.isInteger(Math.sqrt(t))).toBe(true);
      expect(answer).toBe((Math.sqrt(last) + 1) ** 2);
      break;
    }
    case 'cubes': {
      const root = Math.round(Math.cbrt(last));
      expect(root ** 3).toBe(last);
      expect(answer).toBe((root + 1) ** 3);
      break;
    }
    default:
      throw new Error(`unexpected category: ${item.category}`);
  }
}

describe('generateSeries (4.3)', () => {
  it('is deterministic', () => {
    expect(generateSeries(42, 'medium')).toEqual(generateSeries(42, 'medium'));
  });

  it('offers one correct option and the answer continues the rule', () => {
    for (const level of LEVELS) {
      for (let seed = 0; seed < 400; seed++) {
        const item = generateSeries(seed, level);
        expectSingleCorrectChoice(item);
        const answer = Number(item.answerLabel);
        expect(Number.isInteger(answer)).toBe(true);
        expect(answer).toBeGreaterThanOrEqual(0);
        verifyRule(item);
      }
    }
  });

  it('uses several rule families across seeds', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) seen.add(String(generateSeries(seed, 'hard').category));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });
});
