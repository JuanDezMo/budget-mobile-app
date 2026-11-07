// expo-crypto is native and returns nothing under Jest, so repositories receive this
// function from the composition root and tests pass their own.
import { randomUUID } from 'expo-crypto';

// New UUID v4 for any table id.
export function newId(): string {
  return randomUUID();
}
