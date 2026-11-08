import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { amountInputProps } from '@/core/i18n/amount-input';
import { getAppLanguage } from '@/core/i18n/i18n';
import { CURRENCY_CODES } from '@/core/shared/currency';
import type { CurrencyCode } from '@/core/shared/currency';

import { AppText } from './AppText';
import { OptionGroup } from './OptionGroup';
import { useTheme } from './ThemeProvider';
import { CONDENSED_FAMILY } from './typography';

type Props = {
  label: string;
  currencyLabel: string;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  error?: string;
  // RN-02: a budget keeps its currency, so editing one locks the currency chip.
  currencyLocked?: boolean;
};

// A big amount with the currency beside it (sketch 3), shared by the movement and budget forms.
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
  currencyLocked = false,
}: Props) {
  const { colors } = useTheme();
  const [choosing, setChoosing] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${currencyLabel}: ${currency}`}
          accessibilityState={{ disabled: currencyLocked }}
          disabled={currencyLocked}
          onPress={() => setChoosing((open) => !open)}
          style={[styles.currency, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <AppText weight="bold" style={styles.currencyText}>
            {currencyLocked ? currency : `${currency} ▾`}
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
          label={currencyLabel}
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
