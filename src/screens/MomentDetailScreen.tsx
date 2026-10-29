import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';
import { File } from 'expo-file-system';
import { getTopic } from '../content/catalogue';
import type { Language } from '../content/types';
import type { Attachment, MomentConflict } from '../data/repository';
import { Icon, type IconName } from '../design/Icon';
import { EmptyState, formatClip } from '../design/patterns';
import {
  BackHeader, Button, Divider, Eyebrow, NoteField, Screen, Sheet, StatusLine, TextBlock, WarmCard,
} from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, radius, shadow, spacing, typography } from '../design/tokens';
import { AudioPlayer } from '../features/AudioPlayer';
import { momentSyncLine } from '../features/SyncSettingsSection';
import type { StackProps } from '../navigation/types';
import { useAppStore } from '../state/AppStore';

const languageNames: Record<Language, { en: string; nl: string }> = {
  en: { en: 'English', nl: 'Engels' },
  nl: { en: 'Dutch', nl: 'Nederlands' },
};

/**
 * UI10 Moment detail: saved words exactly as kept, question, retained audio (with iCloud download
 * states), sync status, the "two versions" choice, edit / delete (spec 21/32-34).
 */
export function MomentDetailScreen({ route, navigation }: StackProps<'MomentDetail'>) {
  const { palette, t, language } = useDesign();
  const { moments, attachments, conflicts, sync, momentSyncState, updateMoment, deleteMoment, removeAttachment, keepThisVersion, useOtherVersion } = useAppStore();
  const moment = moments.find(m => m.id === route.params.momentId);
  const audio = attachments.find(a => a.momentId === route.params.momentId && a.kind === 'audio');
  const transcript = attachments.find(a => a.momentId === route.params.momentId && a.kind === 'transcript');
  const conflict = conflicts.find(c => c.momentId === route.params.momentId) ?? null;

  const [editing, setEditing] = useState(false);
  const [baseVersion, setBaseVersion] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<'conflict' | 'failed' | null>(null);
  const [sheet, setSheet] = useState<'deleteMoment' | 'deleteAudio' | 'versions' | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const ios = Platform.OS === 'ios';
  const device = ios ? { en: 'this iPhone', nl: 'deze iPhone' } : { en: 'this device', nl: 'dit apparaat' };
  const syncing = ios && sync.supported && sync.enabled;
  const back = () => navigation.goBack();
  const backLabel = t({ en: 'Moments', nl: 'Momenten' });

  if (deleted) return <Screen>{null}</Screen>;
  if (!moment) {
    return <Screen header={<BackHeader label={backLabel} onBack={back} />}>
      <EmptyState title={t({ en: 'This moment is no longer here.', nl: 'Dit moment is er niet meer.' })}
        detail={t({ en: 'It may have been deleted.', nl: 'Het is misschien verwijderd.' })}
        action={{ label: backLabel, onPress: back }} />
    </Screen>;
  }

  const topic = getTopic(moment.topicId);
  const questionNumber = moment.promptId ? Number.parseInt(moment.promptId.split('-').pop() ?? '', 10) : NaN;
  const eyebrow = [topic?.title[language], Number.isFinite(questionNumber) ? `${t({ en: 'Question', nl: 'Vraag' })} ${questionNumber}` : null].filter(Boolean).join(' · ');
  const date = new Date(moment.createdAt).toLocaleDateString(language === 'nl' ? 'nl-BE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const meta = `${date} · ${t(languageNames[moment.contentLanguage] ?? languageNames.en)}`;
  const syncLine = momentSyncLine(sync, momentSyncState(moment.id));

  const startEdit = () => {
    setTitle(moment.title);
    setBody(moment.body);
    setBaseVersion(moment.version);
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    setEditError(null);
    try {
      await updateMoment(moment.id, baseVersion, { title: title.trim(), body });
      setEditing(false);
      // Truthful: the local save succeeded; the status line below says whether it has synced.
      setNotice(t({ en: `Saved on ${device.en}`, nl: `Bewaard op ${device.nl}` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      setEditError(message.includes('changed elsewhere') ? 'conflict' : 'failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteMoment = async () => {
    setBusy(true);
    try {
      await deleteMoment(moment.id);
      setSheet(null);
      setDeleted(true);
      navigation.goBack();
    } catch {
      setBusy(false);
      setSheet(null);
      setNotice(t({ en: 'This moment could not be deleted. Please try again.', nl: 'Dit moment kon niet worden verwijderd. Probeer het opnieuw.' }));
    }
  };

  const confirmDeleteAudio = async () => {
    if (!audio) return;
    setBusy(true);
    try {
      await removeAttachment(audio);
      setNotice(t({ en: 'The recording was deleted. Your written note stays.', nl: 'De opname is verwijderd. Je geschreven notitie blijft.' }));
    } catch {
      setNotice(t({ en: 'The recording could not be deleted. Please try again.', nl: 'De opname kon niet worden verwijderd. Probeer het opnieuw.' }));
    } finally {
      setBusy(false);
      setSheet(null);
    }
  };

  const cloudDeletion = syncing
    ? t({ en: ' It also asks iCloud to remove the synced copy. If you are offline, removal waits for a connection.', nl: ' Het vraagt iCloud ook om de gesynchroniseerde kopie te verwijderen. Ben je offline, dan wacht dat op een verbinding.' })
    : '';

  const sourceLine = moment.source === 'reviewed-ai'
    ? <StatusLine icon="document" tone="text" text={t({ en: 'AI draft, reviewed by you', nl: 'AI-voorstel, door jou nagekeken' })} />
    : moment.source === 'audio'
      ? <StatusLine icon="mic" tone="text" text={t({ en: 'Voice note', nl: 'Spraaknotitie' })} />
      : null;

  const header = <BackHeader label={backLabel} onBack={back} />;

  const footer = editing
    ? <>
      <Button label={t({ en: 'Save', nl: 'Bewaren' })} icon="check" onPress={() => void saveEdit()} loading={saving}
        disabled={!title.trim()} reason={t({ en: 'Give this moment a title.', nl: 'Geef dit moment een titel.' })} />
      <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => { setEditing(false); setEditError(null); }} disabled={saving} />
    </>
    : <>
      <Button variant="secondary" icon="pen" label={t({ en: 'Edit', nl: 'Bewerken' })} onPress={startEdit} />
      <Button variant="destructive" icon="trash" label={t({ en: 'Delete this moment', nl: 'Verwijder dit moment' })} onPress={() => setSheet('deleteMoment')} />
    </>;

  return <Screen header={header} footer={footer}>
    {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}

    {conflict && !editing ? <WarmCard style={{ gap: spacing.sm }}>
      <StatusLine icon="cards" tone="text" text={t({ en: 'Two versions of this moment', nl: 'Twee versies van dit moment' })} />
      <TextBlock variant="supporting" secondary>{t({ en: 'It was edited on another device. Nothing was lost.', nl: 'Het is op een ander apparaat bewerkt. Er is niets verloren gegaan.' })}</TextBlock>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button variant="quiet" label={t({ en: 'Review another version', nl: 'Bekijk een andere versie' })} onPress={() => setSheet('versions')} />
      </View>
    </WarmCard> : null}

    {editing ? <View style={{ gap: spacing.md }}>
      <TextInput value={title} onChangeText={setTitle} accessibilityLabel={t({ en: 'Title', nl: 'Titel' })}
        placeholder={t({ en: 'Title', nl: 'Titel' })} placeholderTextColor={palette.secondary}
        autoCorrect={false} spellCheck={false} autoComplete="off" importantForAutofill="no"
        style={[typography.heading, { color: palette.text, borderWidth: 1, borderColor: palette.outline, borderRadius: radius.control, paddingHorizontal: 14, paddingVertical: 10, minHeight: geometry.button }]} />
      <NoteField value={body} onChangeText={setBody} label={t({ en: 'Your note', nl: 'Je notitie' })}
        placeholder={t({ en: 'A detail, a thought, a small idea...', nl: 'Een detail, een gedachte, een klein idee...' })} minHeight={180} />
      {editError === 'conflict' && <View style={{ gap: spacing.sm }}>
        <StatusLine icon="warning" tone="text" text={t({
          en: 'This moment changed elsewhere. Your edit is still here.',
          nl: 'Dit moment is ergens anders gewijzigd. Je bewerking staat er nog.',
        })} />
        <Button variant="quiet" icon="refresh" label={t({ en: 'Start again from the saved version', nl: 'Begin opnieuw vanaf de bewaarde versie' })} onPress={startEdit} />
      </View>}
      {editError === 'failed' && <StatusLine icon="warning" tone="destructive" text={t({
        en: 'This could not be saved yet. Your draft is still here.', nl: 'Dit kon nog niet worden bewaard. Je concept staat er nog.',
      })} />}
    </View> : <>
      <View style={{ gap: spacing.xs }}>
        <TextBlock variant="title" selectable>{moment.title}</TextBlock>
        <TextBlock variant="meta" secondary>{meta}</TextBlock>
      </View>
      {sourceLine}
      {moment.body ? <TextBlock variant="rowTitle" selectable style={{ fontSize: 17, lineHeight: 26 }}>{moment.body}</TextBlock> : null}
    </>}

    {moment.questionSnapshot && !editing ? <>
      <Divider />
      <View style={{ gap: spacing.xs }}>
        <Eyebrow>{t({ en: 'The question', nl: 'De vraag' })}</Eyebrow>
        <TextBlock variant="voice">{moment.questionSnapshot}</TextBlock>
      </View>
      <Divider />
    </> : null}

    {transcript && !editing ? <TranscriptBlock attachment={transcript} /> : null}

    {audio && !editing ? <RecordingCard key={audio.id} audio={audio}
      onDelete={() => setSheet('deleteAudio')} onNotice={setNotice} /> : null}

    {!editing && <StatusLine icon={syncLine.icon} tone={syncLine.tone ?? 'secondary'} text={t(syncLine.text)} />}
    {notice ? <TextBlock variant="supporting" secondary accessibilityLiveRegion="polite">{notice}</TextBlock> : null}

    <Sheet visible={sheet === 'deleteMoment'} onClose={() => !busy && setSheet(null)}>
      <TextBlock variant="title">{t({ en: 'Delete this moment?', nl: 'Dit moment verwijderen?' })}</TextBlock>
      <TextBlock variant="body" secondary>{(audio
        ? t({ en: `This removes the moment and its recording from InnerUs on ${device.en}.`, nl: `Dit verwijdert het moment en de opname uit InnerUs op ${device.nl}.` })
        : t({ en: `This removes the moment from InnerUs on ${device.en}.`, nl: `Dit verwijdert het moment uit InnerUs op ${device.nl}.` }))
        + cloudDeletion
        + t({ en: ' Copies you exported stay where you shared them.', nl: ' Kopieën die je exporteerde, blijven waar je ze deelde.' })}</TextBlock>
      <Button variant="destructiveFilled" icon="trash" label={t({ en: 'Delete this moment', nl: 'Verwijder dit moment' })} onPress={() => void confirmDeleteMoment()} loading={busy} />
      <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => setSheet(null)} disabled={busy} />
    </Sheet>

    <Sheet visible={sheet === 'deleteAudio'} onClose={() => !busy && setSheet(null)}>
      <TextBlock variant="title">{t({ en: 'Delete this recording?', nl: 'Deze opname verwijderen?' })}</TextBlock>
      <TextBlock variant="body" secondary>{t({
        en: 'The recording is removed from this moment. Your written note stays.',
        nl: 'De opname wordt uit dit moment verwijderd. Je geschreven notitie blijft.',
      }) + cloudDeletion}</TextBlock>
      <Button variant="destructiveFilled" icon="trash" label={t({ en: 'Delete this recording', nl: 'Verwijder deze opname' })} onPress={() => void confirmDeleteAudio()} loading={busy} />
      <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => setSheet(null)} disabled={busy} />
    </Sheet>

    {conflict ? <VersionsSheet visible={sheet === 'versions'} conflict={conflict} currentTitle={moment.title} currentBody={moment.body}
      onClose={() => setSheet(null)}
      onKeep={async () => { await keepThisVersion(moment.id); setSheet(null); }}
      onUseOther={async () => {
        await useOtherVersion(conflict);
        setSheet(null);
        setNotice(t({ en: 'The other version is now this moment. The previous text is kept as an earlier version.', nl: 'De andere versie is nu dit moment. De vorige tekst blijft bewaard als eerdere versie.' }));
      }} /> : null}
  </Screen>;
}

/** Design "Sheet-conflict": two versions side by side; no automatic merge (spec 34). */
function VersionsSheet({ visible, conflict, currentTitle, currentBody, onClose, onKeep, onUseOther }: {
  visible: boolean; conflict: MomentConflict; currentTitle: string; currentBody: string;
  onClose: () => void; onKeep: () => Promise<void>; onUseOther: () => Promise<void>;
}) {
  const { palette, t } = useDesign();
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => { if (!visible) { setReviewing(false); setBusy(false); setFailed(false); } }, [visible]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try { await action(); } catch { setFailed(true); } finally { setBusy(false); }
  };

  const card = (label: string, text: string, strong: boolean, full: boolean) => <View style={{
    borderWidth: 1, borderColor: strong ? palette.text : palette.divider, borderRadius: radius.group, padding: spacing.group, gap: spacing.xs,
  }}>
    <TextBlock variant="eyebrow" secondary>{label}</TextBlock>
    <TextBlock variant="voice" numberOfLines={full ? undefined : 4}>{text}</TextBlock>
  </View>;

  const thisLabel = t({ en: 'This version', nl: 'Deze versie' });
  const otherLabel = t({ en: 'Other version', nl: 'Andere versie' });

  return <Sheet visible={visible} onClose={() => { if (!busy) onClose(); }} dismissable={!busy}>
    <TextBlock variant="title">{t({ en: 'Two versions of this moment', nl: 'Twee versies van dit moment' })}</TextBlock>
    <TextBlock variant="body" secondary>{t({ en: 'It was edited on another device. Nothing was lost.', nl: 'Het is op een ander apparaat bewerkt. Er is niets verloren gegaan.' })}</TextBlock>
    {reviewing ? <>
      <View style={{ gap: spacing.xs }}>
        <TextBlock variant="eyebrow" secondary>{otherLabel}</TextBlock>
        <TextBlock variant="heading" selectable>{conflict.title}</TextBlock>
        <TextBlock variant="rowTitle" selectable style={{ fontSize: 17, lineHeight: 26 }}>{conflict.body || ' '}</TextBlock>
      </View>
      {failed ? <StatusLine icon="warning" tone="destructive" text={t({ en: 'This could not be saved yet. Both versions are still here.', nl: 'Dit kon nog niet worden bewaard. Beide versies staan er nog.' })} /> : null}
      <Button label={t({ en: 'Use the other version', nl: 'Gebruik de andere versie' })} loading={busy} onPress={() => { void run(onUseOther); }} />
      <Button variant="secondary" label={t({ en: 'Keep this version', nl: 'Behoud deze versie' })} disabled={busy} onPress={() => { void run(onKeep); }} />
    </> : <>
      {card(thisLabel, currentBody || currentTitle, true, false)}
      {card(otherLabel, conflict.body || conflict.title, false, false)}
      {failed ? <StatusLine icon="warning" tone="destructive" text={t({ en: 'This could not be saved yet. Both versions are still here.', nl: 'Dit kon nog niet worden bewaard. Beide versies staan er nog.' })} /> : null}
      <Button label={t({ en: 'Keep this version', nl: 'Behoud deze versie' })} loading={busy} onPress={() => { void run(onKeep); }} />
      <Button variant="secondary" label={t({ en: 'Review another version', nl: 'Bekijk een andere versie' })} disabled={busy} onPress={() => setReviewing(true)} />
    </>}
    <TextBlock variant="supporting" secondary>{t({
      en: 'Whichever you choose, the other text stays stored on this iPhone as an earlier version.',
      nl: 'Wat je ook kiest, de andere tekst blijft op deze iPhone bewaard als eerdere versie.',
    })}</TextBlock>
  </Sheet>;
}

/** A kept transcript (spec 21: only when the person chose to keep it). Text stays on the device. */
function TranscriptBlock({ attachment }: { attachment: Attachment }) {
  const { t } = useDesign();
  const { attachmentUri } = useAppStore();
  const text = useMemo(() => {
    if (!attachment.localFile) return null;
    try {
      const file = new File(attachmentUri(attachment));
      return file.exists ? file.textSync() : null;
    } catch {
      return null;
    }
  }, [attachment, attachmentUri]);
  const [expanded, setExpanded] = useState(false);
  const long = (text?.length ?? 0) > 280;
  return <View style={{ gap: spacing.xs }}>
    <Eyebrow>{t({ en: 'Transcript', nl: 'Uitgeschreven tekst' })}</Eyebrow>
    {text != null
      ? <>
        <TextBlock variant="voice" selectable numberOfLines={long && !expanded ? 6 : undefined}>{text}</TextBlock>
        {long ? <View style={{ alignSelf: 'flex-start' }}>
          <Button variant="quiet" label={expanded ? t({ en: 'Show less', nl: 'Toon minder' }) : t({ en: 'Show the full transcript', nl: 'Toon de volledige tekst' })}
            onPress={() => setExpanded(e => !e)} />
        </View> : null}
      </>
      : <StatusLine icon="cloud" text={attachment.localFile
        ? t({ en: 'The transcript could not be read on this device.', nl: 'De tekst kon op dit apparaat niet worden gelezen.' })
        : t({ en: 'The transcript appears here once it has downloaded from iCloud.', nl: 'De tekst verschijnt hier zodra hij uit iCloud is gedownload.' })} />}
  </View>;
}

type DownloadState = { phase: 'idle' | 'downloading' | 'offline' | 'failed' | 'unavailable'; progress: number };

/**
 * Retained voice clip (design "Moment-detail"). On this device: player, "Remove this download" (only
 * when iCloud confirmed a copy) and "Delete this recording". Only in iCloud: a distinct Download state
 * with cancelable progress and retry (spec 33).
 */
function RecordingCard({ audio, onDelete, onNotice }: { audio: Attachment; onDelete: () => void; onNotice: (text: string) => void }) {
  const { palette, scheme, t } = useDesign();
  const { sync, attachmentUri, downloadAttachment, removeDownload } = useAppStore();
  const [download, setDownload] = useState<DownloadState>({ phase: 'idle', progress: 0 });
  const [removing, setRemoving] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  // Leaving the screen cancels a running download (a partial file never counts as downloaded).
  useEffect(() => () => { cancelRef.current?.(); }, []);

  const key = `attachment:${audio.id}`;
  const cloudConfirmed = sync.supported && sync.marks.confirmed.has(key) && !sync.marks.pending.has(key);

  const startDownload = async () => {
    setDownload({ phase: 'downloading', progress: 0 });
    const job = downloadAttachment(audio, fraction => setDownload(d => (d.phase === 'downloading' ? { ...d, progress: fraction } : d)));
    cancelRef.current = job.cancel;
    const outcome = await job.promise;
    cancelRef.current = null;
    if (outcome === 'done') setDownload({ phase: 'idle', progress: 0 });
    else if (outcome === 'cancelled') setDownload({ phase: 'idle', progress: 0 });
    else setDownload({ phase: outcome, progress: 0 });
  };

  const removeLocal = async () => {
    setRemoving(true);
    const outcome = await removeDownload(audio);
    setRemoving(false);
    onNotice(outcome === 'removed'
      ? t({ en: 'The download was removed from this iPhone. The recording stays in iCloud.', nl: 'De download is van deze iPhone verwijderd. De opname blijft in iCloud.' })
      : outcome === 'offline'
        ? t({ en: 'Connect to the internet so iCloud can confirm its copy first. Nothing was removed.', nl: 'Maak verbinding met internet zodat iCloud eerst zijn kopie kan bevestigen. Er is niets verwijderd.' })
        : outcome === 'not-confirmed'
          ? t({ en: 'iCloud has no confirmed copy yet, so the recording stays on this iPhone.', nl: 'iCloud heeft nog geen bevestigde kopie, dus de opname blijft op deze iPhone.' })
          : t({ en: 'The download could not be removed. Try again.', nl: 'De download kon niet worden verwijderd. Probeer het opnieuw.' }));
  };

  const actionRow = (icon: IconName | null, label: string, onPress: () => void, destructive: boolean, disabled = false) =>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled}
      style={({ pressed }) => ({ minHeight: geometry.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: disabled ? 0.5 : pressed ? 0.6 : 1 })}>
      {icon ? <Icon name={icon} color={destructive ? palette.destructive : palette.text} size={18} /> : null}
      <TextBlock variant="label" tone={destructive ? 'destructive' : undefined}>{label}</TextBlock>
    </Pressable>;

  const name = t({ en: 'Voice note', nl: 'Spraaknotitie' });
  const downloadLabel = t({ en: 'Download', nl: 'Downloaden' });

  return <View style={[{ backgroundColor: palette.raised, borderRadius: radius.group, borderWidth: 1, borderColor: palette.divider, padding: spacing.group, gap: spacing.sm }, shadow(scheme)]}>
    {audio.localFile ? <AudioPlayer uri={attachmentUri(audio)} durationMs={audio.durationMs} /> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.group }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: palette.outline, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="cloud" color={palette.text} size={20} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <TextBlock variant="label">{name}</TextBlock>
        <TextBlock variant="supporting" secondary>{t({ en: `In iCloud · not on this iPhone · ${formatClip(audio.durationMs)}`, nl: `In iCloud · niet op deze iPhone · ${formatClip(audio.durationMs)}` })}</TextBlock>
      </View>
    </View>}

    {!audio.localFile && download.phase === 'downloading' ? <View style={{ gap: spacing.sm }}>
      <View accessible accessibilityRole="progressbar" accessibilityLabel={t({ en: 'Downloading the recording', nl: 'De opname downloaden' })}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(download.progress * 100) }}
        style={{ height: 4, borderRadius: 2, backgroundColor: palette.divider, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(4, download.progress * 100)}%`, height: 4, backgroundColor: palette.text }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextBlock variant="supporting" secondary>{t({ en: `Downloading… ${Math.round(download.progress * 100)}%`, nl: `Downloaden… ${Math.round(download.progress * 100)}%` })}</TextBlock>
        <Button variant="quiet" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={() => cancelRef.current?.()} />
      </View>
    </View> : null}

    {!audio.localFile && download.phase !== 'downloading' ? <View style={{ gap: spacing.sm }}>
      {download.phase === 'offline' ? <StatusLine icon="cloudOff" tone="text" text={t({ en: 'You are offline. Download the recording when you are connected.', nl: 'Je bent offline. Download de opname zodra je verbonden bent.' })} /> : null}
      {download.phase === 'unavailable' ? <StatusLine icon="cloudOff" tone="text" text={t({ en: 'iCloud is unavailable right now, so the recording cannot be downloaded.', nl: 'iCloud is nu niet beschikbaar, dus de opname kan niet worden gedownload.' })} /> : null}
      {download.phase === 'failed' ? <StatusLine icon="warning" tone="text" text={t({ en: 'The download did not finish. Nothing was lost; try again.', nl: 'De download is niet afgerond. Er is niets verloren gegaan; probeer het opnieuw.' })} /> : null}
      <Button variant="secondary" icon={download.phase === 'idle' ? 'download' : 'refresh'}
        label={download.phase === 'idle' ? downloadLabel : t({ en: 'Try again', nl: 'Opnieuw proberen' })} onPress={() => { void startDownload(); }} />
    </View> : null}

    <Divider style={{ marginTop: spacing.sm }} />
    {audio.localFile && cloudConfirmed
      ? actionRow(null, t({ en: 'Remove this download', nl: 'Verwijder deze download' }), () => { void removeLocal(); }, false, removing)
      : null}
    {actionRow('trash', t({ en: 'Delete this recording', nl: 'Verwijder deze opname' }), onDelete, true, download.phase === 'downloading')}
  </View>;
}
