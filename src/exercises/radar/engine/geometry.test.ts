import {
  approach,
  bearing,
  clamp,
  dist,
  mod360,
  normalizeDeg,
  velocity,
} from './geometry';

describe('mod360', () => {
  it('wraps into [0, 360)', () => {
    expect(mod360(0)).toBe(0);
    expect(mod360(370)).toBe(10);
    expect(mod360(-10)).toBe(350);
    expect(mod360(720)).toBe(0);
  });
});

describe('normalizeDeg', () => {
  it('wraps a delta to the shorter [-180, 180] direction', () => {
    expect(normalizeDeg(170)).toBe(170);
    expect(normalizeDeg(190)).toBe(-170);
    expect(normalizeDeg(-190)).toBe(170);
    expect(normalizeDeg(350)).toBe(-10);
  });
});

describe('clamp', () => {
  it('bounds the value', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('approach', () => {
  it('steps toward the target without overshooting', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(0, 10, 100)).toBe(10);
    expect(approach(10, 0, 3)).toBe(7);
    expect(approach(5, 5, 1)).toBe(5);
  });
});

describe('dist', () => {
  it('is Euclidean', () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
  });
});

describe('bearing (north-up, y down)', () => {
  it('reads 0=N, 90=E, 180=S, 270=W', () => {
    expect(bearing(0, 0, 0, -1)).toBeCloseTo(0); // up = north
    expect(bearing(0, 0, 1, 0)).toBeCloseTo(90); // right = east
    expect(bearing(0, 0, 0, 1)).toBeCloseTo(180); // down = south
    expect(bearing(0, 0, -1, 0)).toBeCloseTo(270); // left = west
  });
});

describe('velocity', () => {
  it('points north for heading 0 (−y) and east for heading 90 (+x)', () => {
    const n = velocity(0, 10);
    expect(n.vx).toBeCloseTo(0);
    expect(n.vy).toBeCloseTo(-10);
    const e = velocity(90, 10);
    expect(e.vx).toBeCloseTo(10);
    expect(e.vy).toBeCloseTo(0);
  });
});
