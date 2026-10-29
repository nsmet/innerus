import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { ThemeId } from '../content/types';

/** Where a Moment comes from: a prompt, the closing invitation, quick mode or a general note. */
export type MomentSource = { topicId: string; topicVersion?: string; promptId: string | null; sessionId?: string };

export type Tabs = {
  Tonight: undefined;
  Explore: { theme?: ThemeId } | undefined;
  Moments: undefined;
};

export type Routes = {
  Main: NavigatorScreenParams<Tabs> | undefined;
  /** UI03 topic detail (free / owned / locked / resume). */
  Topic: { topicId: string };
  /** UI04 conversation: prompts 1–5 then the closing invitation. `resume` continues the saved position. */
  Conversation: { topicId: string; resume?: boolean };
  /** "A little piece of us." after a confirmed save from the closing invitation. */
  MomentSaved: { momentId: string; sessionId?: string };
  /** UI05 quick question. */
  Quick: undefined;
  /** UI08 recorded clip → local transcription / summary review, or honest unavailable state. */
  Review: { uri: string; durationMs: number; source: MomentSource };
  /** UI10 Moment detail. */
  MomentDetail: { momentId: string };
  /** UI11 the offer: free week / keep / ended / yours (D28). `topicId` = the locked topic the person came from. */
  Paywall: { topicId?: string; reason?: 'trial-ended' };
  /** UI12 settings. */
  Settings: undefined;
  /** Offline help: "How this works" and "Where your data goes". */
  Help: { topic: 'how' | 'data' };
  Gallery: undefined;
  Probe: undefined;
};

export type TabProps<T extends keyof Tabs> = CompositeScreenProps<BottomTabScreenProps<Tabs, T>, NativeStackScreenProps<Routes>>;
export type StackProps<T extends keyof Routes> = NativeStackScreenProps<Routes, T>;
