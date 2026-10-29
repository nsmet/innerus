import React from 'react';
import { Platform, View } from 'react-native';
import type { Localized } from '../content/types';
import { Icon, type IconName } from '../design/Icon';
import { BackHeader, Divider, Screen, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { spacing } from '../design/tokens';
import type { StackProps } from '../navigation/types';
import { SUPPORT_EMAIL } from '../content/links';

/** Offline help (spec 11/30/35): bundled with the app, no web view, no network. */
type Section = { icon: IconName; eyebrow: Localized; title: Localized; body: Localized[] };

const ios = Platform.OS === 'ios';
const device: Localized = ios ? { en: 'this iPhone', nl: 'deze iPhone' } : { en: 'this device', nl: 'dit apparaat' };
const on = (text: (d: string) => string, textNl: (d: string) => string): Localized => ({ en: text(device.en), nl: textNl(device.nl) });

const how: { title: Localized; intro: Localized; sections: Section[] } = {
  title: { en: 'How this works', nl: 'Zo werkt het' },
  intro: {
    en: 'InnerUs gives the two of you a calm place for good conversations. Here is what it does, and what it never does.',
    nl: 'InnerUs geeft jullie samen een rustige plek voor goede gesprekken. Dit is wat het doet, en wat het nooit doet.',
  },
  sections: [
    {
      icon: 'shield', eyebrow: { en: 'No account', nl: 'Geen account' }, title: { en: 'Just open it and start', nl: 'Gewoon openen en beginnen' },
      body: [{ en: 'There is no InnerUs account, no sign-up and no email address. InnerUs never asks for names, dates, contacts, photos or your location.', nl: 'Er is geen InnerUs-account, geen registratie en geen e-mailadres. InnerUs vraagt nooit om namen, datums, contacten, foto’s of je locatie.' }],
    },
    {
      icon: 'book', eyebrow: { en: 'Conversations', nl: 'Gesprekken' }, title: { en: 'Written ahead, inside the app', nl: 'Vooraf geschreven, in de app' },
      body: [
        { en: 'Every conversation is written by people and comes with the app, so it works offline.', nl: 'Elk gesprek is door mensen geschreven en zit in de app, dus het werkt ook offline.' },
        { en: 'Nothing advances on its own. You choose when to go a little further, skip a question or stop. There are no timers and no scores.', nl: 'Niets gaat vanzelf verder. Je kiest zelf wanneer je een stukje verder gaat, een vraag overslaat of stopt. Er zijn geen timers en geen scores.' },
      ],
    },
    {
      icon: 'pen', eyebrow: { en: 'Moments', nl: 'Momenten' }, title: { en: 'Only what you choose to keep', nl: 'Alleen wat je wilt bewaren' },
      body: [{ en: 'Keeping a moment is always optional. A conversation is complete without saving anything.', nl: 'Een moment bewaren is altijd optioneel. Een gesprek is compleet, ook als je niets bewaart.' }],
    },
    {
      icon: 'mic', eyebrow: { en: 'Recording', nl: 'Opnemen' }, title: { en: 'Only when you press record', nl: 'Alleen als jij op opnemen drukt' },
      body: [
        { en: 'InnerUs asks for the microphone only when you choose to record an answer, and never records by itself.', nl: 'InnerUs vraagt pas toegang tot de microfoon als jij ervoor kiest een antwoord op te nemen, en neemt nooit vanzelf op.' },
        on(d => `Turning speech into text and making a short draft memory happen on ${d}, when it supports it. Your words are not sent anywhere for processing.`, d => `Spraak omzetten naar tekst en een korte herinnering voorstellen gebeurt op ${d}, als dat wordt ondersteund. Je woorden worden nergens naartoe gestuurd om verwerkt te worden.`),
      ],
    },
    {
      icon: 'share', eyebrow: { en: 'Export', nl: 'Exporteren' }, title: { en: 'Your own copy, when you want it', nl: 'Je eigen kopie, wanneer je wilt' },
      body: [{ en: 'Export creates a copy outside InnerUs through the share sheet. You choose where it goes.', nl: 'Exporteren maakt via het deelmenu een kopie buiten InnerUs. Jij kiest waar die naartoe gaat.' }],
    },
    {
      icon: 'help', eyebrow: { en: 'Contact', nl: 'Contact' }, title: { en: 'Questions or ideas', nl: 'Vragen of ideeën' },
      body: [
        {
          en: `Email ${SUPPORT_EMAIL}. Nothing from the app is sent with it unless you choose to add it yourself, and we never need the content of your conversations or moments to help.`,
          nl: `Mail naar ${SUPPORT_EMAIL}. Er wordt niets uit de app meegestuurd, tenzij je dat zelf toevoegt, en we hebben de inhoud van je gesprekken of momenten nooit nodig om te helpen.`,
        },
        { en: 'Answers to common questions and the privacy policy are on innerus.app.', nl: 'Antwoorden op veelgestelde vragen en het privacybeleid staan op innerus.app.' },
      ],
    },
  ],
};

const data: { title: Localized; intro: Localized; sections: Section[] } = {
  title: { en: 'Where your data goes', nl: 'Waar je gegevens naartoe gaan' },
  intro: {
    en: 'InnerUs has no account and no server for your personal content. This is where everything lives.',
    nl: 'InnerUs heeft geen account en geen server voor je persoonlijke inhoud. Hier staat alles.',
  },
  sections: [
    {
      icon: 'device', eyebrow: on(d => `On ${d}`, d => `Op ${d}`), title: ios ? { en: 'Everything personal is kept here', nl: 'Alles wat persoonlijk is wordt hier bewaard' } : { en: 'Everything personal stays here', nl: 'Alles wat persoonlijk is blijft hier' },
      body: [
        { en: 'The conversations themselves, where you are in a conversation, unsaved drafts, your Moments and notes, and any recordings you chose to keep.', nl: 'De gesprekken zelf, waar je in een gesprek bent, niet-bewaarde concepten, je momenten en notities, en opnames die je wilde bewaren.' },
        { en: 'This private storage is kept out of automatic device backups, so it does not leave through a backup either. Private sync or an export you make yourself is the way to keep a copy.', nl: 'Deze privéopslag valt buiten de automatische back-ups van het apparaat, dus ook via een back-up gaat er niets naar buiten. Privésynchronisatie of een export die je zelf maakt is de manier om een kopie te houden.' },
        { en: 'Recording drafts expire after 24 hours and are removed at the next app cleanup.', nl: 'Opnameconcepten vervallen na 24 uur en worden bij de volgende opruiming in de app verwijderd.' },
      ],
    },
    ...(ios ? [{
      icon: 'cloud' as IconName, eyebrow: { en: 'Optional', nl: 'Optioneel' }, title: { en: 'Private iCloud sync', nl: 'Privésynchronisatie via iCloud' },
      body: [
        { en: 'Saved moments, recordings you chose to keep and hidden themes can sync through your own private iCloud, so they appear on your other devices with the same Apple Account. Conversations in progress, unsaved drafts and settings such as language, appearance, app lock and reminders stay on each device.', nl: 'Bewaarde momenten, opnames die je wilde bewaren en verborgen thema’s kunnen synchroniseren via je eigen privé-iCloud, zodat ze op je andere apparaten met hetzelfde Apple-account verschijnen. Lopende gesprekken, niet-bewaarde concepten en instellingen zoals taal, weergave, app-vergrendeling en herinneringen blijven op elk apparaat.' },
        { en: 'There are two switches. “Sync with iCloud” in InnerUs Settings is your choice for this app. Apple’s iCloud setting in the Settings app is separate: if iCloud is off there or you are not signed in, InnerUs keeps working on this iPhone and says that sync is unavailable.', nl: 'Er zijn twee schakelaars. “Synchroniseer met iCloud” in de instellingen van InnerUs is jouw keuze voor deze app. De iCloud-instelling van Apple in de app Instellingen staat los daarvan: staat iCloud daar uit of ben je niet aangemeld, dan blijft InnerUs werken op deze iPhone en meldt het dat synchronisatie niet beschikbaar is.' },
        { en: 'Sync is not instant. “Waiting to sync” means a change is saved on this iPhone and will reach iCloud later; it is not a backup yet. “Synced with iCloud” appears only after iCloud confirmed it. Offline, everything keeps working and syncs when you are connected again.', nl: 'Synchronisatie gebeurt niet meteen. “Wacht op synchronisatie” betekent dat een wijziging op deze iPhone is bewaard en later iCloud bereikt; het is nog geen back-up. “Gesynchroniseerd met iCloud” verschijnt pas als iCloud het heeft bevestigd. Offline blijft alles werken en synchroniseert het zodra je weer verbonden bent.' },
        { en: 'Private sync covers one Apple Account. If the two of you use different Apple Accounts, your libraries are not shared automatically.', nl: 'Privésynchronisatie geldt voor één Apple-account. Gebruiken jullie elk een ander Apple-account, dan worden jullie bibliotheken niet automatisch gedeeld.' },
        { en: 'On a new iPhone, your moments return first; a recording downloads when you choose to play it. If the Apple Account on this iPhone changes, InnerUs pauses sync and never uploads your moments into the new account unless you choose that.', nl: 'Op een nieuwe iPhone komen je momenten eerst terug; een opname wordt gedownload als je ze wilt afspelen. Verandert het Apple-account op deze iPhone, dan pauzeert InnerUs de synchronisatie en uploadt het je momenten nooit naar het nieuwe account, tenzij je daarvoor kiest.' },
        { en: 'Turning sync off stops new syncing. It does not automatically delete your saved cloud copies; “Delete iCloud copies” in Settings is a separate choice. Deleting a moment also asks iCloud to remove it; offline, that waits for a connection.', nl: 'Als je synchronisatie uitzet, stopt nieuwe synchronisatie. Bestaande cloudkopieën worden niet automatisch verwijderd; “Verwijder iCloud-kopieën” in Instellingen is een aparte keuze. Een moment verwijderen vraagt iCloud ook om het te verwijderen; offline wacht dat op een verbinding.' },
        { en: 'Apple encrypts iCloud data in transit and on its servers. Your note text is stored in encrypted CloudKit fields; with Advanced Data Protection turned on, those fields and recordings are end-to-end encrypted. InnerUs itself has no server and cannot read them.', nl: 'Apple versleutelt iCloud-gegevens onderweg en op zijn servers. De tekst van je notities staat in versleutelde CloudKit-velden; met Geavanceerde gegevensbescherming aan zijn die velden en opnames end-to-end versleuteld. InnerUs heeft zelf geen server en kan ze niet lezen.' },
      ],
    }] : [{
      icon: 'cloudOff' as IconName, eyebrow: { en: 'Local only', nl: 'Alleen lokaal' }, title: { en: 'No cloud sync on Android', nl: 'Geen cloudsynchronisatie op Android' },
      body: [{ en: 'Local-only storage. Export anything you want an independent copy of.', nl: 'Alleen lokale opslag. Exporteer wat je als losse kopie wilt bewaren.' }],
    }]),
    {
      icon: 'globe', eyebrow: { en: 'Platform services', nl: 'Platformdiensten' }, title: { en: 'What the store handles', nl: 'Wat de winkel regelt' },
      body: [
        { en: `${ios ? 'Apple' : 'Google'} handles purchases and app updates, and any optional speech or language downloads the system offers. Those services do not receive your Moments, notes or recordings${ios ? ', apart from your own private iCloud when sync is on' : ''}.`, nl: `${ios ? 'Apple' : 'Google'} regelt aankopen en app-updates, en eventuele optionele spraak- of taaldownloads van het systeem. Die diensten krijgen je momenten, notities of opnames niet${ios ? ', behalve je eigen privé-iCloud als synchronisatie aan staat' : ''}.` },
        { en: 'Your personal content is never sent anywhere for processing. There is no analytics or advertising tracking, and reminders never mention a topic or an answer.', nl: 'Je persoonlijke inhoud wordt nooit ergens naartoe gestuurd om verwerkt te worden. Er is geen analyse- of advertentietracking, en herinneringen noemen nooit een onderwerp of antwoord.' },
      ],
    },
    {
      icon: 'share', eyebrow: { en: 'When you choose', nl: 'Wanneer jij kiest' }, title: { en: 'Exports', nl: 'Exports' },
      body: [{ en: 'Something leaves InnerUs only when you export or share it yourself. Exports create a copy outside InnerUs that the app can no longer remove.', nl: 'Iets verlaat InnerUs alleen als je het zelf exporteert of deelt. Een export maakt een kopie buiten InnerUs die de app niet meer kan verwijderen.' }],
    },
  ],
};

export function HelpScreen({ navigation, route }: StackProps<'Help'>) {
  const { palette, t } = useDesign();
  const content = route.params.topic === 'data' ? data : how;
  const state = navigation.getState();
  const previous = state.routes[state.index - 1]?.name;
  const backLabel = previous === 'Settings' ? t({ en: 'Settings', nl: 'Instellingen' }) : t({ en: 'Back', nl: 'Terug' });

  return <Screen header={<BackHeader label={backLabel} onBack={() => navigation.goBack()} />}>
    <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
      <TextBlock variant="display">{t(content.title)}</TextBlock>
      <TextBlock variant="invitation" secondary>{t(content.intro)}</TextBlock>
    </View>
    {content.sections.map((section, index) => <View key={section.eyebrow.en} style={{ gap: spacing.md }}>
      {index > 0 ? <Divider /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon name={section.icon} color={palette.secondary} size={16} />
        <TextBlock variant="eyebrow" secondary style={{ flexShrink: 1 }}>{t(section.eyebrow)}</TextBlock>
      </View>
      <TextBlock variant="heading">{t(section.title)}</TextBlock>
      {section.body.map(paragraph => <TextBlock key={paragraph.en} variant="body">{t(paragraph)}</TextBlock>)}
    </View>)}
  </Screen>;
}
