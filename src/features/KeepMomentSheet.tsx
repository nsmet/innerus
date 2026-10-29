import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { uuid } from 'expo';
import type { MomentSource } from '../navigation/types';
import type { Draft } from '../data/repository';
import { getTopic } from '../content/catalogue';
import type { Language } from '../content/types';
import { Icon } from '../design/Icon';
import { Button, NoteField, Sheet, StatusLine, TextBlock, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import { useAppStore } from '../state/AppStore';

/**
 * CONTRACT (owned by the Conversation builder):
 * "A little piece of us." typed-note sheet (design Sheet-moment). Saves a Moment linked to `source`
 * and calls `onSaved(momentId)`. Never advances or finishes the conversation. "Record an answer"
 * calls `onRecord` (the opener shows RecorderSheet).
 */
export type KeepMomentSheetProps = {
  visible: boolean;
  onClose: () => void;
  source: MomentSource;
  questionText?: string;
  onSaved: (momentId: string) => void;
  onRecord?: () => void;
};

/** A Moment's title: the first line or sentence of the note, trimmed to about 40 characters. */
export function momentTitle(text: string, language: Language): string {
  const first = text.trim().split(/\n/)[0]?.trim() ?? '';
  const sentence = (first.match(/^.*?[.!?…](\s|$)/)?.[0] ?? first).trim();
  if (!sentence) return language === 'nl' ? 'Een moment' : 'A moment';
  if (sentence.length <= 40) return sentence;
  const cut = sentence.slice(0, 40);
  const space = cut.lastIndexOf(' ');
  return `${(space > 20 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, '')}…`;
}

/** Turns an unfinished typed draft into a Moment (used when a flow has to resolve the draft). */
export async function keepDraftAsMoment(
  store: Pick<ReturnType<typeof useAppStore>, 'saveMoment' | 'repository'>,
  draft: Draft,
  topicId: string,
  language: Language,
) {
  const session = await store.repository?.getActiveSession();
  const topic = getTopic(topicId, session?.sessionId === draft.sessionId ? session.topicVersion : undefined);
  const prompt = topic?.prompts.find(p => p.id === draft.promptId);
  const question = prompt ? prompt.text[language] : draft.promptId === null && topic ? topic.closing[language] : null;
  await store.saveMoment({
    topicId, topicVersion: topic?.version ?? '1', promptId: draft.promptId, questionSnapshot: question,
    contentLanguage: language, title: momentTitle(draft.body, language), body: draft.body.trim(), source: 'typed', participantLabel: null,
  });
  await store.repository?.discardDraft(draft.sessionId);
}

/** Honest local save status ("Saved on this iPhone" / "Saved on this device"); no sync claim in this build. */
export function savedOnDeviceText(t: (v: { en: string; nl: string }) => string) {
  return Platform.OS === 'ios'
    ? t({ en: 'Saved on this iPhone', nl: 'Bewaard op deze iPhone' })
    : t({ en: 'Saved on this device', nl: 'Bewaard op dit apparaat' });
}

const DRAFT_DELAY = 600;

export function KeepMomentSheet({ visible, onClose, source, questionText, onSaved, onRecord }: KeepMomentSheetProps) {
  const { t, language } = useDesign();
  const { saveMoment, repository } = useAppStore();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const momentId = useRef(uuid.v4());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const savingRef = useRef(false);
  const sessionId = source.sessionId;

  // Each opening is a fresh save attempt; a typed draft from this session is restored.
  useEffect(() => {
    if (!visible) return;
    momentId.current = uuid.v4();
    setFailed(false);
    setSaving(false);
    savingRef.current = false;
    let cancelled = false;
    if (sessionId && repository) {
      repository.getDraft(sessionId)
        .then(draft => { if (!cancelled && draft?.body) setText(previous => previous || draft.body); })
        .catch(() => undefined);
    }
    return () => { cancelled = true; };
  }, [visible, sessionId, repository]);

  const writeDraft = useCallback(async (body: string) => {
    if (!sessionId || !repository) return;
    try {
      if (body.trim()) await repository.saveDraft({ sessionId, promptId: source.promptId, title: '', body });
      else await repository.discardDraft(sessionId);
    } catch { /* the text stays in the field; nothing claims it was saved */ }
  }, [sessionId, repository, source.promptId]);

  const flushDraft = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      const body = pending.current;
      pending.current = null;
      await writeDraft(body);
    }
  }, [writeDraft]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onChange = (value: string) => {
    setText(value);
    setFailed(false);
    if (!sessionId) return;
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flushDraft(); }, DRAFT_DELAY);
  };

  const close = async () => {
    await flushDraft();
    setText('');
    onClose();
  };

  const save = async () => {
    const body = text.trim();
    if (!body || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFailed(false);
    try {
      const topic = getTopic(source.topicId, source.topicVersion);
      const saved = await saveMoment({
        id: momentId.current,
        topicId: source.topicId,
        topicVersion: topic?.version ?? '1',
        promptId: source.promptId,
        questionSnapshot: questionText ?? null,
        contentLanguage: language,
        title: momentTitle(body, language),
        body,
        source: 'typed',
        participantLabel: null,
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pending.current = null;
      if (sessionId && repository) await repository.discardDraft(sessionId).catch(() => undefined);
      setText('');
      onSaved(saved.id);
    } catch {
      setFailed(true);
      // Keep the words safe as a draft so a later Close can still offer them back.
      await writeDraft(text);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const empty = text.trim().length === 0;
  return <Sheet visible={visible} onClose={() => { void close(); }} dismissable={!saving}>
    <View style={{ gap: spacing.xs }}>
      <TextBlock variant="title">{t({ en: 'A little piece of us.', nl: 'Een klein stukje van ons.' })}</TextBlock>
      <TextBlock variant="meta" secondary>{t({ en: 'One thing you would like to keep', nl: 'Iets wat je wilt bewaren' })}</TextBlock>
    </View>
    {questionText ? <FromCard question={questionText} /> : null}
    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="eyebrow" secondary>{t({ en: 'Your note', nl: 'Je notitie' })}</TextBlock>
      <NoteField value={text} onChangeText={onChange}
        label={t({ en: 'Your note', nl: 'Je notitie' })}
        placeholder={t({ en: 'A detail, a thought, a small idea...', nl: 'Een detail, een gedachte, een klein idee...' })} />
      {failed ? <StatusLine icon="warning" tone="destructive"
        text={t({ en: 'This could not be saved yet. Your draft is still here.', nl: 'Dit kon nog niet worden bewaard. Je concept staat er nog.' })} /> : null}
    </View>
    <View style={{ gap: spacing.md }}>
      <Button label={t({ en: 'Save this moment', nl: 'Bewaar dit moment' })} onPress={() => { void save(); }} loading={saving}
        disabled={empty} reason={t({ en: 'Write a few words to save this moment.', nl: 'Schrijf een paar woorden om dit moment te bewaren.' })} />
      {onRecord ? <Button variant="secondary" icon="mic" label={t({ en: 'Record an answer', nl: 'Neem een antwoord op' })} disabled={saving}
        onPress={() => { void flushDraft().then(onRecord); }} /> : null}
      <Button variant="quiet" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => { void close(); }} />
    </View>
  </Sheet>;
}

function FromCard({ question }: { question: string }) {
  const { palette, t } = useDesign();
  return <WarmCard style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md }}>
    <View style={{ paddingTop: 2 }}><Icon name="document" color={palette.secondary} size={16} /></View>
    <TextBlock variant="meta" secondary style={{ flex: 1 }}>
      {t({ en: 'From ', nl: 'Bij ' })}
      <TextBlock variant="voice" style={{ fontSize: 15, lineHeight: 20 }}>{question}</TextBlock>
    </TextBlock>
  </WarmCard>;
}
