import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { CURRENCY_CODES } from '@/core/shared/currency';
import { AppText } from '@/core/theme/AppText';
import { CategoryAvatar } from '@/core/theme/CategoryAvatar';
import { DateField } from '@/core/theme/DateField';
import { OptionGroup } from '@/core/theme/OptionGroup';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { TextField } from '@/core/theme/TextField';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import { useBudgetForm } from '../useBudgetForm';

type Props = {
  categories: readonly Category[];
  budgetId?: string;
  onSaved: () => void;
};

// Create or edit a budget (RN-01 to RN-03, RN-06, RN-07). Errors arrive as codes translated here.
export function BudgetForm({ categories, budgetId, onSaved }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    form,
    submit,
    failure,
    lowAmount,
    isEditing,
    isEditable,
    isLoading,
    budget,
    categoryOptions,
  } = useBudgetForm({ categories, budgetId, onSaved });
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  const message = (code: string | undefined) => (code ? t(`errors.${code}`) : undefined);
  if (isLoading) return null;

  const options = isEditing
    ? categories.filter((category) => category.id === budget?.categoryId)
    : categoryOptions;
  const submitLabel = lowAmount
    ? t('budgets.form.saveAnyway')
    : isEditing
      ? t('budgets.form.save')
      : t('budgets.form.create');

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      {isEditing && !isEditable ? (
        <AppText style={{ color: colors.over }}>{t('budgets.form.readOnly')}</AppText>
      ) : null}

      <AppText variant="muted">{t('budgets.form.category')}</AppText>
      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <View style={styles.options} accessibilityRole="radiogroup">
            {options.length === 0 ? (
              <AppText variant="muted">{t('budgets.form.noCategories')}</AppText>
            ) : null}
            {options.map((category) => {
              const label = getCategoryLabel(category, t);
              const selected = field.value === category.id;

              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  disabled={isEditing}
                  onPress={() => field.onChange(category.id)}
                  style={[
                    styles.category,
                    {
                      backgroundColor: colors.surface,
                      borderColor: selected ? colors.ink : colors.line,
                    },
                  ]}
                >
                  <CategoryAvatar icon={category.icon} color={category.color} />
                  <AppText>{label}</AppText>
                </Pressable>
              );
            })}
            {errors.categoryId ? (
              <AppText variant="muted" style={{ color: colors.over }}>
                {message(errors.categoryId.message)}
              </AppText>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="currency"
        render={({ field }) => (
          <OptionGroup
            label={t('budgets.form.currency')}
            options={CURRENCY_CODES.map((code) => ({ value: code, label: code }))}
            selected={field.value}
            onSelect={field.onChange}
            disabled={isEditing}
          />
        )}
      />
      {isEditing ? <AppText variant="muted">{t('budgets.form.currencyLocked')}</AppText> : null}

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <TextField
            label={t('budgets.form.amount')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="decimal-pad"
            error={message(errors.amount?.message)}
          />
        )}
      />

      <Controller
        control={control}
        name="startDate"
        render={({ field }) => (
          <DateField
            label={t('budgets.form.startDate')}
            value={field.value}
            onChange={field.onChange}
            error={message(errors.startDate?.message)}
            disabled={isEditing && !isEditable}
          />
        )}
      />
      <Controller
        control={control}
        name="endDate"
        render={({ field }) => (
          <DateField
            label={t('budgets.form.endDate')}
            value={field.value}
            onChange={field.onChange}
            error={message(errors.endDate?.message)}
            disabled={isEditing && !isEditable}
          />
        )}
      />

      {lowAmount && budget ? (
        <AppText style={{ color: colors.over }}>
          {t('budgets.form.lowAmount', {
            spent: formatMoney(
              { amountMinor: lowAmount.spentMinor, currency: budget.currency },
              getAppLanguage(),
            ),
          })}
        </AppText>
      ) : null}
      {failure ? <AppText style={{ color: colors.over }}>{t(`errors.${failure}`)}</AppText> : null}
      <PrimaryButton
        label={submitLabel}
        onPress={() => void submit()}
        disabled={isSubmitting || (isEditing && !isEditable)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 32 },
  options: { gap: 8 },
  category: {
    minHeight: 56,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
