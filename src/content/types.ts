/** Bundled editorial content. These types never contain personal material. */
export type Language = 'en' | 'nl';

export type Localized = Readonly<Record<Language, string>>;

export type ThemeId = 'our-story' | 'us-today' | 'whats-next';

export type ArtFamily =
  | 'cafe'
  | 'kitchen'
  | 'window'
  | 'travel'
  | 'notebook'
  | 'garden';

export type Prompt = Readonly<{
  /** Stable across translations and editorial revisions. */
  id: string;
  chapter: Localized;
  text: Localized;
  nudge: Localized;
  quickEligible: boolean;
  /** Authored scene identity; assets may implement this independently of text. */
  sceneState: string;
}>;

export type Topic = Readonly<{
  id: string;
  version: string;
  title: Localized;
  invitation: Localized;
  theme: ThemeId;
  /** One or two sentences about the territory, without listing every prompt (spec 14). */
  about: Localized;
  intensity: 'light' | 'personal' | 'direct';
  minutes: number;
  access: 'free' | 'collection';
  artFamily: ArtFamily;
  tags: Readonly<Record<Language, readonly string[]>>;
  prompts: readonly Prompt[];
  closing: Localized;
}>;

export type Intensity = Topic['intensity'];

export type Theme = Readonly<{
  id: ThemeId;
  label: Localized;
  artFamily: ArtFamily;
}>;
