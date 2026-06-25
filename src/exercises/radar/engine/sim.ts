/** Pure world step + command helpers (no React). Deterministic per inputs. */
import type { Aircraft, Gate, RadarConfig, Scenario, World } from './types';
import { emptyStats } from './types';
import { approach, bearing, clamp, dist, mod360, normalizeDeg, velocity } from './geometry';
import { detectConflicts } from './conflicts';

const OUT_MARGIN = 25;

/** Fresh world for a scenario (aircraft copied so the scenario stays pristine). */
export function initWorld(scenario: Scenario): World {
  return {
    aircraft: scenario.aircraft.map((a) => ({ ...a })),
    elapsedSec: 0,
    stats: emptyStats(),
    activeConflict: false,
  };
}

/** One physics step for a single aircraft (turn toward target, adjust speed, move). */
export function advanceAircraft(ac: Aircraft, cfg: RadarConfig, dt: number): Aircraft {
  if (ac.state !== 'inbound') return ac;
  let { heading, speed } = ac;
  if (ac.controllable) {
    const diff = normalizeDeg(ac.targetHeading - heading);
    heading = mod360(heading + clamp(diff, -cfg.turnRate * dt, cfg.turnRate * dt));
    speed = approach(speed, ac.targetSpeed, cfg.aRate * dt);
  }
  const v = velocity(heading, speed);
  return { ...ac, heading, speed, x: ac.x + v.vx * dt, y: ac.y + v.vy * dt };
}

/** Advance the whole world by dt: move, resolve gates/bounds, detect conflicts, score time. */
export function stepWorld(world: World, scenario: Scenario, dt: number): World {
  const cfg = scenario.config;
  const elapsedSec = world.elapsedSec + dt;
  const stats = { ...world.stats };

  let aircraft = world.aircraft.map((ac) => advanceAircraft(ac, cfg, dt));

  aircraft = aircraft.map((ac) => {
    if (ac.state !== 'inbound') return ac;
    // left the sector?
    if (ac.x < -OUT_MARGIN || ac.y < -OUT_MARGIN || ac.x > cfg.size + OUT_MARGIN || ac.y > cfg.size + OUT_MARGIN) {
      stats.lost += 1;
      return { ...ac, state: 'lost', conflict: false, warn: false };
    }
    // reached a gate?
    for (const g of scenario.gates) {
      if (dist(ac.x, ac.y, g.x, g.y) <= cfg.gateRadius) {
        if (g.id === ac.exitGateId) {
          stats.handoffs += 1;
          if (Math.abs(elapsedSec - ac.etaSec) <= cfg.etaWindowSec) stats.onTimeHandoffs += 1;
          else stats.missedEta += 1;
        } else {
          stats.wrongGate += 1;
        }
        return { ...ac, state: 'handedOff', conflict: false, warn: false };
      }
    }
    return ac;
  });

  const inbound = aircraft.filter((a) => a.state === 'inbound');
  const cr = detectConflicts(inbound, cfg.sepH, cfg.predictT);
  const activeConflict = cr.active.size > 0;
  aircraft = aircraft.map((ac) =>
    ac.state === 'inbound'
      ? { ...ac, conflict: cr.active.has(ac.id), warn: cr.warn.has(ac.id) }
      : ac,
  );

  if (activeConflict) stats.conflictSeconds += dt;
  if (activeConflict && !world.activeConflict) stats.conflictEvents += 1;

  return { aircraft, elapsedSec, stats, activeConflict };
}

export function isComplete(world: World, scenario: Scenario): boolean {
  return (
    world.elapsedSec >= scenario.config.durationSec ||
    world.aircraft.every((a) => a.state !== 'inbound')
  );
}

// --- command helpers (applied to the selected aircraft) ---

export function turnBy(ac: Aircraft, deltaDeg: number): Aircraft {
  return { ...ac, targetHeading: mod360(ac.targetHeading + deltaDeg) };
}

export function directTo(ac: Aircraft, gate: Gate): Aircraft {
  return { ...ac, targetHeading: bearing(ac.x, ac.y, gate.x, gate.y) };
}

export function changeSpeed(ac: Aircraft, delta: number, cfg: RadarConfig): Aircraft {
  return { ...ac, targetSpeed: clamp(ac.targetSpeed + delta, cfg.minSpeed, cfg.maxSpeed) };
}

/** Replace one aircraft (by id) in the world — used after a command. */
export function withAircraft(world: World, id: string, fn: (ac: Aircraft) => Aircraft): World {
  return { ...world, aircraft: world.aircraft.map((a) => (a.id === id ? fn(a) : a)) };
}
