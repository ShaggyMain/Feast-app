import type { Difficulty, GeneratedItem } from '../../types';
import { cubeAdjacency, type Face, type NetCell } from '../../core/cube';
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
        // Reconstruct the net (cell index order preserved) and re-fold it.
        const net: NetCell[] = pf.cells.map((c) => ({ c: c.x, r: c.y }));
        const { faces } = cubeAdjacency(net);
        const symOn = (f: Face) => pf.cells[faces[f]].sym;
        const expected = { top: symOn('U'), left: symOn('E'), right: symOn('N') };

        const cubeViews = item.choices!.map((ch) => ch.figure);
        // all four rendered cubes are distinct
        expect(new Set(cubeViews.map((f) => (f && f.type === 'cube' ? `${f.top}|${f.left}|${f.right}` : '?'))).size).toBe(4);

        const matches = item.choices!.filter((ch) => {
          const f = ch.figure;
          return f && f.type === 'cube' && f.top === expected.top && f.left === expected.left && f.right === expected.right;
        });
        expect(matches).toHaveLength(1);
        expect(matches[0].id).toBe(item.correctChoiceId);
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
