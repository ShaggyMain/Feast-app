/**
 * Framework-free language holder. Kept entirely free of React Native / the
 * settings store so that pure, unit-tested generators can read the active
 * language without pulling in RN. The settings store syncs `setLang` on change
 * and on rehydrate; tests run against the default ('pl'), so Polish-asserting
 * generator tests keep passing.
 */
export type Lang = 'pl' | 'en';

export const LANGS: Lang[] = ['pl', 'en'];

let current: Lang = 'pl';

export const getLang = (): Lang => current;
export const setLang = (lang: Lang): void => {
  current = lang;
};
