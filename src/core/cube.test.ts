import { CUBE_NETS, cubeAdjacency, type Face, type NetCell } from './cube';

function oppositePairs(faces: Record<Face, number>): Set<string> {
  const pair = (a: number, b: number) => [a, b].sort((x, y) => x - y).join('-');
  return new Set([pair(faces.U, faces.D), pair(faces.N, faces.S), pair(faces.E, faces.W)]);
}

describe('cubeAdjacency', () => {
  it('folds the 1-4-1 net with the expected opposite faces', () => {
    // Row of four (labels 0..3) + tab above col 1 (4) + tab below col 1 (5).
    const net: NetCell[] = [
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 2, r: 1 },
      { c: 3, r: 1 },
      { c: 1, r: 0 },
      { c: 1, r: 2 },
    ];
    const { faces, valid } = cubeAdjacency(net);
    expect(valid).toBe(true);
    // A-C and B-D opposite around the band; the two tabs opposite each other.
    expect(oppositePairs(faces)).toEqual(new Set(['0-2', '1-3', '4-5']));
  });

  it('rejects a non-foldable hexomino (2x3 rectangle)', () => {
    const rect: NetCell[] = [
      { c: 0, r: 0 },
      { c: 1, r: 0 },
      { c: 2, r: 0 },
      { c: 0, r: 1 },
      { c: 1, r: 1 },
      { c: 2, r: 1 },
    ];
    expect(cubeAdjacency(rect).valid).toBe(false);
  });

  it('exposes a set of valid nets, all foldable to 6 distinct faces', () => {
    expect(CUBE_NETS.length).toBeGreaterThanOrEqual(6);
    for (const net of CUBE_NETS) {
      const { faces, valid } = cubeAdjacency(net);
      expect(valid).toBe(true);
      expect(new Set(Object.values(faces)).size).toBe(6);
    }
  });
});
