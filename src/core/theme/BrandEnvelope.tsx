import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { EnvelopeFrame } from './EnvelopeFrame';
import { useTheme } from './ThemeProvider';

const HEIGHT = 170;

// The brand at the door of the app (registration and lock): a closed manila envelope with the app
// name, so the first thing the user sees is the envelope of the visual direction.
export function BrandEnvelope({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();

  return (
    <EnvelopeFrame
      height={HEIGHT}
      radius={14}
      fillPercent={100}
      bandColor={colors.ink}
      bandLeft={24}
      bandWidth={0}
      flapHeight={56}
      exceeded={false}
    >
      <View style={styles.texts} pointerEvents="none">
        <AppText
          accessibilityRole="header"
          weight="extrabold"
          style={[styles.title, { color: colors.ink }]}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText weight="semibold" style={{ color: colors.ink }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </EnvelopeFrame>
  );
}

const styles = StyleSheet.create({
  texts: { position: 'absolute', left: 20, right: 20, bottom: 18, gap: 2 },
  title: { fontSize: 26, lineHeight: 32 },
});
