import { StyleSheet, Text, View } from 'react-native';

import { iconToEmoji } from './category-icons';

// Round badge with the category icon over its color.
export function CategoryAvatar({ icon, color }: { icon: string; color: string }) {
  return (
    <View style={[styles.avatar, { backgroundColor: `${color}33`, borderColor: color }]}>
      <Text style={styles.emoji} importantForAccessibility="no">
        {iconToEmoji(icon)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
});
