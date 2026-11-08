import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';
import { initI18n, setAppLanguage } from '@/core/i18n/i18n';
import { ThemeProvider } from '@/core/theme/ThemeProvider';
import { createInMemoryCategoryRepository } from '@/features/categories/category.repository';
import type { CategoryRepository } from '@/features/categories/category.repository';
import type { Category } from '@/features/categories/category.types';
import { CategoryForm } from '@/features/categories/components/CategoryForm';
import { CategoryList } from '@/features/categories/components/CategoryList';
import { CategoryRepositoryProvider } from '@/features/categories/useCategoryRepository';

// Screen tests live here, not in src/app, because Expo Router treats every file there as a route.
const seeded: Category[] = SEED_SYSTEM_CATEGORIES.map((c) => ({
  id: c.id,
  isSystem: true,
  code: c.code,
  icon: c.icon,
  color: c.color,
  archivedAt: null,
}));

let repository: CategoryRepository;

function Providers({ children }: { children: ReactNode }) {
  return (
    <CategoryRepositoryProvider value={repository}>
      <ThemeProvider mode="LIGHT">{children}</ThemeProvider>
    </CategoryRepositoryProvider>
  );
}

beforeEach(async () => {
  let n = 0;
  repository = createInMemoryCategoryRepository(seeded, () => `custom-${(n += 1)}`);
  await initI18n('es');
  await setAppLanguage('es');
  jest.restoreAllMocks();
});

describe('category list', () => {
  it('RN-34 shows the built-in categories translated by code', async () => {
    await render(<CategoryList onCreate={() => undefined} />, { wrapper: Providers });

    expect(await screen.findByText('Transporte')).toBeTruthy();
    expect(screen.getByText('Obligaciones del hogar')).toBeTruthy();
    expect(screen.getByText('Sin clasificar')).toBeTruthy();
  });

  it('RN-34 built-in categories have no remove button', async () => {
    await render(<CategoryList onCreate={() => undefined} />, { wrapper: Providers });
    await screen.findByText('Transporte');

    expect(screen.queryByRole('button', { name: /Quitar/ })).toBeNull();
  });

  it('shows custom categories and archived ones in their own sections', async () => {
    await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    const old = await repository.create({ name: 'Viejo', icon: 'star', color: '#5C6570' });
    await repository.archive(old.id);

    await render(<CategoryList onCreate={() => undefined} />, { wrapper: Providers });

    expect(await screen.findByText('Mascotas')).toBeTruthy();
    const headings = screen.getAllByRole('header');
    const expected = ['TUYAS', 'DEL SISTEMA', 'ARCHIVADAS'];
    expect(headings).toHaveLength(expected.length);
    expected.forEach((text, index) => expect(headings[index]).toHaveTextContent(text));
    expect(screen.getByText('Viejo')).toBeTruthy();
  });

  it('each row carries the band of its color; an archived one is faded (RN-36)', async () => {
    const pets = await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    const old = await repository.create({ name: 'Viejo', icon: 'star', color: '#5C6570' });
    await repository.archive(old.id);

    await render(<CategoryList onCreate={() => undefined} />, { wrapper: Providers });

    expect(await screen.findByTestId(`category-band-${pets.id}`)).toHaveStyle({
      backgroundColor: '#7A4FD0',
      opacity: 1,
    });
    expect(screen.getByTestId(`category-band-${old.id}`)).toHaveStyle({ opacity: 0.4 });
  });

  it('RN-36 removing a category asks for confirmation first', async () => {
    await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await render(<CategoryList onCreate={() => undefined} />, { wrapper: Providers });

    await fireEvent.press(await screen.findByRole('button', { name: 'Quitar Mascotas' }));

    expect(alert).toHaveBeenCalledWith('¿Quitar categoría?', expect.any(String), expect.any(Array));
    expect((await repository.list()).some((c) => !c.isSystem)).toBe(true);
  });
});

describe('category form', () => {
  it('RN-35 creates "Mascotas" with the chosen icon and color', async () => {
    let created = false;
    await render(<CategoryForm onCreated={() => (created = true)} />, { wrapper: Providers });

    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Mascotas');
    await fireEvent.press(screen.getByRole('radio', { name: 'paw' }));
    await fireEvent.press(screen.getByRole('radio', { name: '#7A4FD0' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Crear categoría' }));

    await waitFor(() => expect(created).toBe(true));
    expect((await repository.list()).at(-1)).toMatchObject({
      name: 'Mascotas',
      icon: 'paw',
      color: '#7A4FD0',
    });
  });

  it('shows the small envelope live with the name typed', async () => {
    await render(<CategoryForm onCreated={() => undefined} />, { wrapper: Providers });

    expect(screen.getByLabelText('Vista previa: sobre de Tu categoría')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'Mascotas');

    expect(screen.getByLabelText('Vista previa: sobre de Mascotas')).toBeTruthy();
  });

  it('offers no color that looks like the manila of the envelopes', async () => {
    await render(<CategoryForm onCreated={() => undefined} />, { wrapper: Providers });

    expect(screen.getAllByRole('radio', { name: /^#/ })).toHaveLength(12);
    expect(screen.queryByRole('radio', { name: '#E3A21A' })).toBeNull();
  });

  it('RN-35 refuses "mascotas" when "Mascotas" already exists', async () => {
    await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    let created = false;
    await render(<CategoryForm onCreated={() => (created = true)} />, { wrapper: Providers });

    await fireEvent.changeText(screen.getByLabelText('Nombre'), 'mascotas');
    await fireEvent.press(screen.getByRole('button', { name: 'Crear categoría' }));

    expect(await screen.findByText('Ya tienes una categoría con ese nombre.')).toBeTruthy();
    expect(created).toBe(false);
    expect((await repository.list()).filter((c) => !c.isSystem)).toHaveLength(1);
  });

  it('RN-35 asks for a name', async () => {
    await render(<CategoryForm onCreated={() => undefined} />, { wrapper: Providers });

    await fireEvent.press(screen.getByRole('button', { name: 'Crear categoría' }));

    expect(await screen.findByText('Ingresa un nombre.')).toBeTruthy();
  });
});
