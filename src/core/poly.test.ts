import { type Cell, hasDistinctRotations, isChiral, key, mirror, normalize, rotate90, rotations } from './poly';

const L_TETROMINO: Cell[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
];
const SQUARE: Cell[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
];

describe('poly transforms', () => {
  it('normalize translates to the origin', () => {
    expect(normalize([{ x: 3, y: 5 }, { x: 4, y: 5 }])).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });

  it('rotate90 four times returns the original', () => {
    let cur = L_TETROMINO;
    for (let i = 0; i < 4; i++) cur = rotate90(cur);
    expect(key(cur)).toBe(key(L_TETROMINO));
  });

  it('mirror is an involution', () => {
    expect(key(mirror(mirror(L_TETROMINO)))).toBe(key(L_TETROMINO));
  });

  it('L tetromino is chiral with 4 distinct rotations', () => {
    expect(isChiral(L_TETROMINO)).toBe(true);
    expect(hasDistinctRotations(L_TETROMINO)).toBe(true);
    expect(new Set(rotations(L_TETROMINO).map(key)).size).toBe(4);
  });

  it('square is achiral and rotationally symmetric', () => {
    expect(isChiral(SQUARE)).toBe(false);
    expect(hasDistinctRotations(SQUARE)).toBe(false);
  });
});
