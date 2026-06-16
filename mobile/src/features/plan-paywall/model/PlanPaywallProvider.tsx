import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { getMonetizationMode } from '@/features/app-storefront';
import type { IapBillingOptions, IapBillingPeriod } from '@/features/entitlements';
import {
  getProBillingPriceOptions,
  purchaseProPackageForPeriod,
  resolveDefaultIapBillingPeriod,
  restoreProPurchases,
} from '@/features/entitlements';
import { useProEntitlement } from '@/features/pro-license';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { SettingsPlanPaywallSheet } from '@/screens/settings/ui/SettingsPlanPaywallSheet';
import { FREE_WEEKLY_LIMIT } from '@/shared/config';
import { getAiWeeklyLimits } from '@/shared/lib/ai-api';

import { registerPlanPaywallController } from '../lib/planPaywallController';

const RESET_IAP_BILLING: IapBillingOptions = {
  annual: null,
  monthly: null,
  annualComparedToMonthlyYearPriceString: null,
  savePercentVsMonthly: null,
};

type PlanPaywallContextValue = {
  open: () => void;
  close: () => void;
  visible: boolean;
};

const PlanPaywallContext = createContext<PlanPaywallContextValue | null>(null);

export function usePlanPaywall(): PlanPaywallContextValue {
  const ctx = useContext(PlanPaywallContext);
  if (ctx == null) {
    throw new Error('usePlanPaywall must be used within PlanPaywallProvider');
  }
  return ctx;
}

export function PlanPaywallProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { refresh: refreshProEntitlement } = useProEntitlement();
  const monetizationMode = getMonetizationMode();

  const [visible, setVisible] = useState(false);
  const [iapPaywallBusy, setIapPaywallBusy] = useState(false);
  const [iapBilling, setIapBilling] = useState<IapBillingOptions>(RESET_IAP_BILLING);
  const [selectedIapPeriod, setSelectedIapPeriod] = useState<IapBillingPeriod>('annual');
  const [iapProPriceLoading, setIapProPriceLoading] = useState(false);
  const [proWeeklyLimit, setProWeeklyLimit] = useState(75);
  const [freeWeeklyLimit, setFreeWeeklyLimit] = useState(FREE_WEEKLY_LIMIT);

  const open = useCallback(() => {
    setIapProPriceLoading(true);
    setIapBilling(RESET_IAP_BILLING);
    setVisible(true);
    void getAiWeeklyLimits().then((limits) => {
      if (limits?.proWeeklyLimit && limits.proWeeklyLimit > 0) {
        setProWeeklyLimit(limits.proWeeklyLimit);
      }
      if (limits?.freeWeeklyLimit && limits.freeWeeklyLimit > 0) {
        setFreeWeeklyLimit(limits.freeWeeklyLimit);
      }
    });
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    registerPlanPaywallController({ open, close });
    return () => registerPlanPaywallController(null);
  }, [open, close]);

  useLayoutEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    void getProBillingPriceOptions().then((opts) => {
      if (!cancelled) {
        setIapBilling(opts);
        setSelectedIapPeriod(resolveDefaultIapBillingPeriod(opts));
      }
      setIapProPriceLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [visible, i18n.language]);

  const handleUpgradePress = useCallback(() => {
    setIapPaywallBusy(true);
    void (async () => {
      try {
        const result = await purchaseProPackageForPeriod(selectedIapPeriod);
        if (result.ok) {
          close();
          void refreshProEntitlement({ force: true });
          return;
        }
        if (result.cancelled) {
          return;
        }
        const body =
          result.message === 'no_package'
            ? t('settings.planPaywall.purchaseErrorNoPackage')
            : result.message === 'iap_unavailable'
              ? t('settings.planPaywall.purchaseErrorUnavailable')
              : t('settings.planPaywall.purchaseError');
        Alert.alert(t('common.error'), body);
      } finally {
        setIapPaywallBusy(false);
      }
    })();
  }, [close, refreshProEntitlement, selectedIapPeriod, t]);

  const handleRestorePurchasesPress = useCallback(() => {
    setIapPaywallBusy(true);
    void (async () => {
      try {
        const result = await restoreProPurchases();
        if (result.ok) {
          await refreshProEntitlement({ force: true });
          if (result.entitlementActive || isProActiveFromStorageSync()) {
            close();
            Alert.alert(t('common.done'), t('settings.planPaywall.restoreSuccess'));
            return;
          }
          Alert.alert(t('common.done'), t('settings.planPaywall.restoreNothingFound'));
          return;
        }
        const restoreErrBody =
          result.message === 'iap_unavailable'
            ? t('settings.planPaywall.purchaseErrorUnavailable')
            : t('settings.planPaywall.restoreError');
        Alert.alert(t('common.error'), restoreErrBody);
      } finally {
        setIapPaywallBusy(false);
      }
    })();
  }, [close, refreshProEntitlement, t]);

  const onIapBillingPeriodChange = useCallback((period: IapBillingPeriod) => {
    setSelectedIapPeriod(period);
  }, []);

  const contextValue: PlanPaywallContextValue = {
    open,
    close,
    visible,
  };

  return (
    <PlanPaywallContext.Provider value={contextValue}>
      {children}
      <SettingsPlanPaywallSheet
        visible={visible}
        mode={monetizationMode}
        freeAiLimit={freeWeeklyLimit}
        proAiLimit={proWeeklyLimit}
        onClose={close}
        onUpgradePress={handleUpgradePress}
        onRestorePurchasesPress={handleRestorePurchasesPress}
        iapBusy={iapPaywallBusy}
        iapBilling={iapBilling}
        selectedIapPeriod={selectedIapPeriod}
        onIapBillingPeriodChange={onIapBillingPeriodChange}
        iapProPriceLoading={iapProPriceLoading}
      />
    </PlanPaywallContext.Provider>
  );
}
