import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
import { TimeField } from '@/core/theme/TimeField';

import { getCategoryLabel } from '../../categories/category.rules';
import type { Category } from '../../categories/category.types';
import { MOVEMENT_KINDS, PAYMENT_METHODS } from '../movement.types';
import { useMovementForm } from '../useMovementForm';
import { LineAssignmentText } from './LineAssignmentText';

type Props = {
  categories: readonly Category[];
  movementId?: string;
  onSaved: () => void;
};

// Create or edit a movement split into lines (RN-12 to RN-21). Errors arrive as codes translated here.
export function MovementForm({ categories, movementId, onSaved }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const {
    form,
    lines,
    addLine,
    submit,
    remove,
    failure,
    isEditing,
    isLoading,
    isLocked,
    assignments,
    remainingMinor,
    hasClosedBudgetWarning,
  } = useMovementForm({ categories, movementId, onSaved });
  const {
    control,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const message = (code: string | undefined) => (code ? t(`errors.${code}`) : undefined);
  const currency = watch('currency');
  if (isLoading) return null;

  // RN-36: archived categories take no new lines.
  const usable = categories.filter((category) => category.archivedAt === null);
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency }, getAppLanguage());

  function confirmDelete() {
    Alert.alert(t('movements.form.deleteTitle'), t('movements.form.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('movements.form.delete'), style: 'destructive', onPress: () => void remove() },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      {isLocked ? (
        <AppText style={{ color: colors.over }}>{t('movements.form.locked')}</AppText>
      ) : null}

      <Controller
        control={control}
        name="kind"
        render={({ field }) => (
          <OptionGroup
            label={t('movements.form.kind')}
            options={MOVEMENT_KINDS.map((kind) => ({
              value: kind,
              label: t(`movements.kind.${kind}`),
            }))}
            selected={field.value}
            onSelect={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="currency"
        render={({ field }) => (
          <OptionGroup
            label={t('movements.form.currency')}
            options={CURRENCY_CODES.map((code) => ({ value: code, label: code }))}
            selected={field.value}
            onSelect={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="total"
        render={({ field }) => (
          <TextField
            label={t('movements.form.total')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="decimal-pad"
            error={message(errors.total?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="date"
        render={({ field }) => (
          <DateField
            label={t('movements.form.date')}
            value={field.value}
            onChange={field.onChange}
            error={message(errors.date?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="time"
        render={({ field }) => (
          <TimeField
            label={t('movements.form.time')}
            value={field.value}
            onChange={field.onChange}
            error={message(errors.time?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <OptionGroup
            label={t('movements.form.paymentMethod')}
            options={PAYMENT_METHODS.map((method) => ({
              value: method,
              label: t(`movements.payment.${method}`),
            }))}
            selected={field.value}
            onSelect={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="note"
        render={({ field }) => (
          <TextField
            label={t('movements.form.note')}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={message(errors.note?.message)}
          />
        )}
      />

      <AppText variant="muted">{t('movements.form.lines')}</AppText>
      {lines.fields.map((item, index) => (
        <View
          key={item.id}
          style={[styles.line, { backgroundColor: colors.surface, borderColor: colors.line }]}
        >
          <Controller
            control={control}
            name={`lines.${index}.categoryId`}
            render={({ field }) => (
              <View style={styles.chips} accessibilityRole="radiogroup">
                {usable.map((category) => {
                  const label = getCategoryLabel(category, t);
                  const selected = field.value === category.id;

                  return (
                    <Pressable
                      key={category.id}
                      accessibilityRole="radio"
                      accessibilityLabel={`${t('movements.form.category')} ${index + 1}: ${label}`}
                      accessibilityState={{ selected }}
                      onPress={() => field.onChange(category.id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: selected ? colors.ink : colors.line,
                          backgroundColor: colors.ground,
                        },
                      ]}
                    >
                      <CategoryAvatar icon={category.icon} color={category.color} size={28} />
                      <AppText variant="muted" style={{ color: colors.ink }}>
                        {label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
          <Controller
            control={control}
            name={`lines.${index}.amount`}
            render={({ field }) => (
              <TextField
                label={`${t('movements.form.lineAmount')} ${index + 1}`}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="decimal-pad"
                error={message(errors.lines?.[index]?.amount?.message)}
              />
            )}
          />
          <LineAssignmentText assignment={assignments[index]} categories={categories} />
          {lines.fields.length > 1 ? (
            <PrimaryButton
              label={`${t('movements.form.removeLine')} ${index + 1}`}
              onPress={() => lines.remove(index)}
              tone="danger"
            />
          ) : null}
        </View>
      ))}

      <PrimaryButton label={t('movements.form.addLine')} onPress={addLine} />
      {remainingMinor > 0 && lines.fields.length > 1 ? (
        <AppText variant="muted">
          {t('movements.form.remaining', { amount: money(remainingMinor) })}
        </AppText>
      ) : null}
      {remainingMinor < 0 ? (
        <AppText style={{ color: colors.over }}>
          {t('movements.form.over', { amount: money(-remainingMinor) })}
        </AppText>
      ) : null}
      {hasClosedBudgetWarning ? (
        <AppText style={{ color: colors.over }}>{t('movements.form.closedWarning')}</AppText>
      ) : null}
      {errors.lines?.message ? (
        <AppText style={{ color: colors.over }}>{message(errors.lines.message)}</AppText>
      ) : null}
      {failure ? <AppText style={{ color: colors.over }}>{t(`errors.${failure}`)}</AppText> : null}

      <PrimaryButton
        label={isEditing ? t('movements.form.saveChanges') : t('movements.form.save')}
        onPress={() => void submit()}
        disabled={isSubmitting || isLocked}
      />
      {isEditing ? (
        <PrimaryButton
          label={t('movements.form.delete')}
          onPress={confirmDelete}
          tone="danger"
          disabled={isLocked}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 48 },
  line: { gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 8,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
