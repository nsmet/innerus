import React, { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import type { IconName } from '../design/Icon';
import { Button, ListGroup, ListRow, Sheet, SheetBadge, StatusLine, TextBlock, ToggleRow } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import type { SyncSnapshot } from '../platform/sync';
import { useAppStore, type MomentSyncState } from '../state/AppStore';

/**
 * Private iCloud sync controls and wording (spec 32-37, wording 83-85). Self-contained: mount
 * <SyncSettingsSection /> in Settings where the iCloud group belongs. On Android it renders the
 * local-only storage group instead. Also exports the shared status-line helpers and the
 * account-change sheet used by Moments and Moment detail.
 */
type Localized = { en: string; nl: string };
export type SyncLine = { icon: IconName; text: Localized; tone?: 'secondary' | 'text' | 'destructive' };

const ios = Platform.OS === 'ios';
const savedHere: SyncLine = ios
  ? { icon: 'device', text: { en: 'Saved on this iPhone', nl: 'Bewaard op deze iPhone' } }
  : { icon: 'device', text: { en: 'Saved on this device', nl: 'Bewaard op dit apparaat' } };
const waiting: SyncLine = { icon: 'cloud', text: { en: 'Waiting to sync', nl: 'Wacht op synchronisatie' } };
const synced: SyncLine = { icon: 'cloudCheck', text: { en: 'Synced with iCloud', nl: 'Gesynchroniseerd met iCloud' } };
const offline: SyncLine = { icon: 'cloudOff', text: { en: 'Offline. Changes are saved on this iPhone.', nl: 'Offline. Wijzigingen zijn bewaard op deze iPhone.' } };
const quotaFull: SyncLine = { icon: 'warning', tone: 'text', text: { en: 'Your iCloud storage is full. Your latest changes are saved on this iPhone.', nl: 'Je iCloud-opslag is vol. Je laatste wijzigingen zijn op deze iPhone bewaard.' } };
const unavailable: SyncLine = { icon: 'cloudOff', text: { en: 'iCloud is unavailable. New moments stay on this iPhone for now.', nl: 'iCloud is niet beschikbaar. Nieuwe momenten blijven voorlopig op deze iPhone.' } };
const syncOff: SyncLine = { icon: 'cloudOff', text: { en: 'iCloud sync is off', nl: 'iCloud-synchronisatie staat uit' } };
const accountChanged: SyncLine = { icon: 'shield', tone: 'text', text: { en: 'Your Apple Account changed. We paused sync to keep the previous account’s content separate.', nl: 'Je Apple-account is veranderd. We hebben synchronisatie gepauzeerd om de inhoud van het vorige account apart te houden.' } };

/** True when the sync layer is actually running for this person (iOS, configured, switched on). */
function syncActive(sync: SyncSnapshot) {
  return sync.supported && sync.enabled && !['not-configured', 'unavailable', 'account-changed', 'off', 'local-only'].includes(sync.status);
}

/**
 * The quiet per-moment line (Moment detail; `compact` for library rows). "Synced" only after iCloud
 * confirmed the moment and its files; never before (spec 20/32).
 */
export function momentSyncLine(sync: SyncSnapshot, state: MomentSyncState, compact = false): SyncLine {
  if (!syncActive(sync)) return savedHere;
  if (state === 'synced') return synced;
  if (state === 'local') return savedHere;
  if (compact) return waiting;
  if (sync.status === 'offline') return offline;
  if (sync.status === 'quota-full') return quotaFull;
  return waiting;
}

/** Overall line for Settings. */
export function overallSyncLine(sync: SyncSnapshot): SyncLine {
  switch (sync.status) {
    case 'local-only': return savedHere;
    case 'not-configured':
    case 'unavailable': return unavailable;
    case 'off': return syncOff;
    case 'account-changed': return accountChanged;
    case 'offline': return offline;
    case 'quota-full': return quotaFull;
    case 'synced': return sync.pendingCount > 0 ? waiting : synced;
    case 'pending': return waiting;
    case 'checking': return { icon: 'cloud', text: { en: 'Checking iCloud…', nl: 'iCloud controleren…' } };
    case 'syncing':
    default:
      if (sync.pendingCount > 0) return waiting;
      return sync.lastSyncedAt ? synced : { icon: 'cloud', text: { en: 'Checking iCloud…', nl: 'iCloud controleren…' } };
  }
}

/** Design "Sheet-account": shown once per detected Apple Account change. No private previews. */
export function AccountChangedSheet({ onHowItWorks }: { onHowItWorks?: () => void }) {
  const { t } = useDesign();
  const { sync, acknowledgeAccountChange } = useAppStore();
  const visible = sync.supported && sync.accountNoticeDue;
  const done = () => { void acknowledgeAccountChange(); };
  return <Sheet visible={visible} onClose={done}>
    <SheetBadge icon="shield" />
    <TextBlock variant="title">{t({ en: 'Your Apple Account changed.', nl: 'Je Apple-account is veranderd.' })}</TextBlock>
    <TextBlock variant="body" secondary>{t({
      en: 'We paused sync to keep the previous account’s content separate. Nothing was uploaded to the new account.',
      nl: 'We hebben synchronisatie gepauzeerd om de inhoud van het vorige account apart te houden. Er is niets naar het nieuwe account geüpload.',
    })}</TextBlock>
    <Button label={t({ en: 'Done', nl: 'Klaar' })} onPress={done} />
    {onHowItWorks ? <Button variant="quiet" underline label={t({ en: 'How this works', nl: 'Zo werkt het' })} onPress={() => { done(); onHowItWorks(); }} /> : null}
  </Sheet>;
}

type SheetKind = 'delete' | 'storage' | 'account' | null;

export function SyncSettingsSection({ onHowItWorks }: { onHowItWorks?: () => void }) {
  const { t } = useDesign();
  const { sync, attachments, setSyncEnabled, retrySync, deleteCloudCopies, adoptCurrentAccountForSync, dismissSyncNotice } = useAppStore();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<SyncLine | null>(null);

  if (!ios || !sync.supported) {
    if (ios) {
      // iOS build without the native adapter (e.g. Expo Go): honest unavailable state.
      return <ListGroup title="iCloud">
        <ListRow icon="cloudOff" title={t({ en: 'Sync with iCloud', nl: 'Synchroniseer met iCloud' })} detail={t(unavailable.text)} />
      </ListGroup>;
    }
    return <ListGroup title={t({ en: 'Storage on this device', nl: 'Opslag op dit apparaat' })}>
      <ListRow icon="device" title={t({ en: 'Local-only storage', nl: 'Alleen lokale opslag' })}
        detail={t({ en: 'Local-only storage. Export anything you want an independent copy of.', nl: 'Alleen lokale opslag. Exporteer wat je als losse kopie wilt bewaren.' })} />
    </ListGroup>;
  }

  const line = overallSyncLine(sync);
  const cloudOnly = attachments.filter(a => !a.localFile).length;
  const canToggle = sync.status !== 'not-configured' && !toggling;
  const onOff = { onLabel: t({ en: 'On', nl: 'Aan' }), offLabel: t({ en: 'Off', nl: 'Uit' }) };

  async function toggle(on: boolean) {
    setToggling(true);
    setMessage(null);
    try { await setSyncEnabled(on); } finally { setToggling(false); }
  }

  async function removeCloudCopies() {
    setBusy(true);
    setMessage(null);
    const outcome = await deleteCloudCopies();
    setBusy(false);
    setSheet(null);
    if (outcome === 'deleted') return; // the notice line below explains the result
    setMessage(outcome === 'offline'
      ? { icon: 'cloudOff', text: { en: 'Connect to the internet to delete iCloud copies. Nothing was deleted.', nl: 'Maak verbinding met internet om iCloud-kopieën te verwijderen. Er is niets verwijderd.' } }
      : outcome === 'unavailable'
        ? { icon: 'cloudOff', text: { en: 'iCloud is unavailable for this Apple Account right now. Nothing was deleted.', nl: 'iCloud is nu niet beschikbaar voor dit Apple-account. Er is niets verwijderd.' } }
        : { icon: 'warning', text: { en: 'The iCloud copies could not be deleted. Try again.', nl: 'De iCloud-kopieën konden niet worden verwijderd. Probeer het opnieuw.' } });
  }

  async function useThisAccount() {
    setBusy(true);
    await adoptCurrentAccountForSync();
    setBusy(false);
    setSheet(null);
  }

  const explanation = (() => {
    switch (sync.status) {
      case 'off': return t({
        en: 'Turning sync off stops new syncing. It does not automatically delete your saved cloud copies. Turning it on again restores what is still in iCloud.',
        nl: 'Als je synchronisatie uitzet, stopt nieuwe synchronisatie. Bestaande cloudkopieën worden niet automatisch verwijderd. Zet je synchronisatie weer aan, dan komt terug wat nog in iCloud staat.',
      });
      case 'unavailable': return t({
        en: 'Sign in to iCloud in the Settings app to sync between your own devices. Everything keeps working on this iPhone.',
        nl: 'Meld je aan bij iCloud in de app Instellingen om tussen je eigen apparaten te synchroniseren. Alles blijft werken op deze iPhone.',
      });
      case 'not-configured': return t({
        en: 'This version of InnerUs cannot reach iCloud. Everything keeps working on this iPhone.',
        nl: 'Deze versie van InnerUs kan iCloud niet bereiken. Alles blijft werken op deze iPhone.',
      });
      case 'offline':
      case 'pending': return sync.pendingCount > 0 ? t({
        en: `${sync.pendingCount === 1 ? '1 change is' : `${sync.pendingCount} changes are`} saved on this iPhone and will sync later. Queued changes are not a backup yet.`,
        nl: `${sync.pendingCount === 1 ? '1 wijziging is' : `${sync.pendingCount} wijzigingen zijn`} bewaard op deze iPhone en synchroniseren later. Wachtende wijzigingen zijn nog geen back-up.`,
      }) : null;
      case 'account-changed': return t({
        en: 'Your moments stay on this iPhone. To sync again, sign back in to the previous Apple Account, or choose to use this account.',
        nl: 'Je momenten blijven op deze iPhone. Om opnieuw te synchroniseren meld je je weer aan met het vorige Apple-account, of kies je voor dit account.',
      });
      default: return null;
    }
  })();

  const notice = sync.notice === 'cloud-deleted'
    ? t({ en: 'iCloud copies were deleted and sync is off. Your moments stay on this iPhone.', nl: 'De iCloud-kopieën zijn verwijderd en synchronisatie staat uit. Je momenten blijven op deze iPhone.' })
    : sync.notice === 'cloud-removed'
      ? t({ en: 'The InnerUs copies in iCloud were removed, so sync was turned off. Your moments stay on this iPhone. Turn sync on to upload them again.', nl: 'De InnerUs-kopieën in iCloud zijn verwijderd, dus synchronisatie is uitgezet. Je momenten blijven op deze iPhone. Zet synchronisatie aan om ze opnieuw te uploaden.' })
      : null;

  return <View style={{ gap: spacing.sm }}>
    <ListGroup title="iCloud">
      <ToggleRow icon="cloud" title={t({ en: 'Sync with iCloud', nl: 'Synchroniseer met iCloud' })} {...onOff}
        detail={t({ en: 'Your app choice. Apple’s iCloud setting is separate.', nl: 'Jouw keuze in de app. De iCloud-instelling van Apple staat los hiervan.' })}
        value={sync.enabled && sync.status !== 'not-configured'} disabled={!canToggle} onChange={on => { void toggle(on); }} />
      <View style={{ paddingHorizontal: 16, paddingVertical: spacing.md }} accessibilityLiveRegion="polite">
        <StatusLine icon={line.icon} tone={line.tone ?? 'secondary'} text={t(line.text)} />
      </View>
      {sync.status === 'account-changed'
        ? <ListRow icon="refresh" title={t({ en: 'Use this Apple Account', nl: 'Gebruik dit Apple-account' })} onPress={() => setSheet('account')} />
        : null}
      {sync.status !== 'not-configured' && sync.status !== 'account-changed'
        ? <ListRow icon="trash" destructive title={t({ en: 'Delete iCloud copies', nl: 'Verwijder iCloud-kopieën' })}
          detail={t({ en: 'Moments on this iPhone stay.', nl: 'Momenten op deze iPhone blijven bewaard.' })} onPress={() => { setMessage(null); setSheet('delete'); }} />
        : null}
    </ListGroup>

    {explanation ? <TextBlock variant="supporting" secondary>{explanation}</TextBlock> : null}
    {notice ? <View style={{ gap: spacing.xs }}>
      <StatusLine icon="cloudOff" tone="text" text={notice} />
      <View style={{ alignSelf: 'flex-start' }}><Button variant="quiet" label={t({ en: 'Dismiss', nl: 'Sluiten' })} onPress={() => { void dismissSyncNotice(); }} /></View>
    </View> : null}
    {message ? <StatusLine icon={message.icon} tone={message.tone ?? 'text'} text={t(message.text)} /> : null}

    {(sync.status === 'pending' || sync.status === 'offline') && sync.pendingCount > 0
      ? <View style={{ alignSelf: 'flex-start' }}><Button variant="quiet" icon="refresh" label={t({ en: 'Try again', nl: 'Opnieuw proberen' })} onPress={() => { void retrySync(); }} /></View>
      : null}
    {sync.status === 'quota-full'
      ? <View style={{ alignSelf: 'flex-start' }}><Button variant="quiet" label={t({ en: 'Manage iCloud storage', nl: 'Beheer iCloud-opslag' })} onPress={() => setSheet('storage')} /></View>
      : null}
    {onHowItWorks ? <View style={{ alignSelf: 'flex-start' }}><Button variant="quiet" underline label={t({ en: 'How iCloud sync works', nl: 'Zo werkt iCloud-synchronisatie' })} onPress={onHowItWorks} /></View> : null}

    <Sheet visible={sheet === 'delete'} onClose={() => { if (!busy) setSheet(null); }} dismissable={!busy}>
      <SheetBadge icon="cloudOff" />
      <TextBlock variant="title">{t({ en: 'Delete iCloud copies?', nl: 'iCloud-kopieën verwijderen?' })}</TextBlock>
      <TextBlock variant="body" secondary>{t({
        en: 'This removes the InnerUs moments, recordings and hidden themes stored in iCloud for this Apple Account, and turns sync off. Moments on this iPhone stay here. Other devices keep their own copies and stop syncing.',
        nl: 'Dit verwijdert de InnerUs-momenten, opnames en verborgen thema’s die in iCloud staan voor dit Apple-account, en zet synchronisatie uit. Momenten op deze iPhone blijven hier. Andere apparaten houden hun eigen kopieën en stoppen met synchroniseren.',
      })}</TextBlock>
      {cloudOnly > 0 ? <StatusLine icon="warning" tone="destructive" text={t({
        en: `${cloudOnly === 1 ? '1 recording is' : `${cloudOnly} recordings are`} only in iCloud and not downloaded to this iPhone. ${cloudOnly === 1 ? 'It' : 'They'} will be lost. Download first to keep ${cloudOnly === 1 ? 'it' : 'them'}.`,
        nl: `${cloudOnly === 1 ? '1 opname staat' : `${cloudOnly} opnames staan`} alleen in iCloud en niet op deze iPhone. ${cloudOnly === 1 ? 'Die gaat' : 'Die gaan'} verloren. Download ${cloudOnly === 1 ? 'die' : 'ze'} eerst als je ${cloudOnly === 1 ? 'die' : 'ze'} wilt houden.`,
      })} /> : null}
      <TextBlock variant="supporting" secondary>{t({
        en: 'Exports you made stay where you shared them. This cannot be undone.',
        nl: 'Exports die je maakte blijven waar je ze deelde. Dit kan niet ongedaan worden gemaakt.',
      })}</TextBlock>
      <View style={{ gap: spacing.md }}>
        <Button variant="destructiveFilled" icon="trash" label={t({ en: 'Delete iCloud copies', nl: 'Verwijder iCloud-kopieën' })} loading={busy}
          loadingLabel={t({ en: 'Deleting…', nl: 'Verwijderen…' })} onPress={() => { void removeCloudCopies(); }} />
        <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} disabled={busy} onPress={() => setSheet(null)} />
      </View>
    </Sheet>

    <Sheet visible={sheet === 'storage'} onClose={() => setSheet(null)}>
      <SheetBadge icon="cloud" />
      <TextBlock variant="title">{t({ en: 'Your iCloud storage is full', nl: 'Je iCloud-opslag is vol' })}</TextBlock>
      <TextBlock variant="body" secondary>{t({
        en: 'Your latest changes are saved on this iPhone and will sync once there is space. To free space or upgrade, open the Settings app, tap your name, then iCloud and manage your storage.',
        nl: 'Je laatste wijzigingen zijn op deze iPhone bewaard en synchroniseren zodra er ruimte is. Wil je ruimte vrijmaken of meer opslag nemen? Open de app Instellingen, tik op je naam en dan op iCloud om je opslag te beheren.',
      })}</TextBlock>
      <View style={{ gap: spacing.md }}>
        <Button label={t({ en: 'Open Settings', nl: 'Open instellingen' })} onPress={() => { setSheet(null); void Linking.openSettings().catch(() => undefined); }} />
        <Button variant="secondary" label={t({ en: 'Close', nl: 'Sluiten' })} onPress={() => setSheet(null)} />
      </View>
    </Sheet>

    <Sheet visible={sheet === 'account'} onClose={() => { if (!busy) setSheet(null); }} dismissable={!busy}>
      <SheetBadge icon="shield" />
      <TextBlock variant="title">{t({ en: 'Sync with this Apple Account?', nl: 'Synchroniseren met dit Apple-account?' })}</TextBlock>
      <TextBlock variant="body" secondary>{t({
        en: 'Moments on this iPhone will be added to the iCloud of the Apple Account signed in now, and its InnerUs moments will appear here. To keep things separate instead, sign back in to the previous account.',
        nl: 'Momenten op deze iPhone worden toegevoegd aan de iCloud van het Apple-account dat nu is aangemeld, en de InnerUs-momenten van dat account verschijnen hier. Wil je alles gescheiden houden, meld je dan opnieuw aan met het vorige account.',
      })}</TextBlock>
      {cloudOnly > 0 ? <StatusLine icon="warning" tone="text" text={t({
        en: 'Recordings that were only in the previous account’s iCloud are no longer listed here.',
        nl: 'Opnames die alleen in de iCloud van het vorige account stonden, worden hier niet meer getoond.',
      })} /> : null}
      <View style={{ gap: spacing.md }}>
        <Button label={t({ en: 'Use this account', nl: 'Gebruik dit account' })} loading={busy} onPress={() => { void useThisAccount(); }} />
        <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} disabled={busy} onPress={() => setSheet(null)} />
      </View>
    </Sheet>
  </View>;
}
