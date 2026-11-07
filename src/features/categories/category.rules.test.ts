import { describe, expect, it } from '@jest/globals';

import { err, ok } from '@/core/shared/result';

import {
  checkCanHaveBudget,
  checkCanReceiveLines,
  checkCanRename,
  checkCategoryNameAvailable,
  decideRemoval,
  getCategoryLabel,
} from './category.rules';
import type { Category, CustomCategory, SystemCategory } from './category.types';

const base = { icon: 'star', color: '#D9452A', archivedAt: null };
const transporte: SystemCategory = { ...base, id: 's1', isSystem: true, code: 'TRANSPORTE' };
const sinClasificar: SystemCategory = { ...base, id: 's2', isSystem: true, code: 'SIN_CLASIFICAR' };
const mascotas: CustomCategory = { ...base, id: 'c1', isSystem: false, name: 'Mascotas' };
const archived: CustomCategory = {
  ...mascotas,
  id: 'c2',
  name: 'Viejo',
  archivedAt: '2026-11-01T00:00:00Z',
};
const all: Category[] = [transporte, sinClasificar, mascotas, archived];

describe('RN-35 unique names', () => {
  it('RN-35 accepts a new name and cleans extra spaces', () => {
    expect(checkCategoryNameAvailable('  Ropa   de  bebé ', all)).toEqual(ok('Ropa de bebé'));
  });

  it('RN-35 rejects the same name ignoring case', () => {
    expect(checkCategoryNameAvailable('mascotas', all)).toEqual(err('CATEGORY_NAME_DUPLICATE'));
    expect(checkCategoryNameAvailable('MASCOTAS', all)).toEqual(err('CATEGORY_NAME_DUPLICATE'));
    expect(checkCategoryNameAvailable('  Mascotas  ', all)).toEqual(err('CATEGORY_NAME_DUPLICATE'));
  });

  it('RN-35 compares accented letters in any case too', () => {
    const arbol: CustomCategory = { ...mascotas, id: 'c3', name: 'Árbol' };

    expect(checkCategoryNameAvailable('ÁRBOL', [arbol])).toEqual(err('CATEGORY_NAME_DUPLICATE'));
  });

  it('RN-35 an archived category still reserves its name', () => {
    expect(checkCategoryNameAvailable('viejo', all)).toEqual(err('CATEGORY_NAME_DUPLICATE'));
  });

  it('RN-35 a category can keep its own name when edited', () => {
    expect(checkCategoryNameAvailable('Mascotas', all, 'c1')).toEqual(ok('Mascotas'));
  });
});

describe('RN-34 built-in categories', () => {
  it('RN-34 cannot be renamed', () => {
    expect(checkCanRename(transporte)).toEqual(err('CATEGORY_SYSTEM_PROTECTED'));
    expect(checkCanRename(mascotas)).toEqual(ok(mascotas));
  });

  it('RN-34 cannot be deleted or archived', () => {
    expect(decideRemoval(transporte, false)).toEqual(err('CATEGORY_SYSTEM_PROTECTED'));
    expect(decideRemoval(transporte, true)).toEqual(err('CATEGORY_SYSTEM_PROTECTED'));
  });

  it('RN-34 are named by translating their code', () => {
    const translate = (key: string) => `[${key}]`;

    expect(getCategoryLabel(transporte, translate)).toBe('[categories.TRANSPORTE]');
    expect(getCategoryLabel(mascotas, translate)).toBe('Mascotas');
  });
});

describe('RN-36 archive or delete', () => {
  it('RN-36 a custom category with history is archived, not deleted', () => {
    expect(decideRemoval(mascotas, true)).toEqual(ok('ARCHIVE'));
  });

  it('RN-36 a custom category with no history is deleted', () => {
    expect(decideRemoval(mascotas, false)).toEqual(ok('DELETE'));
  });

  it('RN-36 an already archived category cannot be removed again', () => {
    expect(decideRemoval(archived, true)).toEqual(err('CATEGORY_ALREADY_ARCHIVED'));
  });

  it('RN-36 an archived category accepts no new lines', () => {
    expect(checkCanReceiveLines(archived)).toEqual(err('CATEGORY_ARCHIVED'));
    expect(checkCanReceiveLines(mascotas)).toEqual(ok(mascotas));
  });
});

describe('RN-40 / RN-36 which categories can have a budget', () => {
  it('RN-40 SIN_CLASIFICAR never has a budget', () => {
    expect(checkCanHaveBudget(sinClasificar)).toEqual(err('CATEGORY_NO_BUDGET_ALLOWED'));
  });

  it('RN-36 an archived category cannot get a new budget', () => {
    expect(checkCanHaveBudget(archived)).toEqual(err('CATEGORY_ARCHIVED'));
  });

  it('other categories can have budgets', () => {
    expect(checkCanHaveBudget(transporte)).toEqual(ok(transporte));
    expect(checkCanHaveBudget(mascotas)).toEqual(ok(mascotas));
  });
});
