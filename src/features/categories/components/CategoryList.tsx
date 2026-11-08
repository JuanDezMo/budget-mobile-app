import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/core/theme/AppText';
import { iconToEmoji } from '@/core/theme/category-icons';
import { FLOATING_ACTION_SPACE, FloatingAction } from '@/core/theme/FloatingAction';
import { SectionHeading } from '@/core/theme/SectionHeading';
import { useTheme } from '@/core/theme/ThemeProvider';

import { getCategoryLabel } from '../category.rules';
import type { Category } from '../category.types';
import { useCategories } from '../useCategories';

type Props = {
  refreshKey?: number; // changes when the screen regains focus, to load again
  onCreate: () => void;
};

type Section = { key: string; title: string; items: readonly Category[]; empty?: string };

// Categories grouped as yours, built-in and archived (RN-34, RN-35, RN-36). Each section is one
// continuous block; each row carries the band ("liga") its envelopes will have.
export function CategoryList({ refreshKey, onCreate }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { system, custom, archived, remove, isLoading } = useCategories(refreshKey);

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

  const sections: Section[] = [
    {
      key: 'custom',
      title: t('categories.sectionCustom'),
      items: custom,
      empty: t('categories.emptyCustom'),
    },
    { key: 'system', title: t('categories.sectionSystem'), items: system },
    ...(archived.length > 0
      ? [{ key: 'archived', title: t('categories.sectionArchived'), items: archived }]
      : []),
  ];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <SectionHeading title={section.title} />
            {section.items.length === 0 && section.empty ? (
              <AppText variant="muted">{section.empty}</AppText>
            ) : null}
            {section.items.length > 0 ? (
              <View style={[styles.block, { borderColor: colors.line }]}>
                {section.items.map((category, index) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    isLast={index === section.items.length - 1}
                    // RN-34: built-in categories cannot be removed; archived ones are already out.
                    onRemove={section.key === 'custom' ? confirmRemove : undefined}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <FloatingAction label={t('categories.new')} onPress={onCreate} />
    </View>
  );
}

function CategoryRow({
  category,
  isLast,
  onRemove,
}: {
  category: Category;
  isLast: boolean;
  onRemove?: (category: Category) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const label = getCategoryLabel(category, t);
  const isArchived = category.archivedAt !== null;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderBottomColor: colors.line },
        isLast && styles.last,
      ]}
    >
      {/* An archived category keeps its color, faded: it no longer takes new budgets (RN-36). */}
      <View
        testID={`category-band-${category.id}`}
        style={[styles.band, { backgroundColor: category.color, opacity: isArchived ? 0.4 : 1 }]}
      />
      <View style={[styles.icon, { backgroundColor: colors.ground }]}>
        <AppText>{iconToEmoji(category.icon)}</AppText>
      </View>
      <AppText style={[styles.name, isArchived && { color: colors.mute }]} numberOfLines={1}>
        {label}
      </AppText>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('categories.remove')} ${label}`}
          onPress={() => onRemove(category)}
          style={styles.remove}
        >
          <AppText variant="muted" weight="semibold" style={styles.removeText}>
            {t('categories.remove')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 20, paddingTop: 4, paddingBottom: FLOATING_ACTION_SPACE },
  section: { gap: 8 },
  block: { borderRadius: 12, overflow: 'hidden' },
  row: {
    minHeight: 56,
    paddingLeft: 22, // room for the band
    paddingRight: 8,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  last: { borderBottomWidth: 0 },
  band: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1 },
  remove: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 14 },
});
