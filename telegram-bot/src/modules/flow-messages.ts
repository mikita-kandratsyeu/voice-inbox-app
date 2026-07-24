import type { HandlerCtx } from '../context.js';
import type { ScreenReply } from '../ui/reply.js';
import { handleAccountPasswordMessage } from './account.js';
import { handleBudgetExpenseMessage } from './budget.js';
import { handleSupportMessage } from './support.js';

/** Dispatch free-text messages to active multi-step flows. */
export async function handleFlowMessage(h: HandlerCtx, text: string): Promise<ScreenReply | null> {
  const support = await handleSupportMessage(h, text);
  if (support) return support;

  const budget = await handleBudgetExpenseMessage(h, text);
  if (budget) return budget;

  const password = await handleAccountPasswordMessage(h, text);
  if (password) return password;

  return null;
}
