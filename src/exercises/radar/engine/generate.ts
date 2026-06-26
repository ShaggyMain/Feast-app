/**
 * Seeded scenario generator for radar levels L1–L6. Pure & deterministic: the
 * same (seed, level) always yields the same scenario, so a session is
 * replayable and the engine is unit-testable without React.
 *
 * Geometry: a square scope of `size` units, centre at (size/2, size/2). Four
 * exit gates sit at the cardinal edge midpoints (N/E/S/W). Aircraft enter on a
 * ring inside the edges and fly across the sector to an assigned gate.
 *
 *  - L1: one aircraft, deliberately *not* aimed at its gate — learn to steer.
 *  - L2: a guaranteed crossing pair (predicted conflict) + one filler track.
 *  - L3: the crossing pair + two filler tracks — four-aircraft load.
 *  - L4: four controllable + one UNCONTROLLED transit track to avoid.
 *  - L5: altitude layer — a same-level crossing pair (resolve by vector *or*
 *        climb/descend) plus traffic on other flight levels; tighter ETA.
 *  - L6: maximum load — six controllable + two uncontrolled, multiple flight
 *        levels, staggered (timed) appearances.
 */
import type { Aircraft, Gate, RadarConfig, RadarLevel, Scenario } from './types';
import { bearing, dist, mod360, rad } from './geometry';
import { mulberry32, pick, randInt, type Rng } from '@/core/rng';

const SIZE = 1000;
/** Entry ring radius from centre (fraction of size). Clear of the edge gates. */
const ENTRY_FRAC = 0.44;
/** Nominal cruise speed (sim units/sec); jittered per aircraft. */
const BASE_SPEED = 22;
/** Default flight level for the flat (L1–L4) scenarios. */
const CRUISE = 200;
/** Flight levels used when the altitude layer is in play (≥ sepV apart). */
const ALT_LANES = [180, 200, 220, 240];

const AIRLINES = ['SAS', 'DLH', 'RYR', 'AFR', 'KLM', 'BAW', 'EZY', 'WZZ', 'LOT', 'UAE', 'SWR', 'AUA'];

/** Cardinal bearing → gate id. */
const GATE_AT: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

function configFor(level: RadarLevel): RadarConfig {
  const base: RadarConfig = {
    size: SIZE,
    turnRate: 3, // deg/s — standard rate turn
    aRate: 10, // units/s²
    minSpeed: 14,
    maxSpeed: 34,
    sepH: 92,
    sepV: 15, // flight levels are 20 apart → adjacent lanes are safe
    climbRate: 3, // altitude units/s (one 20-unit level ≈ 6.7 s)
    minAlt: 160,
    maxAlt: 260,
    verticalEnabled: false,
    predictT: 16,
    gateRadius: 42,
    etaWindowSec: 13,
    durationSec: 150,
  };
  switch (level) {
    case 1:
      return { ...base, etaWindowSec: 16, durationSec: 110 };
    case 2:
      return { ...base, etaWindowSec: 13, durationSec: 150 };
    case 3:
      return { ...base, etaWindowSec: 11, durationSec: 190 };
    case 4:
      return { ...base, etaWindowSec: 11, durationSec: 210 };
    case 5:
      return { ...base, verticalEnabled: true, predictT: 18, etaWindowSec: 9, durationSec: 220 };
    case 6:
    default:
      return { ...base, verticalEnabled: true, sepH: 96, predictT: 18, etaWindowSec: 8, durationSec: 270 };
  }
}

function gates(): Gate[] {
  const c = SIZE / 2;
  return [
    { id: 'N', name: 'NORLU', x: c, y: 0 },
    { id: 'E', name: 'ESBOR', x: SIZE, y: c },
    { id: 'S', name: 'SODKA', x: c, y: SIZE },
    { id: 'W', name: 'WESMI', x: 0, y: c },
  ];
}

const gateById = (gs: Gate[], id: string): Gate => gs.find((g) => g.id === id)!;

/** Position on the entry ring for a given compass bearing from the centre. */
function entryPos(bearingDeg: number): { x: number; y: number } {
  const c = SIZE / 2;
  const r = SIZE * ENTRY_FRAC;
  return { x: c + r * Math.sin(rad(bearingDeg)), y: c - r * Math.cos(rad(bearingDeg)) };
}

/** Pop `n` distinct callsigns. */
function callsigns(rng: Rng, n: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  while (out.length < n) {
    const cs = `${pick(rng, AIRLINES)}${randInt(rng, 100, 999)}`;
    if (!seen.has(cs)) {
      seen.add(cs);
      out.push(cs);
    }
  }
  return out;
}

function speedJitter(rng: Rng): number {
  return Math.round(BASE_SPEED * (0.92 + rng() * 0.18)); // ~20..26
}

interface AcOpts {
  id: string;
  callsign: string;
  pos: { x: number; y: number };
  gate: Gate;
  speed: number;
  heading?: number;
  altitude?: number;
  spawnAtSec?: number;
}

/** A controllable inbound assigned to an exit gate. */
function makeAircraft(o: AcOpts): Aircraft {
  const altitude = o.altitude ?? CRUISE;
  const spawnAtSec = o.spawnAtSec ?? 0;
  const h = o.heading ?? bearing(o.pos.x, o.pos.y, o.gate.x, o.gate.y);
  const etaSec = spawnAtSec + dist(o.pos.x, o.pos.y, o.gate.x, o.gate.y) / o.speed;
  return {
    id: o.id,
    callsign: o.callsign,
    x: o.pos.x,
    y: o.pos.y,
    heading: h,
    speed: o.speed,
    altitude,
    targetHeading: h,
    targetSpeed: o.speed,
    targetAltitude: altitude,
    controllable: true,
    exitGateId: o.gate.id,
    etaSec,
    spawnAtSec,
    state: spawnAtSec > 0 ? 'pending' : 'inbound',
    conflict: false,
    warn: false,
  };
}

/** An uncontrolled transit track that flies straight across the sector. */
function makeTransit(
  id: string,
  callsign: string,
  entryBearing: number,
  speed: number,
  altitude: number,
  spawnAtSec: number,
): Aircraft {
  const pos = entryPos(entryBearing);
  const h = mod360(entryBearing + 180); // head from the ring through the centre
  return {
    id,
    callsign,
    x: pos.x,
    y: pos.y,
    heading: h,
    speed,
    altitude,
    targetHeading: h,
    targetSpeed: speed,
    targetAltitude: altitude,
    controllable: false,
    exitGateId: '',
    etaSec: 0,
    spawnAtSec,
    state: spawnAtSec > 0 ? 'pending' : 'inbound',
    conflict: false,
    warn: false,
  };
}

/**
 * Two perpendicular tracks that meet at the centre at the same time → a
 * guaranteed predicted (then active) conflict the player must resolve. Both
 * fly straight at their gates, so doing nothing collides them mid-sector.
 */
function crossingPair(rng: Rng, gs: Gate[], cs: string[], speed: number, altitude: number): Aircraft[] {
  // Each variant is [horizontal lane, vertical lane]; both cross the centre.
  const variants: Array<[{ b: number; g: string }, { b: number; g: string }]> = [
    [{ b: 270, g: 'E' }, { b: 0, g: 'S' }], // W→E  ×  N→S
    [{ b: 90, g: 'W' }, { b: 180, g: 'N' }], // E→W  ×  S→N
    [{ b: 270, g: 'E' }, { b: 180, g: 'N' }], // W→E  ×  S→N
    [{ b: 90, g: 'W' }, { b: 0, g: 'S' }], // E→W  ×  N→S
  ];
  const [a, b] = pick(rng, variants);
  return [
    makeAircraft({ id: 'ac0', callsign: cs[0], pos: entryPos(a.b), gate: gateById(gs, a.g), speed, altitude }),
    makeAircraft({ id: 'ac1', callsign: cs[1], pos: entryPos(b.b), gate: gateById(gs, b.g), speed, altitude }),
  ];
}

/** A filler track entering on `entryB` and crossing to an adjacent gate. */
function fillerOn(
  rng: Rng,
  gs: Gate[],
  id: string,
  cs: string,
  entryB: number,
  altitude: number,
  spawnAtSec: number,
): Aircraft {
  const exitB = rng() < 0.5 ? (entryB + 90) % 360 : (entryB + 270) % 360;
  return makeAircraft({
    id,
    callsign: cs,
    pos: entryPos(entryB),
    gate: gateById(gs, GATE_AT[exitB]),
    speed: speedJitter(rng),
    altitude,
    spawnAtSec,
  });
}

const bearingOf = (ac: Aircraft): number => {
  const c = SIZE / 2;
  return Math.round(bearing(c, c, ac.x, ac.y));
};

export function generateScenario(seed: number, level: RadarLevel): Scenario {
  const rng = mulberry32(seed >>> 0);
  const config = configFor(level);
  const gs = gates();

  if (level === 1) {
    const cs = callsigns(rng, 1)[0];
    const entryB = pick(rng, [0, 90, 180, 270]);
    const exitGate = gateById(gs, GATE_AT[(entryB + 180) % 360]); // opposite edge
    const pos = entryPos(entryB);
    const straight = bearing(pos.x, pos.y, exitGate.x, exitGate.y);
    // Aim ~22–40° off so the player must steer it back to make the gate.
    const off = randInt(rng, 22, 40) * (rng() < 0.5 ? -1 : 1);
    const ac = makeAircraft({ id: 'ac0', callsign: cs, pos, gate: exitGate, speed: speedJitter(rng), heading: straight + off });
    return { level, config, gates: gs, aircraft: [ac] };
  }

  if (level === 2 || level === 3 || level === 4) {
    // Crossing pair + fillers, all on one flight level. L4 adds uncontrolled traffic.
    const fillerCount = level === 2 ? 1 : 2;
    const hasTransit = level === 4;
    const cs = callsigns(rng, 2 + fillerCount + (hasTransit ? 1 : 0));
    const pair = crossingPair(rng, gs, cs, speedJitter(rng), CRUISE);

    const used = new Set<number>();
    pair.forEach((ac) => used.add(bearingOf(ac)));
    const fillers: Aircraft[] = [];
    for (let i = 0; i < fillerCount; i++) {
      const free = [0, 90, 180, 270].filter((b) => !used.has(b));
      const b = pick(rng, free);
      used.add(b);
      fillers.push(fillerOn(rng, gs, `ac${2 + i}`, cs[2 + i], b, CRUISE, 0));
    }

    const extra: Aircraft[] = [];
    if (hasTransit) {
      const tb = pick(rng, [45, 135, 225, 315]); // diagonal entry through the centre
      extra.push(makeTransit(`ac${2 + fillerCount}`, cs[2 + fillerCount], tb, speedJitter(rng), CRUISE, 0));
    }
    return { level, config, gates: gs, aircraft: [...pair, ...fillers, ...extra] };
  }

  if (level === 5) {
    // Altitude layer: a same-level crossing pair (resolve by vector OR climb/
    // descend) + two tracks on other flight levels + one uncontrolled transit.
    const cs = callsigns(rng, 5);
    const pair = crossingPair(rng, gs, cs, speedJitter(rng), ALT_LANES[1]); // both at FL200
    const used = new Set<number>();
    pair.forEach((ac) => used.add(bearingOf(ac)));
    const free = [0, 90, 180, 270].filter((b) => !used.has(b));
    const f1 = fillerOn(rng, gs, 'ac2', cs[2], free[0], ALT_LANES[0], 0); // FL180
    const f2 = fillerOn(rng, gs, 'ac3', cs[3], free[1], ALT_LANES[2], 0); // FL220
    const transit = makeTransit('ac4', cs[4], pick(rng, [45, 135, 225, 315]), speedJitter(rng), ALT_LANES[1], 0);
    return { level, config, gates: gs, aircraft: [...pair, f1, f2, transit] };
  }

  // level 6 — maximum load: six controllable across flight levels (staggered) +
  // two uncontrolled transit tracks appearing later.
  const cs = callsigns(rng, 8);
  const pair = crossingPair(rng, gs, cs, speedJitter(rng), ALT_LANES[1]);
  const cardinals = [0, 90, 180, 270];
  const fillerPlan = [
    { b: cardinals[0], alt: ALT_LANES[0], t: 4 },
    { b: cardinals[1], alt: ALT_LANES[2], t: 10 },
    { b: cardinals[2], alt: ALT_LANES[3], t: 18 },
    { b: cardinals[3], alt: ALT_LANES[0], t: 26 },
  ];
  const fillers = fillerPlan.map((p, i) => fillerOn(rng, gs, `ac${2 + i}`, cs[2 + i], p.b, p.alt, p.t));
  const transits = [
    makeTransit('ac6', cs[6], pick(rng, [45, 135]), speedJitter(rng), ALT_LANES[2], 8),
    makeTransit('ac7', cs[7], pick(rng, [225, 315]), speedJitter(rng), ALT_LANES[1], 20),
  ];
  return { level, config, gates: gs, aircraft: [...pair, ...fillers, ...transits] };
}
