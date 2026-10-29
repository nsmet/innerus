import { Platform, type ViewStyle } from 'react-native';

/**
 * InnerUs design tokens — one source for every screen (handoff §42/§54/§55, design canvas "Foundations").
 * Screens ask for a role; the role resolves for light or dark.
 */
export const colors = {
  light: {
    canvas: '#FAF6EF',
    raised: '#FAF6EF',
    text: '#352238',
    secondary: '#746A73',
    action: '#352238',
    actionText: '#FAF6EF',
    outline: '#746A73',
    divider: '#DDD1D6',
    warm: '#F1EBEF', // quiet wash for notes, nudges, search fields, sheets' cards
    accent: '#C98065', // terracotta hairlines and the selected-tab dot
    destructive: '#A8322A',
    dim: 'rgba(53,34,56,0.40)',
    sheet: '#FAF6EF',
    paper: '#FAF6EF', // art always sits on warm paper, also in dark mode
    disabledFill: '#ECE5EA',
    disabledText: '#8D828C',
  },
  dark: {
    canvas: '#241C29',
    raised: '#302335',
    text: '#F5E9E7',
    secondary: '#C6B6C7',
    action: '#EADCEF',
    actionText: '#352238',
    outline: '#C6B6C7',
    divider: '#514152',
    warm: '#3A2C41',
    accent: '#D99A80',
    destructive: '#FF9C8F',
    dim: 'rgba(0,0,0,0.55)',
    sheet: '#302335',
    paper: '#FAF6EF',
    disabledFill: '#3A2C41',
    disabledText: '#A898A9',
  },
} as const;
export type ColorRoles = { [K in keyof typeof colors.light]: string };

/**
 * The offer's own surface (D29): an evening plum built from the brand ink, so the purchase sheet is
 * unmistakably its own moment against the paper app. Paper-coloured text and a paper primary button;
 * terracotta stays the accent. Dark mode lifts the plum so it still stands apart from the darker canvas.
 */
export const offerColors: { light: ColorRoles; dark: ColorRoles } = {
  light: {
    canvas: '#352238', raised: '#432E47', text: '#FAF6EF', secondary: '#D2C4CF', action: '#FAF6EF', actionText: '#352238',
    outline: '#D2C4CF', divider: '#57425B', warm: '#432E47', accent: '#E2A184', destructive: '#FF9C8F', dim: 'rgba(0,0,0,0.55)',
    sheet: '#432E47', paper: '#FAF6EF', disabledFill: '#4A364E', disabledText: '#A897A8',
  },
  dark: {
    canvas: '#3E2745', raised: '#4B3352', text: '#FAF6EF', secondary: '#D6C8D4', action: '#FAF6EF', actionText: '#352238',
    outline: '#D6C8D4', divider: '#5F4766', warm: '#4B3352', accent: '#E2A184', destructive: '#FF9C8F', dim: 'rgba(0,0,0,0.6)',
    sheet: '#4B3352', paper: '#FAF6EF', disabledFill: '#523A58', disabledText: '#AC9BAE',
  },
};

/** Illustration pigments. Never body text. */
export const pigments = { lavender: '#B6A4CC', terracotta: '#C98065', sage: '#9CA88D', butter: '#EDD9A6' } as const;

export const fonts = {
  serif: 'SourceSerif4',
  serifItalic: 'SourceSerif4Italic',
  sans: Platform.select({ ios: 'System', default: undefined }),
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, group: 16, page: 24, lg: 32, xl: 48 } as const;
export const radius = { control: 8, art: 10, group: 12, sheet: 24 } as const;
export const geometry = { touch: 44, button: 54, contentMax: 620, tabBar: 64 } as const;

/** Type roles. Sizes in dp at standard scale; platform font scaling applies (no max scale). */
export const typography = {
  display: { fontFamily: fonts.serif, fontSize: 36, lineHeight: 44, letterSpacing: -0.5 },
  title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, letterSpacing: -0.3 },
  prompt: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 40, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  rowTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 24 },
  invitation: { fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 26 },
  voice: { fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 25 },
  body: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 24 },
  control: { fontFamily: fonts.sans, fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  label: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 20, fontWeight: '500' as const },
  meta: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  supporting: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16, letterSpacing: 1.8, fontWeight: '600' as const, textTransform: 'uppercase' as const },
  tab: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 15, letterSpacing: 0.2 },
} as const;
export type TextVariant = keyof typeof typography;

/**
 * The one soft shadow (primary actions, paper cards, Tonight's theme tiles). Off in dark mode.
 * Design: 0 1px 2px ink/6%, 0 14px 34px -16px ink/28% — the negative spread keeps it under the object, never a halo.
 */
export function shadow(scheme: 'light' | 'dark'): ViewStyle {
  if (scheme === 'dark') return {};
  return { boxShadow: '0px 1px 2px rgba(53,34,56,0.06), 0px 14px 34px -16px rgba(53,34,56,0.28)' };
}

/** Motion roles (handoff §59). Reduced Motion: static or a short crossfade. */
export const motion = { entry: 500, prompt: 250, chapter: 550, bloom: 1500, nudge: 180, keepsake: 750, sheet: 280 } as const;

/**
 * Typewriter reveal for questions (ms). `lead` lets the chapter fade settle before the first key;
 * `stroke` ± `jitter` per character; extra breath after spaces, commas and full stops.
 * `inkTail` = how many of the newest characters are still drying from terracotta into text colour.
 */
export const typewriter = { lead: 180, stroke: 20, jitter: 7, space: 12, comma: 90, stop: 170, inkTail: 4 } as const;
