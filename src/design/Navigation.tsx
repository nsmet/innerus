import React from 'react';
import { Pressable, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { TextBlock } from './primitives';
import { useDesign } from './ThemeProvider';
import { spacing } from './tokens';

/** DS02 app navigation: Tonight, Explore, Moments. Selected = weight, ink colour and a terracotta dot. */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { palette, t } = useDesign();
  const insets = useSafeAreaInsets();
  const tabs: Record<string, { label: string; icon: IconName }> = {
    Tonight: { label: t({ en: 'Tonight', nl: 'Vanavond' }), icon: 'home' },
    Explore: { label: t({ en: 'Explore', nl: 'Ontdekken' }), icon: 'compass' },
    Moments: { label: t({ en: 'Moments', nl: 'Momenten' }), icon: 'book' },
  };
  return <View style={{ flexDirection: 'row', paddingTop: 10, paddingBottom: Math.max(insets.bottom, spacing.sm), paddingHorizontal: spacing.md, backgroundColor: palette.canvas, borderTopColor: palette.divider, borderTopWidth: 1 }}>
    {state.routes.map((route, index) => {
      const selected = state.index === index;
      const tab = tabs[route.name];
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={tab.label}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: 'center', gap: 4, opacity: pressed ? 0.7 : 1 })}>
        <Icon name={tab.icon} color={selected ? palette.text : palette.secondary} size={24} strokeWidth={selected ? 1.8 : 1.5} />
        <TextBlock variant="tab" style={{ color: selected ? palette.text : palette.secondary, fontWeight: selected ? '700' : '500' }}>{tab.label}</TextBlock>
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: selected ? palette.accent : 'transparent' }} />
      </Pressable>;
    })}
  </View>;
}
