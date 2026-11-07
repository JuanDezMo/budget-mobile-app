import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Props = {
  label: string;
  value: string; // HH:mm, 24 hours
  onChange: (time: string) => void;
  error?: string;
};

const TIME_FORMAT = 'HH:mm';

function toDate(time: string): Date {
  return parse(time, TIME_FORMAT, new Date());
}

// A time of day chosen with the system picker. The value is always `HH:mm` text.
export function TimeField({ label, value, onChange, error }: Props) {
  const { colors } = useTheme();

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value: toDate(value),
      mode: 'time',
      is24Hour: true,
      onValueChange: (_event, picked) => onChange(format(picked, TIME_FORMAT)),
    });
  }

  return (
    <View style={styles.field}>
      <AppText variant="muted">{label}</AppText>
      {Platform.OS === 'android' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value}`}
          onPress={openAndroidPicker}
          style={[
            styles.box,
            { backgroundColor: colors.surface, borderColor: error ? colors.over : colors.line },
          ]}
        >
          <AppText>{value}</AppText>
        </Pressable>
      ) : (
        <View style={styles.iosPicker}>
          <DateTimePicker
            accessibilityLabel={label}
            value={toDate(value)}
            mode="time"
            display="compact"
            onValueChange={(_event, picked) => onChange(format(picked, TIME_FORMAT))}
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
