#!/usr/bin/env node
/**
 * Sync worker execution sources from web/ into packages/ai-worker/src/.
 * Web keeps thin re-exports so @/ imports continue to work.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const web = path.join(root, 'web');
const pkgSrc = path.join(root, 'packages/ai-worker/src');

const FILES = [
  'config/constants.ts',
  'services/ai.service.ts',
  'types/ai-job.ts',
  'types/index.ts',
  'lib/run-ai-job-from-envelope.ts',
  'lib/ai-worker-http.ts',
  'lib/ai-job-cancel.ts',
  'lib/ai-job-context.ts',
  'lib/ai-job-fail.ts',
  'lib/ai-job-lock.ts',
  'lib/ai-job-payload.ts',
  'lib/ai-job-push.ts',
  'lib/ai-job-retry.ts',
  'lib/ai-job-runners/index.ts',
  'lib/ai-job-runners/run-ask-job.ts',
  'lib/ai-job-runners/run-auto-organize-job.ts',
  'lib/ai-job-runners/run-general-ask-job.ts',
  'lib/ai-job-runners/run-inbox-ask-job.ts',
  'lib/ai-job-runners/run-meeting-dialogue-job.ts',
  'lib/ai-job-runners/run-summarize-job.ts',
  'lib/ai-chat.ts',
  'lib/ai-model-display.ts',
  'lib/ai-model-fallback.ts',
  'lib/ai-model-router.ts',
  'lib/ai-operation.ts',
  'lib/ai-rate-limit.ts',
  'lib/ai-usage-ledger.ts',
  'lib/app-config.ts',
  'lib/app-env.ts',
  'lib/ask-interpretation-hint.ts',
  'lib/ask-user-message.ts',
  'lib/auto-organize-input-limits.ts',
  'lib/auto-organize-parse.ts',
  'lib/auto-organize-prompt.ts',
  'lib/auto-organize-types.ts',
  'lib/corpus-notes-prompt.ts',
  'lib/deepseek-reasoning.ts',
  'lib/deepseek.ts',
  'lib/direct-database-url.ts',
  'lib/folder-accent-colors.ts',
  'lib/firebase-admin.ts',
  'lib/firebase-push.ts',
  'lib/general-ask-user-message.ts',
  'lib/inbox-ask-tools.ts',
  'lib/inbox-ask-user-message.ts',
  'lib/linked-notes-prompt.ts',
  'lib/meeting-dialogue-dispatch.ts',
  'lib/meeting-dialogue-user-prompt.ts',
  'lib/meeting-job-payload.ts',
  'lib/memory-store.ts',
  'lib/normalizeTaskDeadlineFields.ts',
  'lib/openrouter-chat.ts',
  'lib/openrouter-provider.ts',
  'lib/openrouter-reasoning.ts',
  'lib/openrouter-recovery.ts',
  'lib/openrouter-response-format.ts',
  'lib/openrouter-token-usage.ts',
  'lib/openrouter.ts',
  'lib/operation-mappings.ts',
  'lib/parse-openrouter-json.ts',
  'lib/prisma.ts',
  'lib/pro-entitlement.ts',
  'lib/prompts.ts',
  'lib/push-messages.ts',
  'lib/push-tokens.ts',
  'lib/push.ts',
  'lib/publish-ai-job.ts',
  'lib/qstash.ts',
  'lib/recording-marks-prompt.ts',
  'lib/redis-pool.ts',
  'lib/redis.ts',
  'lib/timeout.ts',
];

const PACKAGE_LOCAL = new Set([
  'lib/ai-job-duration.ts',
  'lib/ai-job-publish-plan.ts',
  'lib/prisma.ts',
]);

const SKIP_WEB_REEXPORT = new Set(['lib/ai-job-dispatch.ts', 'config/constants.ts']);

function copyFile(rel) {
  const src = path.join(web, rel);
  const dest = path.join(pkgSrc, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function writeWebReexport(rel) {
  if (SKIP_WEB_REEXPORT.has(rel)) return;
  const dest = path.join(web, rel);
  const exportPath = rel.replace(/\.ts$/, '');
  const content = `export * from '@voice-inbox/ai-worker/${exportPath}';\n`;
  fs.writeFileSync(dest, content);
}

for (const rel of FILES) {
  if (!PACKAGE_LOCAL.has(rel)) {
    copyFile(rel);
  }
  if (!SKIP_WEB_REEXPORT.has(rel)) {
    writeWebReexport(rel);
  }
}

console.info(`Synced ${FILES.length} paths to packages/ai-worker/src`);
