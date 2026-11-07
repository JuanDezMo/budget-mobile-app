import { formatMoney } from '@/core/i18n/format';
import { getAppLanguage, translate } from '@/core/i18n/i18n';
import type { CurrencyCode } from '@/core/shared/currency';

import type { NotificationMessage } from './notifier';

export type BudgetAlertInfo = {
  categoryLabel: string;
  currency: CurrencyCode;
  threshold: number;
  spentMinor: number;
  availableMinor: number;
};

// Text of a budget alert, in the language the app has at the moment it is sent.
// The 100% alert says the budget was passed when it already is (RN-29: no more alerts after it).
export function buildBudgetAlertMessage(alert: BudgetAlertInfo): NotificationMessage {
  const language = getAppLanguage();
  const spent = formatMoney({ amountMinor: alert.spentMinor, currency: alert.currency }, language);
  const available = formatMoney(
    { amountMinor: alert.availableMinor, currency: alert.currency },
    language,
  );
  const passed = alert.threshold >= 100 && alert.spentMinor > alert.availableMinor;
  const key = passed
    ? 'alerts.bodyPassed'
    : alert.threshold >= 100
      ? 'alerts.bodyFull'
      : 'alerts.bodyThreshold';

  return {
    title: translate('alerts.title', { category: alert.categoryLabel }),
    body: translate(key, { percent: alert.threshold, spent, available }),
  };
}
