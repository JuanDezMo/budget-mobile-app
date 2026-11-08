import { StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { useTheme } from '@/core/theme/ThemeProvider';

// A band label too close to the top edge would be cut off, so it goes under its line instead.
const LABEL_BELOW_FROM = 88;
// Labels have a fixed size so the screen can tell when two of them would touch.
const LABEL_WIDTH = 52;
const LABEL_HEIGHT = 20;
const LABEL_GAP = 6;
const LABEL_RIGHT = 10;

export type ThresholdBand = { percentage: number; crossed: boolean };

// Where each label goes: its top edge (in px from the top of the envelope) and a column counted
// from the right. Two labels closer than their height plus a gap would touch (90 % and 100 %), so
// the lower one moves one column to the left.
export function layoutBandLabels(
  percentages: readonly number[],
  height: number,
): Map<number, { top: number; below: boolean; column: number }> {
  const placed: { top: number; column: number }[] = [];
  const layout = new Map<number, { top: number; below: boolean; column: number }>();
  for (const percentage of [...percentages].sort((a, b) => a - b)) {
    const below = 100 - percentage >= LABEL_BELOW_FROM;
    const lineY = (height * percentage) / 100;
    const top = below ? lineY + 4 : lineY - LABEL_HEIGHT - 2;
    let column = 0;
    while (
      placed.some(
        (other) => other.column === column && Math.abs(other.top - top) < LABEL_HEIGHT + LABEL_GAP,
      )
    ) {
      column += 1;
    }
    placed.push({ top, column });
    layout.set(percentage, { top, below, column });
  }

  return layout;
}

// The alert thresholds drawn as bands ("ligas") across an envelope, at the height of what would be
// left (90 % used = 10 % left = near the bottom). Dashed while not reached, solid with a dark label
// once crossed. Placed inside an `EnvelopeFrame` of the given height; used by the detail and by the
// form preview.
export function ThresholdBands({
  bands,
  height,
}: {
  bands: readonly ThresholdBand[];
  height: number;
}) {
  const { colors } = useTheme();
  const labels = layoutBandLabels(
    bands.map((band) => band.percentage),
    height,
  );

  return (
    <>
      {bands.map(({ percentage, crossed }) => {
        const label = labels.get(percentage);
        const below = label?.below ?? false;
        const column = label?.column ?? 0;

        return (
          <View
            key={percentage}
            testID={`liga-${percentage}`}
            pointerEvents="none"
            style={[styles.liga, { bottom: `${100 - percentage}%` }]}
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
              testID={`liga-label-${percentage}`}
              style={[
                styles.chip,
                below ? styles.chipBelow : styles.chipAbove,
                {
                  right: LABEL_RIGHT + column * (LABEL_WIDTH + 8),
                  borderColor: colors.ink,
                  backgroundColor: crossed ? colors.ink : colors.surface,
                },
              ]}
            >
              <AppText
                weight="bold"
                numberOfLines={1}
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
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAbove: { top: -LABEL_HEIGHT - 2 },
  chipBelow: { top: 4 },
  chipText: { fontSize: 11 },
});
