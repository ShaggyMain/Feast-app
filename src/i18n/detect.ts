/**
 * Device-language detection for first launch. Polish phones get Polish;
 * everything else falls back to English (the lingua franca for this app).
 * Best-effort: if the native module is unavailable, default to Polish.
 */
import * as Localization from 'expo-localization';
import type { Lang } from './lang';

export function detectDeviceLang(): Lang {
  try {
    const locales = Localization.getLocales?.() ?? [];
    const code = (locales[0]?.languageCode ?? '').toLowerCase();
    return code.startsWith('pl') ? 'pl' : 'en';
  } catch {
    return 'pl';
  }
}
