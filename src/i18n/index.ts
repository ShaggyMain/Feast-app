/**
 * Tiny offline i18n. `translate`/`t` are pure (no React, no RN) so they work in
 * components, helpers and generators alike. Components use `useT` (see ./useT)
 * to re-render on a language change; everything else calls `t` directly, which
 * reads the language module variable kept in sync by the settings store.
 */
import { getLang, type Lang } from './lang';
import { STRINGS } from './strings';

export type { Lang } from './lang';
export { getLang, setLang, LANGS } from './lang';

export type TParams = Record<string, string | number>;

export function translate(key: string, params?: TParams, lang?: Lang): string {
  const l = lang ?? getLang();
  let s = STRINGS[l]?.[key] ?? STRINGS.pl[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

/** Bare translator using the current (module) language — for non-component code. */
export const t = (key: string, params?: TParams): string => translate(key, params);
