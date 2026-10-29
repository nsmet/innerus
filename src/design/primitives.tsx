import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
  useWindowDimensions, type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useDesign } from './ThemeProvider';
import { geometry, motion, radius, shadow, spacing, typography, type TextVariant } from './tokens';
import { Icon, type IconName } from './Icon';

// ---------------------------------------------------------------------------------------------
// DS03 Text
// ---------------------------------------------------------------------------------------------
type Tone = 'text' | 'secondary' | 'destructive' | 'actionText' | 'accent';
export type TextBlockProps = Omit<TextProps, 'role'> & { variant?: TextVariant; tone?: Tone; secondary?: boolean; center?: boolean };

/** Native text that scales with the platform setting (no maximum) and never truncates by default. */
export function TextBlock({ variant = 'body', tone, secondary, center, style, ...props }: TextBlockProps) {
  const { palette } = useDesign();
  const color = palette[secondary ? 'secondary' : tone ?? 'text'];
  const header = variant === 'display' || variant === 'title' || variant === 'prompt' || variant === 'heading';
  return <Text accessibilityRole={header ? 'header' : undefined} {...props} style={[typography[variant], { color }, center && { textAlign: 'center' }, style]} />;
}

/** Tracked eyebrow. `framed` adds the terracotta hairlines used for centred chapter labels. */
export function Eyebrow({ children, framed = false, center = false }: { children: string; framed?: boolean; center?: boolean }) {
  const { palette } = useDesign();
  if (!framed) return <TextBlock variant="eyebrow" secondary center={center}>{children}</TextBlock>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
    <View style={{ width: 20, height: 1, backgroundColor: palette.accent }} />
    <TextBlock variant="eyebrow" secondary center style={{ flexShrink: 1 }}>{children}</TextBlock>
    <View style={{ width: 20, height: 1, backgroundColor: palette.accent }} />
  </View>;
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { palette } = useDesign();
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: palette.divider }, style]} />;
}

// ---------------------------------------------------------------------------------------------
// DS01 Screen frame
// ---------------------------------------------------------------------------------------------
/**
 * Safe areas, scrolling, keyboard accommodation and the compact 16-dp inset under 360 dp.
 * `footer` stays pinned under the content (primary actions); `scroll={false}` for fixed layouts.
 */
export function Screen({ children, footer, header, scroll = true, testID, contentStyle, edges = ['top'] }: React.PropsWithChildren<{
  footer?: React.ReactNode; header?: React.ReactNode; scroll?: boolean; testID?: string; contentStyle?: StyleProp<ViewStyle>; edges?: ('top' | 'bottom')[];
}>) {
  const { palette } = useDesign();
  const { width } = useWindowDimensions();
  const inset = width < 360 ? spacing.group : spacing.page;
  const inner: StyleProp<ViewStyle> = [{ width: '100%', maxWidth: geometry.contentMax, alignSelf: 'center', paddingHorizontal: inset, gap: spacing.group }, contentStyle];
  return <SafeAreaView testID={testID} edges={[...edges, 'left', 'right']} style={{ flex: 1, backgroundColor: palette.canvas }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {header && <View style={{ width: '100%', maxWidth: geometry.contentMax, alignSelf: 'center', paddingHorizontal: inset }}>{header}</View>}
      {scroll
        ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: footer ? spacing.group : spacing.xl }}><View style={[inner, { flexGrow: 1 }]}>{children}</View></ScrollView>
        : <View style={[inner, { flex: 1 }]}>{children}</View>}
      {footer && <View style={{ width: '100%', maxWidth: geometry.contentMax, alignSelf: 'center', paddingHorizontal: inset, paddingBottom: spacing.md, gap: spacing.sm }}>{footer}</View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

// ---------------------------------------------------------------------------------------------
// DS04 Action button
// ---------------------------------------------------------------------------------------------
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive' | 'destructiveFilled';
export function Button({ label, onPress, variant = 'primary', icon, trailingArrow = false, loading = false, loadingLabel, disabled = false, reason, testID, accessibilityLabel, underline }: {
  label: string; onPress: () => void; variant?: ButtonVariant; icon?: IconName; trailingArrow?: boolean; loading?: boolean; loadingLabel?: string;
  disabled?: boolean; reason?: string; testID?: string; accessibilityLabel?: string; underline?: boolean;
}) {
  const { palette, scheme } = useDesign();
  const busy = loading;
  const blocked = busy || disabled;
  const quiet = variant === 'quiet';
  const fg = disabled ? palette.disabledText
    : variant === 'primary' ? palette.actionText
    : variant === 'destructiveFilled' ? '#FFFFFF'
    : variant === 'destructive' ? palette.destructive
    : palette.text;
  const bg = disabled && !quiet ? palette.disabledFill
    : variant === 'primary' ? palette.action
    : variant === 'destructiveFilled' ? (scheme === 'dark' ? '#B5463C' : palette.destructive)
    : 'transparent';
  const border = variant === 'secondary' ? palette.outline : variant === 'destructive' ? palette.destructive : 'transparent';
  const text = busy && loadingLabel ? loadingLabel : label;
  return <View style={{ gap: spacing.xs, alignSelf: quiet ? 'center' : 'stretch' }}>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ disabled: blocked, busy }} disabled={blocked} onPress={onPress}
      style={({ pressed }) => [{
        minHeight: quiet ? geometry.touch : geometry.button, paddingHorizontal: quiet ? spacing.sm : spacing.page - 4, borderRadius: radius.control,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm + 2,
        backgroundColor: bg, borderWidth: border === 'transparent' ? 0 : 1, borderColor: border,
        opacity: pressed ? 0.8 : busy ? 0.75 : 1,
      }, variant === 'primary' && !disabled && shadow(scheme)]}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} color={fg} /> : null}
      <Text style={[quiet ? typography.label : typography.control, { color: fg, textAlign: 'center', flexShrink: 1 },
        quiet && (underline ?? !icon) && { textDecorationLine: 'underline' }]}>{text}</Text>
      {trailingArrow && !busy && <Icon name="arrow" color={fg} />}
    </Pressable>
    {disabled && reason ? <TextBlock variant="supporting" secondary center>{reason}</TextBlock> : null}
  </View>;
}

// ---------------------------------------------------------------------------------------------
// DS05 Icon action
// ---------------------------------------------------------------------------------------------
export function IconButton({ name, label, onPress, filled, color, size = 22 }: { name: IconName; label: string; onPress: () => void; filled?: boolean; color?: string; size?: number }) {
  const { palette } = useDesign();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={filled !== undefined ? { selected: filled } : undefined} onPress={onPress} hitSlop={4}
    style={({ pressed }) => ({ width: geometry.touch, height: geometry.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, opacity: pressed ? 0.6 : 1 })}>
    <Icon name={name} color={color ?? palette.text} size={size} filled={filled} />
  </Pressable>;
}

// ---------------------------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------------------------
/** Conversation header: "Close" on the left, the topic in italic serif centred. */
export function CloseHeader({ title, onClose, closeLabel, right }: { title?: string; onClose: () => void; closeLabel: string; right?: React.ReactNode }) {
  const { palette } = useDesign();
  return <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: geometry.touch, marginTop: spacing.sm }}>
    <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} hitSlop={6} style={({ pressed }) => ({ width: 96, minHeight: geometry.touch, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
      <Icon name="close" color={palette.text} />
      <TextBlock variant="label">{closeLabel}</TextBlock>
    </Pressable>
    <TextBlock variant="voice" secondary center style={{ flex: 1, fontSize: 16 }} numberOfLines={1}>{title ?? ''}</TextBlock>
    <View style={{ width: 96, alignItems: 'flex-end' }}>{right}</View>
  </View>;
}

/** Back header: chevron + the previous screen's name; optional icon actions on the right. */
export function BackHeader({ label, onBack, right }: { label: string; onBack: () => void; right?: React.ReactNode }) {
  const { palette } = useDesign();
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: geometry.touch, marginTop: spacing.sm }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onBack} hitSlop={6} style={({ pressed }) => ({ minHeight: geometry.touch, flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -6, opacity: pressed ? 0.6 : 1 })}>
      <Icon name="back" color={palette.text} />
      <TextBlock variant="label">{label}</TextBlock>
    </Pressable>
    <View style={{ flexDirection: 'row', marginRight: -10 }}>{right}</View>
  </View>;
}

// ---------------------------------------------------------------------------------------------
// Surfaces and small parts
// ---------------------------------------------------------------------------------------------
export function WarmCard({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { palette } = useDesign();
  return <View style={[{ backgroundColor: palette.warm, borderRadius: radius.group, padding: spacing.group }, style]}>{children}</View>;
}

/** DS19 status line: label + symbol, never colour alone. */
export function StatusLine({ icon, text, tone = 'secondary', emphasis = false }: { icon: IconName; text: string; tone?: 'secondary' | 'text' | 'destructive'; emphasis?: boolean }) {
  const { palette } = useDesign();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible accessibilityLabel={text}>
    <Icon name={icon} color={palette[tone]} size={emphasis ? 14 : 15} />
    <TextBlock variant="supporting" tone={tone} style={emphasis ? { fontSize: 12, fontWeight: '600' } : undefined}>{text}</TextBlock>
  </View>;
}

/** DS07 chip: selection uses fill, check and weight. `menu` adds a chevron (opens a choice sheet). */
export function Chip({ label, selected = false, onPress, menu = false }: { label: string; selected?: boolean; onPress: () => void; menu?: boolean }) {
  const { palette } = useDesign();
  const fg = selected ? palette.actionText : palette.text;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ minHeight: geometry.touch, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radius.control,
      backgroundColor: selected ? palette.action : 'transparent', borderWidth: 1, borderColor: selected ? palette.action : palette.divider, opacity: pressed ? 0.75 : 1 })}>
    {selected && <Icon name="check" color={fg} size={16} />}
    <Text style={[typography.label, { color: fg, fontWeight: selected ? '600' : '500' }]}>{label}</Text>
    {menu && <Icon name="chevronDown" color={fg} size={16} />}
  </Pressable>;
}

/** DS06 search field. Queries stay on the device. Private views opt out of system text suggestions. */
export function SearchField({ value, onChangeText, placeholder, clearLabel }: { value: string; onChangeText: (v: string) => void; placeholder: string; clearLabel: string }) {
  const { palette } = useDesign();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, borderRadius: radius.control, backgroundColor: palette.warm, paddingLeft: 14, borderWidth: 1, borderColor: palette.divider }}>
    <Icon name="search" color={palette.secondary} size={18} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.secondary} accessibilityLabel={placeholder}
      autoCorrect={false} autoCapitalize="none" returnKeyType="search" style={[typography.body, { flex: 1, color: palette.text, paddingVertical: 10 }]} />
    {value.length > 0 && <IconButton name="close" label={clearLabel} onPress={() => onChangeText('')} size={18} />}
  </View>;
}

/** Multiline private text input (notes, transcripts). Opts out of autocorrect/suggestions where possible (spec 31). */
export function NoteField({ value, onChangeText, placeholder, label, minHeight = 120, autoFocus }: { value: string; onChangeText: (v: string) => void; placeholder: string; label: string; minHeight?: number; autoFocus?: boolean }) {
  const { palette } = useDesign();
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.secondary} accessibilityLabel={label}
    multiline autoFocus={autoFocus} autoCorrect={false} spellCheck={false} textAlignVertical="top" importantForAutofill="no" autoComplete="off"
    style={[typography.voice, { minHeight, color: palette.text, borderWidth: 1, borderColor: palette.outline, borderRadius: radius.control, padding: 14, fontFamily: typography.rowTitle.fontFamily, fontStyle: 'normal' }]} />;
}

// ---------------------------------------------------------------------------------------------
// DS21 Preference rows
// ---------------------------------------------------------------------------------------------
export function ListGroup({ children, title }: React.PropsWithChildren<{ title?: string }>) {
  const { palette } = useDesign();
  const items = React.Children.toArray(children).filter(Boolean);
  // Design Settings: eyebrow 22 pt below the previous group (screen gap + 6), 8 pt above its own, indented 4 pt.
  return <View style={{ gap: spacing.sm, marginTop: title ? 6 : 0 }}>
    {title ? <TextBlock variant="eyebrow" secondary style={{ marginLeft: 4 }}>{title}</TextBlock> : null}
    <View style={{ borderRadius: radius.group, borderWidth: 1, borderColor: palette.divider, backgroundColor: palette.raised, overflow: 'hidden' }}>
      {items.map((child, i) => <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: palette.divider } : undefined}>{child}</View>)}
    </View>
  </View>;
}

/** Design preference rows: 58 pt content + 8 pt padding above and below. */
const rowHeight = 74;

export function ListRow({ icon, title, detail, value, onPress, destructive, chevron = !!onPress, disabled, accessibilityHint }: {
  icon?: IconName; title: string; detail?: string; value?: string; onPress?: () => void; destructive?: boolean; chevron?: boolean; disabled?: boolean; accessibilityHint?: string;
}) {
  const { palette } = useDesign();
  const fg = destructive ? palette.destructive : disabled ? palette.disabledText : palette.text;
  const content = <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: rowHeight, paddingHorizontal: spacing.group, paddingVertical: spacing.sm }}>
    {icon && <Icon name={icon} color={fg} />}
    <View style={{ flex: 1, gap: 2 }}>
      <TextBlock variant="body" style={{ color: fg, lineHeight: 22 }}>{title}</TextBlock>
      {detail ? <TextBlock variant="supporting" secondary>{detail}</TextBlock> : null}
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '45%' }}>
      {value ? <TextBlock variant="label" secondary style={{ fontWeight: '400', textAlign: 'right', flexShrink: 1 }}>{value}</TextBlock> : null}
      {chevron && <Icon name="chevronRight" color={palette.secondary} size={16} />}
    </View>
  </View>;
  if (!onPress) return <View accessible accessibilityLabel={[title, detail, value].filter(Boolean).join('. ')}>{content}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={[title, value].filter(Boolean).join(', ')} accessibilityHint={accessibilityHint ?? detail} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ backgroundColor: pressed ? palette.warm : 'transparent' })}>{content}</Pressable>;
}

/** Toggle rows say On or Off in words (design DS21/DS24). */
export function ToggleRow({ icon, title, detail, value, onChange, disabled, onLabel, offLabel }: {
  icon?: IconName; title: string; detail?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; onLabel: string; offLabel: string;
}) {
  const { palette } = useDesign();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: rowHeight, paddingHorizontal: spacing.group, paddingVertical: spacing.sm }}>
    {icon && <Icon name={icon} color={disabled ? palette.disabledText : palette.text} />}
    <View style={{ flex: 1, gap: 2 }}>
      <TextBlock variant="body" style={[{ lineHeight: 22 }, disabled && { color: palette.disabledText }]}>{title}</TextBlock>
      {detail ? <TextBlock variant="supporting" secondary>{detail}</TextBlock> : null}
    </View>
    <TextBlock variant="supporting" secondary>{value ? onLabel : offLabel}</TextBlock>
    <Switch value={value} onValueChange={onChange} disabled={disabled} accessibilityLabel={title}
      trackColor={{ false: palette.divider, true: palette.action }} thumbColor={value ? palette.actionText : '#FFFFFF'} ios_backgroundColor={palette.divider} />
  </View>;
}

// ---------------------------------------------------------------------------------------------
// DS11 prompt pager: Previous · progress · Skip, part of the page (not a toolbar)
// ---------------------------------------------------------------------------------------------
/**
 * Quiet text links either side of the chapter progress. Previous is absent on the first prompt, but its slot
 * stays so the dots never shift. Skip is always present (spec §287: skipping needs no answer or reason).
 */
export function PromptPager({ position, total, onPrevious, onSkip, previousLabel, skipLabel, skipAccessibilityLabel, progressLabel }: {
  position: number; total: number; onPrevious?: () => void; onSkip: () => void;
  previousLabel: string; skipLabel: string; skipAccessibilityLabel?: string; progressLabel: string;
}) {
  const { palette } = useDesign();
  const link = (label: string, onPress: () => void, side: 'left' | 'right', a11y?: string) =>
    <Pressable accessibilityRole="button" accessibilityLabel={a11y ?? label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => ({ minHeight: geometry.touch, flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1,
        justifyContent: side === 'left' ? 'flex-start' : 'flex-end', marginLeft: side === 'left' ? -6 : 0, marginRight: side === 'right' ? -6 : 0 })}>
      {side === 'left' && <Icon name="back" color={palette.secondary} size={18} />}
      <TextBlock variant="label" secondary>{label}</TextBlock>
      {side === 'right' && <Icon name="chevronRight" color={palette.secondary} size={18} />}
    </Pressable>;
  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ flex: 1, alignItems: 'flex-start' }}>{onPrevious ? link(previousLabel, onPrevious, 'left') : null}</View>
    <View accessible accessibilityLabel={progressLabel} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => <View key={i} style={{
        width: i === position ? 16 : 6, height: 6, borderRadius: 3,
        backgroundColor: i === position ? palette.accent : i < position ? palette.secondary : palette.divider,
      }} />)}
    </View>
    <View style={{ flex: 1, alignItems: 'flex-end' }}>{link(skipLabel, onSkip, 'right', skipAccessibilityLabel)}</View>
  </View>;
}

// ---------------------------------------------------------------------------------------------
// DS22 Sheet (confirmation, recovery, Keep a moment, recorder)
// ---------------------------------------------------------------------------------------------
/**
 * Bottom sheet over a dimmed, softly blurred screen. Closing returns focus to the screen that opened it.
 * Use RN Modal so it also works above native stacks; `onClose` is the safe cancel.
 */
export function Sheet({ visible, onClose, children, dismissable = true }: React.PropsWithChildren<{ visible: boolean; onClose: () => void; dismissable?: boolean }>) {
  const { palette, reduceMotion } = useDesign();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // The sheet hugs its content from the bottom up; past this cap the content scrolls inside it.
  const maxSheetHeight = Math.min(windowHeight * 0.92, windowHeight - insets.top - spacing.md);
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) Animated.timing(slide, { toValue: 1, duration: reduceMotion ? 0 : motion.sheet, useNativeDriver: true }).start();
    else slide.setValue(0);
  }, [visible, reduceMotion, slide]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onClose : () => undefined} statusBarTranslucent>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
      <BlurView intensity={6} tint="default" style={StyleSheet.absoluteFill} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={dismissable ? onClose : undefined} style={[StyleSheet.absoluteFill, { backgroundColor: palette.dim }]} />
      <Animated.View accessibilityViewIsModal style={{
        backgroundColor: palette.sheet, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: spacing.sm,
        paddingBottom: Math.max(insets.bottom, spacing.page), maxHeight: maxSheetHeight, flexShrink: 1, overflow: 'hidden',
        transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }], opacity: slide,
      }}>
        <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: palette.divider, marginBottom: spacing.md }} />
        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" bounces={false}
          contentContainerStyle={{ paddingHorizontal: spacing.page, gap: spacing.group }}>
          {children}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  </Modal>;
}

/** Round icon badge used at the top of sheets (microphone, warning, shield). */
export function SheetBadge({ icon }: { icon: IconName }) {
  const { palette } = useDesign();
  return <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.warm, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={icon} color={palette.text} size={22} />
  </View>;
}

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
});

export type { TextStyle };
