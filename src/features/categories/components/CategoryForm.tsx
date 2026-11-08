import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { iconToEmoji } from '@/core/theme/category-icons';
import { EnvelopeFrame } from '@/core/theme/EnvelopeFrame';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { TextField } from '@/core/theme/TextField';
import { useTheme } from '@/core/theme/ThemeProvider';

import { CATEGORY_COLORS, CATEGORY_ICON_KEYS } from '../category.types';
import { useCreateCategory } from '../useCreateCategory';

// Create a custom category with name, icon and color (RN-35). At the top, a small envelope shows
// how its budgets will look; the save button stays pinned at the bottom.
export function CategoryForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { form, submit, failed } = useCreateCategory(onCreated);
  const {
    control,
    watch,
    formState: { errors, isSubmitting },
  } = form;
  const message = (code: string | undefined) => (code ? t(`errors.${code}`) : undefined);
  const preview = watch();
  const shownName = preview.name.trim() || t('categories.form.previewName');

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {/* The category as its envelopes will look: band of its color, icon and name, live. */}
        <View style={styles.preview}>
          <View style={styles.envelope}>
            <EnvelopeFrame
              height={PREVIEW_HEIGHT}
              radius={10}
              fillPercent={100}
              bandColor={preview.color}
              bandLeft={16}
              bandWidth={8}
              flapHeight={34}
              exceeded={false}
              accessibilityLabel={t('categories.form.previewLabel', { name: shownName })}
            >
              <View style={styles.envelopeText} pointerEvents="none">
                <View style={[styles.emojiBadge, { backgroundColor: colors.surface }]}>
                  <Text style={styles.badgeEmoji}>{iconToEmoji(preview.icon)}</Text>
                </View>
                <AppText weight="bold" numberOfLines={2} style={{ color: colors.ink }}>
                  {shownName}
                </AppText>
              </View>
            </EnvelopeFrame>
          </View>
          <AppText variant="muted" style={styles.previewCaption}>
            {t('categories.form.previewCaption')}
          </AppText>
        </View>

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextField
              label={t('categories.form.name')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="sentences"
              error={message(errors.name?.message)}
            />
          )}
        />

        <AppText variant="muted">{t('categories.form.icon')}</AppText>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <View style={styles.grid} accessibilityRole="radiogroup">
              {CATEGORY_ICON_KEYS.map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityLabel={key}
                  accessibilityState={{ selected: field.value === key }}
                  onPress={() => field.onChange(key)}
                  style={[
                    styles.cell,
                    {
                      borderColor: field.value === key ? colors.ink : colors.line,
                      borderWidth: field.value === key ? 2 : 1,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text style={styles.emoji}>{iconToEmoji(key)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        />

        <AppText variant="muted">{t('categories.form.color')}</AppText>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <View style={styles.grid} accessibilityRole="radiogroup">
              {CATEGORY_COLORS.map((color) => {
                const selected = field.value === color;

                return (
                  <Pressable
                    key={color}
                    accessibilityRole="radio"
                    accessibilityLabel={color}
                    accessibilityState={{ selected }}
                    onPress={() => field.onChange(color)}
                    // The selected color gets a ring around it, so the swatch keeps its own color.
                    style={[styles.ring, { borderColor: selected ? colors.ink : 'transparent' }]}
                  >
                    <View style={[styles.swatch, { backgroundColor: color }]} />
                  </Pressable>
                );
              })}
            </View>
          )}
        />

        {failed ? <AppText>{t('errors.UNEXPECTED')}</AppText> : null}
      </ScrollView>
      <View style={styles.save} pointerEvents="box-none">
        <PrimaryButton
          tone="ink"
          label={t('categories.form.submit')}
          onPress={() => void submit()}
          disabled={isSubmitting}
        />
      </View>
    </View>
  );
}

const PREVIEW_HEIGHT = 140;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  form: { gap: 14, paddingTop: 4, paddingBottom: 120 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  envelope: { width: 150 },
  envelopeText: { position: 'absolute', left: 34, right: 10, bottom: 12, gap: 6 },
  emojiBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 18 },
  previewCaption: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 36, height: 36, borderRadius: 18 },
  save: { position: 'absolute', left: 0, right: 0, bottom: 16 },
});
