import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { getTopic } from '../content/catalogue';
import type { Attachment, Moment } from '../data/repository';
import { ArtTile, SceneArt } from '../design/Art';
import { Icon } from '../design/Icon';
import { EmptyState, formatClip, formatDay } from '../design/patterns';
import { momentSyncLine } from '../features/SyncSettingsSection';
import { Chip, Eyebrow, Screen, SearchField, Sheet, StatusLine, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, spacing } from '../design/tokens';
import type { TabProps } from '../navigation/types';
import { useAppStore, type MomentSyncState } from '../state/AppStore';

/** UI09 Moments library: newest first, local search, optional conversation filter, month sections (spec 21). */
export function MomentsScreen({ navigation }: TabProps<'Moments'>) {
  const { t, language } = useDesign();
  const { moments, attachments, repository, storageError, momentSyncState } = useAppStore();
  const [query, setQuery] = useState('');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Moment[] | null>(null);

  // Search stays entirely on the device (repository full-text index). Query text is never stored.
  useEffect(() => {
    const q = query.trim();
    if (!q || !repository) { setSearchResults(null); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      repository.searchMoments(q)
        .then(found => { if (!cancelled) setSearchResults(found); })
        .catch(() => { if (!cancelled) setSearchResults([]); });
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, repository, moments]);

  const topicsWithMoments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of moments) counts.set(m.topicId, (counts.get(m.topicId) ?? 0) + 1);
    return [...counts.entries()].map(([topicId, count]) => ({ topicId, count, title: getTopic(topicId)?.title[language] ?? t({ en: 'Earlier conversation', nl: 'Eerder gesprek' }) }));
  }, [moments, language, t]);

  // A filter for a topic whose moments were all deleted falls back to all conversations.
  useEffect(() => {
    if (topicFilter && !topicsWithMoments.some(x => x.topicId === topicFilter)) setTopicFilter(null);
  }, [topicFilter, topicsWithMoments]);

  const visible = useMemo(() => {
    const base = query.trim() ? (searchResults ?? []) : moments;
    return topicFilter ? base.filter(m => m.topicId === topicFilter) : base;
  }, [query, searchResults, moments, topicFilter]);

  const sections = useMemo(() => {
    const locale = language === 'nl' ? 'nl-BE' : 'en-GB';
    const out: { key: string; label: string; items: Moment[] }[] = [];
    for (const m of visible) {
      const d = new Date(m.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let section = out.find(s => s.key === key);
      if (!section) {
        section = { key, label: d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }).toUpperCase(), items: [] };
        out.push(section);
      }
      section.items.push(m);
    }
    return out;
  }, [visible, language]);

  const allLabel = t({ en: 'All conversations', nl: 'Alle gesprekken' });
  const filterLabel = topicFilter ? topicsWithMoments.find(x => x.topicId === topicFilter)?.title ?? allLabel : allLabel;
  const searching = query.trim().length > 0;
  const empty = moments.length === 0;

  return <Screen testID="moments-screen">
    <TextBlock variant="display" style={{ marginTop: spacing.lg }}>{t({ en: 'Moments', nl: 'Momenten' })}</TextBlock>
    <SearchField value={query} onChangeText={setQuery}
      placeholder={t({ en: 'Search your moments', nl: 'Zoek in je momenten' })} clearLabel={t({ en: 'Clear search', nl: 'Wis zoekopdracht' })} />
    <View style={{ flexDirection: 'row' }}>
      <Chip label={filterLabel} menu selected={topicFilter !== null} onPress={() => setFilterOpen(true)} />
    </View>

    {storageError && <StatusLine icon="warning" tone="text" text={t({ en: 'Private storage is unavailable on this device right now.', nl: 'Privéopslag is nu niet beschikbaar op dit apparaat.' })} />}

    {empty ? <EmptyState
      art={<View style={{ alignSelf: 'stretch' }}><SceneArt family="notebook" height={220} /></View>}
      title={t({ en: 'Your saved moments will gather here.', nl: 'Hier komen je bewaarde momenten.' })}
      detail={t({
        en: 'A moment can be a note, a short recording or a reviewed summary. Keep one whenever you like.',
        nl: 'Een moment kan een notitie zijn, een korte opname of een nagekeken samenvatting. Bewaar er een wanneer je wilt.',
      })}
      action={{ label: t({ en: 'Find a conversation', nl: 'Zoek een gesprek' }), onPress: () => navigation.navigate('Explore') }}
    /> : sections.length === 0 ? (searching && searchResults === null ? null : <EmptyState
      title={t({ en: 'No moments match yet.', nl: 'Nog geen passende momenten.' })}
      detail={t({ en: 'Try another word or show all conversations.', nl: 'Probeer een ander woord of toon alle gesprekken.' })}
      action={{ label: t({ en: 'Clear filters', nl: 'Wis filters' }), onPress: () => { setQuery(''); setTopicFilter(null); } }}
    />) : sections.map(section => <View key={section.key} style={{ marginTop: spacing.sm }}>
      <Eyebrow>{section.label}</Eyebrow>
      {section.items.map(m => <LibraryRow key={m.id} moment={m} attachments={attachments} syncState={momentSyncState(m.id)}
        onOpen={() => navigation.navigate('MomentDetail', { momentId: m.id })} />)}
    </View>)}


    <Sheet visible={filterOpen} onClose={() => setFilterOpen(false)}>
      <TextBlock variant="heading">{t({ en: 'Show moments from', nl: 'Toon momenten uit' })}</TextBlock>
      <View>
        <FilterRow label={allLabel} count={moments.length} selected={topicFilter === null} onPress={() => { setTopicFilter(null); setFilterOpen(false); }} />
        {topicsWithMoments.map(item => <FilterRow key={item.topicId} label={item.title} count={item.count} selected={topicFilter === item.topicId}
          onPress={() => { setTopicFilter(item.topicId); setFilterOpen(false); }} />)}
      </View>
    </Sheet>
  </Screen>;
}

/**
 * Library row (design "Moments"): same layout as the shared MomentRow, plus the truthful per-moment
 * sync line (Saved on this iPhone / Waiting to sync / Synced with iCloud).
 */
function LibraryRow({ moment, attachments, syncState, onOpen }: { moment: Moment; attachments: Attachment[]; syncState: MomentSyncState; onOpen: () => void }) {
  const { palette, language, t } = useDesign();
  const { sync } = useAppStore();
  const topic = getTopic(moment.topicId);
  const audio = attachments.find(a => a.momentId === moment.id && a.kind === 'audio');
  const isVoiceOnly = moment.source === 'audio' && !moment.body.trim();
  const preview = isVoiceOnly ? `${t({ en: 'Voice note', nl: 'Spraaknotitie' })} · ${formatClip(audio?.durationMs)}` : moment.body;
  const line = momentSyncLine(sync, syncState, true);
  return <Pressable accessibilityRole="button" onPress={onOpen} accessibilityLabel={`${moment.title}. ${formatDay(moment.createdAt, language)}. ${preview}. ${t(line.text)}`}
    style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.group, paddingVertical: spacing.group, borderBottomWidth: 1, borderBottomColor: palette.divider, opacity: pressed ? 0.75 : 1 })}>
    <ArtTile family={topic?.artFamily} size={48} height={60} rounded={8} missing={!topic} />
    <View style={{ flex: 1, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <TextBlock variant="rowTitle" style={{ flex: 1 }}>{moment.title}</TextBlock>
        <TextBlock variant="supporting" secondary>{formatDay(moment.createdAt, language)}</TextBlock>
      </View>
      <TextBlock variant="voice" style={{ fontSize: 15, lineHeight: 22 }} numberOfLines={3}>{preview}</TextBlock>
      {moment.source === 'reviewed-ai' && <StatusLine icon="document" text={t({ en: 'AI draft, reviewed by you', nl: 'AI-voorstel, door jou nagekeken' })} tone="text" />}
      {topic && <StatusLine icon={moment.source === 'audio' ? 'mic' : moment.source === 'reviewed-ai' ? 'document' : 'pen'} text={topic.title[language]} />}
      <StatusLine icon={line.icon} tone={line.tone ?? 'secondary'} text={t(line.text)} />
    </View>
  </Pressable>;
}

function FilterRow({ label, count, selected, onPress }: { label: string; count: number; selected: boolean; onPress: () => void }) {
  const { palette } = useDesign();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${label}, ${count}`} onPress={onPress}
    style={({ pressed }) => ({ minHeight: geometry.touch + 8, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: palette.divider, opacity: pressed ? 0.7 : 1 })}>
    <TextBlock variant="body" style={{ flex: 1, fontWeight: selected ? '600' : '400' }}>{label}</TextBlock>
    <TextBlock variant="meta" secondary>{String(count)}</TextBlock>
    <View style={{ width: 20 }}>{selected && <Icon name="check" color={palette.text} size={18} />}</View>
  </Pressable>;
}
