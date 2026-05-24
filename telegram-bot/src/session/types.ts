export type FlowKind =
  | 'pro_key_generate'
  | 'pro_key_email'
  | 'support_reply'
  | 'support_search'
  | 'push_single'
  | 'push_broadcast'
  | 'budget_expense'
  | 'admin_create'
  | 'admin_password';

export type FlowStep = {
  kind: FlowKind;
  step: string;
  data: Record<string, string | number | boolean | null>;
};

export type UserSession = {
  flow?: FlowStep;
  listIds?: string[];
  listMeta?: Record<string, string>;
  pendingConfirm?: {
    action: string;
    title: string;
    body: string;
    payload: Record<string, unknown>;
  };
};
