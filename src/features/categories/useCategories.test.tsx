import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SEED_SYSTEM_CATEGORIES } from '@/core/db/seed-data';

import { createInMemoryCategoryRepository } from './category.repository';
import type { CategoryRepository } from './category.repository';
import type { Category } from './category.types';
import { useCategories } from './useCategories';
import { CategoryRepositoryProvider } from './useCategoryRepository';

const seeded: Category[] = SEED_SYSTEM_CATEGORIES.map((c) => ({
  id: c.id,
  isSystem: true,
  code: c.code,
  icon: c.icon,
  color: c.color,
  archivedAt: null,
}));
const transporteId = SEED_SYSTEM_CATEGORIES[1]?.id ?? '';

let repository: CategoryRepository;
let history: Set<string>;

function setup() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <CategoryRepositoryProvider value={repository}>{children}</CategoryRepositoryProvider>
  );

  return renderHook(() => useCategories(), { wrapper });
}

beforeEach(() => {
  let n = 0;
  history = new Set();
  repository = createInMemoryCategoryRepository(seeded, () => `custom-${(n += 1)}`, history);
});

describe('useCategories', () => {
  it('RN-34 lists the built-in categories and no custom ones at first', async () => {
    const { result } = await setup();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.system).toHaveLength(6);
    expect(result.current.custom).toEqual([]);
    expect(result.current.archived).toEqual([]);
  });

  it('RN-36 removing a custom category with no history deletes it', async () => {
    const created = await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    const { result } = await setup();
    await waitFor(() => expect(result.current.custom).toHaveLength(1));

    let outcome;
    await act(async () => {
      outcome = await result.current.remove(created.id);
    });

    expect(outcome).toEqual({ ok: true, value: 'DELETE' });
    expect(result.current.custom).toEqual([]);
  });

  it('RN-36 removing a custom category with history archives it and keeps it listed apart', async () => {
    const created = await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    history.add(created.id);
    const { result } = await setup();
    await waitFor(() => expect(result.current.custom).toHaveLength(1));

    let outcome;
    await act(async () => {
      outcome = await result.current.remove(created.id);
    });

    expect(outcome).toEqual({ ok: true, value: 'ARCHIVE' });
    expect(result.current.custom).toEqual([]);
    expect(result.current.archived).toHaveLength(1);
  });

  it('RN-34 a built-in category cannot be removed', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.remove(transporteId);
    });

    expect(outcome).toEqual({ ok: false, error: 'CATEGORY_SYSTEM_PROTECTED' });
    expect(result.current.system).toHaveLength(6);
  });

  it('RN-34 a built-in category cannot be renamed', async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.rename(transporteId, 'Taxis');
    });

    expect(outcome).toEqual({ ok: false, error: 'CATEGORY_SYSTEM_PROTECTED' });
  });

  it('RN-35 renaming to a name another category uses is refused', async () => {
    await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    const other = await repository.create({ name: 'Ropa', icon: 'shirt', color: '#2F66D8' });
    const { result } = await setup();
    await waitFor(() => expect(result.current.custom).toHaveLength(2));

    let outcome;
    await act(async () => {
      outcome = await result.current.rename(other.id, 'mascotas');
    });

    expect(outcome).toEqual({ ok: false, error: 'CATEGORY_NAME_DUPLICATE' });
  });

  it('RN-35 renaming a custom category changes its name', async () => {
    const created = await repository.create({ name: 'Mascotas', icon: 'paw', color: '#7A4FD0' });
    const { result } = await setup();
    await waitFor(() => expect(result.current.custom).toHaveLength(1));

    await act(async () => {
      await result.current.rename(created.id, '  Gatos ');
    });

    expect(result.current.custom[0]).toMatchObject({ name: 'Gatos' });
  });
});
