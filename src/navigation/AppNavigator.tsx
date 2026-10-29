import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { TonightScreen } from '../screens/TonightScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { MomentsScreen } from '../screens/MomentsScreen';
import { TopicScreen } from '../screens/TopicScreen';
import { ConversationScreen } from '../screens/ConversationScreen';
import { MomentSavedScreen } from '../screens/MomentSavedScreen';
import { QuickScreen } from '../screens/QuickScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { MomentDetailScreen } from '../screens/MomentDetailScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { AppTabBar } from '../design/Navigation';
import { useDesign } from '../design/ThemeProvider';
import { useLockNavigationMemory } from '../features/AppLockGate';
import type { Routes, Tabs } from './types';

const Stack = createNativeStackNavigator<Routes>();
const Tab = createBottomTabNavigator<Tabs>();
// Metro removes this branch in release builds (__DEV__ is false), so the gallery is never shipped.
// Open it with `npm run start:gallery` or a long press on the InnerUs wordmark in a development build.
const GalleryScreen = __DEV__ ? require('../dev/GalleryScreen').GalleryScreen : undefined;
const ProbeScreen = __DEV__ ? require('../dev/ProbeScreen').ProbeScreen : undefined;
/** Development-only start route: EXPO_PUBLIC_INNERUS_START=gallery|probe (see package.json scripts). */
const devStart = __DEV__ ? ({ gallery: 'Gallery', probe: 'Probe' } as const)[process.env.EXPO_PUBLIC_INNERUS_START as 'gallery' | 'probe'] : undefined;

function MainTabs() {
  return <Tab.Navigator tabBar={props => <AppTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'fade' }}>
    <Tab.Screen name="Tonight" component={TonightScreen} />
    <Tab.Screen name="Explore" component={ExploreScreen} />
    <Tab.Screen name="Moments" component={MomentsScreen} />
  </Tab.Navigator>;
}

export function AppNavigator() {
  const navigationMemory = useLockNavigationMemory();
  const { palette, scheme, reduceMotion } = useDesign();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const animation = reduceMotion ? 'fade' : 'default';
  return <>
    <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    <NavigationContainer initialState={navigationMemory.initialState} onStateChange={navigationMemory.onStateChange} theme={{ ...base, colors: { ...base.colors, background: palette.canvas, card: palette.canvas, text: palette.text, border: palette.divider, primary: palette.action } }}>
      <Stack.Navigator initialRouteName={devStart ?? 'Main'} screenOptions={{ headerShown: false, animation, contentStyle: { backgroundColor: palette.canvas } }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Topic" component={TopicScreen} />
        <Stack.Screen name="Conversation" component={ConversationScreen} options={{ animation: reduceMotion ? 'fade' : 'fade_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="MomentSaved" component={MomentSavedScreen} options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="Quick" component={QuickScreen} options={{ animation: reduceMotion ? 'fade' : 'fade_from_bottom' }} />
        <Stack.Screen name="Review" component={ReviewScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="MomentDetail" component={MomentDetailScreen} />
        <Stack.Screen name="Paywall" component={PaywallScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        {__DEV__ && GalleryScreen && <Stack.Screen name="Gallery" component={GalleryScreen} />}
        {__DEV__ && ProbeScreen && <Stack.Screen name="Probe" component={ProbeScreen} />}
      </Stack.Navigator>
    </NavigationContainer>
  </>;
}
