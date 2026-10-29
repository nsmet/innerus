import { requireOptionalNativeModule } from 'expo';

/** Result of inspecting a path in the app container. */
export type PathReport = {
  exists: boolean;
  excludedFromBackup: boolean;
  /** iOS FileProtectionType raw value, or `android-app-private`. */
  protection: string;
  insideApplicationSupport: boolean;
  insideDocuments: boolean;
};

/**
 * One local capability. `state` is the honest product state; `detail` is a short
 * non-personal diagnostic string. Never contains user content.
 */
export type CapabilityState = 'ready' | 'needs-download' | 'downloading' | 'unsupported-device' | 'unsupported-language' | 'disabled-by-user' | 'not-ready' | 'unavailable' | 'unproven';
export type Capability = { state: CapabilityState; detail: string; languages?: Record<string, CapabilityState> };
export type CapabilityReport = {
  platform: 'ios' | 'android';
  osVersion: string;
  isSimulator: boolean;
  transcription: Capability;
  summary: Capability;
  checkedAt: string;
};

type NativeModule = {
  platform: 'ios' | 'android';
  osVersion: string;
  isSimulator: boolean;
  preparePrivateDirectory(): string;
  inspectPath(path: string): PathReport;
  protectFile(path: string): PathReport;
  probeCapabilities(languageTags: string[]): Promise<Omit<CapabilityReport, 'checkedAt'>>;
  probeCloudKit(): Promise<CloudKitReport>;
};

/** Result of the fictional CloudKit round trip (iOS development container only). */
export type CloudKitReport = {
  state: 'ready' | 'not-configured' | 'not-applicable' | 'icloud-unavailable' | 'quota-full' | 'offline' | 'mismatch' | 'error' | 'unavailable';
  detail?: string;
  container?: string;
  accountStatus?: string;
  roundTripMs?: number;
};

/** Null in Jest, Expo Go and web: callers must show an honest unavailable state. */
const native = requireOptionalNativeModule<NativeModule>('InnerUsPlatform');

export const isPlatformAdapterAvailable = native != null;

export function preparePrivateDirectory(): string {
  if (!native) throw new Error('InnerUs platform adapter unavailable (development build required)');
  return native.preparePrivateDirectory();
}

export function inspectPath(path: string): PathReport {
  if (!native) throw new Error('InnerUs platform adapter unavailable');
  return native.inspectPath(stripFileScheme(path));
}

export function protectFile(path: string): PathReport {
  if (!native) throw new Error('InnerUs platform adapter unavailable');
  return native.protectFile(stripFileScheme(path));
}

const unavailable: Capability = { state: 'unavailable', detail: 'native adapter not present' };

export async function probeCapabilities(languageTags: string[]): Promise<CapabilityReport> {
  const checkedAt = new Date().toISOString();
  if (!native) {
    return { platform: 'ios', osVersion: 'unknown', isSimulator: false, transcription: unavailable, summary: unavailable, checkedAt };
  }
  try {
    return { ...(await native.probeCapabilities(languageTags)), checkedAt };
  } catch {
    // A failed probe must degrade to the manual path, never to a remote service.
    return { platform: native.platform, osVersion: native.osVersion, isSimulator: native.isSimulator, transcription: { state: 'unavailable', detail: 'probe failed' }, summary: { state: 'unavailable', detail: 'probe failed' }, checkedAt };
  }
}

export function stripFileScheme(path: string): string {
  return path.startsWith('file://') ? decodeURIComponent(path.slice('file://'.length)) : path;
}

export async function probeCloudKit(): Promise<CloudKitReport> {
  if (!native) return { state: 'unavailable', detail: 'native adapter not present' };
  try { return await native.probeCloudKit(); } catch { return { state: 'error', detail: 'probe failed' }; }
}
