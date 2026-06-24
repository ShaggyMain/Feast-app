import { generateDummy } from './generate';

function compute(prompt: string): number {
  // prompt looks like "47 × 6 = ?"
  const m = prompt.match(/^(-?\d+)\s+([+−×])\s+(-?\d+)\s+=\s+\?$/);
  if (!m) throw new Error(`unexpected prompt: ${prompt}`);
  const a = Number(m[1]);
  const b = Number(m[3]);
  switch (m[2]) {
    case '+':
      return a + b;
    case '−': // −
      return a - b;
    case '×': // ×
      return a * b;
    default:
      throw new Error(`unexpected op: ${m[2]}`);
  }
}

describe('generateDummy', () => {
  it('is deterministic for a given seed', () => {
    expect(generateDummy(2024)).toEqual(generateDummy(2024));
  });

  it('always offers exactly one correct option, with unique labels', () => {
    for (let seed = 0; seed < 500; seed++) {
      const item = generateDummy(seed);

      expect(item.mode).toBe('choice');
      expect(item.choices).toBeDefined();
      const choices = item.choices!;
      expect(choices).toHaveLength(4);

      // labels are unique
      const labels = choices.map((c) => c.label);
      expect(new Set(labels).size).toBe(4);

      // exactly one choice matches the correct id
      const matches = choices.filter((c) => c.id === item.correctChoiceId);
      expect(matches).toHaveLength(1);

      // the correct option's label equals the declared answer
      expect(matches[0].label).toBe(item.answerLabel);

      // and that answer is arithmetically right
      expect(Number(item.answerLabel)).toBe(compute(item.prompt));
    }
  });

  it('never produces a negative answer', () => {
    for (let seed = 0; seed < 500; seed++) {
      expect(Number(generateDummy(seed).answerLabel)).toBeGreaterThanOrEqual(0);
    }
  });
});
