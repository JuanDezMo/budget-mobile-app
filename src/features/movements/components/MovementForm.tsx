import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';

import { formatMoney } from '@/core/i18n/format';
import { getAppLanguage } from '@/core/i18n/i18n';
import { AppText } from '@/core/theme/AppText';
import { ChoiceChips } from '@/core/theme/ChoiceChips';
import { DateTimeChip } from '@/core/theme/DateTimeChip';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { SegmentedControl } from '@/core/theme/SegmentedControl';
import { useTheme } from '@/core/theme/ThemeProvider';
import { FONT_FAMILY } from '@/core/theme/typography';

import type { Category } from '../../categories/category.types';
import { MOVEMENT_KINDS, PAYMENT_METHODS } from '../movement.types';
import { useMovementForm } from '../useMovementForm';
import { AmountInput } from './AmountInput';
import { LineAssignmentText } from './LineAssignmentText';
import { LineRow } from './LineRow';

type Props = {
  categories: readonly Category[];
  movementId?: string;
  onSaved: () => void;
};

const SAVE_LABEL = {
  EXPENSE: 'movements.form.saveExpense',
  REFUND: 'movements.form.saveRefund',
  INCOME: 'movements.form.saveIncome',
} as const;

// "Add" screen of the sketches 3 and 4: kind, amount, payment method, the split into lines (each
// one says which envelope it counts for), what is left to assign, a note, and the save button.
// Errors arrive as codes translated here.
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
    today,
    showsLines,
    singleLinePlaceholder,
    forEnvelope,
    changeForEnvelope,
    incomeImpact,
  } = useMovementForm({ categories, movementId, onSaved });
  const {
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const message = (code: string | undefined) => (code ? t(`errors.${code}`) : undefined);
  const kind = watch('kind');
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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {isLocked ? (
          <AppText style={{ color: colors.over }}>{t('movements.form.locked')}</AppText>
        ) : null}

        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <SegmentedControl
              label={t('movements.form.kind')}
              options={MOVEMENT_KINDS.map((value) => ({
                value,
                label: t(`movements.kind.${value}`),
              }))}
              selected={field.value}
              onSelect={field.onChange}
            />
          )}
        />

        <View style={styles.when}>
          <DateTimeChip
            label={t('movements.form.dateTime')}
            date={watch('date')}
            time={watch('time')}
            today={today}
            onChangeDate={(date) => setValue('date', date, { shouldDirty: true })}
            onChangeTime={(time) => setValue('time', time, { shouldDirty: true })}
          />
        </View>
        {errors.date || errors.time ? (
          <AppText variant="muted" style={{ color: colors.over }}>
            {message(errors.date?.message ?? errors.time?.message)}
          </AppText>
        ) : null}

        <Controller
          control={control}
          name="total"
          render={({ field }) => (
            <AmountInput
              label={t('movements.form.total')}
              currencyLabel={t('movements.form.currency')}
              currency={currency}
              onCurrencyChange={(code) => setValue('currency', code, { shouldDirty: true })}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={message(errors.total?.message)}
            />
          )}
        />

        <Controller
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <ChoiceChips
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

        {kind === 'INCOME' ? (
          <View
            style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <AppText weight="semibold">{t('movements.form.forEnvelope')}</AppText>
            <Switch
              accessibilityLabel={t('movements.form.forEnvelope')}
              value={forEnvelope}
              onValueChange={changeForEnvelope}
              trackColor={{ false: colors.line, true: colors.ink }}
              thumbColor={colors.surface}
            />
          </View>
        ) : null}

        {showsLines ? (
          <View
            style={[styles.lines, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            {lines.fields.map((item, index) => (
              <Controller
                key={item.id}
                control={control}
                name={`lines.${index}`}
                render={({ field }) => (
                  <LineRow
                    position={index + 1}
                    category={categories.find(
                      (candidate) => candidate.id === field.value.categoryId,
                    )}
                    categories={usable}
                    amount={field.value.amount}
                    onChangeAmount={(amount) => field.onChange({ ...field.value, amount })}
                    onBlurAmount={field.onBlur}
                    onSelectCategory={(categoryId) =>
                      field.onChange({ ...field.value, categoryId })
                    }
                    onRemove={lines.fields.length > 1 ? () => lines.remove(index) : undefined}
                    error={message(errors.lines?.[index]?.amount?.message)}
                    placeholder={lines.fields.length === 1 ? singleLinePlaceholder : '0'}
                  >
                    <LineAssignmentText
                      assignment={assignments[index]}
                      categories={categories}
                      currency={currency}
                      isIncome={kind === 'INCOME'}
                    />
                  </LineRow>
                )}
              />
            ))}
            <PrimaryButtonLink label={t('movements.form.splitMore')} onPress={addLine} />
          </View>
        ) : (
          // A general income: it counts for no envelope (RN-41). Nothing to split.
          <AppText variant="muted">{assignmentNoneNote(t, currency)}</AppText>
        )}

        {showsLines && lines.fields.length > 1 ? (
          <View style={styles.rest}>
            <AppText variant="muted">{t('movements.form.toAssign')}</AppText>
            <AppText
              weight="bold"
              style={{
                color:
                  remainingMinor === 0
                    ? colors.positive
                    : remainingMinor < 0
                      ? colors.over
                      : colors.ink,
              }}
            >
              {remainingMinor === 0
                ? `${money(0)} ✓`
                : remainingMinor < 0
                  ? `−${money(-remainingMinor)}`
                  : money(remainingMinor)}
            </AppText>
          </View>
        ) : null}
        {errors.lines?.message ? (
          <AppText style={{ color: colors.over }}>{message(errors.lines.message)}</AppText>
        ) : null}
        {remainingMinor < 0 && showsLines ? (
          <AppText style={{ color: colors.over }}>
            {t('movements.form.over', { amount: money(-remainingMinor) })}
          </AppText>
        ) : null}

        {incomeImpact ? (
          <View style={[styles.note, { borderColor: colors.mute }]}>
            <AppText variant="muted">
              {t('movements.form.incomeNote', {
                from: money(incomeImpact.availableBeforeMinor),
                to: money(incomeImpact.availableAfterMinor),
                left: money(incomeImpact.remainingAfterMinor),
              })}
            </AppText>
          </View>
        ) : null}
        {hasClosedBudgetWarning ? (
          <AppText style={{ color: colors.over }}>{t('movements.form.closedWarning')}</AppText>
        ) : null}

        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <View style={[styles.note, { borderColor: colors.mute }]}>
              <TextInput
                accessibilityLabel={t('movements.form.note')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={t('movements.form.notePlaceholder')}
                placeholderTextColor={colors.mute}
                style={{
                  color: colors.ink,
                  fontFamily: FONT_FAMILY.regular,
                  fontSize: 14,
                  minHeight: 36,
                }}
              />
              {errors.note ? (
                <AppText variant="muted" style={{ color: colors.over }}>
                  {message(errors.note.message)}
                </AppText>
              ) : null}
            </View>
          )}
        />

        {failure ? (
          <AppText style={{ color: colors.over }}>{t(`errors.${failure}`)}</AppText>
        ) : null}
        {isEditing ? (
          <PrimaryButton
            label={t('movements.form.delete')}
            onPress={confirmDelete}
            tone="danger"
            disabled={isLocked}
          />
        ) : null}
      </ScrollView>

      <View style={styles.save} pointerEvents="box-none">
        <PrimaryButton
          tone="ink"
          label={isEditing ? t('movements.form.saveChanges') : t(SAVE_LABEL[kind])}
          onPress={() => void submit()}
          disabled={isSubmitting || isLocked}
        />
      </View>
    </View>
  );
}

// "＋ Split into another category": a blue text link at the end of the card (sketch 3).
function PrimaryButtonLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();

  return (
    <View style={styles.split}>
      <AppText
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        weight="bold"
        style={{ color: colors.link, fontSize: 14, minHeight: 44, textAlignVertical: 'center' }}
      >
        {`＋ ${label}`}
      </AppText>
    </View>
  );
}

function assignmentNoneNote(
  t: (key: string, options?: Record<string, unknown>) => string,
  currency: string,
) {
  return t('movements.assignment.noneIn', { currency });
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  form: { gap: 14, paddingTop: 4, paddingBottom: 120 },
  when: { alignItems: 'flex-end', marginTop: -6 },
  toggle: {
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lines: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  split: { paddingHorizontal: 14 },
  rest: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  note: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  save: { position: 'absolute', left: 0, right: 0, bottom: 16 },
});
