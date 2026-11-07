import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// Repositories reach ViewModels through React context, so tests can swap the SQLite
// implementation for an in-memory one. One context per repository keeps features independent:
//   export const { RepositoryProvider, useRepository } = createRepositoryContext<MyRepo>('My');
export function createRepositoryContext<T>(name: string) {
  const Context = createContext<T | null>(null);

  function RepositoryProvider({ value, children }: { value: T; children: ReactNode }) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useRepository(): T {
    const value = useContext(Context);
    if (value === null) {
      throw new Error(`${name} repository is missing: wrap the tree in its RepositoryProvider`);
    }

    return value;
  }

  return { RepositoryProvider, useRepository };
}
