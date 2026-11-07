import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

// Main action of a list screen ("New budget", "New movement"), pinned to the bottom so it is
// always in reach of the thumb and never scrolls away. Lists leave room for it at their end
// (`FLOATING_ACTION_SPACE`).
export const FLOATING_ACTION_SPACE = 96;

export function FloatingAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <PrimaryButton label={label} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 16 },
});
