import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Sheet, SheetBadge, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import type { Routes } from '../navigation/types';
import { useAppStore } from '../state/AppStore';
import { cleanUpRecordingDrafts, discardRecordingDraft, draftUri, type RecordingDraft } from './recordingDrafts';

/** Offered once per app launch, so "Stay here" is respected until the next launch. */
let offeredThisLaunch = false;

/**
 * Recovers an unresolved recording from an earlier session (design Sheet-draft, spec 24).
 * Keep draft opens it for review (it still expires 24 hours after capture stopped), Discard draft
 * removes it, Stay here leaves it for later. Expired drafts are cleaned up whenever the app becomes
 * active, never while their review is open.
 */
export function RecordingDraftPrompt() {
  const { t } = useDesign();
  const { privateDirectory } = useAppStore();
  const navigation = useNavigation<NativeStackNavigationProp<Routes>>();
  const [draft, setDraft] = useState<RecordingDraft | null>(null);

  const device = Platform.OS === 'ios' ? { en: 'this iPhone', nl: 'deze iPhone' } : { en: 'this device', nl: 'dit apparaat' };

  const check = useCallback((offer: boolean) => {
    if (!privateDirectory) return;
    const waiting = cleanUpRecordingDrafts(privateDirectory);
    if (offer && !offeredThisLaunch && waiting.length) {
      offeredThisLaunch = true;
      setDraft(waiting[0]);
    }
  }, [privateDirectory]);

  useEffect(() => { check(true); }, [check]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') check(false); });
    return () => subscription.remove();
  }, [check]);

  if (!draft || !privateDirectory) return null;

  const keep = () => {
    const current = draft;
    setDraft(null);
    navigation.navigate('Review', { uri: draftUri(privateDirectory, current), durationMs: current.durationMs, source: current.source });
  };

  const discard = () => {
    discardRecordingDraft(privateDirectory, draft);
    setDraft(null);
  };

  return <Sheet visible onClose={() => setDraft(null)}>
    <SheetBadge icon="mic" />
    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="title">{t({
        en: `An unfinished recording is on ${device.en}.`,
        nl: `Er staat een onvoltooide opname op ${device.nl}.`,
      })}</TextBlock>
      <TextBlock variant="meta" secondary>{t({
        en: 'Recording drafts expire after 24 hours and are removed at the next app cleanup. Save what you want to keep.',
        nl: 'Opnameconcepten vervallen na 24 uur en worden bij de volgende opruiming in de app verwijderd. Bewaar wat je wilt houden.',
      })}</TextBlock>
    </View>
    <View style={{ gap: spacing.md }}>
      <Button label={t({ en: 'Keep draft', nl: 'Bewaar concept' })} onPress={keep} />
      <Button variant="secondary" label={t({ en: 'Discard draft', nl: 'Verwijder concept' })} onPress={discard} />
      <Button variant="quiet" underline label={t({ en: 'Stay here', nl: 'Blijf hier' })} onPress={() => setDraft(null)} />
    </View>
  </Sheet>;
}
