import { mulberry32 } from '@/core/rng';
import { genCallsign, nextSpoken } from './callsign';
import { genStrips } from './strips';
import { emptyTally, scoreMultipass, taskAccuracy } from './scoring';

describe('genCallsign', () => {
  it('is 3 letters + 3 digits, with a spelled-out form, deterministic per seed', () => {
    const a = genCallsign(mulberry32(42));
    const b = genCallsign(mulberry32(42));
    expect(a).toEqual(b);
    expect(a.text).toMatch(/^[A-Z]{3}[0-9]{3}$/);
    expect(a.spoken).toBe(a.text.split('').join(' '));
  });
});

describe('nextSpoken', () => {
  it('returns the target on a "go" trial and something else on a "no-go"', () => {
    const target = genCallsign(mulberry32(1));
    // matchRate 1 → always the target.
    expect(nextSpoken(mulberry32(2), target, 1).text).toBe(target.text);
    // matchRate 0 → never the target.
    expect(nextSpoken(mulberry32(2), target, 0).text).not.toBe(target.text);
  });
});

describe('genStrips', () => {
  it('produces n strips with unique callsigns', () => {
    const strips = genStrips(mulberry32(7), 4);
    expect(strips).toHaveLength(4);
    expect(new Set(strips.map((s) => s.callsign)).size).toBe(4);
    strips.forEach((s) => expect(s.clearance).toBeTruthy());
  });
});

describe('scoreMultipass', () => {
  it('averages the accuracy of the tasks that fired → stanine', () => {
    const radar = { hits: 8, misses: 2, falseAlarms: 0 }; // 0.8
    const strips = { hits: 5, misses: 0, falseAlarms: 0 }; // 1.0
    const audio = { hits: 4, misses: 1, falseAlarms: 1 }; // 0.667
    const s = scoreMultipass(radar, strips, audio);
    expect(s.radar).toBe(80);
    expect(s.strips).toBe(100);
    expect(s.audio).toBe(67);
    expect(s.raw).toBe(82); // round(100*(0.8+1+0.6667)/3)
    expect(s.stanine).toBe(7);
  });

  it('ignores tasks that never fired', () => {
    const s = scoreMultipass({ hits: 6, misses: 0, falseAlarms: 0 }, emptyTally(), emptyTally());
    expect(s.raw).toBe(100);
    expect(s.stanine).toBe(9);
  });

  it('taskAccuracy is neutral with no events', () => {
    expect(taskAccuracy(emptyTally())).toBe(1);
  });
});
