import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { Moment } from '../data/repository';
import { Icon, type IconName } from '../design/Icon';
import { Button, Chip, ListGroup, Sheet, SheetBadge, StatusLine, TextBlock, ToggleRow, WarmCard } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import { useAppStore } from '../state/AppStore';
import { clipLength } from './exportAll';
import {
  momentExportSources, planMomentExport, shareMomentExport, type ExportResult, type MomentSelection, type PreviewItem,
} from './exportMoment';

/**
 * Export one Moment (spec 37): choose the words as text, or files (readable document, original recording,
 * kept transcript), see exactly what will leave InnerUs, then open the system share sheet.
 * Defaults to the readable document only; recordings and transcripts are opt-in.
 */
type Props = {
  visible: boolean;
  moment: Moment;
  onClose: () => void;
  /** Called after the share sheet closed (or could not open), e.g. to show a notice. */
  onResult?: (result: ExportResult) => void;
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const PREVIEW_CHARS = 700;

function formatBytes(bytes: number | null, language: 'en' | 'nl') {
  if (bytes === null) return '';
  const locale = language === 'nl' ? 'nl-BE' : 'en-GB';
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1_000)).toLocaleString(locale)} KB`;
}

const itemIcon: Record<PreviewItem['kind'], IconName> = { document: 'document', recording: 'mic', transcript: 'pen' };

export function ExportMomentSheet({ visible, moment, onClose, onResult }: Props) {
  const { palette, t, language } = useDesign();
  const { attachments, attachmentUri } = useAppStore();
  const [mode, setMode] = useState<'text' | 'files'>('files');
  const [document, setDocument] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [busy, setBusy] = useState(false);

  // Start from the minimal selection each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setMode('files'); setDocument(true); setRecording(false); setTranscript(false); setBusy(false);
  }, [visible]);

  // File checks only while the sheet is open (cheap, and current after an iCloud download or a deletion).
  const sources = useMemo(
    () => (visible ? momentExportSources(moment, attachments, attachmentUri) : { recording: null, transcript: null }),
    [visible, moment, attachments, attachmentUri],
  );
  const plan = useMemo(() => {
    const selection: MomentSelection = mode === 'text' ? { mode: 'text' } : { mode: 'files', document, recording, transcript };
    return planMomentExport(moment, sources, selection, language);
  }, [moment, sources, mode, document, recording, transcript, language]);

  const notOnDevice = t({ en: 'Not on this device right now', nl: 'Nu niet op dit apparaat' });
  const recordingDetail = sources.recording
    ? sources.recording.file
      ? [t({ en: 'Original audio', nl: 'Originele audio' }), clipLength(sources.recording.attachment.durationMs)].filter(Boolean).join(' · ')
      : notOnDevice
    : null;
  const transcriptDetail = sources.transcript
    ? sources.transcript.file ? t({ en: 'The full text you kept', nl: 'De volledige tekst die je bewaarde' }) : notOnDevice
    : null;

  async function share() {
    setBusy(true);
    onClose();
    await wait(350); // let the sheet close before the system share sheet appears
    const result = await shareMomentExport(plan, moment.title, language);
    setBusy(false);
    onResult?.(result);
  }

  const on = t({ en: 'On', nl: 'Aan' });
  const off = t({ en: 'Off', nl: 'Uit' });

  const preview = plan.mode === 'text'
    ? <WarmCard>
      <TextBlock variant="supporting" secondary style={{ marginBottom: spacing.xs }}>
        {t({ en: 'Shared as text, for a message or a note', nl: 'Gedeeld als tekst, voor een bericht of notitie' })}
      </TextBlock>
      <TextBlock variant="body">
        {plan.text.length > PREVIEW_CHARS ? `${plan.text.slice(0, PREVIEW_CHARS).trimEnd()}…` : plan.text.trim()}
      </TextBlock>
    </WarmCard>
    : plan.mode === 'files'
      ? <WarmCard style={{ gap: spacing.sm }}>
        <TextBlock variant="supporting" secondary>
          {plan.archiveName
            ? t({ en: `Shared as one .zip file: ${plan.archiveName}`, nl: `Gedeeld als één .zip-bestand: ${plan.archiveName}` })
            : t({ en: 'Shared as one file', nl: 'Gedeeld als één bestand' })}
        </TextBlock>
        {plan.items.map(item => <View key={item.name} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          accessible accessibilityLabel={`${item.name}, ${formatBytes(item.bytes, language)}`}>
          <Icon name={itemIcon[item.kind]} color={palette.text} size={16} />
          <TextBlock variant="body" style={{ flex: 1 }}>{item.name}</TextBlock>
          <TextBlock variant="meta" secondary>{formatBytes(item.bytes, language)}</TextBlock>
        </View>)}
      </WarmCard>
      : <StatusLine icon="warning" text={t({ en: 'Choose at least one item to share.', nl: 'Kies minstens één onderdeel om te delen.' })} />;

  return <Sheet visible={visible} onClose={() => { if (!busy) onClose(); }} dismissable={!busy}>
    <View style={{ alignItems: 'center' }}><SheetBadge icon="share" /></View>
    <TextBlock variant="title" center accessibilityRole="header">{t({ en: 'Export this moment', nl: 'Exporteer dit moment' })}</TextBlock>
    <TextBlock variant="body" secondary center>{t({
      en: 'Exports create a copy outside InnerUs. Choose what you want to share.',
      nl: 'Een export maakt een kopie buiten InnerUs. Kies wat je wilt delen.',
    })}</TextBlock>

    <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }} accessibilityRole="radiogroup">
      <Chip label={t({ en: 'As files', nl: 'Als bestanden' })} selected={mode === 'files'} onPress={() => setMode('files')} />
      <Chip label={t({ en: 'As text', nl: 'Als tekst' })} selected={mode === 'text'} onPress={() => setMode('text')} />
    </View>

    {mode === 'files' ? <ListGroup>
      <ToggleRow icon="document" title={t({ en: 'Readable document', nl: 'Leesbaar document' })}
        detail={t({ en: 'Text file with conversation, question, date and source', nl: 'Tekstbestand met gesprek, vraag, datum en bron' })}
        value={document} onChange={setDocument} onLabel={on} offLabel={off} />
      {recordingDetail ? <ToggleRow icon="mic" title={t({ en: 'Original recording', nl: 'Originele opname' })} detail={recordingDetail}
        value={recording && !!sources.recording?.file} onChange={setRecording} disabled={!sources.recording?.file} onLabel={on} offLabel={off} /> : null}
      {transcriptDetail ? <ToggleRow icon="pen" title={t({ en: 'Full transcript', nl: 'Volledige tekst' })} detail={transcriptDetail}
        value={transcript && !!sources.transcript?.file} onChange={setTranscript} disabled={!sources.transcript?.file} onLabel={on} offLabel={off} /> : null}
    </ListGroup> : null}

    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="eyebrow" secondary>{t({ en: 'Preview', nl: 'Voorbeeld' })}</TextBlock>
      {preview}
    </View>

    <View style={{ gap: spacing.md }}>
      <Button icon="share" label={t({ en: 'Choose where to share', nl: 'Kies waar je wilt delen' })} loading={busy}
        disabled={plan.mode === 'nothing'} reason={t({ en: 'Choose at least one item to share.', nl: 'Kies minstens één onderdeel om te delen.' })}
        onPress={() => { void share(); }} />
      <Button variant="quiet" label={t({ en: 'Cancel', nl: 'Annuleren' })} disabled={busy} onPress={onClose} />
    </View>
  </Sheet>;
}
