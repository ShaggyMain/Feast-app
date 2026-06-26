/**
 * Module 1.2 — Prędkość–dystans–czas (speed/distance/time).
 * Numeric input. Speeds are chosen so v/60 (km per minute) is a whole number,
 * matching the FEAST trick "convert speed to per-minute". Answers stay integer.
 */
import type { Difficulty, GeneratedItem } from '@/types';
import { mulberry32, pick, randInt } from '@/core/rng';
import { t } from '@/i18n';

// km/h whose /60 is a whole number of km/min.
const SPEEDS: Record<Difficulty, number[]> = {
  easy: [300, 420, 480, 600], // 5, 7, 8, 10 km/min
  medium: [360, 420, 480, 540, 600, 660, 720], // 6..12
  hard: [420, 480, 540, 600, 660, 720, 780, 840, 900], // 7..15
};

type Ask = 'distance' | 'time' | 'speed';

const VARIANT: Record<string, Ask> = { distance: 'distance', time: 'time', speed: 'speed' };

export function generateVst(seed: number, level: Difficulty, variant?: string): GeneratedItem {
  const rng = mulberry32(seed);
  const speed = pick(rng, SPEEDS[level]);
  const kmPerMin = speed / 60;
  const minutes = randInt(rng, level === 'easy' ? 2 : 3, level === 'hard' ? 18 : 12);
  const distance = kmPerMin * minutes;

  const forced = variant ? VARIANT[variant] : undefined;
  const ask: Ask = forced ?? pick(rng, ['distance', 'time', 'speed'] as const);

  let prompt: string;
  let answer: number;
  let unit: string;
  switch (ask) {
    case 'distance':
      prompt = t('vst.distance', { speed, minutes });
      answer = distance;
      unit = 'km';
      break;
    case 'time':
      prompt = t('vst.time', { speed, distance });
      answer = minutes;
      unit = 'min';
      break;
    case 'speed':
      prompt = t('vst.speed', { distance, minutes });
      answer = speed;
      unit = 'km/h';
      break;
  }

  return {
    prompt,
    mode: 'numeric',
    correctValue: answer,
    answerLabel: `${answer} ${unit}`,
    hint: t('hint.vst'),
    category: ask,
  };
}
