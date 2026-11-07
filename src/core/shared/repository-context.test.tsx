import { describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createRepositoryContext } from './repository-context';

type FakeRepository = { name: string };

describe('createRepositoryContext', () => {
  const { RepositoryProvider, useRepository } = createRepositoryContext<FakeRepository>('Fake');

  it('gives the provided repository to the hook', async () => {
    const repository: FakeRepository = { name: 'in-memory' };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <RepositoryProvider value={repository}>{children}</RepositoryProvider>
    );

    const { result } = await renderHook(() => useRepository(), { wrapper });

    expect(result.current).toBe(repository);
  });

  it('fails with a clear message when no provider wraps the tree', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useRepository())).rejects.toThrow('Fake repository is missing');

    spy.mockRestore();
  });
});
