/**
 * Seeded scenario generator for radar levels L1–L3. Pure & deterministic: the
 * same (seed, level) always yields the same scenario, so a session is
 * replayable and the engine is unit-testable without React.
 *
 * Geometry: a square scope of `size` units, centre at (size/2, size/2). Four
 * exit gates sit at the cardinal edge midpoints (N/E/S/W). Aircraft enter on a
 * ring inside the edges and fly across the sector to an assigned gate.
 *
 *  - L1: one aircraft, deliberately *not* aimed at its gate — learn to steer
 *        (select → Direct-to) before it leaves the sector.
 *  - L2: a guaranteed crossing pair (predicted conflict near centre) + one
 *        filler track — resolve the conflict while still making the gates.
 *  - L3: the crossing pair + two filler tracks — four-aircraft load.
 */
import type { Aircraft, Gate, RadarConfig, Scenario } from './types';
import { bearing, dist, rad } from './geometry';
import { mulberry32, pick, randInt, type Rng } from '@/core/rng';

const SIZE = 1000;
/** Entry ring radius from centre (fraction of size). Clear of the edge gates. */
const ENTRY_FRAC = 0.44;
/** Nominal cruise speed (sim units/sec); jittered per aircraft. */
const BASE_SPEED = 22;

const AIRLINES = ['SAS', 'DLH', 'RYR', 'AFR', 'KLM', 'BAW', 'EZY', 'WZZ', 'LOT', 'UAE', 'SWR', 'AUA'];

/** Cardinal bearing → gate id. */
const GATE_AT: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

function configFor(level: 1 | 2 | 3): RadarConfig {
  const base: RadarConfig = {
    size: SIZE,
    turnRate: 3, // deg/s — standard rate turn
    aRate: 10, // units/s²
    minSpeed: 14,
    maxSpeed: 34,
    sepH: 92,
    predictT: 16,
    gateRadius: 42,
    etaWindowSec: 13,
    durationSec: 150,
  };
  if (level === 1) return { ...base, etaWindowSec: 16, durationSec: 110 };
  if (level === 2) return { ...base, etaWindowSec: 13, durationSec: 150 };
  return { ...base, etaWindowSec: 11, durationSec: 190 };
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

function makeAircraft(
  id: string,
  callsign: string,
  pos: { x: number; y: number },
  gate: Gate,
  speed: number,
  headingOverride?: number,
): Aircraft {
  const h = headingOverride ?? bearing(pos.x, pos.y, gate.x, gate.y);
  const etaSec = dist(pos.x, pos.y, gate.x, gate.y) / speed;
  return {
    id,
    callsign,
    x: pos.x,
    y: pos.y,
    heading: h,
    speed,
    targetHeading: h,
    targetSpeed: speed,
    controllable: true,
    exitGateId: gate.id,
    etaSec,
    state: 'inbound',
    conflict: false,
    warn: false,
  };
}

/**
 * Two perpendicular tracks that meet at the centre at the same time → a
 * guaranteed predicted (then active) conflict the player must resolve. Both
 * fly straight at their gates, so doing nothing collides them mid-sector.
 */
function crossingPair(rng: Rng, gs: Gate[], cs: string[], speed: number): Aircraft[] {
  // Each variant is [horizontal lane, vertical lane]; both cross the centre.
  const variants: Array<[{ b: number; g: string }, { b: number; g: string }]> = [
    [{ b: 270, g: 'E' }, { b: 0, g: 'S' }], // W→E  ×  N→S
    [{ b: 90, g: 'W' }, { b: 180, g: 'N' }], // E→W  ×  S→N
    [{ b: 270, g: 'E' }, { b: 180, g: 'N' }], // W→E  ×  S→N
    [{ b: 90, g: 'W' }, { b: 0, g: 'S' }], // E→W  ×  N→S
  ];
  const [a, b] = pick(rng, variants);
  return [
    makeAircraft('ac0', cs[0], entryPos(a.b), gateById(gs, a.g), speed),
    makeAircraft('ac1', cs[1], entryPos(b.b), gateById(gs, b.g), speed),
  ];
}

/**
 * A filler track entering on one of the still-unused cardinals and crossing to
 * an adjacent gate (a 90° diagonal through the sector) — extra scan load that
 * may or may not conflict depending on the seeded speeds/timing.
 */
function filler(rng: Rng, gs: Gate[], id: string, cs: string, used: Set<number>): Aircraft {
  const free = [0, 90, 180, 270].filter((b) => !used.has(b));
  const b = pick(rng, free);
  used.add(b);
  const exitB = rng() < 0.5 ? (b + 90) % 360 : (b + 270) % 360;
  return makeAircraft(id, cs, entryPos(b), gateById(gs, GATE_AT[exitB]), speedJitter(rng));
}

export function generateScenario(seed: number, level: 1 | 2 | 3): Scenario {
  const rng = mulberry32(seed >>> 0);
  const config = configFor(level);
  const gs = gates();

  if (level === 1) {
    const cs = callsigns(rng, 1)[0];
    const entryB = pick(rng, [0, 90, 180, 270]);
    const exitGate = gateById(gs, GATE_AT[(entryB + 180) % 360]); // opposite edge
    const pos = entryPos(entryB);
    const straight = bearing(pos.x, pos.y, exitGate.x, exitGate.y);
    // Aim ~25–40° off so the player must steer it back to make the gate.
    const off = (randInt(rng, 22, 40)) * (rng() < 0.5 ? -1 : 1);
    const ac = makeAircraft('ac0', cs, pos, exitGate, speedJitter(rng), straight + off);
    return { level, config, gates: gs, aircraft: [ac] };
  }

  // L2/L3: a guaranteed crossing pair, then 1 (L2) or 2 (L3) filler tracks.
  const fillerCount = level === 2 ? 1 : 2;
  const cs = callsigns(rng, 2 + fillerCount);
  const pairSpeed = speedJitter(rng);
  const pair = crossingPair(rng, gs, cs, pairSpeed);

  // Mark the cardinals the pair already entered on so fillers pick fresh ones.
  const used = new Set<number>();
  const bearingOf = (ac: Aircraft) => {
    const c = SIZE / 2;
    return Math.round(bearing(c, c, ac.x, ac.y));
  };
  pair.forEach((ac) => used.add(bearingOf(ac)));

  const fillers: Aircraft[] = [];
  for (let i = 0; i < fillerCount; i++) {
    fillers.push(filler(rng, gs, `ac${2 + i}`, cs[2 + i], used));
  }

  return { level, config, gates: gs, aircraft: [...pair, ...fillers] };
}
