import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { addDays, format, parse, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatShortDate, formatTime } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { toLocalDate } from '@/core/shared/dates';
import type { LocalDate } from '@/core/shared/dates';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

type Props = {
  label: string;
  date: LocalDate; // YYYY-MM-DD
  time: string; // HH:mm
  today: LocalDate;
  onChangeDate: (date: LocalDate) => void;
  onChangeTime: (time: string) => void;
};

const TIME_FORMAT = 'HH:mm';

// "Today 7:42 p. m." in the corner of the form (sketch 3). Pressing it on Android asks for the
// day and then the time with the system dialogs; on iOS the two native pickers are shown.
export function DateTimeChip({ label, date, time, today, onChangeDate, onChangeTime }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const language = getAppLanguage();
  const yesterday = toLocalDate(addDays(parseISO(today), -1));
  const day =
    date === today
      ? t('movements.form.today')
      : date === yesterday
        ? t('movements.form.yesterday')
        : formatShortDate(date, language);
  const text = `${day} ${formatTime(time, language)}`;
  const timeAsDate = parse(time, TIME_FORMAT, new Date());

  function openAndroid() {
    DateTimePickerAndroid.open({
      value: parseISO(date),
      mode: 'date',
      onValueChange: (_event, pickedDate) => {
        onChangeDate(toLocalDate(pickedDate));
        DateTimePickerAndroid.open({
          value: timeAsDate,
          mode: 'time',
          is24Hour: false,
          onValueChange: (_timeEvent, pickedTime) => onChangeTime(format(pickedTime, TIME_FORMAT)),
        });
      },
    });
  }

  if (Platform.OS === 'android') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}`}
        onPress={openAndroid}
        style={styles.chip}
      >
        <AppText weight="semibold" style={{ color: colors.mute }}>
          {text}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.ios}>
      <DateTimePicker
        accessibilityLabel={`${label}: ${t('movements.form.date')}`}
        value={parseISO(date)}
        mode="date"
        display="compact"
        onValueChange={(_event, picked) => onChangeDate(toLocalDate(picked))}
      />
      <DateTimePicker
        accessibilityLabel={`${label}: ${t('movements.form.time')}`}
        value={timeAsDate}
        mode="time"
        display="compact"
        onValueChange={(_event, picked) => onChangeTime(format(picked, TIME_FORMAT))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  ios: { flexDirection: 'row', alignItems: 'center' },
});
