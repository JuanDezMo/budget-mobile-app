import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatCountryName } from '@/core/i18n/format';
import { COUNTRY_CODES } from '@/core/shared/countries';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { TextField } from '@/core/theme/TextField';
import { useTheme } from '@/core/theme/ThemeProvider';

const MAX_RESULTS = 6;

// Pick a country by typing part of its name. Shows the few best matches, not all 249.
export function CountryPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [changing, setChanging] = useState(value === '');
  const language = getAppLanguage();

  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? COUNTRY_CODES.map((code) => ({ code, name: formatCountryName(code, language) }))
        .filter((country) => country.name.toLowerCase().includes(normalized))
        .slice(0, MAX_RESULTS)
    : [];

  if (!changing && value) {
    return (
      <View style={styles.group}>
        <AppText variant="muted">{label}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatCountryName(value, language)}. ${t('country.change')}`}
          onPress={() => setChanging(true)}
          style={[styles.selected, { borderColor: colors.line, backgroundColor: colors.surface }]}
        >
          <AppText>{formatCountryName(value, language)}</AppText>
          <AppText variant="muted">{t('country.change')}</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.group}>
      <TextField label={t('country.search')} value={query} onChangeText={setQuery} error={error} />
      {normalized && matches.length === 0 ? (
        <AppText variant="muted">{t('country.none')}</AppText>
      ) : null}
      {matches.map((country) => (
        <Pressable
          key={country.code}
          accessibilityRole="button"
          onPress={() => {
            onChange(country.code);
            setChanging(false);
            setQuery('');
          }}
          style={[styles.option, { borderColor: colors.line, backgroundColor: colors.surface }]}
        >
          <AppText>{country.name}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  selected: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
