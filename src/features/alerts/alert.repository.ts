import type { AppDatabase, BudgetThresholdTable } from '@/core/db/database.types';

import { AUTOMATIC_THRESHOLD_PERCENTAGE } from './alert.types';
import type { Threshold } from './alert.types';

export interface ThresholdRepository {
  // Every threshold of a budget, lowest first (the automatic 100% is the last).
  list(budgetId: string): Promise<Threshold[]>;
  // RN-25: makes sure the automatic 100% exists. Safe to call as many times as needed.
  ensureAutomatic(budgetId: string): Promise<void>;
  // RN-24: replaces the thresholds the user chose. Those that stay keep their id, and with it
  // their "already sent" record. Returns the thresholds that were added.
  replaceConfigurable(budgetId: string, percentages: readonly number[]): Promise<Threshold[]>;
  // Percentages of every budget (configured ones and the automatic 100%), lowest first, in one
  // query: the envelopes draw them as bands (the "ligas" of the visual direction).
  listPercentagesByBudget(): Promise<Record<string, number[]>>;
  // RN-27: ids of the thresholds of this budget that were already notified.
  listSentIds(budgetId: string): Promise<Set<string>>;
  recordSent(thresholdIds: readonly string[], sentAtIso: string): Promise<void>;
  clearSent(thresholdIds: readonly string[]): Promise<void>;
}

function toThreshold(row: BudgetThresholdTable): Threshold {
  return {
    id: row.id,
    budgetId: row.budget_id,
    percentage: row.percentage,
    isAutomatic: row.is_automatic === 1,
  };
}

export function createThresholdRepository(
  db: AppDatabase,
  generateId: () => string,
): ThresholdRepository {
  async function list(budgetId: string): Promise<Threshold[]> {
    const rows = await db
      .selectFrom('budget_threshold')
      .selectAll()
      .where('budget_id', '=', budgetId)
      .orderBy('percentage')
      .execute();

    return rows.map(toThreshold);
  }

  return {
    list,

    async ensureAutomatic(budgetId) {
      await db
        .insertInto('budget_threshold')
        .values({
          id: generateId(),
          budget_id: budgetId,
          percentage: AUTOMATIC_THRESHOLD_PERCENTAGE,
          is_automatic: 1,
        })
        // UNIQUE(budget_id, percentage): a second call finds the 100% already there.
        .onConflict((conflict) => conflict.columns(['budget_id', 'percentage']).doNothing())
        .execute();
    },

    async replaceConfigurable(budgetId, percentages) {
      return db.transaction().execute(async (trx) => {
        const current = await trx
          .selectFrom('budget_threshold')
          .selectAll()
          .where('budget_id', '=', budgetId)
          .where('is_automatic', '=', 0)
          .execute();

        // Removed thresholds go away; their alert_sent rows go with them (ON DELETE CASCADE).
        const removed = current.filter((row) => !percentages.includes(row.percentage));
        for (const row of removed) {
          await trx.deleteFrom('budget_threshold').where('id', '=', row.id).execute();
        }

        const added: Threshold[] = [];
        for (const percentage of percentages) {
          if (current.some((row) => row.percentage === percentage)) continue;
          const row: BudgetThresholdTable = {
            id: generateId(),
            budget_id: budgetId,
            percentage,
            is_automatic: 0,
          };
          await trx.insertInto('budget_threshold').values(row).execute();
          added.push(toThreshold(row));
        }

        return added;
      });
    },

    async listPercentagesByBudget() {
      const rows = await db
        .selectFrom('budget_threshold')
        .select(['budget_id', 'percentage'])
        .orderBy('percentage')
        .execute();

      const byBudget: Record<string, number[]> = {};
      for (const row of rows) (byBudget[row.budget_id] ??= []).push(row.percentage);

      return byBudget;
    },

    async listSentIds(budgetId) {
      const rows = await db
        .selectFrom('alert_sent')
        .innerJoin('budget_threshold', 'budget_threshold.id', 'alert_sent.threshold_id')
        .select('alert_sent.threshold_id as threshold_id')
        .where('budget_threshold.budget_id', '=', budgetId)
        .execute();

      return new Set(rows.map((row) => row.threshold_id));
    },

    async recordSent(thresholdIds, sentAtIso) {
      for (const thresholdId of thresholdIds) {
        await db
          .insertInto('alert_sent')
          .values({ id: generateId(), threshold_id: thresholdId, sent_at: sentAtIso })
          // UNIQUE(threshold_id): a threshold is recorded once.
          .onConflict((conflict) => conflict.column('threshold_id').doNothing())
          .execute();
      }
    },

    async clearSent(thresholdIds) {
      if (thresholdIds.length === 0) return;
      await db
        .deleteFrom('alert_sent')
        .where('threshold_id', 'in', [...thresholdIds])
        .execute();
    },
  };
}

// For tests of ViewModels and screens: same behavior, no database.
export function createInMemoryThresholdRepository(generateId: () => string): ThresholdRepository {
  let thresholds: Threshold[] = [];
  const sent = new Set<string>();

  const byBudget = (budgetId: string) =>
    thresholds.filter((threshold) => threshold.budgetId === budgetId);

  return {
    list: (budgetId) =>
      Promise.resolve(byBudget(budgetId).sort((a, b) => a.percentage - b.percentage)),
    ensureAutomatic(budgetId) {
      if (!byBudget(budgetId).some((threshold) => threshold.isAutomatic)) {
        thresholds = [
          ...thresholds,
          {
            id: generateId(),
            budgetId,
            percentage: AUTOMATIC_THRESHOLD_PERCENTAGE,
            isAutomatic: true,
          },
        ];
      }
      return Promise.resolve();
    },
    replaceConfigurable(budgetId, percentages) {
      const configurable = byBudget(budgetId).filter((threshold) => !threshold.isAutomatic);
      for (const removed of configurable.filter((t) => !percentages.includes(t.percentage))) {
        sent.delete(removed.id);
      }
      thresholds = thresholds.filter(
        (threshold) =>
          threshold.budgetId !== budgetId ||
          threshold.isAutomatic ||
          percentages.includes(threshold.percentage),
      );
      const added = percentages
        .filter(
          (percentage) => !configurable.some((threshold) => threshold.percentage === percentage),
        )
        .map((percentage) => ({
          id: generateId(),
          budgetId,
          percentage,
          isAutomatic: false,
        }));
      thresholds = [...thresholds, ...added];

      return Promise.resolve(added);
    },
    listPercentagesByBudget() {
      const byBudgetId: Record<string, number[]> = {};
      for (const threshold of [...thresholds].sort((a, b) => a.percentage - b.percentage)) {
        (byBudgetId[threshold.budgetId] ??= []).push(threshold.percentage);
      }

      return Promise.resolve(byBudgetId);
    },
    listSentIds: (budgetId) =>
      Promise.resolve(
        new Set(
          byBudget(budgetId)
            .filter((t) => sent.has(t.id))
            .map((t) => t.id),
        ),
      ),
    recordSent(thresholdIds) {
      thresholdIds.forEach((id) => sent.add(id));
      return Promise.resolve();
    },
    clearSent(thresholdIds) {
      thresholdIds.forEach((id) => sent.delete(id));
      return Promise.resolve();
    },
  };
}
