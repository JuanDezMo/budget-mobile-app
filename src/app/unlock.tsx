import { Screen } from '@/core/theme/Screen';
import { UnlockForm } from '@/features/profile/components/UnlockForm';

// PIN door (RN-44). The root layout only shows this route while the app is locked.
export default function UnlockScreen() {
  return (
    <Screen>
      <UnlockForm />
    </Screen>
  );
}
