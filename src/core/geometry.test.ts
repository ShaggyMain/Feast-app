import { bearing, dir8ToDeg, distance, relativeFacing, to8 } from './geometry';

describe('bearing', () => {
  it('points along the cardinal axes', () => {
    expect(bearing(0, 0, 0, 1)).toBeCloseTo(0, 5); // north
    expect(bearing(0, 0, 1, 0)).toBeCloseTo(90, 5); // east
    expect(bearing(0, 0, 0, -1)).toBeCloseTo(180, 5); // south
    expect(bearing(0, 0, -1, 0)).toBeCloseTo(270, 5); // west
  });

  it('matches the SPEC example (2,1)->(5,5) ~ NE', () => {
    expect(to8(bearing(2, 1, 5, 5))).toBe('NE');
  });
});

describe('distance', () => {
  it('is euclidean', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });
});

describe('to8', () => {
  it('snaps to the nearest octant', () => {
    expect(to8(0)).toBe('N');
    expect(to8(45)).toBe('NE');
    expect(to8(90)).toBe('E');
    expect(to8(200)).toBe('S');
    expect(to8(359)).toBe('N');
    expect(to8(-45)).toBe('NW');
  });
});

describe('relativeFacing', () => {
  it('wraps and matches the SPEC example NE left 90 -> NW', () => {
    expect(to8(relativeFacing(dir8ToDeg('NE'), -90))).toBe('NW');
    expect(relativeFacing(350, 30)).toBe(20);
    expect(relativeFacing(10, -30)).toBe(340);
  });
});
