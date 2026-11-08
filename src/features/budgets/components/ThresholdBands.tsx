import { StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

// A band label too close to the top edge would be cut off, so it goes under its line instead.
const LABEL_BELOW_FROM = 88;

export type ThresholdBand = { percentage: number; crossed: boolean };

// The alert thresholds drawn as bands ("ligas") across an envelope, at the height of what would be
// left (90 % used = 10 % left = near the bottom). Dashed while not reached, solid with a dark label
// once crossed. Placed inside an `EnvelopeFrame`; used by the detail and by the form preview.
export function ThresholdBands({ bands }: { bands: readonly ThresholdBand[] }) {
  const { colors } = useTheme();

  return (
    <>
      {bands.map(({ percentage, crossed }) => {
        const bottomPercent = 100 - percentage;
        const below = bottomPercent >= LABEL_BELOW_FROM;

        return (
          <View
            key={percentage}
            testID={`liga-${percentage}`}
            pointerEvents="none"
            style={[styles.liga, { bottom: `${bottomPercent}%` }]}
          >
            {/* The line is the top edge of a taller box: dashed borders only draw well on Android
                when the border goes all around. The clip shows only that top edge; the label stays
                outside it so it is never cut. */}
            <View style={styles.lineClip}>
              <View
                testID={`liga-line-${percentage}`}
                style={[
                  styles.ligaLine,
                  { borderColor: colors.ink, borderStyle: crossed ? 'solid' : 'dashed' },
                ]}
              />
            </View>
            <View
              style={[
                styles.chip,
                below ? styles.chipBelow : styles.chipAbove,
                {
                  borderColor: colors.ink,
                  backgroundColor: crossed ? colors.ink : colors.surface,
                },
              ]}
            >
              <AppText
                weight="bold"
                style={[styles.chipText, { color: crossed ? colors.surface : colors.ink }]}
              >
                {`${percentage} %`}
              </AppText>
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  liga: { position: 'absolute', left: 0, right: 0, height: 2, overflow: 'visible' },
  lineClip: { height: 2, overflow: 'hidden' },
  ligaLine: { height: 12, borderWidth: 2, borderRadius: 0, marginHorizontal: -2 },
  chip: {
    position: 'absolute',
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipAbove: { top: -22 },
  chipBelow: { top: 4 },
  chipText: { fontSize: 11 },
});
