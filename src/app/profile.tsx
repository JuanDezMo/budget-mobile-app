import { Screen } from '@/core/theme/Screen';
import { ProfileEditor } from '@/features/profile/components/ProfileEditor';

// The title comes from the stack header (see _layout.tsx).
export default function ProfileScreen() {
  return (
    <Screen>
      <ProfileEditor />
    </Screen>
  );
}
