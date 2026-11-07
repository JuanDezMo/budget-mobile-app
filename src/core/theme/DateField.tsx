import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { parseISO } from 'date-fns';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatLocalDate } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { toLocalDate } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Props = {
  label: string;
  value: LocalDate; // YYYY-MM-DD
  onChange: (date: LocalDate) => void;
  error?: string;
  disabled?: boolean;
};

// A calendar day chosen with the system picker. The value is always a `YYYY-MM-DD` text,
// so no time zone can shift it. Android opens a dialog; iOS shows a compact inline picker.
export function DateField({ label, value, onChange, error, disabled }: Props) {
  const { colors } = useTheme();
  const date = parseISO(value);
  const shown = formatLocalDate(value, getAppLanguage());

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      onValueChange: (_event, picked) => onChange(toLocalDate(picked)),
    });
  }

  return (
    <View style={styles.field}>
      <AppText variant="muted">{label}</AppText>
      {Platform.OS === 'android' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${shown}`}
          disabled={disabled}
          onPress={openAndroidPicker}
          style={[
            styles.box,
            {
              backgroundColor: colors.surface,
              borderColor: error ? colors.over : colors.line,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <AppText>{shown}</AppText>
        </Pressable>
      ) : (
        <View style={styles.iosPicker}>
          <DateTimePicker
            accessibilityLabel={label}
            value={date}
            mode="date"
            display="compact"
            disabled={disabled}
            onValueChange={(_event, picked) => onChange(toLocalDate(picked))}
          />
        </View>
      )}
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
  box: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  iosPicker: { alignItems: 'flex-start' },
});
