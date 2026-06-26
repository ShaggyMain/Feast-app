/** Flight-strips sub-task: a small board of progress strips to acknowledge. Pure. */
import { pick, shuffle, type Rng } from '@/core/rng';

const AIRLINES = ['SAS', 'DLH', 'RYR', 'AFR', 'KLM', 'BAW', 'EZY', 'WZZ', 'LOT', 'UAE'];
const CLEARANCES = ['FL180', 'FL200', 'FL220', 'FL240', 'HDG 090', 'HDG 180', 'HDG 270', 'HDG 360'];

export interface Strip {
  id: string;
  callsign: string;
  clearance: string;
}

export function genStrips(rng: Rng, n: number): Strip[] {
  const out: Strip[] = [];
  const seen = new Set<string>();
  const clz = shuffle(rng, CLEARANCES);
  while (out.length < n) {
    const callsign = `${pick(rng, AIRLINES)}${100 + Math.floor(rng() * 900)}`;
    if (seen.has(callsign)) continue;
    seen.add(callsign);
    out.push({ id: `s${out.length}`, callsign, clearance: clz[out.length % clz.length] });
  }
  return out;
}
