/** Pure RCT world step + command helpers (no React). Aircraft auto-navigate
 * their route fix-to-fix; the controller only sets altitude/speed and complies
 * with radio instructions. Reuses the radar engine's geometry + 3D conflicts. */
import { approach, bearing, clamp, dist, mod360, normalizeDeg, velocity } from '../../radar/engine/geometry';
import { detectConflicts } from '../../radar/engine/conflicts';
import {
  emptyRctStats,
  type Fix,
  type RadioInstruction,
  type RctAircraft,
  type RctConfig,
  type RctScenario,
  type RctWorld,
} from './types';

const OUT_MARGIN = 30;

const fixById = (fixes: Fix[], id: string): Fix => fixes.find((f) => f.id === id)!;

export function initRctWorld(scenario: RctScenario): RctWorld {
  return {
    aircraft: scenario.aircraft.map((a) => ({ ...a })),
    elapsedSec: 0,
    stats: emptyRctStats(),
    activeConflict: false,
    instructions: scenario.instructions.map((i) => ({ ...i })),
  };
}

/** One physics step: steer toward the current route fix, ease speed/altitude, move. */
export function advanceRct(ac: RctAircraft, fixes: Fix[], cfg: RctConfig, dt: number): RctAircraft {
  if (ac.state !== 'enroute') return ac;
  const fix = fixById(fixes, ac.route[Math.min(ac.legIdx, ac.route.length - 1)]);
  const desired = bearing(ac.x, ac.y, fix.x, fix.y);
  const diff = normalizeDeg(desired - ac.heading);
  const heading = mod360(ac.heading + clamp(diff, -cfg.turnRate * dt, cfg.turnRate * dt));
  const speed = approach(ac.speed, ac.targetSpeed, cfg.aRate * dt);
  const altitude = approach(ac.altitude, ac.targetAltitude, cfg.climbRate * dt);
  const v = velocity(heading, speed);
  const x = ac.x + v.vx * dt;
  const y = ac.y + v.vy * dt;
  let legIdx = ac.legIdx;
  // Advance to the next leg once we cross the current (non-final) fix.
  if (legIdx < ac.route.length - 1 && dist(x, y, fix.x, fix.y) <= cfg.fixRadius) {
    legIdx += 1;
  }
  return { ...ac, heading, speed, altitude, x, y, legIdx };
}

/** Advance the whole world by dt: spawn, fly routes, exit/bounds, conflicts, instructions. */
export function stepRct(world: RctWorld, scenario: RctScenario, dt: number): RctWorld {
  const cfg = scenario.config;
  const elapsedSec = world.elapsedSec + dt;
  const stats = { ...world.stats };

  let aircraft = world.aircraft.map((ac) =>
    ac.state === 'pending' && elapsedSec >= ac.spawnAtSec ? { ...ac, state: 'enroute' as const } : ac,
  );

  aircraft = aircraft.map((ac) => advanceRct(ac, scenario.fixes, cfg, dt));

  aircraft = aircraft.map((ac) => {
    if (ac.state !== 'enroute') return ac;
    if (ac.x < -OUT_MARGIN || ac.y < -OUT_MARGIN || ac.x > cfg.size + OUT_MARGIN || ac.y > cfg.size + OUT_MARGIN) {
      stats.lost += 1;
      return { ...ac, state: 'lost', conflict: false, warn: false };
    }
    const lastFix = fixById(scenario.fixes, ac.route[ac.route.length - 1]);
    if (ac.legIdx >= ac.route.length - 1 && dist(ac.x, ac.y, lastFix.x, lastFix.y) <= cfg.fixRadius) {
      stats.exits += 1;
      const altOk = Math.abs(ac.altitude - ac.clearedAlt) <= cfg.altWindow;
      const timeOk = Math.abs(elapsedSec - ac.etaSec) <= cfg.etaWindowSec;
      if (altOk && timeOk) stats.onTimeExits += 1;
      if (!altOk) stats.wrongAlt += 1;
      return { ...ac, state: 'exited', conflict: false, warn: false };
    }
    return ac;
  });

  const enroute = aircraft.filter((a) => a.state === 'enroute');
  const cr = detectConflicts(enroute, cfg.sepH, cfg.sepV, cfg.predictT, cfg.climbRate);
  const activeConflict = cr.active.size > 0;
  aircraft = aircraft.map((ac) =>
    ac.state === 'enroute' ? { ...ac, conflict: cr.active.has(ac.id), warn: cr.warn.has(ac.id) } : ac,
  );
  if (activeConflict) stats.conflictSeconds += dt;
  if (activeConflict && !world.activeConflict) stats.conflictEvents += 1;

  const instructions = world.instructions.map((ins) =>
    processInstruction(ins, aircraft, elapsedSec, stats),
  );

  return { aircraft, elapsedSec, stats, activeConflict, instructions };
}

function processInstruction(
  ins: RadioInstruction,
  aircraft: RctAircraft[],
  elapsedSec: number,
  stats: RctWorld['stats'],
): RadioInstruction {
  let cur = ins;
  if (cur.status === 'pending' && elapsedSec >= cur.issuedAtSec) cur = { ...cur, status: 'active' };
  if (cur.status !== 'active') return cur;
  const ac = aircraft.find((a) => a.id === cur.acId);
  if (ac && ac.state !== 'pending') {
    const matched = cur.kind === 'speed' ? ac.targetSpeed === cur.value : ac.targetAltitude === cur.value;
    if (matched) {
      stats.instrComplied += 1;
      return { ...cur, status: 'complied' };
    }
  }
  if (elapsedSec > cur.dueBySec) {
    stats.instrMissed += 1;
    return { ...cur, status: 'missed' };
  }
  return cur;
}

export function isRctComplete(world: RctWorld, scenario: RctScenario): boolean {
  return (
    world.elapsedSec >= scenario.config.durationSec ||
    world.aircraft.every((a) => a.state !== 'enroute' && a.state !== 'pending')
  );
}

// --- command helpers (applied to the selected aircraft) ---

export function changeAltitude(ac: RctAircraft, delta: number, cfg: RctConfig): RctAircraft {
  return { ...ac, targetAltitude: clamp(ac.targetAltitude + delta, cfg.minAlt, cfg.maxAlt) };
}

export function setAltitude(ac: RctAircraft, value: number, cfg: RctConfig): RctAircraft {
  return { ...ac, targetAltitude: clamp(value, cfg.minAlt, cfg.maxAlt) };
}

export function changeSpeed(ac: RctAircraft, delta: number, cfg: RctConfig): RctAircraft {
  return { ...ac, targetSpeed: clamp(ac.targetSpeed + delta, cfg.minSpeed, cfg.maxSpeed) };
}

export function setSpeed(ac: RctAircraft, value: number, cfg: RctConfig): RctAircraft {
  return { ...ac, targetSpeed: clamp(value, cfg.minSpeed, cfg.maxSpeed) };
}

export function withAircraft(world: RctWorld, id: string, fn: (ac: RctAircraft) => RctAircraft): RctWorld {
  return { ...world, aircraft: world.aircraft.map((a) => (a.id === id ? fn(a) : a)) };
}
