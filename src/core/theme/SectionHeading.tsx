import type { StyleProp, TextStyle } from 'react-native';
import { StyleSheet } from 'react-native';

import { AppText } from './AppText';

// The small uppercase heading over a block of rows (HOY in the history, TUYAS in categories,
// PREFERENCIAS in settings). Screen readers announce it as a heading.
export function SectionHeading({ title, style }: { title: string; style?: StyleProp<TextStyle> }) {
  return (
    <AppText
      accessibilityRole="header"
      variant="muted"
      weight="bold"
      style={[styles.heading, style]}
    >
      {title.toUpperCase()}
    </AppText>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 12, letterSpacing: 0.7 },
});
