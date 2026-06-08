import { REVENUECAT_AI_RESET_PRODUCT_ID } from '@/config/constants';

const RC_API = 'https://api.revenuecat.com/v1';

function getSecretKey(): string | null {
  const k = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

export function getAiResetProductId(): string | null {
  const id = REVENUECAT_AI_RESET_PRODUCT_ID.trim();
  return id.length > 0 ? id : null;
}

type RcNonSubscriptionPurchase = {
  id?: string;
  store_transaction_id?: string;
  purchase_date?: string;
  is_sandbox?: boolean;
};

type RcSubscriberResponse = {
  subscriber?: {
    non_subscriptions?: Record<string, RcNonSubscriptionPurchase[]>;
  };
};

type FetchSubscriberResult =
  | { kind: 'ok'; body: RcSubscriberResponse }
  | { kind: 'not_found' }
  | { kind: 'error'; reason: string }
  | { kind: 'no_secret' };

async function fetchRevenueCatSubscriberJson(deviceId: string): Promise<FetchSubscriberResult> {
  const secret = getSecretKey();
  if (!secret) {
    return { kind: 'no_secret' };
  }

  const encoded = encodeURIComponent(deviceId);
  const url = `${RC_API}/subscribers/${encoded}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return { kind: 'error', reason: 'network_error' };
  }

  if (res.status === 404) {
    return { kind: 'not_found' };
  }

  if (!res.ok) {
    return { kind: 'error', reason: `revenuecat_http_${res.status}` };
  }

  try {
    const body = (await res.json()) as RcSubscriberResponse;
    return { kind: 'ok', body };
  } catch {
    return { kind: 'error', reason: 'invalid_json' };
  }
}

function normalizeTransactionId(value: string): string {
  return value.trim();
}

function purchaseMatchesTransaction(
  purchase: RcNonSubscriptionPurchase,
  transactionId: string,
): boolean {
  const normalized = normalizeTransactionId(transactionId);
  const candidates = [purchase.store_transaction_id, purchase.id]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(normalizeTransactionId);

  return candidates.includes(normalized);
}

export type VerifyAiResetPurchaseResult =
  | { ok: true; productIdentifier: string; transactionId: string }
  | { ok: false; reason: string };

export async function verifyAiResetPurchaseWithRevenueCat(params: {
  deviceId: string;
  productIdentifier: string;
  transactionId: string;
}): Promise<VerifyAiResetPurchaseResult> {
  const configuredProductId = getAiResetProductId();
  if (!configuredProductId) {
    return { ok: false, reason: 'reset_product_not_configured' };
  }

  const productIdentifier = params.productIdentifier.trim();
  const transactionId = normalizeTransactionId(params.transactionId);

  if (!productIdentifier || !transactionId) {
    return { ok: false, reason: 'invalid_purchase_payload' };
  }

  if (productIdentifier !== configuredProductId) {
    return { ok: false, reason: 'invalid_product_identifier' };
  }

  const fetched = await fetchRevenueCatSubscriberJson(params.deviceId.trim());
  if (fetched.kind === 'no_secret') {
    return { ok: false, reason: 'revenuecat_secret_not_configured' };
  }
  if (fetched.kind === 'error') {
    return { ok: false, reason: fetched.reason };
  }
  if (fetched.kind === 'not_found') {
    return { ok: false, reason: 'subscriber_not_found' };
  }

  const purchases = fetched.body.subscriber?.non_subscriptions?.[productIdentifier] ?? [];
  const matched = purchases.some((purchase) => purchaseMatchesTransaction(purchase, transactionId));

  if (!matched) {
    return { ok: false, reason: 'purchase_not_found' };
  }

  return { ok: true, productIdentifier, transactionId };
}

export function isAiResetProductId(productId: string | null | undefined): boolean {
  const configured = getAiResetProductId();
  if (!configured || !productId) {
    return false;
  }
  return productId.trim() === configured;
}
