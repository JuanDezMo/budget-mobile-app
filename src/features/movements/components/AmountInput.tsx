import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { amountInputProps } from '@/core/i18n/amount-input';
import { getAppLanguage } from '@/core/i18n/i18n';
import { CURRENCY_CODES } from '@/core/shared/currency';
import type { CurrencyCode } from '@/core/shared/currency';
import { AppText } from '@/core/theme/AppText';
import { OptionGroup } from '@/core/theme/OptionGroup';
import { useTheme } from '@/core/theme/ThemeProvider';
import { CONDENSED_FAMILY } from '@/core/theme/typography';

type Props = {
  label: string;
  currencyLabel: string;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  error?: string;
};

// The amount is the first thing in the form: a big number with the currency beside it (sketch 3).
// Pressing the currency opens the three choices.
export function AmountInput({
  label,
  currencyLabel,
  currency,
  onCurrencyChange,
  value,
  onChangeText,
  onBlur,
  error,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [choosing, setChoosing] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${currencyLabel}: ${currency}`}
          onPress={() => setChoosing((open) => !open)}
          style={[styles.currency, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <AppText weight="bold" style={styles.currencyText}>
            {`${currency} ▾`}
          </AppText>
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          {...amountInputProps(value, onChangeText, getAppLanguage())}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.line}
          style={[styles.amount, { color: colors.ink, fontFamily: CONDENSED_FAMILY }]}
        />
      </View>
      {choosing ? (
        <OptionGroup<CurrencyCode>
          compact
          label={t('movements.form.currency')}
          options={CURRENCY_CODES.map((code) => ({ value: code, label: code }))}
          selected={currency}
          onSelect={(code) => {
            onCurrencyChange(code);
            setChoosing(false);
          }}
        />
      ) : null}
      {error ? (
        <AppText variant="muted" style={{ color: colors.over }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currency: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  currencyText: { fontSize: 15 },
  amount: { flex: 1, fontSize: 52, paddingVertical: 4, fontVariant: ['tabular-nums'] },
});
