import React, { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AppStoreProvider, useAppStore } from './src/state/AppStore';
import { ThemeProvider } from './src/design/ThemeProvider';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppLockGate } from './src/features/AppLockGate';
import { AccessProvider } from './src/platform/access';
import { colors } from './src/design/tokens';
import { ErrorBoundary } from './src/features/ErrorBoundary';

// The launch screen (cup mark on ivory / plum, app.json) stays until fonts and private storage are ready,
// then fades into the first screen. A safety timer hides it regardless, so a slow start never looks frozen.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
try { SplashScreen.setOptions({ fade: true, duration: 250 }); } catch { /* older native module */ }
const hideSplash = () => { void SplashScreen.hideAsync().catch(() => undefined); };
const splashSafety = setTimeout(hideSplash, 4000);

/** The paper-coloured frame shown while starting; matches the launch screen in both appearances. */
function StartingFrame() {
  const scheme = useColorScheme();
  return <View style={{ flex: 1, backgroundColor: (scheme === 'dark' ? colors.dark : colors.light).canvas }} />;
}

function Root() {
  const { ready } = useAppStore();
  useEffect(() => {
    if (!ready) return;
    clearTimeout(splashSafety);
    hideSplash();
  }, [ready]);
  // Private storage opens in well under a second.
  if (!ready) return <StartingFrame />;
  return <AccessProvider><ThemeProvider><AppLockGate><AppNavigator /></AppLockGate></ThemeProvider></AccessProvider>;
}

export default function App() {
  const [loaded, error] = useFonts({
    SourceSerif4: require('./assets/fonts/SourceSerif4-Regular.ttf'),
    SourceSerif4Italic: require('./assets/fonts/SourceSerif4-Italic.ttf'),
  });
  if (!loaded && !error) return <StartingFrame />;
  return <SafeAreaProvider><ErrorBoundary><AppStoreProvider><Root /></AppStoreProvider></ErrorBoundary></SafeAreaProvider>;
}
