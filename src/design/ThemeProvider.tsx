import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import type { Language, Localized } from '../content/types';
import { useAppStore, type AppearancePref } from '../state/AppStore';
import { colors, offerColors, type ColorRoles } from './tokens';

type Design = {
  language: Language;
  scheme: 'light' | 'dark';
  palette: ColorRoles;
  appearance: AppearancePref;
  reduceMotion: boolean;
  /** Pick the current language from an inline pair: t({ en: 'Close', nl: 'Sluiten' }). */
  t: (text: Localized) => string;
};

const Context = createContext<Design | null>(null);

/** Resolves appearance and language from the device + stored preferences. */
export function ThemeProvider({ children }: React.PropsWithChildren) {
  const { prefs, language } = useAppStore();
  const system = useColorScheme();
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  const scheme = prefs.appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : prefs.appearance;
  const value = useMemo<Design>(() => ({
    language, scheme, palette: colors[scheme], appearance: prefs.appearance, reduceMotion,
    t: text => text[language],
  }), [language, scheme, prefs.appearance, reduceMotion]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDesign() {
  const value = useContext(Context);
  if (!value) throw new Error('Design components require ThemeProvider.');
  return value;
}

/**
 * Renders its children on the offer's evening palette (D29). Every shared component follows, because they all
 * read roles from this context. `scheme` becomes 'dark' so shadows switch off.
 */
export function OfferPalette({ children }: React.PropsWithChildren) {
  const design = useDesign();
  const value = useMemo<Design>(() => ({ ...design, palette: offerColors[design.scheme], scheme: 'dark' }), [design]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
