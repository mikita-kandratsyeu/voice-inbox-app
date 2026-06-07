/**
 * Seed AiUsageLedgerEntry rows for local/dev UI testing.
 *
 * Usage (from web/):
 *   DEVICE_ID=a175c65e-d607-4641-bfe4-6d7c07eb62e2 yarn tsx scripts/db-seed-ai-usage-ledger.ts
 *
 * Optional:
 *   LEDGER_SEED_COUNT=120
 *   LEDGER_SEED_CLEAR=1   — delete existing rows for this device first
 */

import 'dotenv/config';

import type { Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

const DEFAULT_DEVICE_ID = 'a175c65e-d607-4641-bfe4-6d7c07eb62e2';

type SeedKind = 'debit' | 'credit' | 'refund';

type SeedOperation =
  | 'transcript_summarize'
  | 'transcript_ask'
  | 'translate'
  | 'digest'
  | 'auto_organize'
  | 'meeting_dialogue'
  | 'bonus';

const NOTE_TITLES = [
  'Встреча с командой',
  'Идеи для релиза',
  'Звонок с клиентом',
  'Планы на неделю',
  'Интервью кандидата',
  'Product sync',
  'Voice memo — дорога домой',
  'Лекция по маркетингу',
  'Daily standup notes',
  'Brainstorm: onboarding',
] as const;

const ASK_QUESTIONS = [
  'Какие задачи нужно сделать в первую очередь?',
  'Есть ли дедлайны на этой неделе?',
  'Кратко перечисли ключевые решения',
  'What are the main risks?',
  'Summarize action items only',
] as const;

const MODELS = [
  { model: 'google/gemini-2.5-flash-lite', modelLabel: 'Gemini 2.5 Flash Lite' },
  { model: 'google/gemini-3.1-flash-lite', modelLabel: 'Gemini 3.1 Flash Lite' },
  { model: 'deepseek/deepseek-v4-flash', modelLabel: 'DeepSeek V4 Flash' },
  { model: 'openai/gpt-5.4-nano', modelLabel: 'GPT-5.4 Nano' },
] as const;

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length]!;
}

function buildMetadata(params: {
  operation: SeedOperation;
  seed: number;
  model: (typeof MODELS)[number];
  noteTitle: string;
}): Prisma.InputJsonObject {
  const base = {
    model: params.model.model,
    modelLabel: params.model.modelLabel,
    noteTitle: params.noteTitle,
  };

  switch (params.operation) {
    case 'transcript_ask':
      return {
        ...base,
        question: pick(ASK_QUESTIONS, params.seed),
        recordId: `rec-${String(params.seed).padStart(4, '0')}`,
      };
    case 'translate':
      return {
        ...base,
        sourceLanguage: params.seed % 2 === 0 ? 'ru' : 'en',
        targetLanguage: params.seed % 2 === 0 ? 'en' : 'ru',
      };
    case 'digest':
      return {
        ...base,
        period: pick(['day', 'week', 'month'] as const, params.seed),
        format: pick(['brief', 'detailed', 'tasks'] as const, params.seed),
      };
    case 'auto_organize':
      return {
        ...base,
        notesCount: 8 + (params.seed % 24),
      };
    case 'meeting_dialogue':
      return {
        ...base,
        chargedUsageUnits: 1,
      };
    case 'bonus':
      return {
        requestedAmount: 3,
        source: 'rewarded_ad',
      };
    default:
      return {
        ...base,
        recordId: `rec-${String(params.seed).padStart(4, '0')}`,
        chargedUsageUnits: params.seed % 11 === 0 ? 2 : 1,
      };
  }
}

function buildEntry(deviceId: string, index: number) {
  const daysAgo = Math.floor(index / 3);
  const hoursOffset = (index * 5) % 24;
  const minutesOffset = (index * 11) % 60;
  const createdAt = new Date();
  createdAt.setUTCDate(createdAt.getUTCDate() - daysAgo);
  createdAt.setUTCHours(9 + hoursOffset, minutesOffset, 0, 0);

  const operationRoll = index % 20;
  let operation: SeedOperation;
  let kind: SeedKind;
  let amount: number;
  let description: string | undefined;

  if (operationRoll === 18) {
    operation = 'bonus';
    kind = 'credit';
    amount = 3;
    description = 'Rewarded ad bonus';
  } else if (operationRoll === 19) {
    operation = pick(
      ['transcript_summarize', 'transcript_ask', 'translate', 'digest'] as const,
      index,
    );
    kind = 'refund';
    amount = 1;
    description = 'Operation failed — credit returned';
  } else {
    operation = pick(
      [
        'transcript_summarize',
        'transcript_summarize',
        'transcript_ask',
        'translate',
        'digest',
        'auto_organize',
        'meeting_dialogue',
      ] as const,
      index,
    );
    kind = 'debit';
    amount = operation === 'transcript_summarize' && index % 11 === 0 ? -2 : -1;
  }

  const model = pick(MODELS, index);
  const noteTitle = pick(NOTE_TITLES, index);
  const jobId =
    kind === 'debit' || (kind === 'refund' && operation !== 'bonus')
      ? `job-${deviceId.slice(0, 8)}-${String(index).padStart(4, '0')}`
      : undefined;

  return {
    deviceId,
    createdAt,
    kind,
    operation,
    amount,
    jobId,
    description,
    metadata: buildMetadata({ operation, seed: index, model, noteTitle }),
  };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not set (see web/.env)');
  }

  const deviceId = (process.env.DEVICE_ID?.trim() || DEFAULT_DEVICE_ID).trim();
  const count = Math.max(
    20,
    Math.min(500, Number.parseInt(process.env.LEDGER_SEED_COUNT ?? '120', 10)),
  );
  const clear = process.env.LEDGER_SEED_CLEAR === '1';

  if (clear) {
    const deleted = await prisma.aiUsageLedgerEntry.deleteMany({ where: { deviceId } });
    console.log(`Cleared ${deleted.count} existing ledger rows for ${deviceId}`);
  }

  const rows = Array.from({ length: count }, (_, index) => buildEntry(deviceId, index + 1));

  const batchSize = 50;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    await prisma.aiUsageLedgerEntry.createMany({
      data: rows.slice(offset, offset + batchSize),
    });
  }

  const total = await prisma.aiUsageLedgerEntry.count({ where: { deviceId } });
  console.log(`Seeded ${rows.length} ledger rows for ${deviceId} (total now: ${total})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
