/**
 * Component-facing translator hook. Subscribes to the language in the settings
 * store so anything using it re-renders when the user toggles PL/EN. (Imports
 * the store, so it must only be used from React components — generators import
 * `t` from `./index` instead.)
 */
import { useMemo } from 'react';

import { useSettingsStore } from '@/store/settings';
import { translate, type TParams } from './index';

export function useT(): (key: string, params?: TParams) => string {
  const lang = useSettingsStore((s) => s.language);
  return useMemo(() => (key: string, params?: TParams) => translate(key, params, lang), [lang]);
}
