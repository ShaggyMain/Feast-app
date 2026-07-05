import { Stack, useLocalSearchParams } from 'expo-router';

import type { ModuleId } from '@/types';
import { getModule } from '@/data/registry';
import { MixRunner } from '@/runner/MixRunner';
import { useT } from '@/i18n/useT';

export default function MixScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const moduleMeta = getModule(id ?? '');
  const t = useT();
  return (
    <>
      <Stack.Screen options={{ title: t('mix.title') }} />
      <MixRunner moduleId={(moduleMeta?.id ?? 'math') as ModuleId} />
    </>
  );
}
