import type { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AmountInput } from '@/core/theme/AmountInput';
import { AppText } from '@/core/theme/AppText';
import { CategoryAvatar } from '@/core/theme/CategoryAvatar';
import { DateField } from '@/core/theme/DateField';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import { useBudgetForm } from '../useBudgetForm';
import { EnvelopePreview } from './EnvelopePreview';

type Props = {
  categories: readonly Category[];
  budgetId?: string;
  onSaved: (budgetId: string) => void | Promise<void>;
  // Extra fields for the form, owned by another feature (the alert thresholds). The form only
  // places them; `extraValid` false blocks saving.
  extraSection?: ReactNode;
  extraValid?: boolean;
  // Alert percentages from that extra section, drawn as bands on the envelope preview.
  previewThresholds?: readonly number[];
};

// Create or edit a budget (RN-01 to RN-03, RN-06, RN-07). Errors arrive as codes translated here.
// At the top, the envelope being made (live preview); the save button stays pinned at the bottom.
export function BudgetForm({
  categories,
  budgetId,
  onSaved,
  extraSection,
  extraValid = true,
  previewThresholds = [],
}: Props) {
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
    preview,
  } = useBudgetForm({ categories, budgetId, onSaved });
  const {
    control,
    setValue,
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {isEditing && !isEditable ? (
          <AppText style={{ color: colors.over }}>{t('budgets.form.readOnly')}</AppText>
        ) : null}

        <EnvelopePreview preview={preview} thresholds={previewThresholds} />

        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <View style={styles.section}>
              <AppText variant="muted">{t('budgets.form.category')}</AppText>
              {options.length === 0 ? (
                <AppText variant="muted">{t('budgets.form.noCategories')}</AppText>
              ) : null}
              {/* One row of chips that scrolls sideways, so the list never pushes the form down. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                accessibilityRole="radiogroup"
                contentContainerStyle={styles.chips}
              >
                {options.map((category) => {
                  const label = getCategoryLabel(category, t);
                  const selected = field.value === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="radio"
                      accessibilityLabel={label}
                      accessibilityState={{ selected, disabled: isEditing }}
                      disabled={isEditing}
                      onPress={() => field.onChange(category.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: colors.surface,
                          borderColor: selected ? colors.ink : colors.line,
                          borderWidth: selected ? 2 : 1,
                        },
                      ]}
                    >
                      <CategoryAvatar icon={category.icon} color={category.color} size={28} />
                      <AppText weight={selected ? 'bold' : 'regular'}>{label}</AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
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
          name="amount"
          render={({ field }) => (
            <AmountInput
              label={t('budgets.form.amount')}
              currencyLabel={t('budgets.form.currency')}
              currency={preview.currency}
              onCurrencyChange={(code) => setValue('currency', code, { shouldDirty: true })}
              currencyLocked={isEditing}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={message(errors.amount?.message)}
            />
          )}
        />
        {isEditing ? <AppText variant="muted">{t('budgets.form.currencyLocked')}</AppText> : null}

        <View style={styles.dates}>
          <View style={styles.date}>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DateField
                  label={t('budgets.form.startDate')}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isEditing && !isEditable}
                />
              )}
            />
          </View>
          <View style={styles.date}>
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <DateField
                  label={t('budgets.form.endDate')}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isEditing && !isEditable}
                />
              )}
            />
          </View>
        </View>
        {/* Under both dates: an overlap (RN-03) or a reversed range is about the period. */}
        {[...new Set([errors.startDate?.message, errors.endDate?.message])].map((code) =>
          code ? (
            <AppText key={code} variant="muted" style={{ color: colors.over }}>
              {message(code)}
            </AppText>
          ) : null,
        )}

        {extraSection}

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
        {failure ? (
          <AppText style={{ color: colors.over }}>{t(`errors.${failure}`)}</AppText>
        ) : null}
      </ScrollView>
      <View style={styles.save} pointerEvents="box-none">
        <PrimaryButton
          tone="ink"
          label={submitLabel}
          onPress={() => void submit()}
          disabled={isSubmitting || !extraValid || (isEditing && !isEditable)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  form: { gap: 16, paddingTop: 4, paddingBottom: 120 },
  section: { gap: 8 },
  chips: { gap: 8, paddingRight: 16 },
  chip: {
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dates: { flexDirection: 'row', gap: 12 },
  date: { flex: 1 },
  save: { position: 'absolute', left: 0, right: 0, bottom: 16 },
});
