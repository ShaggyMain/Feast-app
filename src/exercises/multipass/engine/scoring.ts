/**
 * Combined Multipass scoring: each of the three concurrent tasks (radar, flight
 * strips, audio) contributes its accuracy hits / (hits + misses + false alarms);
 * the overall is the mean of the tasks that actually fired, mapped to a stanine
 * (reuses the shared radar stanine bands).
 */
import { rawToStanine, stanineLabel } from '@/exercises/radar/engine/scoring';

export { rawToStanine, stanineLabel };

export interface TaskTally {
  hits: number;
  misses: number;
  falseAlarms: number;
}

export const emptyTally = (): TaskTally => ({ hits: 0, misses: 0, falseAlarms: 0 });

const events = (t: TaskTally): number => t.hits + t.misses + t.falseAlarms;

/** Accuracy 0..1; a task with no events is neutral (1, excluded from the mean). */
export function taskAccuracy(t: TaskTally): number {
  return events(t) > 0 ? t.hits / events(t) : 1;
}

export interface MultipassScore {
  raw: number;
  stanine: number;
  radar: number;
  strips: number;
  audio: number;
}

export function scoreMultipass(radar: TaskTally, strips: TaskTally, audio: TaskTally): MultipassScore {
  const fired = [radar, strips, audio].filter((t) => events(t) > 0);
  const overall = fired.length ? fired.reduce((s, t) => s + taskAccuracy(t), 0) / fired.length : 0;
  const raw = Math.round(overall * 100);
  return {
    raw,
    stanine: rawToStanine(raw),
    radar: Math.round(taskAccuracy(radar) * 100),
    strips: Math.round(taskAccuracy(strips) * 100),
    audio: Math.round(taskAccuracy(audio) * 100),
  };
}
