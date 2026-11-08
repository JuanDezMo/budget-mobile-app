import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

// RN-43: a PIN has 4 to 6 digits.
const REQUIRED_DIGITS = 4;
const MAX_DIGITS = 6;
const DOT = '●'; // a symbol, not text: the field's meaning is in its label

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  autoFocus?: boolean;
};

// A PIN as boxes: 4 required (solid) and 2 optional (dashed); a dot for each digit typed. The real
// field is a normal number input laid over the boxes, invisible, so the keyboard, screen readers
// and paste keep working; the boxes only show what it holds.
export function PinInput({ label, value, onChangeText, onBlur, error, autoFocus }: Props) {
  const { colors } = useTheme();
  // The next box is marked only while this field has the keyboard, so two PIN fields on one
  // screen never look active at the same time.
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <AppText variant="muted">{label}</AppText>
      <View style={styles.boxes}>
        {Array.from({ length: MAX_DIGITS }, (_, index) => {
          const filled = index < value.length;
          const next = focused && index === value.length;

          return (
            <View
              key={index}
              style={[
                styles.box,
                {
                  backgroundColor: colors.surface,
                  borderColor: error ? colors.over : next ? colors.ink : colors.line,
                  borderStyle: index < REQUIRED_DIGITS || filled ? 'solid' : 'dashed',
                  borderWidth: next ? 2 : 1,
                },
              ]}
            >
              {filled ? <AppText weight="bold">{DOT}</AppText> : null}
            </View>
          );
        })}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/\D/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          keyboardType="number-pad"
          maxLength={MAX_DIGITS}
          secureTextEntry
          autoFocus={autoFocus}
          caretHidden
          contextMenuHidden
          style={styles.input}
        />
      </View>
      {error ? (
        <AppText variant="muted" style={{ color: colors.over }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Covers the boxes so a tap anywhere opens the keyboard; its own text is never seen.
  input: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: 'transparent',
    opacity: 0.02,
  },
});
