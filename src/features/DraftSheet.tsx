import React from 'react';
import { Platform, View } from 'react-native';
import { Button, Sheet, SheetBadge, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';

/**
 * Unfinished typed note recovery (design Sheet-draft, adapted to a note; spec 20).
 * `mode` only changes the explanation:
 * - 'leave'  (Close before Finish): Keep draft leaves the note on the device for when you continue.
 * - 'resolve' (Start again / Finish): Keep draft keeps the note as a Moment before moving on.
 * No punitive "abandon" language; Stay here is always the safe cancel.
 */
export type DraftSheetProps = {
  visible: boolean;
  onKeep: () => void;
  onDiscard: () => void;
  onStay: () => void;
  mode?: 'leave' | 'resolve';
  busy?: boolean;
};

export function DraftSheet({ visible, onKeep, onDiscard, onStay, mode = 'leave', busy = false }: DraftSheetProps) {
  const { t } = useDesign();
  const device = Platform.OS === 'ios'
    ? { en: 'this iPhone', nl: 'deze iPhone' }
    : { en: 'this device', nl: 'dit apparaat' };
  const title = t({
    en: `An unfinished note is on ${device.en}.`,
    nl: `Er staat een onvoltooide notitie op ${device.nl}.`,
  });
  const body = mode === 'leave'
    ? t({
      en: 'It stays here until you keep or discard it. You can pick it up again when you continue this conversation.',
      nl: 'De notitie blijft hier tot je ze bewaart of verwijdert. Je vindt ze terug wanneer je dit gesprek voortzet.',
    })
    : t({
      en: 'Keep it as a moment, or discard it before you go on. Moments you already saved are not affected.',
      nl: 'Bewaar ze als moment, of verwijder ze voordat je verdergaat. Momenten die je al bewaarde, blijven staan.',
    });
  return <Sheet visible={visible} onClose={onStay}>
    <SheetBadge icon="pen" />
    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="title">{title}</TextBlock>
      <TextBlock variant="meta" secondary>{body}</TextBlock>
    </View>
    <View style={{ gap: spacing.md }}>
      <Button label={t({ en: 'Keep draft', nl: 'Bewaar concept' })} onPress={onKeep} loading={busy} />
      <Button variant="secondary" label={t({ en: 'Discard draft', nl: 'Verwijder concept' })} onPress={onDiscard} disabled={busy} />
      <Button variant="quiet" label={t({ en: 'Stay here', nl: 'Blijf hier' })} onPress={onStay} />
    </View>
  </Sheet>;
}
