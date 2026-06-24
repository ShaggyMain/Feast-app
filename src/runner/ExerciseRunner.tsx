/**
 * ExerciseRunner — the shared shell every exercise runs inside.
 *
 * Responsibilities (milestone M0):
 *  - drive a session of `itemsPerSession` generated items,
 *  - per-item countdown timer with auto-advance on timeout,
 *  - multiple-choice and numeric-input answering,
 *  - immediate feedback (color + haptics), no penalty for wrong/blank answers,
 *  - scoring + persistence of an ExerciseResult,
 *  - a results screen comparing against the previous best.
 *
 * Per-item state lives in <PlayItem>, remounted via `key` for each question so
 * timers and inputs reset cleanly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import type { ExerciseResult, GeneratedItem, ItemOutcome } from '@/types';
import { getExercise } from '@/data/registry';
import { gradeItem, summarize } from '@/runner/scoring';
import { useResultsStore } from '@/store/results';
import { bestScore } from '@/store/selectors';
import { makeId } from '@/core/id';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TimerBar } from '@/ui/TimerBar';
import { Stat } from '@/ui/Stat';

const FEEDBACK_MS = 650;

function makeSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

export function ExerciseRunner({ exerciseId }: { exerciseId: string }) {
  const theme = useTheme();
  const router = useRouter();
  useKeepAwake();

  const def = useMemo(() => getExercise(exerciseId), [exerciseId]);
  const addResult = useResultsStore((s) => s.addResult);

  // Snapshot the previous best once, before this session saves anything.
  const [prevBest] = useState(() => bestScore(useResultsStore.getState().results, exerciseId));
  const [baseSeed, setBaseSeed] = useState(makeSeed);
  const [sessionKey, setSessionKey] = useState(0);
  const [outcomes, setOutcomes] = useState<ItemOutcome[]>([]);
  const [savedResult, setSavedResult] = useState<ExerciseResult | null>(null);

  const total = def ? def.itemsPerSession : 0;
  const timeLimitMs = def ? def.timePerItemSec * 1000 : 0;
  const index = outcomes.length;

  const currentItem = useMemo(
    () => (def && index < total ? def.generate(baseSeed + index) : null),
    [def, baseSeed, index, total],
  );

  // Finalize once the last item is graded.
  useEffect(() => {
    if (!def || savedResult || total === 0 || outcomes.length < total) return;
    const summary = summarize(outcomes, timeLimitMs);
    const result: ExerciseResult = {
      id: makeId(),
      module: def.module,
      exercise: def.id,
      date: new Date().toISOString(),
      totalItems: summary.totalItems,
      correct: summary.correct,
      accuracy: summary.accuracy,
      avgResponseMs: summary.avgResponseMs,
      score: summary.score,
    };
    addResult(result);
    setSavedResult(result);
  }, [outcomes, total, def, savedResult, timeLimitMs, addResult]);

  const handleItemComplete = useCallback((outcome: ItemOutcome) => {
    setOutcomes((prev) => [...prev, outcome]);
  }, []);

  const restart = useCallback(() => {
    setOutcomes([]);
    setSavedResult(null);
    setBaseSeed(makeSeed());
    setSessionKey((k) => k + 1);
  }, []);

  if (!def) {
    return (
      <Screen>
        <Text style={[styles.prompt, { color: theme.text }]}>Nie znaleziono ćwiczenia</Text>
        <PrimaryButton label="Wróć" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (savedResult) {
    return (
      <ResultsView
        result={savedResult}
        prevBest={prevBest}
        onRetry={restart}
        onBack={() => router.back()}
      />
    );
  }

  const correctSoFar = outcomes.filter((o) => o.correct).length;
  const sessionProgress = total ? index / total : 0;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { color: theme.textSecondary }]}>
          Pytanie {Math.min(index + 1, total)} / {total}
        </Text>
        <Text style={[styles.headerText, { color: theme.success }]}>✓ {correctSoFar}</Text>
      </View>
      <View style={[styles.sessionTrack, { backgroundColor: theme.surfaceAlt }]}>
        <View style={{ flex: sessionProgress, backgroundColor: theme.tint }} />
        <View style={{ flex: 1 - sessionProgress }} />
      </View>

      {currentItem ? (
        <PlayItem
          key={`${sessionKey}-${index}`}
          item={currentItem}
          timeLimitMs={timeLimitMs}
          accent={theme.tint}
          onComplete={handleItemComplete}
        />
      ) : (
        <View style={styles.flexCenter} />
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------

interface PlayItemProps {
  item: GeneratedItem;
  timeLimitMs: number;
  accent: string;
  onComplete: (outcome: ItemOutcome) => void;
}

function PlayItem({ item, timeLimitMs, accent, onComplete }: PlayItemProps) {
  const theme = useTheme();
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [remainingMs, setRemainingMs] = useState(timeLimitMs);
  const [phase, setPhase] = useState<'answering' | 'feedback'>('answering');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [numericText, setNumericText] = useState('');
  const [outcome, setOutcome] = useState<ItemOutcome | null>(null);

  const finish = useCallback(
    (payload: { answered: boolean; choiceId?: string; numericValue?: number }) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const responseMs = payload.answered ? Date.now() - startRef.current : timeLimitMs;
      const graded = gradeItem(item, { ...payload, responseMs });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          graded.correct
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }

      setOutcome(graded);
      setPhase('feedback');
      feedbackTimer.current = setTimeout(() => onComplete(graded), FEEDBACK_MS);
    },
    [item, timeLimitMs, onComplete],
  );

  // Per-item countdown.
  useEffect(() => {
    if (phase !== 'answering') return;
    const id = setInterval(() => {
      const remaining = timeLimitMs - (Date.now() - startRef.current);
      if (remaining <= 0) {
        clearInterval(id);
        finish({ answered: false });
      } else {
        setRemainingMs(remaining);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, timeLimitMs, finish]);

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const onChoose = (id: string) => {
    if (phase !== 'answering') return;
    setChosenId(id);
    finish({ answered: true, choiceId: id });
  };

  const onSubmitNumeric = () => {
    if (phase !== 'answering') return;
    const value = Number(numericText.replace(',', '.'));
    if (!Number.isFinite(value) || numericText.trim() === '') return;
    finish({ answered: true, numericValue: value });
  };

  const showFeedback = phase === 'feedback';

  return (
    <View style={styles.flexCenter}>
      <TimerBar progress={remainingMs / timeLimitMs} />

      <View style={styles.promptBlock}>
        <Text style={[styles.prompt, { color: theme.text }]}>{item.prompt}</Text>
        {item.hint ? (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>{item.hint}</Text>
        ) : null}
      </View>

      {showFeedback ? (
        <Text
          style={[
            styles.feedback,
            { color: outcome?.correct ? theme.success : theme.danger },
          ]}>
          {outcome?.correct
            ? 'Dobrze!'
            : outcome?.answered
              ? `Błąd — poprawnie: ${item.answerLabel}`
              : `Czas minął — poprawnie: ${item.answerLabel}`}
        </Text>
      ) : (
        <View style={styles.feedbackSpacer} />
      )}

      {item.mode === 'choice' && item.choices ? (
        <View style={styles.choiceGrid}>
          {item.choices.map((choice) => {
            const isCorrect = choice.id === item.correctChoiceId;
            const isChosen = choice.id === chosenId;
            let bg = theme.surface;
            let borderColor = theme.border;
            let labelColor = theme.text;
            if (showFeedback && isCorrect) {
              bg = theme.success;
              borderColor = theme.success;
              labelColor = theme.successText;
            } else if (showFeedback && isChosen) {
              bg = theme.danger;
              borderColor = theme.danger;
              labelColor = theme.dangerText;
            } else if (isChosen) {
              borderColor = accent;
            }
            return (
              <Text
                key={choice.id}
                onPress={() => onChoose(choice.id)}
                style={[
                  styles.choice,
                  { backgroundColor: bg, borderColor, color: labelColor },
                ]}>
                {choice.label}
              </Text>
            );
          })}
        </View>
      ) : (
        <View style={styles.numericBlock}>
          <TextInput
            value={numericText}
            onChangeText={setNumericText}
            editable={!showFeedback}
            keyboardType="numbers-and-punctuation"
            inputMode="numeric"
            placeholder="Wpisz odpowiedź"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={onSubmitNumeric}
            returnKeyType="done"
            style={[
              styles.numericInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          />
          <PrimaryButton
            label="Zatwierdź"
            onPress={onSubmitNumeric}
            disabled={showFeedback || numericText.trim() === ''}
          />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------

function ResultsView({
  result,
  prevBest,
  onRetry,
  onBack,
}: {
  result: ExerciseResult;
  prevBest: number;
  onRetry: () => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const accuracyPct = Math.round(result.accuracy * 100);
  const avgSec = (result.avgResponseMs / 1000).toFixed(1);
  const isRecord = result.score > prevBest;

  return (
    <Screen>
      <Text style={[styles.resultTitle, { color: theme.text }]}>Koniec sesji</Text>

      <View style={styles.statRow}>
        <Stat label="Wynik" value={String(result.score)} accent={theme.tint} />
        <Stat label="Trafność" value={`${accuracyPct}%`} />
        <Stat label="Śr. czas" value={`${avgSec}s`} />
      </View>

      <Text style={[styles.resultLine, { color: theme.textSecondary }]}>
        Poprawne odpowiedzi: {result.correct} / {result.totalItems}
      </Text>

      <View
        style={[
          styles.recordBanner,
          { backgroundColor: isRecord ? theme.success : theme.surfaceAlt },
        ]}>
        <Text
          style={[
            styles.recordText,
            { color: isRecord ? theme.successText : theme.textSecondary },
          ]}>
          {isRecord
            ? `Nowy rekord! Poprzedni najlepszy: ${prevBest}`
            : `Najlepszy wynik: ${Math.max(prevBest, result.score)}`}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="Jeszcze raz" onPress={onRetry} />
        <PrimaryButton label="Statystyki" variant="secondary" onPress={() => router.push('/stats')} />
        <PrimaryButton label="Wróć" variant="ghost" onPress={onBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flexCenter: {
    flex: 1,
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 15,
    fontWeight: '700',
  },
  sessionTrack: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  promptBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  prompt: {
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
  feedback: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 22,
  },
  feedbackSpacer: {
    minHeight: 22,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  choice: {
    width: '47%',
    flexGrow: 1,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    fontSize: 24,
    fontWeight: '800',
    overflow: 'hidden',
  },
  numericBlock: {
    gap: Spacing.md,
  },
  numericInput: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  resultLine: {
    fontSize: 15,
    fontWeight: '600',
  },
  recordBanner: {
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  recordText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
