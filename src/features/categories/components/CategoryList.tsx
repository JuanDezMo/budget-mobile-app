import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { PrimaryButton } from '@/core/theme/PrimaryButton';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../category.rules';
import type { Category } from '../category.types';
import { useCategories } from '../useCategories';
import { CategoryAvatar } from '@/core/theme/CategoryAvatar';

type Props = { onCreate: () => void };

// Categories grouped as built-in, yours and archived (RN-34, RN-35, RN-36).
export function CategoryList({ onCreate }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { system, custom, archived, remove, isLoading } = useCategories();

  async function removeCategory(category: Category) {
    const result = await remove(category.id);
    const message = result.ok
      ? t(result.value === 'ARCHIVE' ? 'categories.archivedDone' : 'categories.deletedDone')
      : t(`errors.${result.error}`);
    Alert.alert(getCategoryLabel(category, t), message);
  }

  function confirmRemove(category: Category) {
    Alert.alert(t('categories.removeTitle'), t('categories.removeMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('categories.remove'),
        style: 'destructive',
        onPress: () => void removeCategory(category),
      },
    ]);
  }

  if (isLoading) return null;

  const renderRow = (category: Category, removable: boolean) => (
    <View
      key={category.id}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.line }]}
    >
      <CategoryAvatar icon={category.icon} color={category.color} />
      <AppText style={styles.name}>{getCategoryLabel(category, t)}</AppText>
      {removable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('categories.remove')} ${getCategoryLabel(category, t)}`}
          onPress={() => confirmRemove(category)}
          style={styles.remove}
        >
          <AppText style={{ color: colors.over }}>{t('categories.remove')}</AppText>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <PrimaryButton label={t('categories.new')} onPress={onCreate} />

      <AppText variant="muted">{t('categories.sectionCustom')}</AppText>
      {custom.length === 0 ? (
        <AppText variant="muted">{t('categories.emptyCustom')}</AppText>
      ) : (
        custom.map((category) => renderRow(category, true))
      )}

      <AppText variant="muted">{t('categories.sectionSystem')}</AppText>
      {system.map((category) => renderRow(category, false))}

      {archived.length > 0 ? (
        <>
          <AppText variant="muted">{t('categories.sectionArchived')}</AppText>
          {archived.map((category) => renderRow(category, false))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 10, paddingBottom: 32 },
  row: {
    minHeight: 64,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: { flex: 1 },
  remove: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
});
