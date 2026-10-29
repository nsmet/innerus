import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Platform, StyleSheet, View, type AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import type { InitialState, NavigationState } from '@react-navigation/native';
import { Button, StatusLine, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, spacing, typography } from '../design/tokens';
import { useAppStore } from '../state/AppStore';

/** How long InnerUs may sit in the background before App lock asks again. */
const RELOCK_AFTER_MS = 30_000;

/** Whether the device has any security (biometrics or a passcode/PIN) that App lock can use. */
export async function deviceSecurityAvailable(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/** One platform authentication (Face ID / fingerprint with the device passcode as fallback). */
export async function authenticateWithDevice(promptMessage: string, cancelLabel: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: false });
    return result.success;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Navigation memory across a lock
// ---------------------------------------------------------------------------------------------
type NavigationMemory = {
  initialState: InitialState | undefined;
  onStateChange: (state: NavigationState | undefined) => void;
};
const NavigationMemoryContext = createContext<NavigationMemory | null>(null);

/**
 * Spread onto the NavigationContainer so the person returns to the same screen after unlocking:
 *   const memory = useLockNavigationMemory();
 *   <NavigationContainer initialState={memory.initialState} onStateChange={memory.onStateChange} …>
 * The state (route names and ids only) is kept in memory for this app run; it is never written to disk.
 * Without it, unlocking simply starts at the root screen.
 */
export function useLockNavigationMemory(): NavigationMemory {
  return useContext(NavigationMemoryContext) ?? { initialState: undefined, onStateChange: () => undefined };
}

/**
 * Optional App lock (spec 22/31/36): an operating-system privacy control, not an InnerUs account.
 *
 * - Locked (cold start, or back after more than 30 s in the background): the app's screens are UNMOUNTED, so no
 *   private text, open sheet or recording view exists in the view tree; only the lock screen renders. After
 *   unlocking, the navigator remounts and (with `useLockNavigationMemory`) restores the same screen. Saved data,
 *   drafts and an active conversation live in the repository, so remounting loses nothing that was saved.
 * - App switcher: while App lock is on, leaving the app (iOS `inactive`, then `background`) shows a full-screen
 *   cover in its own modal, above any open sheet, so the system snapshot holds no private content.
 */
export function AppLockGate({ children }: React.PropsWithChildren) {
  const { prefs, setPref } = useAppStore();
  const { palette, t } = useDesign();
  const [locked, setLocked] = useState(prefs.appLock);
  const [away, setAway] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const backgroundAt = useRef<number | null>(null);
  const lockOn = useRef(prefs.appLock);
  lockOn.current = prefs.appLock;

  const savedNavigation = useRef<InitialState | undefined>(undefined);
  const memory = useMemo<NavigationMemory>(() => ({
    get initialState() { return savedNavigation.current; },
    onStateChange: state => { savedNavigation.current = state as InitialState | undefined; },
  }), []);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'inactive') {
        setAway(true); // the snapshot is taken around here on iOS
      } else if (state === 'background') {
        if (backgroundAt.current === null) backgroundAt.current = Date.now();
        setAway(true);
      } else if (state === 'active') {
        setAway(false);
        const since = backgroundAt.current;
        backgroundAt.current = null;
        if (lockOn.current && since !== null && Date.now() - since > RELOCK_AFTER_MS) {
          setFailed(false);
          setLocked(true);
        }
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  // Turning the preference off in Settings releases the gate.
  useEffect(() => {
    if (!prefs.appLock) setLocked(false);
  }, [prefs.appLock]);

  const unlock = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    if (!(await deviceSecurityAvailable())) {
      // Device security was removed: the lock cannot work any more, so it is switched off.
      await setPref('appLock', false);
      setBusy(false);
      return;
    }
    const ok = await authenticateWithDevice(
      t({ en: 'Unlock InnerUs', nl: 'Ontgrendel InnerUs' }),
      t({ en: 'Cancel', nl: 'Annuleren' }),
    );
    setBusy(false);
    if (ok) setLocked(false); else setFailed(true);
  }, [setPref, t]);

  const isLocked = prefs.appLock && locked;
  const coverWhileAway = prefs.appLock && !isLocked && away;

  const message = Platform.OS === 'ios'
    ? t({ en: 'App lock is on. Use Face ID or your passcode to continue.', nl: 'App-vergrendeling staat aan. Gebruik Face ID of je toegangscode om verder te gaan.' })
    : t({ en: 'App lock is on. Use your fingerprint, face or screen lock to continue.', nl: 'App-vergrendeling staat aan. Gebruik je vingerafdruk, gezicht of schermvergrendeling om verder te gaan.' });

  const face = (withUnlock: boolean) => <View style={{ flex: 1, backgroundColor: palette.canvas }}>
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.page, paddingHorizontal: spacing.page, maxWidth: geometry.contentMax, width: '100%', alignSelf: 'center' }}>
        <TextBlock variant="display" center accessibilityRole="header">
          Inner<TextBlock variant="display" style={{ fontFamily: typography.invitation.fontFamily }}>Us</TextBlock>
        </TextBlock>
        <TextBlock variant="body" secondary center>{message}</TextBlock>
        {withUnlock ? <View style={{ alignSelf: 'stretch', gap: spacing.md }}>
          <Button label={t({ en: 'Unlock', nl: 'Ontgrendelen' })} icon="lock" loading={busy} onPress={() => { void unlock(); }} />
          {failed ? <View style={{ alignItems: 'center' }}>
            <StatusLine icon="warning" text={t({ en: 'Not unlocked. Try again when you are ready.', nl: 'Niet ontgrendeld. Probeer het opnieuw wanneer je klaar bent.' })} />
          </View> : null}
        </View> : null}
      </View>
    </SafeAreaView>
  </View>;

  // Locked: nothing private is mounted at all.
  if (isLocked) return face(true);

  return <NavigationMemoryContext.Provider value={memory}>
    <View style={{ flex: 1 }} importantForAccessibility={coverWhileAway ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={coverWhileAway}>
      {children}
    </View>
    {/* A plain cover for the screens, plus its own modal so an open sheet is covered in the snapshot too. */}
    {coverWhileAway ? <View style={StyleSheet.absoluteFill}>{face(false)}</View> : null}
    <Modal visible={coverWhileAway} animationType="none" transparent={false} statusBarTranslucent onRequestClose={() => undefined}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.canvas }]}>{face(false)}</View>
    </Modal>
  </NavigationMemoryContext.Provider>;
}
