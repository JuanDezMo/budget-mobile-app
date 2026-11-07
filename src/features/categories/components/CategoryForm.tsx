import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { TextField } from '@/core/theme/TextField';
import { useTheme } from '@/core/theme/ThemeProvider';

import { CATEGORY_COLORS, CATEGORY_ICON_KEYS } from '../category.types';
import { useCreateCategory } from '../useCreateCategory';
import { CategoryAvatar } from './CategoryAvatar';
import { ICON_EMOJI } from './category-icons';

// Create a custom category with name, icon and color (RN-35).
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

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <View style={styles.preview}>
        <CategoryAvatar icon={preview.icon} color={preview.color} />
        <AppText>{preview.name}</AppText>
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
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={styles.emoji}>{ICON_EMOJI[key]}</Text>
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
            {CATEGORY_COLORS.map((color) => (
              <Pressable
                key={color}
                accessibilityRole="radio"
                accessibilityLabel={color}
                accessibilityState={{ selected: field.value === color }}
                onPress={() => field.onChange(color)}
                style={[
                  styles.cell,
                  {
                    backgroundColor: color,
                    borderColor: field.value === color ? colors.ink : colors.line,
                  },
                ]}
              />
            ))}
          </View>
        )}
      />

      {failed ? <AppText>{t('errors.UNEXPECTED')}</AppText> : null}
      <PrimaryButton
        label={t('categories.form.submit')}
        onPress={() => void submit()}
        disabled={isSubmitting}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, paddingBottom: 32 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
});
