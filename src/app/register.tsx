import { Screen } from '@/core/theme/Screen';
import { RegistrationForm } from '@/features/profile/components/RegistrationForm';

// First launch (RN-42). The root layout only shows this route while there is no profile.
export default function RegisterScreen() {
  return (
    <Screen>
      <RegistrationForm />
    </Screen>
  );
}
