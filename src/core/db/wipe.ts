import type { AppDatabase } from './database.types';

// RN-46: deletes everything the user created, in an order that respects foreign keys,
// inside one transaction (all or nothing). Currencies, the system categories and the
// settings row are not user data and stay.
export async function wipeUserData(db: AppDatabase): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('movement_line').execute();
    await trx.deleteFrom('movement').execute();
    await trx.deleteFrom('alert_sent').execute();
    await trx.deleteFrom('budget_threshold').execute();
    await trx.deleteFrom('budget').execute();
    await trx.deleteFrom('category').where('is_system', '=', 0).execute();
    await trx.deleteFrom('user_profile').execute();
  });
}
