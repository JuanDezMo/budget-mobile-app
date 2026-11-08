import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

// The save button of a form, pinned to the bottom of the screen within reach of the thumb. While
// the keyboard is open it steps aside: otherwise it would ride up with the keyboard and cover the
// field being typed in. Forms leave room for it at their end (`PINNED_FOOTER_SPACE`).
export const PINNED_FOOTER_SPACE = 120;

export function PinnedFooter({ children }: { children: ReactNode }) {
  // Read the keyboard at mount too: a screen can open while the keyboard is already up.
  const [keyboardOpen, setKeyboardOpen] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  return (
    <View style={styles.footer} pointerEvents="box-none">
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { position: 'absolute', left: 0, right: 0, bottom: 16 },
});
