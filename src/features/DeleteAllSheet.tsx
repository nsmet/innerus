import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Icon } from '../design/Icon';
import { Button, Sheet, StatusLine, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import { useAppStore } from '../state/AppStore';
import { cancelReminders } from './reminders';

/**
 * Design "Sheet-delete" (spec 37): lists exactly what is removed, states whether synced iCloud copies are
 * included (cloud removal stays pending offline), keeps the purchase, and needs a second explicit
 * confirmation before anything is deleted.
 */
export function DeleteAllSheet({ visible, onClose, onDeleted }: { visible: boolean; onClose: () => void; onDeleted?: () => void }) {
  const { palette, t } = useDesign();
  const { deleteAllPrivateContent, sync } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!visible) { setConfirming(false); setBusy(false); setFailed(false); }
  }, [visible]);

  const items = [
    t({ en: 'Moments', nl: 'Momenten' }),
    t({ en: 'Retained recordings', nl: 'Bewaarde opnames' }),
    t({ en: 'Transcripts', nl: 'Uitgeschreven teksten' }),
    t({ en: 'Preferences', nl: 'Voorkeuren' }),
    t({ en: 'Local drafts', nl: 'Lokale concepten' }),
  ];

  const syncOn = Platform.OS === 'ios' && sync.supported && sync.enabled && sync.status !== 'not-configured';
  const where = syncOn
    ? t({
      en: 'This also asks iCloud to remove synced copies. If you are offline, removal stays pending until iCloud confirms. Copies you exported earlier are outside InnerUs. This cannot be undone. Your purchase stays.',
      nl: 'Dit vraagt iCloud ook om gesynchroniseerde kopieën te verwijderen. Ben je offline, dan wacht het verwijderen tot iCloud het bevestigt. Kopieën die je eerder exporteerde staan buiten InnerUs. Dit kan niet ongedaan worden gemaakt. Je aankoop blijft.',
    })
    : Platform.OS === 'ios' && sync.supported
      ? t({
        en: 'iCloud sync is off, so copies already in your iCloud are not removed now. If you turn sync on again, they are removed then; “Delete iCloud copies” in Settings removes them right away. Copies you exported earlier are outside InnerUs. This cannot be undone. Your purchase stays.',
        nl: 'iCloud-synchronisatie staat uit, dus kopieën die al in je iCloud staan worden nu niet verwijderd. Zet je synchronisatie weer aan, dan worden ze op dat moment verwijderd; “Verwijder iCloud-kopieën” in Instellingen verwijdert ze meteen. Kopieën die je eerder exporteerde staan buiten InnerUs. Dit kan niet ongedaan worden gemaakt. Je aankoop blijft.',
      })
      : Platform.OS === 'ios'
        ? t({
          en: 'InnerUs keeps this only on this iPhone. Copies you exported earlier are outside InnerUs. This cannot be undone. Your purchase stays.',
          nl: 'InnerUs bewaart dit alleen op deze iPhone. Kopieën die je eerder exporteerde staan buiten InnerUs. Dit kan niet ongedaan worden gemaakt. Je aankoop blijft.',
        })
    : t({
      en: 'InnerUs keeps this only on this device. Copies you exported earlier are outside InnerUs. This cannot be undone. Your purchase stays.',
      nl: 'InnerUs bewaart dit alleen op dit apparaat. Kopieën die je eerder exporteerde staan buiten InnerUs. Dit kan niet ongedaan worden gemaakt. Je aankoop blijft.',
    });

  async function onDelete() {
    if (!confirming) { setConfirming(true); return; }
    setBusy(true);
    setFailed(false);
    try {
      await deleteAllPrivateContent();
      await cancelReminders();
      setBusy(false);
      onDeleted?.();
      onClose();
    } catch {
      setBusy(false);
      setFailed(true);
    }
  }

  return <Sheet visible={visible} onClose={busy ? () => undefined : onClose} dismissable={!busy}>
    <TextBlock variant="title">{t({ en: 'Delete all private app content', nl: 'Verwijder alle persoonlijke app-inhoud' })}</TextBlock>
    <View style={{ gap: spacing.sm }}>
      <TextBlock variant="meta" secondary>{t({ en: 'This removes:', nl: 'Dit verwijdert:' })}</TextBlock>
      <View>
        {items.map(item => <View key={item} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: palette.divider }}>
          <Icon name="check" color={palette.text} size={16} />
          <TextBlock variant="body">{item}</TextBlock>
        </View>)}
      </View>
    </View>
    <TextBlock variant="supporting" secondary>{where}</TextBlock>
    {confirming && !failed ? <StatusLine icon="warning" tone="destructive" text={t({ en: 'Tap again to delete everything listed above.', nl: 'Tik nog eens om alles hierboven te verwijderen.' })} /> : null}
    {failed ? <StatusLine icon="warning" tone="destructive" text={t({ en: 'Not everything could be deleted. Try again.', nl: 'Niet alles kon worden verwijderd. Probeer het opnieuw.' })} /> : null}
    <View style={{ gap: spacing.md }}>
      <Button variant="destructiveFilled" icon="trash" loading={busy}
        label={confirming ? t({ en: 'Yes, delete everything', nl: 'Ja, verwijder alles' }) : t({ en: 'Delete all private app content', nl: 'Verwijder alle persoonlijke app-inhoud' })}
        loadingLabel={t({ en: 'Deleting…', nl: 'Verwijderen…' })}
        onPress={() => { void onDelete(); }} />
      <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={onClose} disabled={busy} />
    </View>
  </Sheet>;
}
