import { wipeUserData } from '@/core/db/wipe';
import type { AppDatabase, UserProfileTable } from '@/core/db/database.types';

import type { Profile, ProfileUpdate } from './profile.types';

export interface ProfileRepository {
  // null until the user registers (RN-42).
  get(): Promise<Profile | null>;
  create(profile: Profile): Promise<Profile>;
  update(change: ProfileUpdate): Promise<Profile>;
  // RN-46: removes the profile and everything the user created. Settings and the
  // built-in currencies and categories stay.
  eraseAllData(): Promise<void>;
}

const PROFILE_ID = 1;

// Row (snake_case) -> entity (camelCase).
function toProfile(row: UserProfileTable): Profile {
  return { fullName: row.full_name, email: row.email, countryCode: row.country_code };
}

export function createProfileRepository(db: AppDatabase): ProfileRepository {
  async function get(): Promise<Profile | null> {
    const row = await db
      .selectFrom('user_profile')
      .selectAll()
      .where('id', '=', PROFILE_ID)
      .executeTakeFirst();

    return row ? toProfile(row) : null;
  }

  async function required(): Promise<Profile> {
    const profile = await get();
    if (!profile) throw new Error('Profile is missing: the user has not registered');

    return profile;
  }

  return {
    get,

    async create(profile) {
      const now = new Date().toISOString();
      await db
        .insertInto('user_profile')
        .values({
          id: PROFILE_ID,
          full_name: profile.fullName,
          email: profile.email,
          country_code: profile.countryCode,
          created_at: now,
          updated_at: now,
        })
        .execute();

      return required();
    },

    async update(change) {
      await db
        .updateTable('user_profile')
        .set({
          ...(change.fullName !== undefined ? { full_name: change.fullName } : {}),
          ...(change.email !== undefined ? { email: change.email } : {}),
          ...(change.countryCode !== undefined ? { country_code: change.countryCode } : {}),
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', PROFILE_ID)
        .execute();

      return required();
    },

    eraseAllData: () => wipeUserData(db),
  };
}

// For tests of ViewModels and screens: same behavior, no database.
export function createInMemoryProfileRepository(initial?: Profile): ProfileRepository {
  let current: Profile | null = initial ?? null;

  return {
    get: () => Promise.resolve(current ? { ...current } : null),
    create(profile) {
      current = { ...profile };
      return Promise.resolve({ ...current });
    },
    update(change) {
      if (!current) return Promise.reject(new Error('Profile is missing'));
      current = { ...current, ...change };
      return Promise.resolve({ ...current });
    },
    eraseAllData() {
      current = null;
      return Promise.resolve();
    },
  };
}
