import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, View } from 'react-native';
import pkg from '../../package.json';
import { Icon } from '../design/Icon';
import { Button, ListGroup, ListRow, Screen, Sheet, SheetBadge, StatusLine, TextBlock, ToggleRow, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, spacing, typography } from '../design/tokens';
import type { StackProps } from '../navigation/types';
import { formatTrialEnd, useAccess } from '../platform/access';
import { AccessCard } from '../design/access';
import { topics } from '../content/catalogue';
import { useAppStore, type AppearancePref, type LanguagePref, type Prefs } from '../state/AppStore';
import { authenticateWithDevice, deviceSecurityAvailable } from '../features/AppLockGate';
import { ChoiceSheet, type Choice } from '../features/ChoiceSheet';
import { DeleteAllSheet } from '../features/DeleteAllSheet';
import { SyncSettingsSection } from '../features/SyncSettingsSection';
import { describeExportAll, shareAllMoments } from '../features/exportAll';
import { cancelReminders, formatReminderTime, getReminderPermission, reminderTimes, reminderWeekdays, scheduleReminder } from '../features/reminders';
import { getLocalProcessing, installModel, type LocalProcessing } from '../features/localProcessing';
import { PRIVACY_URL, SUPPORT_EMAIL, pageUrl, supportMailUrl } from '../content/links';

/** UI12 Settings (design "Settings", spec 22). Store-only ownership; iCloud section from SyncSettingsSection. */
type Picker = 'language' | 'recording' | 'appearance' | 'day' | 'time' | null;
type Line = { icon: Parameters<typeof StatusLine>[0]['icon']; text: string; tone?: 'secondary' | 'text' | 'destructive' } | null;

const ios = Platform.OS === 'ios';

function formatBytes(bytes: number, language: 'en' | 'nl') {
  const locale = language === 'nl' ? 'nl-BE' : 'en-GB';
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1_000)).toLocaleString(locale)} KB`;
}

export function SettingsScreen({ navigation }: StackProps<'Settings'>) {
  const { palette, t, language } = useDesign();
  const store = useAppStore();
  const { prefs, setPref, attachments, moments } = store;
  const { access, restore: restoreAccess } = useAccess();

  const [picker, setPicker] = useState<Picker>(null);
  const [lockLine, setLockLine] = useState<Line>(null);
  const [lockBusy, setLockBusy] = useState(false);
  const [reminderLine, setReminderLine] = useState<Line & { openSettings?: boolean } | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [restoreLine, setRestoreLine] = useState<Line>(null);
  const [restoring, setRestoring] = useState(false);
  const [audioSheet, setAudioSheet] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [audioLine, setAudioLine] = useState<Line>(null);
  const [exportSheet, setExportSheet] = useState(false);
  const [exportLine, setExportLine] = useState<Line>(null);
  const [exporting, setExporting] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [deletedLine, setDeletedLine] = useState<Line>(null);

  const device = ios ? t({ en: 'this iPhone', nl: 'deze iPhone' }) : t({ en: 'this device', nl: 'dit apparaat' });
  const onOff = { onLabel: t({ en: 'On', nl: 'Aan' }), offLabel: t({ en: 'Off', nl: 'Uit' }) };

  // ---- Choices --------------------------------------------------------------------------------
  const languageChoices: Choice<LanguagePref>[] = [
    { value: 'system', label: t({ en: 'Follow device', nl: 'Volg apparaat' }) },
    { value: 'en', label: 'English' },
    { value: 'nl', label: 'Nederlands' },
  ];
  const recordingChoices: Choice<Prefs['recordingLanguage']>[] = [
    { value: 'nl-BE', label: t({ en: 'Dutch (Belgium)', nl: 'Nederlands (België)' }) },
    { value: 'nl-NL', label: t({ en: 'Dutch (Netherlands)', nl: 'Nederlands (Nederland)' }) },
    { value: 'en-US', label: t({ en: 'English', nl: 'Engels' }) },
  ];
  const appearanceChoices: Choice<AppearancePref>[] = [
    { value: 'system', label: t({ en: 'System', nl: 'Systeem' }) },
    { value: 'light', label: t({ en: 'Light', nl: 'Licht' }) },
    { value: 'dark', label: t({ en: 'Dark', nl: 'Donker' }) },
  ];
  const dayChoices: Choice<number>[] = reminderWeekdays.map(d => ({ value: d.value, label: t(d) }));
  const timeChoices: Choice<number>[] = reminderTimes.map(m => ({ value: m, label: formatReminderTime(Math.floor(m / 60), m % 60) }));
  const labelOf = <T extends string | number>(choices: Choice<T>[], value: T) => choices.find(c => c.value === value)?.label ?? '';

  // ---- Reminders ------------------------------------------------------------------------------
  async function applyReminder(next: Prefs['reminders'], lang = language) {
    setReminderBusy(true);
    setReminderLine(null);
    const result = await scheduleReminder(next, lang);
    setReminderBusy(false);
    if (result === 'scheduled') {
      await setPref('reminders', { ...next, enabled: true });
      return;
    }
    await setPref('reminders', { ...next, enabled: false });
    setReminderLine(result === 'denied'
      ? { icon: 'bell', openSettings: true, text: ios
        ? t({ en: 'Notifications are off for InnerUs. You can allow them in Settings.', nl: 'Meldingen staan uit voor InnerUs. Je kunt ze toestaan in Instellingen.' })
        : t({ en: 'Notifications are off for InnerUs. You can allow them in the system settings.', nl: 'Meldingen staan uit voor InnerUs. Je kunt ze toestaan in de systeeminstellingen.' }) }
      : { icon: 'warning', text: t({ en: 'The reminder could not be set. Try again.', nl: 'De herinnering kon niet worden ingesteld. Probeer het opnieuw.' }) });
  }

  // Back from the system settings after a denial: if notifications are now allowed, turn the reminder on.
  const reminderRetry = useRef(false);
  reminderRetry.current = !!reminderLine?.openSettings;
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active' || !reminderRetry.current) return;
      void getReminderPermission().then(p => { if (p === 'granted') void applyReminder(prefs.reminders); });
    });
    return () => sub.remove();
  });

  async function toggleReminders(on: boolean) {
    if (on) { await applyReminder(prefs.reminders); return; }
    await cancelReminders();
    setReminderLine(null);
    await setPref('reminders', { ...prefs.reminders, enabled: false });
  }

  async function chooseReminder(change: Partial<Prefs['reminders']>) {
    const next = { ...prefs.reminders, ...change };
    if (prefs.reminders.enabled) await applyReminder(next);
    else await setPref('reminders', next);
  }

  // ---- App lock -------------------------------------------------------------------------------
  async function toggleLock(on: boolean) {
    setLockLine(null);
    if (!on) { await setPref('appLock', false); return; }
    setLockBusy(true);
    if (!(await deviceSecurityAvailable())) {
      setLockBusy(false);
      setLockLine({ icon: 'lock', text: t({ en: `App lock is unavailable. Set a passcode on ${device} first.`, nl: `App-vergrendeling is niet beschikbaar. Stel eerst een toegangscode in op ${device}.` }) });
      return;
    }
    const ok = await authenticateWithDevice(t({ en: 'Turn on App lock', nl: 'Zet app-vergrendeling aan' }), t({ en: 'Cancel', nl: 'Annuleren' }));
    setLockBusy(false);
    if (ok) await setPref('appLock', true);
    else setLockLine({ icon: 'lock', text: t({ en: 'App lock stays off. It turns on after one successful unlock.', nl: 'App-vergrendeling blijft uit. Die gaat pas aan na één geslaagde ontgrendeling.' }) });
  }

  // ---- Storage --------------------------------------------------------------------------------
  const audio = attachments.filter(a => a.kind === 'audio');
  const audioBytes = audio.reduce((sum, a) => sum + (a.bytes || 0), 0);

  async function removeAllAudio() {
    setAudioBusy(true);
    setAudioLine(null);
    let failed = 0;
    for (const attachment of audio) {
      try { await store.removeAttachment(attachment); } catch { failed += 1; }
    }
    setAudioBusy(false);
    setAudioSheet(false);
    setAudioLine(failed
      ? { icon: 'warning', text: t({ en: 'Some recordings could not be removed. Try again.', nl: 'Sommige opnames konden niet worden verwijderd. Probeer het opnieuw.' }) }
      : { icon: 'check', text: t({ en: 'Recordings removed. Your written notes stay.', nl: 'Opnames verwijderd. Je geschreven notities blijven.' }) });
  }

  // ---- Purchases ------------------------------------------------------------------------------
  async function restore() {
    setRestoring(true);
    setRestoreLine(null);
    const outcome = await restoreAccess();
    setRestoring(false);
    if (outcome === 'restored') {
      setRestoreLine({ icon: 'refresh', tone: 'text', text: t({ en: 'Purchases restored. Your conversations are ready.', nl: 'Aankopen hersteld. Je gesprekken staan klaar.' }) });
    } else if (outcome === 'trial-restored') {
      setRestoreLine({ icon: 'refresh', tone: 'text', text: t({ en: 'Your free week was already started with this account.', nl: 'Je gratis week was al gestart met dit account.' }) });
    } else if (outcome === 'nothing') {
      setRestoreLine({ icon: 'refresh', text: ios
        ? t({ en: 'No earlier purchase was found for this Apple Account.', nl: 'Er is geen eerdere aankoop gevonden voor dit Apple-account.' })
        : t({ en: 'No earlier purchase was found for this Google account.', nl: 'Er is geen eerdere aankoop gevonden voor dit Google-account.' }) });
    } else {
      setRestoreLine({ icon: 'warning', text: t({ en: 'The store could not be reached. Try again later.', nl: 'De winkel is niet bereikbaar. Probeer het later opnieuw.' }) });
    }
  }

  // ---- Export ---------------------------------------------------------------------------------
  async function runExport() {
    setExporting(true);
    setExportLine(null);
    const result = await shareAllMoments(moments, attachments, language, { attachmentUri: store.attachmentUri });
    setExporting(false);
    setExportSheet(false);
    if (result === 'unavailable') setExportLine({ icon: 'warning', text: t({ en: `Sharing is not available on ${device}.`, nl: `Delen is niet beschikbaar op ${device}.` }) });
    if (result === 'no-space') setExportLine({ icon: 'warning', text: t({ en: 'There is not enough space to create this export.', nl: 'Er is niet genoeg ruimte om deze export te maken.' }) });
    if (result === 'failed') setExportLine({ icon: 'warning', text: t({ en: 'The export could not be created. Nothing was shared.', nl: 'De export kon niet worden gemaakt. Er is niets gedeeld.' }) });
  }

  const pickerProps = (() => {
    switch (picker) {
      case 'language': return { title: t({ en: 'App language', nl: 'Taal van de app' }), options: languageChoices, selected: prefs.language as string | number,
        onSelect: (v: string | number) => { const value = v as LanguagePref; void setPref('language', value).then(() => {
          // Keep a scheduled reminder's neutral text in the new language.
          if (prefs.reminders.enabled) void scheduleReminder(prefs.reminders, value === 'system' ? language : value);
        }); } };
      case 'recording': return { title: t({ en: 'Recording language', nl: 'Opnametaal' }), options: recordingChoices, selected: prefs.recordingLanguage as string | number,
        onSelect: (v: string | number) => { void setPref('recordingLanguage', v as Prefs['recordingLanguage']); } };
      case 'appearance': return { title: t({ en: 'Appearance', nl: 'Weergave' }), options: appearanceChoices, selected: prefs.appearance as string | number,
        onSelect: (v: string | number) => { void setPref('appearance', v as AppearancePref); } };
      case 'day': return { title: t({ en: 'Reminder day', nl: 'Dag van de herinnering' }), options: dayChoices, selected: prefs.reminders.weekday as string | number,
        onSelect: (v: string | number) => { void chooseReminder({ weekday: Number(v) }); } };
      case 'time': return { title: t({ en: 'Reminder time', nl: 'Tijd van de herinnering' }), options: timeChoices, selected: (prefs.reminders.hour * 60 + prefs.reminders.minute) as string | number,
        onSelect: (v: string | number) => { const m = Number(v); void chooseReminder({ hour: Math.floor(m / 60), minute: m % 60 }); } };
      default: return null;
    }
  })();

  const reminderDay = reminderWeekdays.find(d => d.value === prefs.reminders.weekday);

  return <Screen header={<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, gap: spacing.md }}>
    <TextBlock variant="display" style={{ flexShrink: 1 }}>{t({ en: 'Settings', nl: 'Instellingen' })}</TextBlock>
    <Pressable accessibilityRole="button" accessibilityLabel={t({ en: 'Done', nl: 'Klaar' })} onPress={() => navigation.goBack()} hitSlop={6}
      style={({ pressed }) => ({ minHeight: geometry.touch, minWidth: geometry.touch, alignItems: 'flex-end', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <TextBlock variant="label" style={{ fontWeight: '600' }}>{t({ en: 'Done', nl: 'Klaar' })}</TextBlock>
    </Pressable>
  </View>}>
    <WarmCard style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md }}>
      <Icon name="shield" color={palette.text} />
      <TextBlock variant="meta" style={{ flex: 1 }}>
        <TextBlock variant="meta" style={{ fontWeight: '600' }}>{t({ en: 'No InnerUs account.', nl: 'Geen InnerUs-account.' })}</TextBlock>{' '}
        {ios
          ? t({ en: 'AI processing stays on this iPhone. Saved items can sync through your iCloud.', nl: 'AI-verwerking gebeurt op deze iPhone. Bewaarde items kunnen via je iCloud synchroniseren.' })
          : t({ en: 'Your moments stay on this device.', nl: 'Je momenten blijven op dit apparaat.' })}
      </TextBlock>
    </WarmCard>

    <ListGroup title={t({ en: 'Language', nl: 'Taal' })}>
      <ListRow icon="globe" title={t({ en: 'App language', nl: 'Taal van de app' })} value={labelOf(languageChoices, prefs.language)} onPress={() => setPicker('language')} />
      <ListRow icon="mic" title={t({ en: 'Recording language', nl: 'Opnametaal' })} value={labelOf(recordingChoices, prefs.recordingLanguage)} onPress={() => setPicker('recording')} />
    </ListGroup>

    <SpeechSection />

    <ListGroup title={t({ en: 'Appearance', nl: 'Weergave' })}>
      <ListRow icon="moon" title={t({ en: 'Appearance', nl: 'Weergave' })} value={labelOf(appearanceChoices, prefs.appearance)} onPress={() => setPicker('appearance')} />
    </ListGroup>

    <SyncSettingsSection onHowItWorks={() => navigation.navigate('Help', { topic: 'data' })} />

    <View style={{ gap: spacing.sm }}>
      <ListGroup title={t({ en: 'Privacy and reminders', nl: 'Privacy en herinneringen' })}>
        <ToggleRow icon="lock" title={t({ en: 'App lock', nl: 'App-vergrendeling' })} {...onOff}
          detail={ios ? t({ en: 'Face ID or device passcode', nl: 'Face ID of toegangscode' }) : t({ en: 'Fingerprint, face or screen lock', nl: 'Vingerafdruk, gezicht of schermvergrendeling' })}
          value={prefs.appLock} disabled={lockBusy} onChange={on => { void toggleLock(on); }} />
        <ToggleRow icon="bell" title={t({ en: 'Reminders', nl: 'Herinneringen' })} {...onOff}
          detail={t({ en: 'Reminders are optional.', nl: 'Herinneringen zijn optioneel.' })}
          value={prefs.reminders.enabled} disabled={reminderBusy} onChange={on => { void toggleReminders(on); }} />
        {prefs.reminders.enabled ? <ListRow icon="clock" title={t({ en: 'Day', nl: 'Dag' })} value={reminderDay ? t(reminderDay) : ''} onPress={() => setPicker('day')} /> : null}
        {prefs.reminders.enabled ? <ListRow icon="clock" title={t({ en: 'Time', nl: 'Tijd' })} value={formatReminderTime(prefs.reminders.hour, prefs.reminders.minute)} onPress={() => setPicker('time')} /> : null}
      </ListGroup>
      {lockLine ? <WarmCard style={{ paddingVertical: spacing.md }}><StatusLine icon={lockLine.icon} tone="text" text={lockLine.text} /></WarmCard> : null}
      {prefs.reminders.enabled ? <TextBlock variant="supporting" secondary>
        {t({ en: 'A neutral note, “A little time for each other?”, once a week. It never mentions a topic or an answer.', nl: 'Een neutraal berichtje, “Even tijd voor elkaar?”, één keer per week. Het noemt nooit een onderwerp of antwoord.' })}
      </TextBlock> : null}
      {reminderLine ? <View style={{ gap: spacing.xs }}>
        <StatusLine icon={reminderLine.icon} text={reminderLine.text} />
        {reminderLine.openSettings ? <View style={{ alignSelf: 'flex-start' }}>
          <Button variant="quiet" label={t({ en: 'Open Settings', nl: 'Open instellingen' })} onPress={() => { void Linking.openSettings(); }} />
        </View> : null}
      </View> : null}
    </View>

    <View style={{ gap: spacing.sm }}>
      <ListGroup title={t({ en: 'Storage', nl: 'Opslag' })}>
        <ListRow icon="database" title={t({ en: 'Saved audio', nl: 'Bewaarde audio' })}
          detail={t({ en: 'Remove recordings and keep written notes', nl: 'Verwijder opnames, behoud geschreven notities' })}
          value={audio.length ? formatBytes(audioBytes, language) : t({ en: 'None', nl: 'Geen' })}
          onPress={audio.length ? () => setAudioSheet(true) : undefined} />
      </ListGroup>
      {audioLine ? <StatusLine icon={audioLine.icon} text={audioLine.text} /> : null}
    </View>

    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="eyebrow" secondary style={{ marginLeft: 4, marginTop: 6 }}>{t({ en: 'Purchases', nl: 'Aankopen' })}</TextBlock>
      {access.state === 'checking'
        ? <StatusLine icon="clock" text={t({ en: 'Checking your purchases…', nl: 'Je aankopen controleren…' })} />
        : <AccessCard freeCount={topics.filter(x => x.access === 'free').length} totalCount={topics.length}
          art={access.state === 'new' ? 'garden' : access.state === 'trial' ? 'window' : 'cafe'}
          state={access.state === 'trial' ? { kind: 'trial', day: access.day, daysLeft: access.daysLeft, endsLabel: formatTrialEnd(access.endsAt, language) }
            : access.state === 'owned' ? { kind: 'owned', legacy: access.source === 'legacy' } : { kind: access.state }}
          onAction={() => navigation.navigate('Paywall', {})} />}
      <ListGroup>
        <ListRow icon="refresh" title={restoring ? t({ en: 'Restoring…', nl: 'Herstellen…' }) : t({ en: 'Restore purchases', nl: 'Herstel aankopen' })}
          disabled={restoring} onPress={() => { void restore(); }} />
        {access.state === 'owned' && access.source === 'legacy'
          ? <ListRow icon="share" title={t({ en: 'Earlier subscription', nl: 'Vorig abonnement' })}
            detail={t({ en: `If it still renews, you can cancel it in ${ios ? 'the App Store' : 'Google Play'}. The collection stays yours.`, nl: `Wordt het nog verlengd, dan kun je het opzeggen in ${ios ? 'de App Store' : 'Google Play'}. De collectie blijft van jou.` })}
            onPress={() => { void Linking.openURL(ios ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account').catch(() => undefined); }} />
          : null}
      </ListGroup>
      {restoreLine ? <StatusLine icon={restoreLine.icon} tone={restoreLine.tone ?? 'secondary'} text={restoreLine.text} /> : null}
    </View>

    <View style={{ gap: spacing.sm }}>
      <ListGroup title={t({ en: 'Privacy and help', nl: 'Privacy en hulp' })}>
        <ListRow icon="shield" title={t({ en: 'Where your data goes', nl: 'Waar je gegevens naartoe gaan' })} onPress={() => navigation.navigate('Help', { topic: 'data' })} />
        <ListRow icon="download" title={t({ en: 'Export all', nl: 'Alles exporteren' })}
          detail={moments.length ? undefined : t({ en: 'No moments to export yet.', nl: 'Nog geen momenten om te exporteren.' })}
          disabled={!moments.length} onPress={() => setExportSheet(true)} />
        <ListRow icon="document" title={t({ en: 'Privacy policy', nl: 'Privacybeleid' })} accessibilityHint={t({ en: 'Opens in your browser', nl: 'Opent in je browser' })}
          onPress={() => { void Linking.openURL(pageUrl(PRIVACY_URL, language)).catch(() => undefined); }} />
        <ListRow icon="help" title={t({ en: 'Help and contact', nl: 'Hulp en contact' })} onPress={() => navigation.navigate('Help', { topic: 'how' })} />
        <ListRow icon="pen" title={t({ en: 'Email us', nl: 'Mail ons' })} value={SUPPORT_EMAIL}
          onPress={() => { void Linking.openURL(supportMailUrl(pkg.version)).catch(() => undefined); }} />
        <ListRow icon="trash" destructive title={t({ en: 'Delete all private app content', nl: 'Verwijder alle persoonlijke app-inhoud' })} onPress={() => { setDeletedLine(null); setDeleteSheet(true); }} />
      </ListGroup>
      {exportLine ? <StatusLine icon={exportLine.icon} text={exportLine.text} /> : null}
      {deletedLine ? <StatusLine icon={deletedLine.icon} tone="text" text={deletedLine.text} /> : null}
    </View>

    <View style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md }}>
      <TextBlock variant="rowTitle" secondary>Inner<TextBlock variant="rowTitle" secondary style={{ fontFamily: typography.invitation.fontFamily }}>Us</TextBlock></TextBlock>
      <TextBlock variant="supporting" secondary center>
        {t({ en: `Version ${pkg.version} · No InnerUs account`, nl: `Versie ${pkg.version} · Geen InnerUs-account` })}
      </TextBlock>
    </View>

    {pickerProps ? <ChoiceSheet visible title={pickerProps.title} options={pickerProps.options as Choice<string | number>[]} selected={pickerProps.selected}
      onClose={() => setPicker(null)} onSelect={value => { setPicker(null); pickerProps.onSelect(value); }} /> : null}

    <Sheet visible={audioSheet} onClose={() => { if (!audioBusy) setAudioSheet(false); }} dismissable={!audioBusy}>
      <SheetBadge icon="database" />
      <TextBlock variant="title">{t({ en: 'Remove saved audio?', nl: 'Bewaarde audio verwijderen?' })}</TextBlock>
      <TextBlock variant="body" secondary>
        {t({
          en: `This removes ${audio.length === 1 ? '1 recording' : `${audio.length} recordings`} (${formatBytes(audioBytes, 'en')}) from ${device}. Your Moments and written notes stay. This cannot be undone.`,
          nl: `Dit verwijdert ${audio.length === 1 ? '1 opname' : `${audio.length} opnames`} (${formatBytes(audioBytes, 'nl')}) van ${device}. Je momenten en geschreven notities blijven. Dit kan niet ongedaan worden gemaakt.`,
        })}
      </TextBlock>
      <View style={{ gap: spacing.md }}>
        <Button variant="destructiveFilled" icon="trash" label={t({ en: 'Remove recordings', nl: 'Verwijder opnames' })} loading={audioBusy} onPress={() => { void removeAllAudio(); }} />
        <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} disabled={audioBusy} onPress={() => setAudioSheet(false)} />
      </View>
    </Sheet>

    <Sheet visible={exportSheet} onClose={() => { if (!exporting) setExportSheet(false); }} dismissable={!exporting}>
      <SheetBadge icon="share" />
      <TextBlock variant="title">{t({ en: 'Export all', nl: 'Alles exporteren' })}</TextBlock>
      <TextBlock variant="body">{t({ en: 'Exports create a copy outside InnerUs. Choose what you want to share.', nl: 'Een export maakt een kopie buiten InnerUs. Kies wat je wilt delen.' })}</TextBlock>
      <TextBlock variant="supporting" secondary>{describeExportAll(moments, attachments, language, { attachmentUri: store.attachmentUri })}</TextBlock>
      <View style={{ gap: spacing.md }}>
        <Button icon="share" label={t({ en: 'Choose where to share', nl: 'Kies waar je wilt delen' })} loading={exporting} onPress={() => { void runExport(); }} />
        <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} disabled={exporting} onPress={() => setExportSheet(false)} />
      </View>
    </Sheet>

    <DeleteAllSheet visible={deleteSheet} onClose={() => setDeleteSheet(false)}
      onDeleted={() => setDeletedLine({ icon: 'check', text: t({ en: 'All private app content was deleted from this device.', nl: 'Alle persoonlijke app-inhoud is van dit apparaat verwijderd.' }) })} />
  </Screen>;
}

/**
 * "Speech on this iPhone" (spec 25–28): honest transcription and short-memory readiness for the
 * recording language, an explicit model download where iOS offers one, and the
 * "Draft memory after recording" preference. Never processes personal content.
 */
function SpeechSection() {
  const { t } = useDesign();
  const { prefs, setPref } = useAppStore();
  const [caps, setCaps] = useState<LocalProcessing | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState<Line>(null);
  const job = useRef<AbortController | null>(null);
  const languageTag = prefs.recordingLanguage;
  const device = ios ? t({ en: 'this iPhone', nl: 'deze iPhone' }) : t({ en: 'this device', nl: 'dit apparaat' });
  const onOff = { onLabel: t({ en: 'On', nl: 'Aan' }), offLabel: t({ en: 'Off', nl: 'Uit' }) };

  const refresh = useCallback(async () => { setCaps(await getLocalProcessing(languageTag)); }, [languageTag]);
  useEffect(() => { setCaps(null); setLine(null); void refresh(); }, [refresh]);
  useEffect(() => () => job.current?.abort(), []);

  async function download() {
    const controller = new AbortController();
    job.current = controller;
    setInstalling(true);
    setProgress(0);
    setLine(null);
    const outcome = await installModel(languageTag, { onProgress: setProgress, signal: controller.signal });
    setInstalling(false);
    job.current = null;
    if (outcome === 'installed') setLine({ icon: 'check', text: t({ en: `Language support is ready on ${device}.`, nl: `Taalondersteuning staat klaar op ${device}.` }) });
    else if (outcome === 'failed') setLine({ icon: 'warning', text: t({ en: 'The download did not finish. You can try again later.', nl: 'De download is niet afgerond. Je kunt het later opnieuw proberen.' }) });
    await refresh();
  }

  const percent = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
  const denied = caps?.authorization === 'denied' || caps?.authorization === 'restricted';

  const speechValue = !caps ? t({ en: 'Checking…', nl: 'Controleren…' })
    : installing ? percent
    : denied ? t({ en: 'Off', nl: 'Uit' })
    : caps.transcription === 'ready' ? t({ en: 'Ready', nl: 'Klaar' })
    : caps.transcription === 'needs-download' ? t({ en: 'Needs a download', nl: 'Download nodig' })
    : caps.transcription === 'downloading' ? t({ en: 'Downloading', nl: 'Wordt gedownload' })
    : t({ en: 'Not available', nl: 'Niet beschikbaar' });

  const speechDetail = !caps ? undefined
    : !ios ? t({ en: 'Not yet available on Android. Recording, playback and writing work fully.', nl: 'Nog niet beschikbaar op Android. Opnemen, afspelen en schrijven werken volledig.' })
    : denied ? t({ en: 'Speech recognition is off for InnerUs. Tap to open Settings.', nl: 'Spraakherkenning staat uit voor InnerUs. Tik om Instellingen te openen.' })
    : caps.transcriptionDetail === 'unsupported-language' ? t({ en: 'Not available for this recording language here. You can choose another one.', nl: 'Hier niet beschikbaar voor deze opnametaal. Je kunt een andere kiezen.' })
    : caps.transcriptionDetail === 'unsupported-device' || caps.transcriptionDetail === 'unavailable' ? t({ en: `Not supported on ${device}. You can keep recordings or write notes.`, nl: `Niet ondersteund op ${device}. Je kunt opnames bewaren of notities schrijven.` })
    : t({ en: 'Turns your selected recording into editable text on this device.', nl: 'Zet je gekozen opname om naar bewerkbare tekst op dit apparaat.' });

  const summaryValue = !caps ? t({ en: 'Checking…', nl: 'Controleren…' })
    : caps.summary === 'ready' ? t({ en: 'Ready', nl: 'Klaar' })
    : caps.summaryDetail === 'disabled-by-user' ? t({ en: 'Off', nl: 'Uit' })
    : caps.summary === 'downloading' ? t({ en: 'Preparing', nl: 'Wordt voorbereid' })
    : t({ en: 'Not available', nl: 'Niet beschikbaar' });

  const summaryDetail = !caps ? undefined
    : caps.summary === 'ready' ? t({ en: 'A draft you always review before saving.', nl: 'Een voorstel dat je altijd nakijkt voor het bewaren.' })
    : caps.summaryDetail === 'disabled-by-user' ? t({ en: 'Apple Intelligence is turned off in Settings.', nl: 'Apple Intelligence staat uit in Instellingen.' })
    : caps.summaryDetail === 'unsupported-language' ? t({ en: 'Not available for this recording language here.', nl: 'Hier niet beschikbaar voor deze opnametaal.' })
    : caps.summary === 'downloading' ? t({ en: `The on-device model is still being prepared by ${device}.`, nl: `Het model wordt nog voorbereid op ${device}.` })
    : t({ en: `A local summary is not available on ${device} right now. You can still keep a note or recording.`, nl: `Een lokale samenvatting is nu niet beschikbaar op ${device}. Je kunt wel een notitie of opname bewaren.` });

  const bothReady = !!caps && caps.canTranscribe && caps.canSummarize;
  const canDownload = ios && !!caps && !denied && caps.transcription === 'needs-download' && caps.canDownloadModel;

  return <View style={{ gap: spacing.sm }}>
    <ListGroup title={ios ? t({ en: 'Speech on this iPhone', nl: 'Spraak op deze iPhone' }) : t({ en: 'Speech on this device', nl: 'Spraak op dit apparaat' })}>
      <ListRow icon="mic" title={t({ en: 'Speech to text', nl: 'Spraak naar tekst' })} value={speechValue} detail={speechDetail}
        onPress={denied ? () => { void Linking.openSettings(); } : undefined} />
      {canDownload || installing
        ? <ListRow icon="download" title={installing ? t({ en: 'Cancel the download', nl: 'Annuleer de download' }) : t({ en: 'Download language support', nl: 'Download taalondersteuning' })}
          detail={t({ en: 'Model setup can use the internet. Your recordings never do.', nl: 'Het installeren van een model kan internet gebruiken. Je opnames nooit.' })}
          onPress={installing ? () => job.current?.abort() : () => { void download(); }} />
        : null}
      {ios ? <ListRow icon="document" title={t({ en: 'Short memory', nl: 'Korte herinnering' })} value={summaryValue} detail={summaryDetail} /> : null}
      {ios ? <ToggleRow icon="refresh" title={t({ en: 'Draft memory after recording', nl: 'Herinnering voorstellen na een opname' })} {...onOff}
        detail={bothReady
          ? t({ en: 'Starts right after you stop recording. You always review before saving.', nl: 'Begint meteen nadat je de opname stopt. Je kijkt alles altijd na voor het bewaren.' })
          : t({ en: `Available when speech to text and a short memory are both ready on ${device}.`, nl: `Beschikbaar wanneer spraak naar tekst en een korte herinnering allebei klaarstaan op ${device}.` })}
        value={prefs.autoDraftMemory} disabled={!bothReady && !prefs.autoDraftMemory}
        onChange={value => { void setPref('autoDraftMemory', value); }} /> : null}
    </ListGroup>
    {line ? <StatusLine icon={line.icon} tone="text" text={line.text} /> : null}
  </View>;
}
