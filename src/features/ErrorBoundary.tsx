import React from 'react';
import { Appearance, Pressable, Text, View } from 'react-native';
import { getLocales } from 'expo-localization';
import { colors } from '../design/tokens';

/**
 * Last-resort fallback for an unexpected render error (release readiness, D40).
 * It shows a calm bilingual message with "Try again" instead of a blank screen.
 * Nothing is logged or sent anywhere: the error may contain personal text (AGENTS.md).
 * Saved Moments are untouched; the private store lives below this boundary and reopens on retry.
 */
type State = { failed: boolean; attempt: number };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false, attempt: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch() {
    // Intentionally empty: no logs, no reporting (no analytics or crash service in InnerUs).
  }

  private retry = () => this.setState(s => ({ failed: false, attempt: s.attempt + 1 }));

  render() {
    if (!this.state.failed) return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    const nl = getLocales()[0]?.languageCode === 'nl';
    const palette = Appearance.getColorScheme() === 'dark' ? colors.dark : colors.light;
    const title = nl ? 'Er ging iets mis' : 'Something went wrong';
    const body = nl
      ? 'InnerUs liep vast. Je momenten zijn veilig op deze telefoon bewaard. Probeer het opnieuw.'
      : 'InnerUs got stuck. Your moments are safe on this phone. Please try again.';
    const action = nl ? 'Probeer opnieuw' : 'Try again';
    return (
      <View style={{ flex: 1, backgroundColor: palette.canvas, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 26, textAlign: 'center', marginBottom: 12 }}>{title}</Text>
        <Text style={{ color: palette.secondary, fontSize: 17, lineHeight: 24, textAlign: 'center', marginBottom: 28 }}>{body}</Text>
        <Pressable accessibilityRole="button" onPress={this.retry}
          style={{ minHeight: 48, paddingHorizontal: 28, borderRadius: 24, backgroundColor: palette.action, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: palette.actionText, fontSize: 17 }}>{action}</Text>
        </Pressable>
      </View>
    );
  }
}
