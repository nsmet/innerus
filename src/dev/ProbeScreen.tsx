import React, { useEffect, useState } from 'react';
import { File, Paths } from 'expo-file-system';
import { defaultDatabaseDirectory } from 'expo-sqlite';
import { inspectPath, isPlatformAdapterAvailable, probeCapabilities, probeCloudKit, protectFile } from '../../modules/innerus-platform';
import { openPrivateStore, PRIVATE_DATABASE_NAME } from '../data/openPrivateStore';
import { probeStore } from '../platform/store';
import { BackHeader, Screen, TextBlock } from '../design/primitives';
import type { StackProps } from '../navigation/types';

/**
 * Prompt 2 platform experiment (development builds only). Uses one FICTIONAL Moment and a fictional
 * attachment; never reads real user content. Results are written to the cache directory as
 * `innerus-probe-results.json` so scripts/mac/ios-verify.sh can collect them from the simulator.
 */
const FICTIONAL_ID = 'probe-fictional-moment';
export const PROBE_RESULTS_FILE = 'innerus-probe-results.json';

type Step = { name: string; ok: boolean; detail: unknown };

async function runProbe(): Promise<{ steps: Step[]; summary: string }> {
  const steps: Step[] = [];
  const step = async (name: string, task: () => Promise<unknown> | unknown) => {
    try { steps.push({ name, ok: true, detail: await task() }); } catch (error) { steps.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) }); }
  };
  await step('adapter', () => ({ available: isPlatformAdapterAvailable }));
  let directory = '';
  let persistedFromPreviousLaunch = false;
  await step('private-store', async () => {
    const opened = await openPrivateStore();
    directory = opened.directory;
    persistedFromPreviousLaunch = (await opened.repository.getMoment(FICTIONAL_ID)) != null;
    const saved = await opened.repository.saveMoment({
      id: FICTIONAL_ID, topicId: 'A01', topicVersion: '1.0', promptId: 'A01-03',
      questionSnapshot: 'What tiny detail from that day has stayed with you?', contentLanguage: 'en',
      title: 'Fictional probe', body: 'Fictional text for the storage experiment — café, niet echt.', source: 'typed', participantLabel: null,
    });
    const search = await opened.repository.searchMoments('cafe');
    return { persistedFromPreviousLaunch, savedBodyMatches: saved.body.includes('café'), searchHits: search.length, count: (await opened.repository.listMoments()).length };
  });
  await step('private-directory', () => inspectPath(directory));
  await step('database-file', () => inspectPath(`${directory}/${PRIVATE_DATABASE_NAME}`));
  await step('attachment-file', async () => {
    const file = new File(`file://${directory}/probe-fictional-attachment.txt`);
    if (!file.exists) file.create();
    await file.write('Fictional attachment bytes');
    return protectFile(file.uri);
  });
  await step('expo-sqlite-default-directory (not used)', () => ({ path: defaultDatabaseDirectory, note: 'Documents/SQLite or filesDir/SQLite is backed up by default; InnerUs does not store here.' }));
  await step('capabilities', () => probeCapabilities(['en-US', 'nl-NL', 'nl-BE']));
  await step('cloudkit', () => probeCloudKit());
  await step('store', () => probeStore());
  const failed = steps.filter(s => !s.ok).map(s => s.name);
  const summary = failed.length ? `FAILED: ${failed.join(', ')}` : `ALL STEPS OK · persisted from previous launch: ${persistedFromPreviousLaunch}`;
  try {
    const out = new File(Paths.cache, PROBE_RESULTS_FILE);
    if (!out.exists) out.create();
    await out.write(JSON.stringify({ at: new Date().toISOString(), summary, steps }, null, 2));
  } catch { /* results still shown on screen */ }
  return { steps, summary };
}

export function ProbeScreen({ navigation }: StackProps<'Probe'>) {
  const [result, setResult] = useState<{ steps: Step[]; summary: string } | null>(null);
  useEffect(() => { void runProbe().then(setResult); }, []);
  return <Screen testID="probe-screen">
    <BackHeader label="InnerUs · Development" onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.replace('Main')} />
    <TextBlock variant="title">Platform probe</TextBlock>
    <TextBlock secondary>Fictional data only. Not a device or privacy certification.</TextBlock>
    <TextBlock testID="probe-summary" variant="control">{result ? result.summary : 'Running…'}</TextBlock>
    {result?.steps.map(s => <TextBlock key={s.name} variant="supporting" selectable>{`${s.ok ? '✓' : '✗'} ${s.name}\n${JSON.stringify(s.detail, null, 1)}`}</TextBlock>)}
  </Screen>;
}
