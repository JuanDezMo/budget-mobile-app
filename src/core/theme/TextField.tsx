import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Props = Pick<
  TextInputProps,
  | 'value'
  | 'onChangeText'
  | 'onBlur'
  | 'secureTextEntry'
  | 'keyboardType'
  | 'maxLength'
  | 'autoCapitalize'
  | 'autoComplete'
  | 'textContentType'
> & { label: string; error?: string };

// Labeled themed input. `error` is already translated by the caller.
export function TextField({ label, error, ...inputProps }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <AppText variant="muted">{label}</AppText>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        placeholderTextColor={colors.mute}
        style={[
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.surface,
            borderColor: error ? colors.over : colors.line,
          },
        ]}
      />
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
  input: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, fontSize: 16 },
});
