import { useState } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from './ThemeProvider';

type Props = {
  height: number;
  radius: number;
  // How full the envelope is, 0 to 100: what is LEFT of the budget (the visual signature).
  fillPercent: number;
  bandColor: string; // the "liga" in the color of the category
  bandLeft: number;
  bandWidth: number;
  flapHeight: number;
  exceeded: boolean; // RN-29: border in the "over" color, no red fill
  // Only for a standalone envelope (the detail). Inside a card, the card itself is the button.
  accessibilityLabel?: string;
  children?: ReactNode;
};

// The envelope drawn by budgets (and the category preview): white paper, manila filled up to what is left, the flap
// (two lines meeting at the middle), and the colored band of its category. Content goes on top.
export function EnvelopeFrame({
  height,
  radius,
  fillPercent,
  bandColor,
  bandLeft,
  bandWidth,
  flapHeight,
  exceeded,
  accessibilityLabel,
  children,
}: Props) {
  const { colors, scheme } = useTheme();
  const [width, setWidth] = useState(0);
  const fill = Math.min(100, Math.max(0, fillPercent));
  const half = width / 2;
  // Each flap line goes from a top corner to the middle of the bottom edge of the flap.
  const flapLength = Math.hypot(half, flapHeight);
  const flapAngle = (Math.atan2(flapHeight, half) * 180) / Math.PI;

  return (
    <View
      testID="envelope-frame"
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: radius,
        backgroundColor: colors.surface,
        borderWidth: exceeded ? 2 : 1,
        borderColor: exceeded ? colors.over : colors.line,
        overflow: 'hidden',
      }}
    >
      {/* Light: solid manila. Dark: translucent manila with a solid edge on top, so the level is
          still clear and the light text stays readable over it. */}
      <View
        testID="envelope-fill"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: `${fill}%`,
          backgroundColor: colors.manila,
          opacity: scheme === 'dark' ? 0.3 : 1,
        }}
      />
      {scheme === 'dark' && fill > 0 && fill < 100 ? (
        <View
          testID="envelope-fill-edge"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${fill}%`,
            height: 2,
            backgroundColor: colors.manila,
          }}
        />
      ) : null}
      {width > 0 ? (
        <>
          <View
            style={{
              position: 'absolute',
              left: half / 2 - flapLength / 2,
              top: flapHeight / 2,
              width: flapLength,
              height: 1,
              backgroundColor: colors.line,
              transform: [{ rotate: `${flapAngle}deg` }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: width - half / 2 - flapLength / 2,
              top: flapHeight / 2,
              width: flapLength,
              height: 1,
              backgroundColor: colors.line,
              transform: [{ rotate: `${-flapAngle}deg` }],
            }}
          />
        </>
      ) : null}
      <View
        testID="envelope-band"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: bandLeft,
          width: bandWidth,
          backgroundColor: bandColor,
        }}
      />
      {children}
    </View>
  );
}

// What share of the envelope is still full, from the usage (remaining / available).
export function leftPercentage(remainingMinor: number, availableMinor: number): number {
  if (availableMinor <= 0) return 0;
  return Math.min(100, Math.max(0, (remainingMinor / availableMinor) * 100));
}
