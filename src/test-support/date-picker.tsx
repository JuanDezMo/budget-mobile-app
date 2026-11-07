import { jest } from '@jest/globals';
import { createElement } from 'react';
import { Pressable } from 'react-native';

// Stand-in for the native date picker in tests. The real one cannot run in Jest, so this
// renders a button; pressing it "picks" whatever date `getPickedDate` returns at that moment.
// Used as: jest.mock('@react-native-community/datetimepicker', () => mockDatePicker(() => date))
export function mockDatePicker(getPickedDate: () => Date) {
  return {
    __esModule: true,
    default: (props: {
      accessibilityLabel?: string;
      onValueChange: (event: object, date: Date) => void;
    }) =>
      createElement(Pressable, {
        accessibilityRole: 'button',
        accessibilityLabel: props.accessibilityLabel,
        onPress: () => props.onValueChange({}, getPickedDate()),
      }),
    DateTimePickerAndroid: { open: jest.fn() },
  };
}
