import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type AiLimitResetProduct,
  getAiLimitResetProduct,
  getRevenueCatIntegrationEnabled,
  purchaseAiLimitReset,
} from '@/features/entitlements';
import { useProEntitlement } from '@/features/pro-license';
import type { AiUsage, ProLimitResetSummary } from '@/shared/lib/ai-api';
import { resetProAiUsageLimit } from '@/shared/lib/ai-api';
import { requestAiUsageRefresh } from '@/shared/lib/aiUsageRefresh';

function mapResetError(error: string): string {
  switch (error) {
    case 'pro_required':
      return 'resetProLimitProRequired';
    case 'limit_not_exhausted':
      return 'resetProLimitNotExhausted';
    case 'purchase_not_found':
    case 'invalid_product_identifier':
      return 'resetProLimitPurchaseNotVerified';
    case 'transaction_already_used':
      return 'resetProLimitTransactionUsed';
    case 'reset_product_not_configured':
    case 'revenuecat_secret_not_configured':
    case 'iap_unavailable':
    case 'no_product':
      return 'resetProLimitUnavailable';
    case 'cancelled':
      return 'resetProLimitCancelled';
    default:
      return error.length > 0 && error.length <= 180 ? error : 'resetProLimitError';
  }
}

export type ProLimitResetSuccess = {
  usage: AiUsage;
  alreadyApplied: boolean;
  reset: ProLimitResetSummary;
};

export function useResetProAiLimit(onSuccess?: (result: ProLimitResetSuccess) => void) {
  const { isProActive } = useProEntitlement();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<AiLimitResetProduct | null>(null);
  const [productLoading, setProductLoading] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const loadProduct = useCallback(async () => {
    if (!isProActive || !getRevenueCatIntegrationEnabled()) {
      setProduct(null);
      return null;
    }

    setProductLoading(true);
    try {
      const next = await getAiLimitResetProduct();
      setProduct(next);
      return next;
    } finally {
      setProductLoading(false);
    }
  }, [isProActive]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  const resetLimit = useCallback(async () => {
    if (loading || !isProActive) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const purchase = await purchaseAiLimitReset();
      if (!purchase.ok) {
        if (!purchase.cancelled) {
          setError(mapResetError(purchase.message));
        }
        return;
      }

      const result = await resetProAiUsageLimit({
        productIdentifier: purchase.productIdentifier,
        transactionId: purchase.transactionId,
      });

      if (!result.ok) {
        setError(mapResetError(result.error));
        return;
      }

      requestAiUsageRefresh();
      onSuccessRef.current?.({
        usage: result.usage,
        alreadyApplied: result.alreadyApplied,
        reset: result.reset,
      });
    } finally {
      setLoading(false);
    }
  }, [isProActive, loading]);

  return {
    resetLimit,
    loading,
    error,
    product,
    productLoading,
    reloadProduct: loadProduct,
  };
}
