import { StyleSheet, View, useWindowDimensions } from 'react-native';

import type { Category } from '../../categories/category.types';
import type { BudgetItem } from '../budget.types';
import { EnvelopeCard } from './EnvelopeCard';

const SCREEN_PADDING = 16; // the Screen component's horizontal padding
const GAP = 12;

type Props = {
  items: readonly BudgetItem[];
  categories: readonly Category[];
  onOpen: (budgetId: string) => void;
};

// Envelopes in two columns (the grid of the visual direction).
export function EnvelopeGrid({ items, categories, onOpen }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = Math.floor((screenWidth - SCREEN_PADDING * 2 - GAP) / 2);

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <EnvelopeCard
          key={item.budget.id}
          item={item}
          category={categories.find((category) => category.id === item.budget.categoryId)}
          width={cardWidth}
          onPress={() => onOpen(item.budget.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
});
