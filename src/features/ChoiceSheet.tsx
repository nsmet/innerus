import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../design/Icon';
import { Button, Sheet, TextBlock } from '../design/primitives';
import { useDesign } from '../design/ThemeProvider';
import { geometry, spacing } from '../design/tokens';

export type Choice<T extends string | number> = { value: T; label: string; detail?: string };

/** A small bottom sheet with one full-width row per option; the current option carries a check. */
export function ChoiceSheet<T extends string | number>({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean;
  title: string;
  options: readonly Choice<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  const { palette, t } = useDesign();
  return <Sheet visible={visible} onClose={onClose}>
    <TextBlock variant="heading">{title}</TextBlock>
    <View>
      {options.map((option, index) => {
        const isSelected = option.value === selected;
        return <Pressable key={String(option.value)} accessibilityRole="button" accessibilityState={{ selected: isSelected }}
          accessibilityLabel={[option.label, option.detail].filter(Boolean).join('. ')}
          onPress={() => onSelect(option.value)}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: geometry.touch + 8, paddingVertical: spacing.sm,
            borderTopWidth: index > 0 ? 1 : 0, borderTopColor: palette.divider, opacity: pressed ? 0.7 : 1,
          })}>
          <View style={{ flex: 1, gap: 2 }}>
            <TextBlock variant="body" style={isSelected ? { fontWeight: '600' } : undefined}>{option.label}</TextBlock>
            {option.detail ? <TextBlock variant="supporting" secondary>{option.detail}</TextBlock> : null}
          </View>
          {isSelected ? <Icon name="check" color={palette.text} /> : <View style={{ width: 20 }} />}
        </Pressable>;
      })}
    </View>
    <Button variant="secondary" label={t({ en: 'Cancel', nl: 'Annuleren' })} onPress={onClose} />
  </Sheet>;
}
