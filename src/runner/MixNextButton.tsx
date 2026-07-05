/**
 * Shown on an exercise's done screen while a mix playlist is running and this
 * exercise is the current step: advances to the next game (or ends the mix and
 * returns to the module). Renders nothing outside a mix, so it's safe to drop
 * into every custom/standard done screen.
 */
import { useRouter } from 'expo-router';

import { PrimaryButton } from '@/ui/PrimaryButton';
import { getExercise } from '@/data/registry';
import { useMixStore } from '@/store/mix';
import { useT } from '@/i18n/useT';

export function MixNextButton({ exerciseId }: { exerciseId: string }) {
  const router = useRouter();
  const t = useT();
  const moduleId = useMixStore((s) => s.moduleId);
  const queue = useMixStore((s) => s.queue);
  const index = useMixStore((s) => s.index);
  const advance = useMixStore((s) => s.advance);
  const clear = useMixStore((s) => s.clear);

  // Only on the game the playlist is currently pointing at.
  if (!moduleId || queue[index] !== exerciseId) return null;

  const isLast = index >= queue.length - 1;
  const nextDef = !isLast ? getExercise(queue[index + 1]) : null;

  const onNext = () => {
    if (isLast) {
      clear();
      router.back(); // pop back to the module screen underneath
    } else {
      const next = queue[index + 1];
      advance();
      router.replace(`/exercise/${next}`);
    }
  };

  return (
    <PrimaryButton
      label={isLast ? t('mix.finish') : t('mix.next', { name: nextDef ? t(nextDef.title) : '' })}
      onPress={onNext}
    />
  );
}
