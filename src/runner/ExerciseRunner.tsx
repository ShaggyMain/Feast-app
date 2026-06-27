/**
 * ExerciseRunner — the shared shell every exercise runs inside.
 *
 *  intro  → choose difficulty, see best score, read the method hint
 *  playing→ per-item countdown, multiple-choice or numeric input, optional
 *           figure, instant feedback (color + haptics), no penalty for wrong/blank
 *  done   → accuracy + speed score, compared to the previous best for that level
 *
 * Per-item state lives in <PlayItem>, remounted via `key` for each question so
 * timers and inputs reset cleanly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';

import type { Difficulty, ExerciseDef, ExerciseResult, GeneratedItem, ItemOutcome } from '@/types';
import { getExercise, getModule } from '@/data/registry';
import { gradeItem, summarize } from '@/runner/scoring';
import { buildSession } from '@/runner/session';
import { useResultsStore } from '@/store/results';
import { pickInitialLevel, sessionMultiplier, useSettingsStore } from '@/store/settings';
import { bestScore } from '@/store/selectors';
import { makeId } from '@/core/id';
import { playCue } from '@/core/sound';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/ui/Screen';
import { PrimaryButton } from '@/ui/PrimaryButton';
import { TimerBar } from '@/ui/TimerBar';
import { Stat } from '@/ui/Stat';
import { AppText } from '@/ui/Text';
import { SegmentedControl } from '@/ui/SegmentedControl';
import { Figure } from '@/ui/Figure';
import { useT } from '@/i18n/useT';

const FEEDBACK_MS = 650;

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];
const levelLabelKey = (l: Difficulty) => `level.${l}`;

function makeSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

type Phase = 'intro' | 'playing' | 'done';

export function ExerciseRunner({ exerciseId }: { exerciseId: string }) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  useKeepAwake();

  const def = useMemo(() => getExercise(exerciseId), [exerciseId]);
  const accent = useMemo(
    () => (def ? getModule(def.module)?.color : undefined) ?? theme.tint,
    [def, theme.tint],
  );
  const addResult = useResultsStore((s) => s.addResult);
  const results = useResultsStore((s) => s.results);
  const sessionLength = useSettingsStore((s) => s.sessionLength);

  const [level, setLevel] = useState<Difficulty>(() => pickInitialLevel(exerciseId));
  const [variant, setVariant] = useState<string | undefined>(() => def?.variant?.default);
  const [phase, setPhase] = useState<Phase>('intro');
  const [baseSeed, setBaseSeed] = useState(makeSeed);
  const [outcomes, setOutcomes] = useState<ItemOutcome[]>([]);
  const [savedResult, setSavedResult] = useState<ExerciseResult | null>(null);
  const prevBestRef = useRef(0);

  const total = def ? Math.max(4, Math.round(def.itemsPerSession * sessionMultiplier(sessionLength))) : 0;
  const timeLimitMs = def ? def.timePerItemSec * 1000 : 0;
  const index = outcomes.length;

  // Pre-build the whole session so prompts are de-duplicated and item types are
  // balanced (variety within a session); regenerated each run via baseSeed.
  const sessionItems = useMemo(
    () => (def && phase === 'playing' ? buildSession(def, baseSeed, level, variant, total) : []),
    [def, phase, baseSeed, level, variant, total],
  );
  const currentItem = phase === 'playing' && index < sessionItems.length ? sessionItems[index] : null;

  useEffect(() => {
    if (!def || phase !== 'playing' || savedResult || total === 0 || outcomes.length < total) return;
    const summary = summarize(outcomes, timeLimitMs);
    const result: ExerciseResult = {
      id: makeId(),
      module: def.module,
      exercise: def.id,
      level,
      date: new Date().toISOString(),
      totalItems: summary.totalItems,
      correct: summary.correct,
      accuracy: summary.accuracy,
      avgResponseMs: summary.avgResponseMs,
      score: summary.score,
    };
    addResult(result);
    setSavedResult(result);
    setPhase('done');
  }, [outcomes, phase, total, def, savedResult, timeLimitMs, addResult, level]);

  const handleItemComplete = useCallback((outcome: ItemOutcome) => {
    setOutcomes((prev) => [...prev, outcome]);
  }, []);

  const start = useCallback(() => {
    prevBestRef.current = def ? bestScore(useResultsStore.getState().results, def.id, level) : 0;
    setOutcomes([]);
    setSavedResult(null);
    setBaseSeed(makeSeed());
    setPhase('playing');
  }, [def, level]);

  if (!def) {
    return (
      <Screen>
        <AppText variant="title">{t('common.notFound')}</AppText>
        <PrimaryButton label={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <IntroView
        def={def}
        accent={accent}
        level={level}
        onLevel={setLevel}
        variant={variant}
        onVariant={setVariant}
        bestForLevel={bestScore(results, def.id, level)}
        onStart={start}
        onBack={() => router.back()}
      />
    );
  }

  if (phase === 'done' && savedResult) {
    return (
      <ResultsView
        result={savedResult}
        prevBest={prevBestRef.current}
        accent={accent}
        onRetry={start}
        onChangeLevel={() => setPhase('intro')}
        onBack={() => router.back()}
      />
    );
  }

  const correctSoFar = outcomes.filter((o) => o.correct).length;
  const sessionProgress = total ? index / total : 0;

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <AppText variant="caption">
          {t('runner.question', { i: Math.min(index + 1, total), n: total })}
        </AppText>
        <AppText variant="caption" color={theme.success}>
          ✓ {correctSoFar}
        </AppText>
      </View>
      <View style={[styles.sessionTrack, { backgroundColor: theme.surfaceAlt }]}>
        <View style={{ flex: sessionProgress, backgroundColor: accent }} />
        <View style={{ flex: 1 - sessionProgress }} />
      </View>

      {/* Edge-to-edge (SDK 56) means Android's adjustResize no longer insets the
          RN view for the soft keyboard, so the numeric input + Submit button used
          to sit hidden behind it. Lift them with JS-driven padding instead. */}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        {currentItem ? (
          <PlayItem
            key={`${baseSeed}-${index}`}
            item={currentItem}
            timeLimitMs={timeLimitMs}
            accent={accent}
            onComplete={handleItemComplete}
          />
        ) : (
          <View style={styles.flexCenter} />
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

// ---------------------------------------------------------------------------

function IntroView({
  def,
  accent,
  level,
  onLevel,
  variant,
  onVariant,
  bestForLevel,
  onStart,
  onBack,
}: {
  def: ExerciseDef;
  accent: string;
  level: Difficulty;
  onLevel: (l: Difficulty) => void;
  variant: string | undefined;
  onVariant: (v: string) => void;
  bestForLevel: number;
  onStart: () => void;
  onBack: () => void;
}) {
  const t = useT();
  const levelOptions = LEVELS.map((l) => ({ value: l, label: t(levelLabelKey(l)) }));
  return (
    <Screen>
      <AppText variant="title">{t(def.title)}</AppText>
      <AppText variant="bodyMuted">{t(def.description)}</AppText>

      <AppText variant="label" style={styles.introLabel}>
        {t('runner.levelLabel')}
      </AppText>
      <SegmentedControl value={level} options={levelOptions} onChange={onLevel} accent={accent} />

      {def.variant ? (
        <>
          <AppText variant="label" style={styles.introLabel}>
            {t(def.variant.label)}
          </AppText>
          <SegmentedControl
            value={variant ?? def.variant.default}
            options={def.variant.options.map((o) => ({ ...o, label: t(o.label) }))}
            onChange={onVariant}
            accent={accent}
          />
        </>
      ) : null}

      <View style={styles.statRow}>
        <Stat label={t('runner.bestLevel')} value={String(bestForLevel)} accent={accent} />
        <Stat label={t('runner.timePerQ')} value={`${def.timePerItemSec}s`} />
        <Stat label={t('runner.questions')} value={String(def.itemsPerSession)} />
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={t('common.start')} onPress={onStart} />
        <PrimaryButton label={t('common.back')} variant="ghost" onPress={onBack} />
      </View>
    </Screen>
  );
}

// ---------------------------------------------------------------------------

export interface PlayItemProps {
  item: GeneratedItem;
  timeLimitMs: number;
  accent: string;
  onComplete: (outcome: ItemOutcome) => void;
}

export function PlayItem({ item, timeLimitMs, accent, onComplete }: PlayItemProps) {
  const theme = useTheme();
  const t = useT();
  const hapticsOn = useSettingsStore((s) => s.haptics);
  const soundOn = useSettingsStore((s) => s.sound);
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

      if (hapticsOn && Platform.OS !== 'web') {
        Haptics.notificationAsync(
          graded.correct
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
      }
      if (soundOn) playCue(graded.answered ? (graded.correct ? 'correct' : 'wrong') : 'timeout');

      setOutcome(graded);
      setPhase('feedback');
      feedbackTimer.current = setTimeout(() => onComplete(graded), FEEDBACK_MS);
    },
    [item, timeLimitMs, onComplete, hapticsOn, soundOn],
  );

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

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

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
        {item.promptFigure ? (
          <Figure spec={item.promptFigure} accent={accent} size={item.promptFigure.type === 'net' ? 168 : 132} />
        ) : null}
        {item.figure ? <Figure spec={item.figure} accent={accent} /> : null}
        <Text style={[item.promptFigure ? styles.promptSmall : styles.prompt, { color: theme.text }]}>
          {item.prompt}
        </Text>
        {item.hint ? <Text style={[styles.hint, { color: theme.textSecondary }]}>{item.hint}</Text> : null}
      </View>

      {showFeedback ? (
        <Text style={[styles.feedback, { color: outcome?.correct ? theme.success : theme.danger }]}>
          {outcome?.correct
            ? t('runner.correct')
            : outcome?.answered
              ? t('runner.wrong', { ans: item.answerLabel })
              : t('runner.timeout', { ans: item.answerLabel })}
        </Text>
      ) : (
        <View style={styles.feedbackSpacer} />
      )}

      {item.mode === 'choice' && item.choices ? (
        item.choices.some((c) => c.figure) ? (
          <View style={styles.choiceGridVisual}>
            {item.choices.map((choice) => {
              const isCorrect = choice.id === item.correctChoiceId;
              const isChosen = choice.id === chosenId;
              let borderColor = theme.border;
              let bg = theme.surface;
              if (showFeedback && isCorrect) {
                borderColor = theme.success;
                bg = theme.surfaceAlt;
              } else if (showFeedback && isChosen) {
                borderColor = theme.danger;
                bg = theme.surfaceAlt;
              } else if (isChosen) {
                borderColor = accent;
              }
              return (
                <Pressable
                  key={choice.id}
                  onPress={() => onChoose(choice.id)}
                  style={[styles.choiceCard, { borderColor, backgroundColor: bg }]}>
                  {choice.figure ? <Figure spec={choice.figure} accent={theme.tint} size={116} /> : null}
                  <Text style={[styles.choiceBadge, { color: theme.textSecondary }]}>{choice.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
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
                  style={[styles.choice, { backgroundColor: bg, borderColor, color: labelColor }]}>
                  {choice.label}
                </Text>
              );
            })}
          </View>
        )
      ) : (
        <View style={styles.numericBlock}>
          <TextInput
            value={numericText}
            onChangeText={setNumericText}
            editable={!showFeedback}
            keyboardType="numbers-and-punctuation"
            inputMode="numeric"
            placeholder={t('runner.numericPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={onSubmitNumeric}
            returnKeyType="done"
            style={[
              styles.numericInput,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
            ]}
          />
          <PrimaryButton
            label={t('runner.submit')}
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
  accent,
  onRetry,
  onChangeLevel,
  onBack,
}: {
  result: ExerciseResult;
  prevBest: number;
  accent: string;
  onRetry: () => void;
  onChangeLevel: () => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const t = useT();
  const accuracyPct = Math.round(result.accuracy * 100);
  const avgSec = (result.avgResponseMs / 1000).toFixed(1);
  const isRecord = result.score > prevBest;
  const levelLabel = t(levelLabelKey(result.level));

  return (
    <Screen>
      <AppText variant="title">{t('runner.doneTitle')}</AppText>
      <AppText variant="caption">{t('runner.levelPrefix', { label: levelLabel })}</AppText>

      <View style={styles.statRow}>
        <Stat label={t('runner.score')} value={String(result.score)} accent={accent} />
        <Stat label={t('runner.accuracy')} value={`${accuracyPct}%`} />
        <Stat label={t('runner.avgTime')} value={`${avgSec}s`} />
      </View>

      <AppText variant="bodyMuted">
        {t('runner.correctOf', { c: result.correct, t: result.totalItems })}
      </AppText>

      <View
        style={[styles.recordBanner, { backgroundColor: isRecord ? theme.success : theme.surfaceAlt }]}>
        <Text
          style={[styles.recordText, { color: isRecord ? theme.successText : theme.textSecondary }]}>
          {isRecord
            ? t('runner.newRecord', { label: levelLabel, prev: prevBest })
            : t('runner.bestScore', { label: levelLabel, best: Math.max(prevBest, result.score) })}
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={t('common.retry')} onPress={onRetry} />
        <PrimaryButton label={t('common.changeLevel')} variant="secondary" onPress={onChangeLevel} />
        <PrimaryButton label={t('common.stats')} variant="ghost" onPress={() => router.push('/stats')} />
        <PrimaryButton label={t('common.back')} variant="ghost" onPress={onBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flexCenter: { flex: 1, gap: Spacing.lg },
  fill: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionTrack: { height: 6, borderRadius: Radius.pill, overflow: 'hidden', flexDirection: 'row' },
  introLabel: { marginTop: Spacing.sm },
  promptBlock: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  prompt: { fontSize: 38, fontWeight: '800', textAlign: 'center' },
  promptSmall: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, textAlign: 'center' },
  feedback: { fontSize: 16, fontWeight: '700', textAlign: 'center', minHeight: 22 },
  feedbackSpacer: { minHeight: 22 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md },
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
  choiceGridVisual: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.md },
  choiceCard: {
    width: '47%',
    flexGrow: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBadge: { position: 'absolute', top: 6, left: 10, fontSize: 13, fontWeight: '800' },
  numericBlock: { gap: Spacing.md },
  numericInput: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  recordBanner: { borderRadius: Radius.md, padding: Spacing.md },
  recordText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
});
