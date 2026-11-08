import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import {
  createFakePinHasher,
  createInMemorySecretStorage,
  createPinVault,
} from '@/core/security/pin-vault';
import type { PinVault } from '@/core/security/pin-vault';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { RegistrationForm } from '@/features/profile/components/RegistrationForm';
import { UnlockForm } from '@/features/profile/components/UnlockForm';
import { createInMemoryProfileRepository } from '@/features/profile/profile.repository';
import type { ProfileRepository } from '@/features/profile/profile.repository';
import { useAccessStore } from '@/features/profile/useAccess';
import {
  PinVaultProvider,
  ProfileRepositoryProvider,
} from '@/features/profile/useProfileDependencies';

// Screen tests live here, not in src/app, because Expo Router treats every file there as a route.
let repository: ProfileRepository;
let vault: PinVault;

function Providers({ children }: { children: ReactNode }) {
  return (
    <ProfileRepositoryProvider value={repository}>
      <PinVaultProvider value={vault}>
        <ThemeProvider mode="LIGHT">{children}</ThemeProvider>
      </PinVaultProvider>
    </ProfileRepositoryProvider>
  );
}

beforeEach(async () => {
  repository = createInMemoryProfileRepository();
  vault = createPinVault(createInMemorySecretStorage(), createFakePinHasher());
  useAccessStore.setState({ status: 'needsRegistration', profile: null });
  await initI18n('es');
  await setAppLanguage('es');
});

describe('registration screen', () => {
  it('RN-42 shows an error for each required field when sent empty', async () => {
    await render(<RegistrationForm />, { wrapper: Providers });

    await fireEvent.press(screen.getByRole('button', { name: 'Crear perfil' }));

    expect(await screen.findByText('Ingresa tu nombre.')).toBeTruthy();
    expect(screen.getByText('Ingresa un correo válido.')).toBeTruthy();
    expect(screen.getAllByText('El PIN debe tener de 4 a 6 dígitos.').length).toBeGreaterThan(0);
    expect(await repository.get()).toBeNull();
  });

  it('RN-42 / RN-43 registers with name, email, country and a confirmed PIN', async () => {
    await render(<RegistrationForm />, { wrapper: Providers });

    await fireEvent.changeText(screen.getByLabelText('Nombre completo'), 'Ana Pérez');
    await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await fireEvent.changeText(screen.getByLabelText('Buscar país'), 'colom');
    await fireEvent.press(await screen.findByText('Colombia'));
    await fireEvent.changeText(screen.getByLabelText('PIN (de 4 a 6 dígitos)'), '4821');
    await fireEvent.changeText(screen.getByLabelText('Repite tu PIN'), '4821');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear perfil' }));

    await waitFor(() => expect(useAccessStore.getState().status).toBe('unlocked'));
    expect(await repository.get()).toEqual({
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      countryCode: 'CO',
    });
    expect(await vault.verifyPin('4821')).toBe(true);
  });

  it('RN-43 tells the user when the two PINs differ', async () => {
    await render(<RegistrationForm />, { wrapper: Providers });

    await fireEvent.changeText(screen.getByLabelText('PIN (de 4 a 6 dígitos)'), '4821');
    await fireEvent.changeText(screen.getByLabelText('Repite tu PIN'), '1111');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear perfil' }));

    expect(await screen.findByText('Los PIN no coinciden.')).toBeTruthy();
  });

  it('RN-43 warns that a forgotten PIN cannot be recovered', async () => {
    await render(<RegistrationForm />, { wrapper: Providers });

    expect(screen.getByText(/no se puede recuperar/)).toBeTruthy();
  });
});

describe('lock screen', () => {
  beforeEach(async () => {
    const profile = { fullName: 'Ana', email: 'ana@example.com', countryCode: 'CO' };
    await repository.create(profile);
    await vault.setPin('4821');
    useAccessStore.setState({ status: 'locked', profile });
  });

  it('RN-43 the PIN boxes show one dot per digit and take digits only', async () => {
    await render(<UnlockForm />, { wrapper: Providers });

    await fireEvent.changeText(screen.getByLabelText('PIN'), '48a2');

    expect(screen.getByLabelText('PIN').props.value).toBe('482');
    expect(screen.getAllByText('●')).toHaveLength(3);
  });

  it('RN-46 "Olvidé mi PIN" is a quiet link that still asks before erasing', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<UnlockForm />, { wrapper: Providers });

    await fireEvent.press(screen.getByRole('button', { name: 'Olvidé mi PIN' }));

    expect(alert).toHaveBeenCalledTimes(1);
    expect(await repository.get()).not.toBeNull(); // nothing erased without confirming
    alert.mockRestore();
  });

  it('RN-44 a wrong PIN shows an error and keeps the app locked', async () => {
    await render(<UnlockForm />, { wrapper: Providers });

    await fireEvent.changeText(screen.getByLabelText('PIN'), '0000');
    await fireEvent.press(screen.getByRole('button', { name: 'Desbloquear' }));

    expect(await screen.findByText('PIN incorrecto.')).toBeTruthy();
    expect(useAccessStore.getState().status).toBe('locked');
  });

  it('RN-44 the right PIN opens the app', async () => {
    await render(<UnlockForm />, { wrapper: Providers });

    await fireEvent.changeText(screen.getByLabelText('PIN'), '4821');
    await fireEvent.press(screen.getByRole('button', { name: 'Desbloquear' }));

    await waitFor(() => expect(useAccessStore.getState().status).toBe('unlocked'));
  });

  it('RN-45 after 5 wrong PINs the screen shows the wait and disables the button', async () => {
    await render(<UnlockForm />, { wrapper: Providers });

    for (let i = 0; i < 5; i += 1) {
      await fireEvent.changeText(screen.getByLabelText('PIN'), '0000');
      await fireEvent.press(screen.getByRole('button', { name: 'Desbloquear' }));
    }

    expect(
      await screen.findByText(/Demasiados intentos\. Intenta de nuevo en \d+ s\./),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeDisabled();
  });
});
