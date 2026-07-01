// src/server.ts
import { createServer } from "node:http";

// ../../web/lib/ai-worker-http.ts
import {
  parseAiJobEnvelope,
  parseQStashFailureCallbackEnvelope,
  resolveEnvelopeFromBody
} from "@voice-inbox/ai-job-core";

// ../../web/lib/auto-organize-types.ts
var AUTO_ORGANIZE_INBOX_FOLDER_NAME = "__inbox__";
var AUTO_ORGANIZE_CHARGED_USAGE_UNITS = 2;
function normalizeAutoOrganizeTemplate(template) {
  return template ?? "general";
}

// ../../web/lib/ai-job-duration.ts
import {
  CLOUD_RUN_WORKER_MAX_DURATION_SECONDS,
  VERCEL_WORKER_MAX_DURATION_SECONDS,
  calculatePollDeadlineMs,
  formatQStashTimeout,
  getAiJobMaxDurationSeconds,
  getAiJobProcessingTimeoutMs,
  getFallbackQStashTimeoutSeconds,
  getJobLockTtlSeconds,
  getOpenRouterGenerationRecoveryMaxWaitMs,
  getPrimaryQStashTimeoutSeconds
} from "@voice-inbox/ai-job-core";

// ../../web/config/constants.ts
function extractAppleAppStoreId(storeUrl) {
  const trimmed = storeUrl.trim();
  if (!trimmed || trimmed === "#") return void 0;
  const m = trimmed.match(/\/id(\d+)/i);
  return m?.[1];
}
var BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";
var BASE_URL_OR_FALLBACK = BASE_URL || "http://localhost:3000";
var SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
var APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL ?? "#";
var GOOGLE_PLAY_URL = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "#";
var ANDROID_WAITLIST_URL = process.env.NEXT_PUBLIC_ANDROID_WAITLIST_URL?.trim() ?? "";
var APP_STORE_APP_ID = process.env.NEXT_PUBLIC_APP_STORE_APP_ID?.trim() || extractAppleAppStoreId(process.env.NEXT_PUBLIC_APP_STORE_URL ?? "") || void 0;
var VERIFIED_METRICS_URL = process.env.NEXT_PUBLIC_VERIFIED_METRICS_URL?.trim() ?? "";
var FREE_WEEKLY_LIMIT = 10;
var PRO_WEEKLY_LIMIT = 75;
var AI_WEEKLY_KEY_PREFIX = "ai_weekly:";
var AI_PERIOD_START_KEY_PREFIX = "ai_period_start:";
var AI_AUTO_ORGANIZE_WEEKLY_KEY_PREFIX = "ai_auto_organize_weekly:";
var AI_USAGE_PERIOD_MS = 7 * 24 * 3600 * 1e3;
var WEEK_TTL_SECONDS = 8 * 24 * 3600;
var AI_DEBIT_IDEMPOTENCY_TTL_SECONDS = 24 * 3600;
var AI_BONUS_AMOUNT = 5;
var AI_BONUS_COOLDOWN_KEY_PREFIX = "ai_bonus_cooldown:";
var AI_BONUS_COOLDOWN_SECONDS = 900;
var REVENUECAT_AI_RESET_PRODUCT_ID = process.env.REVENUECAT_AI_RESET_PRODUCT_ID?.trim() ?? "";
var MESSAGE_TTL_SECONDS = 3600;
var MESSAGE_KEY_PREFIX = "msg:";
var JOB_PAYLOAD_KEY_PREFIX = "job-payload:";
var MEETING_JOB_PAYLOAD_KEY_PREFIX = "job-payload:meeting:";
var AI_JOB_QSTASH_RETRIES = 3;
var JOB_LOCK_KEY_PREFIX = "job-lock:";
var JOB_LOCK_TTL_SECONDS = getJobLockTtlSeconds();
var OPENROUTER_PENDING_GENERATION_KEY_PREFIX = "or-gen:";
var OPENROUTER_PENDING_GENERATION_TTL_SECONDS = JOB_LOCK_TTL_SECONDS;
var OPENROUTER_GENERATION_RECOVERY_POLL_INTERVAL_MS = 2e3;
var OPENROUTER_GENERATION_RECOVERY_MAX_WAIT_MS = getOpenRouterGenerationRecoveryMaxWaitMs();
var SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS = 1e4;
var MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS = 8e3;
var AI_JOB_CANCELLED_ERROR = "Cancelled by user";
var JOB_CANCELLED_KEY_PREFIX = "job-cancelled:";
var GET_RETRY_ATTEMPTS = 3;
var GET_RETRY_DELAY_MS = 100;
var AI_MODEL_GEMINI_2_5_FLASH_LITE = "google/gemini-2.5-flash-lite";
var AI_MODEL_GEMINI_3_1_FLASH_LITE = "google/gemini-3.1-flash-lite";
var AI_MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW = "google/gemini-3.1-flash-lite-preview";
var MEETING_DIALOGUE_MODEL_FALLBACK_CHAIN = [
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_GEMINI_2_5_FLASH_LITE
];
function normalizeIncomingAiModel(model) {
  const t = model.trim();
  if (t === AI_MODEL_GEMINI_3_1_FLASH_LITE_PREVIEW) {
    return AI_MODEL_GEMINI_3_1_FLASH_LITE;
  }
  if (t === LEGACY_AI_MODEL_STEP_3_5_FLASH) {
    return AI_MODEL_GEMINI_2_5_FLASH_LITE;
  }
  if (t === LEGACY_AI_MODEL_DEEPSEEK_V4_FLASH_NITRO) {
    return AI_MODEL_DEEPSEEK_V4_FLASH;
  }
  return t;
}
var AI_MODEL_DEEPSEEK_V4_FLASH = "deepseek/deepseek-v4-flash";
var AI_MODEL_DEEPSEEK_V4_PRO = "deepseek/deepseek-v4-pro";
var LEGACY_AI_MODEL_DEEPSEEK_V4_FLASH_NITRO = "deepseek/deepseek-v4-flash:nitro";
var AI_MODEL_GPT_5_4_NANO = "openai/gpt-5.4-nano";
var SYSTEM_MICRO_TASK_MODEL = AI_MODEL_GPT_5_4_NANO;
var AI_MODEL_MIMO_V2_5_PRO = "xiaomi/mimo-v2.5-pro";
var AI_MODEL_MIMO_V2_5 = "xiaomi/mimo-v2.5";
var AI_MODEL_MINIMAX_M3 = "minimax/minimax-m3";
var LEGACY_AI_MODEL_MINIMAX_M2_7 = "minimax/minimax-m2.7";
var AI_MODEL_NEMOTRON_3_SUPER = "nvidia/nemotron-3-super-120b-a12b";
var LEGACY_AI_MODEL_STEP_3_5_FLASH = "stepfun/step-3.5-flash";
var SYSTEM_TASK_MODEL_FALLBACK_CHAIN = [
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_DEEPSEEK_V4_FLASH
];
var USER_AI_MODEL_FALLBACK_CHAIN = [
  AI_MODEL_GEMINI_3_1_FLASH_LITE,
  AI_MODEL_DEEPSEEK_V4_FLASH
];
var PUSH_TOKEN_KEY_PREFIX = "push_token:";
var PUSH_TOKEN_TTL_SECONDS = 30 * 24 * 3600;
var APP_FOREGROUND_KEY_PREFIX = "app_foreground:";
var PUSH_PENDING_KEY_PREFIX = "push_pending:";
var PUSH_LOCK_KEY_PREFIX = "push_lock:";
var PUSH_DEBOUNCE_MS = 15e3;
var PUSH_PENDING_TTL_SECONDS = 120;
var PUSH_LOCK_TTL_SECONDS = 30;

// ../../web/lib/prisma.ts
import { URL as URL2 } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";

// ../../web/generated/prisma/client.ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ../../web/generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.8.0",
  "engineVersion": "3c6e192761c0362d496ed980de936e2f3cebcd3a",
  "activeProvider": "postgresql",
  "inlineSchema": 'generator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nmodel AdminUser {\n  id             String   @id @default(cuid())\n  login          String   @unique\n  passwordHash   String\n  isSuperadmin   Boolean  @default(false)\n  permissions    String[] @default([])\n  telegramUserId String?  @unique\n  createdAt      DateTime @default(now())\n  updatedAt      DateTime @updatedAt\n}\n\nmodel AdminAuditLog {\n  id         String   @id @default(cuid())\n  createdAt  DateTime @default(now())\n  adminId    String\n  adminLogin String\n  action     String\n  metadata   Json?\n\n  @@index([createdAt(sort: Desc)])\n}\n\nmodel BroadcastHistory {\n  id             String   @id @default(cuid())\n  createdAt      DateTime @default(now())\n  kind           String\n  notifyType     String\n  title          String?\n  bodyPreview    String?  @db.Text\n  messagePreview String?  @db.Text\n  sent           Int\n  failed         Int\n  total          Int\n  errorSample    String?  @db.Text\n  adminId        String\n  adminLogin     String\n  deviceId       String?\n\n  @@index([createdAt(sort: Desc)])\n}\n\nmodel AppConfig {\n  key       String   @id\n  value     String\n  updatedAt DateTime @updatedAt\n}\n\nmodel ReleasePost {\n  id          String    @id @default(cuid())\n  locale      String\n  slug        String\n  title       String\n  version     String?\n  summary     String?   @db.Text\n  body        String    @db.Text\n  published   Boolean   @default(false)\n  publishedAt DateTime?\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n\n  @@unique([locale, slug])\n  @@index([locale, published, publishedAt(sort: Desc)])\n}\n\nmodel InAppEventPage {\n  id          String   @id @default(cuid())\n  eventId     String\n  locale      String\n  title       String\n  contentType String\n  body        String   @db.Text\n  ctaLabel    String?\n  published   Boolean  @default(false)\n  revision    Int      @default(1)\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  @@unique([eventId, locale])\n  @@index([eventId, published])\n}\n\nmodel PublishedNote {\n  id          String    @id @default(cuid())\n  token       String    @unique\n  deviceId    String\n  recordId    String\n  title       String\n  template    String\n  markdown    String    @db.Text\n  contentHash String\n  publishedAt DateTime  @default(now())\n  expiresAt   DateTime?\n  revokedAt   DateTime?\n  updatedAt   DateTime  @updatedAt\n\n  @@unique([deviceId, recordId])\n  @@index([token, revokedAt])\n  @@index([expiresAt])\n}\n\nmodel SupportIssue {\n  id                       String    @id @default(cuid())\n  referenceNumber          Int       @unique @default(autoincrement())\n  deviceId                 String\n  email                    String?\n  subject                  String?\n  message                  String    @db.Text\n  diagnostics              Json\n  appLogs                  String?   @db.Text\n  status                   String    @default("open")\n  createdAt                DateTime  @default(now())\n  updatedAt                DateTime  @updatedAt\n  closedAt                 DateTime?\n  proLicenseEmailSentAt    DateTime?\n  proLicenseDurationMonths Int?\n  proLicenseDurationDays   Int?\n\n  @@index([deviceId])\n  @@index([createdAt(sort: Desc)])\n  @@index([status])\n  @@index([status, createdAt(sort: Desc)])\n}\n\nmodel ProLicenseKey {\n  id                     String    @id @default(cuid())\n  keyHash                String    @unique\n  durationMonths         Int\n  durationDays           Int?\n  createdAt              DateTime  @default(now())\n  createdByAdminId       String\n  issuedToEmail          String?\n  adminNotes             String?   @db.Text\n  /**\n   * Set when the key is issued as a printable gift voucher (one batch per print/email run).\n   */\n  voucherBatchId         String?\n  /**\n   * Voucher PDF template version at issue time (e.g. v2).\n   */\n  voucherTemplateVersion String?\n  consumedAt             DateTime?\n  consumedByDeviceId     String?\n\n  @@index([createdAt(sort: Desc)])\n  @@index([voucherBatchId])\n  @@index([consumedByDeviceId])\n  @@index([consumedAt(sort: Desc)])\n}\n\nmodel DeviceProEntitlement {\n  deviceId  String   @id\n  expiresAt DateTime\n  updatedAt DateTime @updatedAt\n\n  @@index([expiresAt])\n}\n\n/// Per-device mobile inbox banner override (deviceId = mobile x-device-id / push token id).\nmodel DeviceMobileBanner {\n  deviceId   String   @id\n  revision   Int      @default(1)\n  bannerJson String   @db.Text\n  updatedAt  DateTime @updatedAt\n  createdAt  DateTime @default(now())\n\n  @@index([updatedAt(sort: Desc)])\n}\n\nmodel AiUsageLedgerEntry {\n  id          String   @id @default(cuid())\n  deviceId    String\n  createdAt   DateTime @default(now())\n  kind        String\n  operation   String\n  amount      Int\n  jobId       String?\n  description String?\n  metadata    Json?\n\n  @@index([deviceId, createdAt(sort: Desc), id(sort: Desc)])\n  @@index([deviceId, operation, jobId])\n  @@index([jobId])\n}\n\nmodel AiUsageResetPurchase {\n  id                String   @id @default(cuid())\n  deviceId          String\n  transactionId     String   @unique\n  productIdentifier String\n  creditedAmount    Int\n  createdAt         DateTime @default(now())\n  metadata          Json?\n\n  @@index([deviceId, createdAt(sort: Desc)])\n}\n\nmodel AdminBudgetExpense {\n  id          String   @id @default(cuid())\n  spentAt     DateTime @default(now())\n  category    String?\n  description String\n  amountCents Int\n  currency    String   @default("USD")\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  @@index([spentAt(sort: Desc)])\n  @@index([currency])\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"AdminUser":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"login","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String"},{"name":"isSuperadmin","kind":"scalar","type":"Boolean"},{"name":"permissions","kind":"scalar","type":"String"},{"name":"telegramUserId","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null},"AdminAuditLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"adminId","kind":"scalar","type":"String"},{"name":"adminLogin","kind":"scalar","type":"String"},{"name":"action","kind":"scalar","type":"String"},{"name":"metadata","kind":"scalar","type":"Json"}],"dbName":null},"BroadcastHistory":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"kind","kind":"scalar","type":"String"},{"name":"notifyType","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"bodyPreview","kind":"scalar","type":"String"},{"name":"messagePreview","kind":"scalar","type":"String"},{"name":"sent","kind":"scalar","type":"Int"},{"name":"failed","kind":"scalar","type":"Int"},{"name":"total","kind":"scalar","type":"Int"},{"name":"errorSample","kind":"scalar","type":"String"},{"name":"adminId","kind":"scalar","type":"String"},{"name":"adminLogin","kind":"scalar","type":"String"},{"name":"deviceId","kind":"scalar","type":"String"}],"dbName":null},"AppConfig":{"fields":[{"name":"key","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null},"ReleasePost":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"locale","kind":"scalar","type":"String"},{"name":"slug","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"version","kind":"scalar","type":"String"},{"name":"summary","kind":"scalar","type":"String"},{"name":"body","kind":"scalar","type":"String"},{"name":"published","kind":"scalar","type":"Boolean"},{"name":"publishedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null},"InAppEventPage":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"eventId","kind":"scalar","type":"String"},{"name":"locale","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"contentType","kind":"scalar","type":"String"},{"name":"body","kind":"scalar","type":"String"},{"name":"ctaLabel","kind":"scalar","type":"String"},{"name":"published","kind":"scalar","type":"Boolean"},{"name":"revision","kind":"scalar","type":"Int"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null},"PublishedNote":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"token","kind":"scalar","type":"String"},{"name":"deviceId","kind":"scalar","type":"String"},{"name":"recordId","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"template","kind":"scalar","type":"String"},{"name":"markdown","kind":"scalar","type":"String"},{"name":"contentHash","kind":"scalar","type":"String"},{"name":"publishedAt","kind":"scalar","type":"DateTime"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"revokedAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null},"SupportIssue":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"referenceNumber","kind":"scalar","type":"Int"},{"name":"deviceId","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"subject","kind":"scalar","type":"String"},{"name":"message","kind":"scalar","type":"String"},{"name":"diagnostics","kind":"scalar","type":"Json"},{"name":"appLogs","kind":"scalar","type":"String"},{"name":"status","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"closedAt","kind":"scalar","type":"DateTime"},{"name":"proLicenseEmailSentAt","kind":"scalar","type":"DateTime"},{"name":"proLicenseDurationMonths","kind":"scalar","type":"Int"},{"name":"proLicenseDurationDays","kind":"scalar","type":"Int"}],"dbName":null},"ProLicenseKey":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"keyHash","kind":"scalar","type":"String"},{"name":"durationMonths","kind":"scalar","type":"Int"},{"name":"durationDays","kind":"scalar","type":"Int"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"createdByAdminId","kind":"scalar","type":"String"},{"name":"issuedToEmail","kind":"scalar","type":"String"},{"name":"adminNotes","kind":"scalar","type":"String"},{"name":"voucherBatchId","kind":"scalar","type":"String"},{"name":"voucherTemplateVersion","kind":"scalar","type":"String"},{"name":"consumedAt","kind":"scalar","type":"DateTime"},{"name":"consumedByDeviceId","kind":"scalar","type":"String"}],"dbName":null},"DeviceProEntitlement":{"fields":[{"name":"deviceId","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null},"DeviceMobileBanner":{"fields":[{"name":"deviceId","kind":"scalar","type":"String"},{"name":"revision","kind":"scalar","type":"Int"},{"name":"bannerJson","kind":"scalar","type":"String"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null},"AiUsageLedgerEntry":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"deviceId","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"kind","kind":"scalar","type":"String"},{"name":"operation","kind":"scalar","type":"String"},{"name":"amount","kind":"scalar","type":"Int"},{"name":"jobId","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"metadata","kind":"scalar","type":"Json"}],"dbName":null},"AiUsageResetPurchase":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"deviceId","kind":"scalar","type":"String"},{"name":"transactionId","kind":"scalar","type":"String"},{"name":"productIdentifier","kind":"scalar","type":"String"},{"name":"creditedAmount","kind":"scalar","type":"Int"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"metadata","kind":"scalar","type":"Json"}],"dbName":null},"AdminBudgetExpense":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"spentAt","kind":"scalar","type":"DateTime"},{"name":"category","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"amountCents","kind":"scalar","type":"Int"},{"name":"currency","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","AdminUser.findUnique","AdminUser.findUniqueOrThrow","orderBy","cursor","AdminUser.findFirst","AdminUser.findFirstOrThrow","AdminUser.findMany","data","AdminUser.createOne","AdminUser.createMany","AdminUser.createManyAndReturn","AdminUser.updateOne","AdminUser.updateMany","AdminUser.updateManyAndReturn","create","update","AdminUser.upsertOne","AdminUser.deleteOne","AdminUser.deleteMany","having","_count","_min","_max","AdminUser.groupBy","AdminUser.aggregate","AdminAuditLog.findUnique","AdminAuditLog.findUniqueOrThrow","AdminAuditLog.findFirst","AdminAuditLog.findFirstOrThrow","AdminAuditLog.findMany","AdminAuditLog.createOne","AdminAuditLog.createMany","AdminAuditLog.createManyAndReturn","AdminAuditLog.updateOne","AdminAuditLog.updateMany","AdminAuditLog.updateManyAndReturn","AdminAuditLog.upsertOne","AdminAuditLog.deleteOne","AdminAuditLog.deleteMany","AdminAuditLog.groupBy","AdminAuditLog.aggregate","BroadcastHistory.findUnique","BroadcastHistory.findUniqueOrThrow","BroadcastHistory.findFirst","BroadcastHistory.findFirstOrThrow","BroadcastHistory.findMany","BroadcastHistory.createOne","BroadcastHistory.createMany","BroadcastHistory.createManyAndReturn","BroadcastHistory.updateOne","BroadcastHistory.updateMany","BroadcastHistory.updateManyAndReturn","BroadcastHistory.upsertOne","BroadcastHistory.deleteOne","BroadcastHistory.deleteMany","_avg","_sum","BroadcastHistory.groupBy","BroadcastHistory.aggregate","AppConfig.findUnique","AppConfig.findUniqueOrThrow","AppConfig.findFirst","AppConfig.findFirstOrThrow","AppConfig.findMany","AppConfig.createOne","AppConfig.createMany","AppConfig.createManyAndReturn","AppConfig.updateOne","AppConfig.updateMany","AppConfig.updateManyAndReturn","AppConfig.upsertOne","AppConfig.deleteOne","AppConfig.deleteMany","AppConfig.groupBy","AppConfig.aggregate","ReleasePost.findUnique","ReleasePost.findUniqueOrThrow","ReleasePost.findFirst","ReleasePost.findFirstOrThrow","ReleasePost.findMany","ReleasePost.createOne","ReleasePost.createMany","ReleasePost.createManyAndReturn","ReleasePost.updateOne","ReleasePost.updateMany","ReleasePost.updateManyAndReturn","ReleasePost.upsertOne","ReleasePost.deleteOne","ReleasePost.deleteMany","ReleasePost.groupBy","ReleasePost.aggregate","InAppEventPage.findUnique","InAppEventPage.findUniqueOrThrow","InAppEventPage.findFirst","InAppEventPage.findFirstOrThrow","InAppEventPage.findMany","InAppEventPage.createOne","InAppEventPage.createMany","InAppEventPage.createManyAndReturn","InAppEventPage.updateOne","InAppEventPage.updateMany","InAppEventPage.updateManyAndReturn","InAppEventPage.upsertOne","InAppEventPage.deleteOne","InAppEventPage.deleteMany","InAppEventPage.groupBy","InAppEventPage.aggregate","PublishedNote.findUnique","PublishedNote.findUniqueOrThrow","PublishedNote.findFirst","PublishedNote.findFirstOrThrow","PublishedNote.findMany","PublishedNote.createOne","PublishedNote.createMany","PublishedNote.createManyAndReturn","PublishedNote.updateOne","PublishedNote.updateMany","PublishedNote.updateManyAndReturn","PublishedNote.upsertOne","PublishedNote.deleteOne","PublishedNote.deleteMany","PublishedNote.groupBy","PublishedNote.aggregate","SupportIssue.findUnique","SupportIssue.findUniqueOrThrow","SupportIssue.findFirst","SupportIssue.findFirstOrThrow","SupportIssue.findMany","SupportIssue.createOne","SupportIssue.createMany","SupportIssue.createManyAndReturn","SupportIssue.updateOne","SupportIssue.updateMany","SupportIssue.updateManyAndReturn","SupportIssue.upsertOne","SupportIssue.deleteOne","SupportIssue.deleteMany","SupportIssue.groupBy","SupportIssue.aggregate","ProLicenseKey.findUnique","ProLicenseKey.findUniqueOrThrow","ProLicenseKey.findFirst","ProLicenseKey.findFirstOrThrow","ProLicenseKey.findMany","ProLicenseKey.createOne","ProLicenseKey.createMany","ProLicenseKey.createManyAndReturn","ProLicenseKey.updateOne","ProLicenseKey.updateMany","ProLicenseKey.updateManyAndReturn","ProLicenseKey.upsertOne","ProLicenseKey.deleteOne","ProLicenseKey.deleteMany","ProLicenseKey.groupBy","ProLicenseKey.aggregate","DeviceProEntitlement.findUnique","DeviceProEntitlement.findUniqueOrThrow","DeviceProEntitlement.findFirst","DeviceProEntitlement.findFirstOrThrow","DeviceProEntitlement.findMany","DeviceProEntitlement.createOne","DeviceProEntitlement.createMany","DeviceProEntitlement.createManyAndReturn","DeviceProEntitlement.updateOne","DeviceProEntitlement.updateMany","DeviceProEntitlement.updateManyAndReturn","DeviceProEntitlement.upsertOne","DeviceProEntitlement.deleteOne","DeviceProEntitlement.deleteMany","DeviceProEntitlement.groupBy","DeviceProEntitlement.aggregate","DeviceMobileBanner.findUnique","DeviceMobileBanner.findUniqueOrThrow","DeviceMobileBanner.findFirst","DeviceMobileBanner.findFirstOrThrow","DeviceMobileBanner.findMany","DeviceMobileBanner.createOne","DeviceMobileBanner.createMany","DeviceMobileBanner.createManyAndReturn","DeviceMobileBanner.updateOne","DeviceMobileBanner.updateMany","DeviceMobileBanner.updateManyAndReturn","DeviceMobileBanner.upsertOne","DeviceMobileBanner.deleteOne","DeviceMobileBanner.deleteMany","DeviceMobileBanner.groupBy","DeviceMobileBanner.aggregate","AiUsageLedgerEntry.findUnique","AiUsageLedgerEntry.findUniqueOrThrow","AiUsageLedgerEntry.findFirst","AiUsageLedgerEntry.findFirstOrThrow","AiUsageLedgerEntry.findMany","AiUsageLedgerEntry.createOne","AiUsageLedgerEntry.createMany","AiUsageLedgerEntry.createManyAndReturn","AiUsageLedgerEntry.updateOne","AiUsageLedgerEntry.updateMany","AiUsageLedgerEntry.updateManyAndReturn","AiUsageLedgerEntry.upsertOne","AiUsageLedgerEntry.deleteOne","AiUsageLedgerEntry.deleteMany","AiUsageLedgerEntry.groupBy","AiUsageLedgerEntry.aggregate","AiUsageResetPurchase.findUnique","AiUsageResetPurchase.findUniqueOrThrow","AiUsageResetPurchase.findFirst","AiUsageResetPurchase.findFirstOrThrow","AiUsageResetPurchase.findMany","AiUsageResetPurchase.createOne","AiUsageResetPurchase.createMany","AiUsageResetPurchase.createManyAndReturn","AiUsageResetPurchase.updateOne","AiUsageResetPurchase.updateMany","AiUsageResetPurchase.updateManyAndReturn","AiUsageResetPurchase.upsertOne","AiUsageResetPurchase.deleteOne","AiUsageResetPurchase.deleteMany","AiUsageResetPurchase.groupBy","AiUsageResetPurchase.aggregate","AdminBudgetExpense.findUnique","AdminBudgetExpense.findUniqueOrThrow","AdminBudgetExpense.findFirst","AdminBudgetExpense.findFirstOrThrow","AdminBudgetExpense.findMany","AdminBudgetExpense.createOne","AdminBudgetExpense.createMany","AdminBudgetExpense.createManyAndReturn","AdminBudgetExpense.updateOne","AdminBudgetExpense.updateMany","AdminBudgetExpense.updateManyAndReturn","AdminBudgetExpense.upsertOne","AdminBudgetExpense.deleteOne","AdminBudgetExpense.deleteMany","AdminBudgetExpense.groupBy","AdminBudgetExpense.aggregate","AND","OR","NOT","id","spentAt","category","description","amountCents","currency","createdAt","updatedAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","deviceId","transactionId","productIdentifier","creditedAmount","metadata","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","kind","operation","amount","jobId","revision","bannerJson","expiresAt","keyHash","durationMonths","durationDays","createdByAdminId","issuedToEmail","adminNotes","voucherBatchId","voucherTemplateVersion","consumedAt","consumedByDeviceId","referenceNumber","email","subject","message","diagnostics","appLogs","status","closedAt","proLicenseEmailSentAt","proLicenseDurationMonths","proLicenseDurationDays","token","recordId","title","template","markdown","contentHash","publishedAt","revokedAt","deviceId_recordId","eventId","locale","contentType","body","ctaLabel","published","eventId_locale","slug","version","summary","locale_slug","key","value","notifyType","bodyPreview","messagePreview","sent","failed","total","errorSample","adminId","adminLogin","action","login","passwordHash","isSuperadmin","permissions","telegramUserId","has","hasEvery","hasSome","set","push","increment","decrement","multiply","divide"]'),
  graph: "5gOBAeABC-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_AgEAAAABwAIBAAAAAcECAQAAAAHCAgIAAAABwwICAAAAAcQCAgAAAAHFAgEAAAABxgIBAAAAAccCAQAAAAEBCAAAOwAgDu8BAQAAAAH1AUAAAAABggIBAAAAAY0CAQAAAAGrAgEAAAABvwIBAAAAAcACAQAAAAHBAgEAAAABwgICAAAAAcMCAgAAAAHEAgIAAAABxQIBAAAAAcYCAQAAAAHHAgEAAAABAQgAAD0AMAEIAAA9ADAO7wEBAKkDACH1AUAAqgMAIYICAQCrAwAhjQIBAKkDACGrAgEAqwMAIb8CAQCpAwAhwAIBAKsDACHBAgEAqwMAIcICAgCsAwAhwwICAKwDACHEAgIArAMAIcUCAQCrAwAhxgIBAKkDACHHAgEAqQMAIQIAAAAzACAIAABAACAO7wEBAKkDACH1AUAAqgMAIYICAQCrAwAhjQIBAKkDACGrAgEAqwMAIb8CAQCpAwAhwAIBAKsDACHBAgEAqwMAIcICAgCsAwAhwwICAKwDACHEAgIArAMAIcUCAQCrAwAhxgIBAKkDACHHAgEAqQMAIQIAAAA2ACAIAABCACACAAAANgAgCAAAQgAgAwAAADMAIA8AADsAIBAAAEAAIAEAAAAzACABAAAANgAgChUAANoDACAWAADdAwAgFwAA3AMAIDgAANsDACA5AADeAwAgggIAAKMDACCrAgAAowMAIMACAACjAwAgwQIAAKMDACDFAgAAowMAIBHsAQAAnAMAMO0BAABJABDuAQAAnAMAMO8BAQDgAgAh9QFAAOECACGCAgEA4gIAIY0CAQDgAgAhqwIBAOICACG_AgEA4AIAIcACAQDiAgAhwQIBAOICACHCAgIA4wIAIcMCAgDjAgAhxAICAOMCACHFAgEA4gIAIcYCAQDgAgAhxwIBAOACACEDAAAANgAgAwAASAAwFAAASQAgAwAAADYAIAMAADcAMAQAADMAIAbsAQAAmwMAMO0BAABPABDuAQAAmwMAMPYBQADwAgAhvQIBAAAAAb4CAQDvAgAhAQAAAEwAIAEAAABMACAG7AEAAJsDADDtAQAATwAQ7gEAAJsDADD2AUAA8AIAIb0CAQDvAgAhvgIBAO8CACEAAwAAAE8AIAMAAFAAMAQAAEwAIAMAAABPACADAABQADAEAABMACADAAAATwAgAwAAUAAwBAAATAAgA_YBQAAAAAG9AgEAAAABvgIBAAAAAQEIAABUACAD9gFAAAAAAb0CAQAAAAG-AgEAAAABAQgAAFYAMAEIAABWADAD9gFAAKoDACG9AgEAqQMAIb4CAQCpAwAhAgAAAEwAIAgAAFkAIAP2AUAAqgMAIb0CAQCpAwAhvgIBAKkDACECAAAATwAgCAAAWwAgAgAAAE8AIAgAAFsAIAMAAABMACAPAABUACAQAABZACABAAAATAAgAQAAAE8AIAMVAADXAwAgFgAA2QMAIBcAANgDACAG7AEAAJoDADDtAQAAYgAQ7gEAAJoDADD2AUAA4QIAIb0CAQDgAgAhvgIBAOACACEDAAAATwAgAwAAYQAwFAAAYgAgAwAAAE8AIAMAAFAAMAQAAEwAIA_sAQAAmAMAMO0BAABoABDuAQAAmAMAMO8BAQAAAAH1AUAA8AIAIfYBQADwAgAhqwIBAO8CACGvAkAAhwMAIbMCAQDvAgAhtQIBAO8CACG3AiAAlQMAIbkCAQDvAgAhugIBAPECACG7AgEA8QIAIbwCAACZAwAgAQAAAGUAIAEAAABlACAO7AEAAJgDADDtAQAAaAAQ7gEAAJgDADDvAQEA7wIAIfUBQADwAgAh9gFAAPACACGrAgEA7wIAIa8CQACHAwAhswIBAO8CACG1AgEA7wIAIbcCIACVAwAhuQIBAO8CACG6AgEA8QIAIbsCAQDxAgAhA68CAACjAwAgugIAAKMDACC7AgAAowMAIAMAAABoACADAABpADAEAABlACADAAAAaAAgAwAAaQAwBAAAZQAgAwAAAGgAIAMAAGkAMAQAAGUAIAvvAQEAAAAB9QFAAAAAAfYBQAAAAAGrAgEAAAABrwJAAAAAAbMCAQAAAAG1AgEAAAABtwIgAAAAAbkCAQAAAAG6AgEAAAABuwIBAAAAAQEIAABtACAL7wEBAAAAAfUBQAAAAAH2AUAAAAABqwIBAAAAAa8CQAAAAAGzAgEAAAABtQIBAAAAAbcCIAAAAAG5AgEAAAABugIBAAAAAbsCAQAAAAEBCAAAbwAwAQgAAG8AMAvvAQEAqQMAIfUBQACqAwAh9gFAAKoDACGrAgEAqQMAIa8CQADFAwAhswIBAKkDACG1AgEAqQMAIbcCIADTAwAhuQIBAKkDACG6AgEAqwMAIbsCAQCrAwAhAgAAAGUAIAgAAHIAIAvvAQEAqQMAIfUBQACqAwAh9gFAAKoDACGrAgEAqQMAIa8CQADFAwAhswIBAKkDACG1AgEAqQMAIbcCIADTAwAhuQIBAKkDACG6AgEAqwMAIbsCAQCrAwAhAgAAAGgAIAgAAHQAIAIAAABoACAIAAB0ACADAAAAZQAgDwAAbQAgEAAAcgAgAQAAAGUAIAEAAABoACAGFQAA1AMAIBYAANYDACAXAADVAwAgrwIAAKMDACC6AgAAowMAILsCAACjAwAgDuwBAACXAwAw7QEAAHsAEO4BAACXAwAw7wEBAOACACH1AUAA4QIAIfYBQADhAgAhqwIBAOACACGvAkAAgAMAIbMCAQDgAgAhtQIBAOACACG3AiAAkQMAIbkCAQDgAgAhugIBAOICACG7AgEA4gIAIQMAAABoACADAAB6ADAUAAB7ACADAAAAaAAgAwAAaQAwBAAAZQAgD-wBAACUAwAw7QEAAIEBABDuAQAAlAMAMO8BAQAAAAH1AUAA8AIAIfYBQADwAgAhkQICAPICACGrAgEA7wIAIbICAQDvAgAhswIBAO8CACG0AgEA7wIAIbUCAQDvAgAhtgIBAPECACG3AiAAlQMAIbgCAACWAwAgAQAAAH4AIAEAAAB-ACAO7AEAAJQDADDtAQAAgQEAEO4BAACUAwAw7wEBAO8CACH1AUAA8AIAIfYBQADwAgAhkQICAPICACGrAgEA7wIAIbICAQDvAgAhswIBAO8CACG0AgEA7wIAIbUCAQDvAgAhtgIBAPECACG3AiAAlQMAIQG2AgAAowMAIAMAAACBAQAgAwAAggEAMAQAAH4AIAMAAACBAQAgAwAAggEAMAQAAH4AIAMAAACBAQAgAwAAggEAMAQAAH4AIAvvAQEAAAAB9QFAAAAAAfYBQAAAAAGRAgIAAAABqwIBAAAAAbICAQAAAAGzAgEAAAABtAIBAAAAAbUCAQAAAAG2AgEAAAABtwIgAAAAAQEIAACGAQAgC-8BAQAAAAH1AUAAAAAB9gFAAAAAAZECAgAAAAGrAgEAAAABsgIBAAAAAbMCAQAAAAG0AgEAAAABtQIBAAAAAbYCAQAAAAG3AiAAAAABAQgAAIgBADABCAAAiAEAMAvvAQEAqQMAIfUBQACqAwAh9gFAAKoDACGRAgIArAMAIasCAQCpAwAhsgIBAKkDACGzAgEAqQMAIbQCAQCpAwAhtQIBAKkDACG2AgEAqwMAIbcCIADTAwAhAgAAAH4AIAgAAIsBACAL7wEBAKkDACH1AUAAqgMAIfYBQACqAwAhkQICAKwDACGrAgEAqQMAIbICAQCpAwAhswIBAKkDACG0AgEAqQMAIbUCAQCpAwAhtgIBAKsDACG3AiAA0wMAIQIAAACBAQAgCAAAjQEAIAIAAACBAQAgCAAAjQEAIAMAAAB-ACAPAACGAQAgEAAAiwEAIAEAAAB-ACABAAAAgQEAIAYVAADOAwAgFgAA0QMAIBcAANADACA4AADPAwAgOQAA0gMAILYCAACjAwAgDuwBAACQAwAw7QEAAJQBABDuAQAAkAMAMO8BAQDgAgAh9QFAAOECACH2AUAA4QIAIZECAgDjAgAhqwIBAOACACGyAgEA4AIAIbMCAQDgAgAhtAIBAOACACG1AgEA4AIAIbYCAQDiAgAhtwIgAJEDACEDAAAAgQEAIAMAAJMBADAUAACUAQAgAwAAAIEBACADAACCAQAwBAAAfgAgEOwBAACOAwAw7QEAAJoBABDuAQAAjgMAMO8BAQAAAAH2AUAA8AIAIYICAQDvAgAhkwJAAIcDACGpAgEAAAABqgIBAO8CACGrAgEA7wIAIawCAQDvAgAhrQIBAO8CACGuAgEA7wIAIa8CQADwAgAhsAJAAIcDACGxAgAAjwMAIAEAAACXAQAgAQAAAJcBACAP7AEAAI4DADDtAQAAmgEAEO4BAACOAwAw7wEBAO8CACH2AUAA8AIAIYICAQDvAgAhkwJAAIcDACGpAgEA7wIAIaoCAQDvAgAhqwIBAO8CACGsAgEA7wIAIa0CAQDvAgAhrgIBAO8CACGvAkAA8AIAIbACQACHAwAhApMCAACjAwAgsAIAAKMDACADAAAAmgEAIAMAAJsBADAEAACXAQAgAwAAAJoBACADAACbAQAwBAAAlwEAIAMAAACaAQAgAwAAmwEAMAQAAJcBACAM7wEBAAAAAfYBQAAAAAGCAgEAAAABkwJAAAAAAakCAQAAAAGqAgEAAAABqwIBAAAAAawCAQAAAAGtAgEAAAABrgIBAAAAAa8CQAAAAAGwAkAAAAABAQgAAJ8BACAM7wEBAAAAAfYBQAAAAAGCAgEAAAABkwJAAAAAAakCAQAAAAGqAgEAAAABqwIBAAAAAawCAQAAAAGtAgEAAAABrgIBAAAAAa8CQAAAAAGwAkAAAAABAQgAAKEBADABCAAAoQEAMAzvAQEAqQMAIfYBQACqAwAhggIBAKkDACGTAkAAxQMAIakCAQCpAwAhqgIBAKkDACGrAgEAqQMAIawCAQCpAwAhrQIBAKkDACGuAgEAqQMAIa8CQACqAwAhsAJAAMUDACECAAAAlwEAIAgAAKQBACAM7wEBAKkDACH2AUAAqgMAIYICAQCpAwAhkwJAAMUDACGpAgEAqQMAIaoCAQCpAwAhqwIBAKkDACGsAgEAqQMAIa0CAQCpAwAhrgIBAKkDACGvAkAAqgMAIbACQADFAwAhAgAAAJoBACAIAACmAQAgAgAAAJoBACAIAACmAQAgAwAAAJcBACAPAACfAQAgEAAApAEAIAEAAACXAQAgAQAAAJoBACAFFQAAywMAIBYAAM0DACAXAADMAwAgkwIAAKMDACCwAgAAowMAIA_sAQAAjQMAMO0BAACtAQAQ7gEAAI0DADDvAQEA4AIAIfYBQADhAgAhggIBAOACACGTAkAAgAMAIakCAQDgAgAhqgIBAOACACGrAgEA4AIAIawCAQDgAgAhrQIBAOACACGuAgEA4AIAIa8CQADhAgAhsAJAAIADACEDAAAAmgEAIAMAAKwBADAUAACtAQAgAwAAAJoBACADAACbAQAwBAAAlwEAIBLsAQAAiwMAMO0BAACzAQAQ7gEAAIsDADDvAQEAAAAB9QFAAPACACH2AUAA8AIAIYICAQDvAgAhngICAAAAAZ8CAQDxAgAhoAIBAPECACGhAgEA7wIAIaICAACMAwAgowIBAPECACGkAgEA7wIAIaUCQACHAwAhpgJAAIcDACGnAgIAhgMAIagCAgCGAwAhAQAAALABACABAAAAsAEAIBLsAQAAiwMAMO0BAACzAQAQ7gEAAIsDADDvAQEA7wIAIfUBQADwAgAh9gFAAPACACGCAgEA7wIAIZ4CAgDyAgAhnwIBAPECACGgAgEA8QIAIaECAQDvAgAhogIAAIwDACCjAgEA8QIAIaQCAQDvAgAhpQJAAIcDACGmAkAAhwMAIacCAgCGAwAhqAICAIYDACEHnwIAAKMDACCgAgAAowMAIKMCAACjAwAgpQIAAKMDACCmAgAAowMAIKcCAACjAwAgqAIAAKMDACADAAAAswEAIAMAALQBADAEAACwAQAgAwAAALMBACADAAC0AQAwBAAAsAEAIAMAAACzAQAgAwAAtAEAMAQAALABACAP7wEBAAAAAfUBQAAAAAH2AUAAAAABggIBAAAAAZ4CAgAAAAGfAgEAAAABoAIBAAAAAaECAQAAAAGiAoAAAAABowIBAAAAAaQCAQAAAAGlAkAAAAABpgJAAAAAAacCAgAAAAGoAgIAAAABAQgAALgBACAP7wEBAAAAAfUBQAAAAAH2AUAAAAABggIBAAAAAZ4CAgAAAAGfAgEAAAABoAIBAAAAAaECAQAAAAGiAoAAAAABowIBAAAAAaQCAQAAAAGlAkAAAAABpgJAAAAAAacCAgAAAAGoAgIAAAABAQgAALoBADABCAAAugEAMA_vAQEAqQMAIfUBQACqAwAh9gFAAKoDACGCAgEAqQMAIZ4CAgCsAwAhnwIBAKsDACGgAgEAqwMAIaECAQCpAwAhogKAAAAAAaMCAQCrAwAhpAIBAKkDACGlAkAAxQMAIaYCQADFAwAhpwICAMQDACGoAgIAxAMAIQIAAACwAQAgCAAAvQEAIA_vAQEAqQMAIfUBQACqAwAh9gFAAKoDACGCAgEAqQMAIZ4CAgCsAwAhnwIBAKsDACGgAgEAqwMAIaECAQCpAwAhogKAAAAAAaMCAQCrAwAhpAIBAKkDACGlAkAAxQMAIaYCQADFAwAhpwICAMQDACGoAgIAxAMAIQIAAACzAQAgCAAAvwEAIAIAAACzAQAgCAAAvwEAIAMAAACwAQAgDwAAuAEAIBAAAL0BACABAAAAsAEAIAEAAACzAQAgDBUAAMYDACAWAADJAwAgFwAAyAMAIDgAAMcDACA5AADKAwAgnwIAAKMDACCgAgAAowMAIKMCAACjAwAgpQIAAKMDACCmAgAAowMAIKcCAACjAwAgqAIAAKMDACAS7AEAAIgDADDtAQAAxgEAEO4BAACIAwAw7wEBAOACACH1AUAA4QIAIfYBQADhAgAhggIBAOACACGeAgIA4wIAIZ8CAQDiAgAhoAIBAOICACGhAgEA4AIAIaICAACJAwAgowIBAOICACGkAgEA4AIAIaUCQACAAwAhpgJAAIADACGnAgIA_wIAIagCAgD_AgAhAwAAALMBACADAADFAQAwFAAAxgEAIAMAAACzAQAgAwAAtAEAMAQAALABACAP7AEAAIUDADDtAQAAzAEAEO4BAACFAwAw7wEBAAAAAfUBQADwAgAhlAIBAAAAAZUCAgDyAgAhlgICAIYDACGXAgEA7wIAIZgCAQDxAgAhmQIBAPECACGaAgEA8QIAIZsCAQDxAgAhnAJAAIcDACGdAgEA8QIAIQEAAADJAQAgAQAAAMkBACAP7AEAAIUDADDtAQAAzAEAEO4BAACFAwAw7wEBAO8CACH1AUAA8AIAIZQCAQDvAgAhlQICAPICACGWAgIAhgMAIZcCAQDvAgAhmAIBAPECACGZAgEA8QIAIZoCAQDxAgAhmwIBAPECACGcAkAAhwMAIZ0CAQDxAgAhB5YCAACjAwAgmAIAAKMDACCZAgAAowMAIJoCAACjAwAgmwIAAKMDACCcAgAAowMAIJ0CAACjAwAgAwAAAMwBACADAADNAQAwBAAAyQEAIAMAAADMAQAgAwAAzQEAMAQAAMkBACADAAAAzAEAIAMAAM0BADAEAADJAQAgDO8BAQAAAAH1AUAAAAABlAIBAAAAAZUCAgAAAAGWAgIAAAABlwIBAAAAAZgCAQAAAAGZAgEAAAABmgIBAAAAAZsCAQAAAAGcAkAAAAABnQIBAAAAAQEIAADRAQAgDO8BAQAAAAH1AUAAAAABlAIBAAAAAZUCAgAAAAGWAgIAAAABlwIBAAAAAZgCAQAAAAGZAgEAAAABmgIBAAAAAZsCAQAAAAGcAkAAAAABnQIBAAAAAQEIAADTAQAwAQgAANMBADAM7wEBAKkDACH1AUAAqgMAIZQCAQCpAwAhlQICAKwDACGWAgIAxAMAIZcCAQCpAwAhmAIBAKsDACGZAgEAqwMAIZoCAQCrAwAhmwIBAKsDACGcAkAAxQMAIZ0CAQCrAwAhAgAAAMkBACAIAADWAQAgDO8BAQCpAwAh9QFAAKoDACGUAgEAqQMAIZUCAgCsAwAhlgICAMQDACGXAgEAqQMAIZgCAQCrAwAhmQIBAKsDACGaAgEAqwMAIZsCAQCrAwAhnAJAAMUDACGdAgEAqwMAIQIAAADMAQAgCAAA2AEAIAIAAADMAQAgCAAA2AEAIAMAAADJAQAgDwAA0QEAIBAAANYBACABAAAAyQEAIAEAAADMAQAgDBUAAL8DACAWAADCAwAgFwAAwQMAIDgAAMADACA5AADDAwAglgIAAKMDACCYAgAAowMAIJkCAACjAwAgmgIAAKMDACCbAgAAowMAIJwCAACjAwAgnQIAAKMDACAP7AEAAP4CADDtAQAA3wEAEO4BAAD-AgAw7wEBAOACACH1AUAA4QIAIZQCAQDgAgAhlQICAOMCACGWAgIA_wIAIZcCAQDgAgAhmAIBAOICACGZAgEA4gIAIZoCAQDiAgAhmwIBAOICACGcAkAAgAMAIZ0CAQDiAgAhAwAAAMwBACADAADeAQAwFAAA3wEAIAMAAADMAQAgAwAAzQEAMAQAAMkBACAG7AEAAP0CADDtAQAA5QEAEO4BAAD9AgAw9gFAAPACACGCAgEAAAABkwJAAPACACEBAAAA4gEAIAEAAADiAQAgBuwBAAD9AgAw7QEAAOUBABDuAQAA_QIAMPYBQADwAgAhggIBAO8CACGTAkAA8AIAIQADAAAA5QEAIAMAAOYBADAEAADiAQAgAwAAAOUBACADAADmAQAwBAAA4gEAIAMAAADlAQAgAwAA5gEAMAQAAOIBACAD9gFAAAAAAYICAQAAAAGTAkAAAAABAQgAAOoBACAD9gFAAAAAAYICAQAAAAGTAkAAAAABAQgAAOwBADABCAAA7AEAMAP2AUAAqgMAIYICAQCpAwAhkwJAAKoDACECAAAA4gEAIAgAAO8BACAD9gFAAKoDACGCAgEAqQMAIZMCQACqAwAhAgAAAOUBACAIAADxAQAgAgAAAOUBACAIAADxAQAgAwAAAOIBACAPAADqAQAgEAAA7wEAIAEAAADiAQAgAQAAAOUBACADFQAAvAMAIBYAAL4DACAXAAC9AwAgBuwBAAD8AgAw7QEAAPgBABDuAQAA_AIAMPYBQADhAgAhggIBAOACACGTAkAA4QIAIQMAAADlAQAgAwAA9wEAMBQAAPgBACADAAAA5QEAIAMAAOYBADAEAADiAQAgCOwBAAD7AgAw7QEAAP4BABDuAQAA-wIAMPUBQADwAgAh9gFAAPACACGCAgEAAAABkQICAPICACGSAgEA7wIAIQEAAAD7AQAgAQAAAPsBACAI7AEAAPsCADDtAQAA_gEAEO4BAAD7AgAw9QFAAPACACH2AUAA8AIAIYICAQDvAgAhkQICAPICACGSAgEA7wIAIQADAAAA_gEAIAMAAP8BADAEAAD7AQAgAwAAAP4BACADAAD_AQAwBAAA-wEAIAMAAAD-AQAgAwAA_wEAMAQAAPsBACAF9QFAAAAAAfYBQAAAAAGCAgEAAAABkQICAAAAAZICAQAAAAEBCAAAgwIAIAX1AUAAAAAB9gFAAAAAAYICAQAAAAGRAgIAAAABkgIBAAAAAQEIAACFAgAwAQgAAIUCADAF9QFAAKoDACH2AUAAqgMAIYICAQCpAwAhkQICAKwDACGSAgEAqQMAIQIAAAD7AQAgCAAAiAIAIAX1AUAAqgMAIfYBQACqAwAhggIBAKkDACGRAgIArAMAIZICAQCpAwAhAgAAAP4BACAIAACKAgAgAgAAAP4BACAIAACKAgAgAwAAAPsBACAPAACDAgAgEAAAiAIAIAEAAAD7AQAgAQAAAP4BACAFFQAAtwMAIBYAALoDACAXAAC5AwAgOAAAuAMAIDkAALsDACAI7AEAAPoCADDtAQAAkQIAEO4BAAD6AgAw9QFAAOECACH2AUAA4QIAIYICAQDgAgAhkQICAOMCACGSAgEA4AIAIQMAAAD-AQAgAwAAkAIAMBQAAJECACADAAAA_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-gEBAAAAAfsBAQAAAAH8AQEAAAAB_QEBAAAAAf4BAQDsAgAh_wEBAAAAAYACAQAAAAGBAgEAAAABCxUAAOUCACAWAADrAgAgFwAA6wIAIPcBQAAAAAH4AUAAAAAE-QFAAAAABPoBQAAAAAH7AUAAAAAB_AFAAAAAAf0BQAAAAAH-AUAA6gIAIQ4VAADoAgAgFgAA6QIAIBcAAOkCACD3AQEAAAAB-AEBAAAABfkBAQAAAAX6AQEAAAAB-wEBAAAAAfwBAQAAAAH9AQEAAAAB_gEBAOcCACH_AQEAAAABgAIBAAAAAYECAQAAAAENFQAA5QIAIBYAAOUCACAXAADlAgAgOAAA5gIAIDkAAOUCACD3AQIAAAAB-AECAAAABPkBAgAAAAT6AQIAAAAB-wECAAAAAfwBAgAAAAH9AQIAAAAB_gECAOQCACENFQAA5QIAIBYAAOUCACAXAADlAgAgOAAA5gIAIDkAAOUCACD3AQIAAAAB-AECAAAABPkBAgAAAAT6AQIAAAAB-wECAAAAAfwBAgAAAAH9AQIAAAAB_gECAOQCACEI9wECAAAAAfgBAgAAAAT5AQIAAAAE-gECAAAAAfsBAgAAAAH8AQIAAAAB_QECAAAAAf4BAgDlAgAhCPcBCAAAAAH4AQgAAAAE-QEIAAAABPoBCAAAAAH7AQgAAAAB_AEIAAAAAf0BCAAAAAH-AQgA5gIAIQ4VAADoAgAgFgAA6QIAIBcAAOkCACD3AQEAAAAB-AEBAAAABfkBAQAAAAX6AQEAAAAB-wEBAAAAAfwBAQAAAAH9AQEAAAAB_gEBAOcCACH_AQEAAAABgAIBAAAAAYECAQAAAAEI9wECAAAAAfgBAgAAAAX5AQIAAAAF-gECAAAAAfsBAgAAAAH8AQIAAAAB_QECAAAAAf4BAgDoAgAhC_cBAQAAAAH4AQEAAAAF-QEBAAAABfoBAQAAAAH7AQEAAAAB_AEBAAAAAf0BAQAAAAH-AQEA6QIAIf8BAQAAAAGAAgEAAAABgQIBAAAAAQsVAADlAgAgFgAA6wIAIBcAAOsCACD3AUAAAAAB-AFAAAAABPkBQAAAAAT6AUAAAAAB-wFAAAAAAfwBQAAAAAH9AUAAAAAB_gFAAOoCACEI9wFAAAAAAfgBQAAAAAT5AUAAAAAE-gFAAAAAAfsBQAAAAAH8AUAAAAAB_QFAAAAAAf4BQADrAgAhDhUAAOUCACAWAADtAgAgFwAA7QIAIPcBAQAAAAH4AQEAAAAE-QEBAAAABPoBAQAAAAH7AQEAAAAB_AEBAAAAAf0BAQAAAAH-AQEA7AIAIf8BAQAAAAGAAgEAAAABgQIBAAAAAQv3AQEAAAAB-AEBAAAABPkBAQAAAAT6AQEAAAAB-wEBAAAAAfwBAQAAAAH9AQEAAAAB_gEBAO0CACH_AQEAAAABgAIBAAAAAYECAQAAAAEL7AEAAO4CADDtAQAAyQIAEO4BAADuAgAw7wEBAO8CACHwAUAA8AIAIfEBAQDxAgAh8gEBAO8CACHzAQIA8gIAIfQBAQDvAgAh9QFAAPACACH2AUAA8AIAIQv3AQEAAAAB-AEBAAAABPkBAQAAAAT6AQEAAAAB-wEBAAAAAfwBAQAAAAH9AQEAAAAB_gEBAO0CACH_AQEAAAABgAIBAAAAAYECAQAAAAEI9wFAAAAAAfgBQAAAAAT5AUAAAAAE-gFAAAAAAfsBQAAAAAH8AUAAAAAB_QFAAAAAAf4BQADrAgAhC_cBAQAAAAH4AQEAAAAF-QEBAAAABfoBAQAAAAH7AQEAAAAB_AEBAAAAAf0BAQAAAAH-AQEA6QIAIf8BAQAAAAGAAgEAAAABgQIBAAAAAQj3AQIAAAAB-AECAAAABPkBAgAAAAT6AQIAAAAB-wECAAAAAfwBAgAAAAH9AQIAAAAB_gECAOUCACEK7AEAAPMCADDtAQAAwwIAEO4BAADzAgAw7wEBAOACACH1AUAA4QIAIYICAQDgAgAhgwIBAOACACGEAgEA4AIAIYUCAgDjAgAhhgIAAPQCACAPFQAA6AIAIBYAAPUCACAXAAD1AgAg9wGAAAAAAfoBgAAAAAH7AYAAAAAB_AGAAAAAAf0BgAAAAAH-AYAAAAABhwIBAAAAAYgCAQAAAAGJAgEAAAABigKAAAAAAYsCgAAAAAGMAoAAAAABDPcBgAAAAAH6AYAAAAAB-wGAAAAAAfwBgAAAAAH9AYAAAAAB_gGAAAAAAYcCAQAAAAGIAgEAAAABiQIBAAAAAYoCgAAAAAGLAoAAAAABjAKAAAAAAQrsAQAA9gIAMO0BAACwAgAQ7gEAAPYCADDvAQEA7wIAIfUBQADwAgAhggIBAO8CACGDAgEA7wIAIYQCAQDvAgAhhQICAPICACGGAgAA9wIAIAz3AYAAAAAB-gGAAAAAAfsBgAAAAAH8AYAAAAAB_QGAAAAAAf4BgAAAAAGHAgEAAAABiAIBAAAAAYkCAQAAAAGKAoAAAAABiwKAAAAAAYwCgAAAAAEM7AEAAPgCADDtAQAAqgIAEO4BAAD4AgAw7wEBAOACACHyAQEA4gIAIfUBQADhAgAhggIBAOACACGGAgAA9AIAII0CAQDgAgAhjgIBAOACACGPAgIA4wIAIZACAQDiAgAhDOwBAAD5AgAw7QEAAJcCABDuAQAA-QIAMO8BAQDvAgAh8gEBAPECACH1AUAA8AIAIYICAQDvAgAhhgIAAPcCACCNAgEA7wIAIY4CAQDvAgAhjwICAPICACGQAgEA8QIAIQjsAQAA-gIAMO0BAACRAgAQ7gEAAPoCADD1AUAA4QIAIfYBQADhAgAhggIBAOACACGRAgIA4wIAIZICAQDgAgAhCOwBAAD7AgAw7QEAAP4BABDuAQAA-wIAMPUBQADwAgAh9gFAAPACACGCAgEA7wIAIZECAgDyAgAhkgIBAO8CACEG7AEAAPwCADDtAQAA-AEAEO4BAAD8AgAw9gFAAOECACGCAgEA4AIAIZMCQADhAgAhBuwBAAD9AgAw7QEAAOUBABDuAQAA_QIAMPYBQADwAgAhggIBAO8CACGTAkAA8AIAIQ_sAQAA_gIAMO0BAADfAQAQ7gEAAP4CADDvAQEA4AIAIfUBQADhAgAhlAIBAOACACGVAgIA4wIAIZYCAgD_AgAhlwIBAOACACGYAgEA4gIAIZkCAQDiAgAhmgIBAOICACGbAgEA4gIAIZwCQACAAwAhnQIBAOICACENFQAA6AIAIBYAAOgCACAXAADoAgAgOAAAhAMAIDkAAOgCACD3AQIAAAAB-AECAAAABfkBAgAAAAX6AQIAAAAB-wECAAAAAfwBAgAAAAH9AQIAAAAB_gECAIMDACELFQAA6AIAIBYAAIIDACAXAACCAwAg9wFAAAAAAfgBQAAAAAX5AUAAAAAF-gFAAAAAAfsBQAAAAAH8AUAAAAAB_QFAAAAAAf4BQACBAwAhCxUAAOgCACAWAACCAwAgFwAAggMAIPcBQAAAAAH4AUAAAAAF-QFAAAAABfoBQAAAAAH7AUAAAAAB_AFAAAAAAf0BQAAAAAH-AUAAgQMAIQj3AUAAAAAB-AFAAAAABfkBQAAAAAX6AUAAAAAB-wFAAAAAAfwBQAAAAAH9AUAAAAAB_gFAAIIDACENFQAA6AIAIBYAAOgCACAXAADoAgAgOAAAhAMAIDkAAOgCACD3AQIAAAAB-AECAAAABfkBAgAAAAX6AQIAAAAB-wECAAAAAfwBAgAAAAH9AQIAAAAB_gECAIMDACEI9wEIAAAAAfgBCAAAAAX5AQgAAAAF-gEIAAAAAfsBCAAAAAH8AQgAAAAB_QEIAAAAAf4BCACEAwAhD-wBAACFAwAw7QEAAMwBABDuAQAAhQMAMO8BAQDvAgAh9QFAAPACACGUAgEA7wIAIZUCAgDyAgAhlgICAIYDACGXAgEA7wIAIZgCAQDxAgAhmQIBAPECACGaAgEA8QIAIZsCAQDxAgAhnAJAAIcDACGdAgEA8QIAIQj3AQIAAAAB-AECAAAABfkBAgAAAAX6AQIAAAAB-wECAAAAAfwBAgAAAAH9AQIAAAAB_gECAOgCACEI9wFAAAAAAfgBQAAAAAX5AUAAAAAF-gFAAAAAAfsBQAAAAAH8AUAAAAAB_QFAAAAAAf4BQACCAwAhEuwBAACIAwAw7QEAAMYBABDuAQAAiAMAMO8BAQDgAgAh9QFAAOECACH2AUAA4QIAIYICAQDgAgAhngICAOMCACGfAgEA4gIAIaACAQDiAgAhoQIBAOACACGiAgAAiQMAIKMCAQDiAgAhpAIBAOACACGlAkAAgAMAIaYCQACAAwAhpwICAP8CACGoAgIA_wIAIQ8VAADlAgAgFgAAigMAIBcAAIoDACD3AYAAAAAB-gGAAAAAAfsBgAAAAAH8AYAAAAAB_QGAAAAAAf4BgAAAAAGHAgEAAAABiAIBAAAAAYkCAQAAAAGKAoAAAAABiwKAAAAAAYwCgAAAAAEM9wGAAAAAAfoBgAAAAAH7AYAAAAAB_AGAAAAAAf0BgAAAAAH-AYAAAAABhwIBAAAAAYgCAQAAAAGJAgEAAAABigKAAAAAAYsCgAAAAAGMAoAAAAABEuwBAACLAwAw7QEAALMBABDuAQAAiwMAMO8BAQDvAgAh9QFAAPACACH2AUAA8AIAIYICAQDvAgAhngICAPICACGfAgEA8QIAIaACAQDxAgAhoQIBAO8CACGiAgAAjAMAIKMCAQDxAgAhpAIBAO8CACGlAkAAhwMAIaYCQACHAwAhpwICAIYDACGoAgIAhgMAIQz3AYAAAAAB-gGAAAAAAfsBgAAAAAH8AYAAAAAB_QGAAAAAAf4BgAAAAAGHAgEAAAABiAIBAAAAAYkCAQAAAAGKAoAAAAABiwKAAAAAAYwCgAAAAAEP7AEAAI0DADDtAQAArQEAEO4BAACNAwAw7wEBAOACACH2AUAA4QIAIYICAQDgAgAhkwJAAIADACGpAgEA4AIAIaoCAQDgAgAhqwIBAOACACGsAgEA4AIAIa0CAQDgAgAhrgIBAOACACGvAkAA4QIAIbACQACAAwAhD-wBAACOAwAw7QEAAJoBABDuAQAAjgMAMO8BAQDvAgAh9gFAAPACACGCAgEA7wIAIZMCQACHAwAhqQIBAO8CACGqAgEA7wIAIasCAQDvAgAhrAIBAO8CACGtAgEA7wIAIa4CAQDvAgAhrwJAAPACACGwAkAAhwMAIQKCAgEAAAABqgIBAAAAAQ7sAQAAkAMAMO0BAACUAQAQ7gEAAJADADDvAQEA4AIAIfUBQADhAgAh9gFAAOECACGRAgIA4wIAIasCAQDgAgAhsgIBAOACACGzAgEA4AIAIbQCAQDgAgAhtQIBAOACACG2AgEA4gIAIbcCIACRAwAhBRUAAOUCACAWAACTAwAgFwAAkwMAIPcBIAAAAAH-ASAAkgMAIQUVAADlAgAgFgAAkwMAIBcAAJMDACD3ASAAAAAB_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-frUBPn-2AT6AAbcBPoEBuQE-ggG7AQKDAbwBP4QBvgE-hQHAAQKGAcEBQIcBwgE-iAHDAT6JAcQBAooBxwFBiwHIAUeMAcoBSI0BywFIjgHOAUiPAc8BSJAB0AFIkQHSAUiSAdQBApMB1QFJlAHXAUiVAdkBApYB2gFKlwHbAUiYAdwBSJkB3QECmgHgAUubAeEBUZwB4wFSnQHkAVKeAecBUp8B6AFSoAHpAVKhAesBUqIB7QECowHuAVOkAfABUqUB8gECpgHzAVSnAfQBUqgB9QFSqQH2AQKqAfkBVasB-gFZrAH8AVqtAf0BWq4BgAJarwGBAlqwAYICWrEBhAJasgGGAgKzAYcCW7QBiQJatQGLAgK2AYwCXLcBjQJauAGOAlq5AY8CAroBkgJduwGTAmO8AZUCZL0BlgJkvgGZAmS_AZoCZMABmwJkwQGdAmTCAZ8CAsMBoAJlxAGiAmTFAaQCAsYBpQJmxwGmAmTIAacCZMkBqAICygGrAmfLAawCbcwBrgJuzQGvAm7OAbICbs8BswJu0AG0Am7RAbYCbtIBuAIC0wG5Am_UAbsCbtUBvQIC1gG-AnDXAb8CbtgBwAJu2QHBAgLaAcQCcdsBxQJ33AHHAnjdAcgCeN4BywJ43wHMAnjgAc0CeOEBzwJ44gHRAgLjAdICeeQB1AJ45QHWAgLmAdcCeucB2AJ46AHZAnjpAdoCAuoB3QJ76wHeAoEB"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer: Buffer2 } = await import("node:buffer");
  const wasmArray = Buffer2.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// ../../web/generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// ../../web/generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// ../../web/lib/app-env.ts
function normalizeRawAppEnv(value) {
  const raw2 = (value ?? "").trim().toLowerCase();
  if (!raw2) return null;
  if (raw2 === "development") return "development";
  if (raw2 === "production") return "production";
  if (raw2 === "preview") return "preview";
  return null;
}
function getAppEnv() {
  const fromEnv = normalizeRawAppEnv(process.env.APP_ENV);
  if (fromEnv) return fromEnv;
  return "production";
}
function isDevelopmentAppEnv() {
  return getAppEnv() === "development";
}

// ../../web/lib/direct-database-url.ts
function normalizePostgresConnectionUrl(connectionString) {
  const raw2 = connectionString.trim();
  const match = raw2.match(/^(postgres(?:ql)?:\/\/)(.+)$/i);
  if (!match) return raw2;
  const [, prefix, rest] = match;
  const queryIdx = rest.indexOf("?");
  const pathAndHost = queryIdx === -1 ? rest : rest.slice(0, queryIdx);
  const query = queryIdx === -1 ? "" : rest.slice(queryIdx);
  const atIdx = pathAndHost.lastIndexOf("@");
  if (atIdx === -1) return raw2;
  const hostPart = pathAndHost.slice(atIdx + 1);
  const userPass = pathAndHost.slice(0, atIdx);
  const colonIdx = userPass.indexOf(":");
  if (colonIdx === -1) return raw2;
  let user = userPass.slice(0, colonIdx);
  let password = userPass.slice(colonIdx + 1);
  try {
    user = decodeURIComponent(user);
    password = decodeURIComponent(password);
  } catch {
  }
  return `${prefix}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostPart}${query}`;
}

// ../../web/lib/prisma.ts
var globalForPrisma = globalThis;
var SSL_MODES_NEEDING_LIBPQ_COMPAT = /* @__PURE__ */ new Set(["require", "prefer", "verify-ca"]);
function normalizePgConnectionString(connectionString) {
  const raw2 = connectionString?.trim();
  if (!raw2) return raw2;
  const encoded = normalizePostgresConnectionUrl(raw2);
  try {
    const u = new URL2(encoded);
    if (u.protocol !== "postgresql:" && u.protocol !== "postgres:") {
      return encoded;
    }
    if (u.hostname.endsWith("supabase.com") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    const mode = u.searchParams.get("sslmode")?.toLowerCase() ?? "";
    if (SSL_MODES_NEEDING_LIBPQ_COMPAT.has(mode) && u.searchParams.get("uselibpqcompat") !== "true") {
      u.searchParams.set("uselibpqcompat", "true");
      return u.href;
    }
    return encoded;
  } catch {
  }
  return encoded;
}
function poolMax(connectionString) {
  const raw2 = connectionString?.trim();
  if (!raw2) return 3;
  try {
    const u = new URL2(raw2);
    if (u.searchParams.get("pgbouncer") === "true") return 1;
    const limit = u.searchParams.get("connection_limit");
    if (limit) return Math.max(1, Number.parseInt(limit, 10) || 1);
    if (u.hostname.includes("supabase.com")) return 1;
    if (u.hostname.includes("neon.tech")) return 1;
  } catch {
  }
  return 3;
}
function pgPoolConfig(connectionString) {
  return {
    connectionString,
    max: poolMax(connectionString),
    connectionTimeoutMillis: 1e4,
    idleTimeoutMillis: 3e4,
    allowExitOnIdle: true
  };
}
function createPrismaClient() {
  const connectionString = normalizePgConnectionString(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg(pgPoolConfig(connectionString));
  return new PrismaClient({
    adapter,
    log: isDevelopmentAppEnv() ? ["error", "warn"] : ["error"]
  });
}
var prisma = globalForPrisma.prisma ?? createPrismaClient();
if (isDevelopmentAppEnv()) {
  globalForPrisma.prisma = prisma;
}

// ../../web/lib/ai-usage-ledger.ts
var isRecord = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));
function resolveTranscriptSummarizeLedgerOperation(chargedUsageUnits) {
  return typeof chargedUsageUnits === "number" && Number.isFinite(chargedUsageUnits) && chargedUsageUnits >= 2 ? "transcript_summarize_meeting" : "transcript_summarize";
}
async function recordAiUsageLedgerEntry(params) {
  if (!process.env.DATABASE_URL?.trim() || params.amount === 0) return null;
  try {
    const row = await prisma.aiUsageLedgerEntry.create({
      data: {
        deviceId: params.deviceId,
        kind: params.kind,
        operation: params.operation ?? "unknown",
        amount: params.amount,
        jobId: params.jobId,
        description: params.description,
        metadata: params.metadata
      },
      select: { id: true }
    });
    return row.id;
  } catch (e) {
    console.error("[ai-usage-ledger]", params.kind, params.operation, e);
    return null;
  }
}
async function updateAiUsageLedgerMetadata(params) {
  if (!process.env.DATABASE_URL?.trim()) return;
  try {
    const existing = await prisma.aiUsageLedgerEntry.findFirst({
      where: {
        deviceId: params.deviceId,
        kind: "debit",
        operation: params.operation,
        ...params.entryId ? { id: params.entryId } : {},
        ...!params.entryId && params.jobId ? { jobId: params.jobId } : {}
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, metadata: true }
    });
    if (!existing) return;
    await prisma.aiUsageLedgerEntry.update({
      where: { id: existing.id },
      data: {
        metadata: {
          ...isRecord(existing.metadata) ? existing.metadata : {},
          ...isRecord(params.metadata) ? params.metadata : {}
        }
      }
    });
  } catch (e) {
    console.error("[ai-usage-ledger:update]", params.operation, e);
  }
}

// ../../web/lib/app-config.ts
var BONUS_APP_CONFIG_KEYS = {
  AI_BONUS_AMOUNT: "AI_BONUS_AMOUNT",
  AI_BONUS_COOLDOWN_SECONDS: "AI_BONUS_COOLDOWN_SECONDS",
  AI_BONUS_COOLDOWN_KEY_PREFIX: "AI_BONUS_COOLDOWN_KEY_PREFIX"
};
var WEEKLY_LIMIT_APP_CONFIG_KEYS = {
  AI_WEEKLY_LIMIT_FREE: "AI_WEEKLY_LIMIT_FREE",
  AI_WEEKLY_LIMIT_PRO: "AI_WEEKLY_LIMIT_PRO"
};
var ALL_MANAGED_KEYS = [
  ...Object.values(BONUS_APP_CONFIG_KEYS),
  ...Object.values(WEEKLY_LIMIT_APP_CONFIG_KEYS)
];
var DEFAULTS = {
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_AMOUNT]: String(AI_BONUS_AMOUNT),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_SECONDS]: String(AI_BONUS_COOLDOWN_SECONDS),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_KEY_PREFIX]: AI_BONUS_COOLDOWN_KEY_PREFIX,
  [WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_FREE]: String(FREE_WEEKLY_LIMIT),
  [WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_PRO]: String(PRO_WEEKLY_LIMIT)
};

// ../../web/lib/pro-entitlement.ts
var PRO_ENTITLEMENT_CACHE_TTL_MS = 6e4;
var proExpiresCache = /* @__PURE__ */ new Map();
async function getProExpiresAtUtc(deviceId) {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }
  const now = Date.now();
  const hit = proExpiresCache.get(deviceId);
  if (hit && now - hit.loadedAt < PRO_ENTITLEMENT_CACHE_TTL_MS) {
    return hit.expiresAt;
  }
  try {
    const row = await prisma.deviceProEntitlement.findUnique({
      where: { deviceId },
      select: { expiresAt: true }
    });
    const expiresAt = row?.expiresAt ?? null;
    proExpiresCache.set(deviceId, { expiresAt, loadedAt: now });
    return expiresAt;
  } catch {
    return null;
  }
}
async function isProDevice(deviceId) {
  const expires = await getProExpiresAtUtc(deviceId);
  const isDev = isDevelopmentAppEnv();
  return isDev || expires != null && expires.getTime() > Date.now();
}

// ../../web/lib/memory-store.ts
var kvStore = /* @__PURE__ */ new Map();
var counterStore = /* @__PURE__ */ new Map();
var cleanupExpired = () => {
  const now = Date.now();
  for (const [k, v] of kvStore) {
    if (v.expiresAt > 0 && v.expiresAt <= now) kvStore.delete(k);
  }
  for (const [k, v] of counterStore) {
    if (v.expiresAt <= now) counterStore.delete(k);
  }
};
var memoryStore = {
  set: async (key, value, options) => {
    const expiresAt = options?.ex ? Date.now() + options.ex * 1e3 : 0;
    kvStore.set(key, { value, expiresAt });
  },
  get: async (key) => {
    cleanupExpired();
    const counterEntry = counterStore.get(key);
    if (counterEntry && counterEntry.expiresAt > Date.now()) {
      return String(counterEntry.count);
    }
    const entry = kvStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      kvStore.delete(key);
      return null;
    }
    return entry.value;
  },
  incr: async (key) => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      counterStore.set(key, { count: 1, expiresAt: now + 6e4 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  },
  incrWithExpireOnFirst: async (key, seconds) => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      counterStore.set(key, { count: 1, expiresAt: now + seconds * 1e3 });
      return 1;
    }
    entry.count += 1;
    return entry.count;
  },
  incrByWithExpireOnFirst: async (key, amount, seconds) => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) {
      counterStore.set(key, { count: amount, expiresAt: now + seconds * 1e3 });
      return amount;
    }
    entry.count += amount;
    return entry.count;
  },
  incrementWithinLimit: async (key, amount, limit, seconds) => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    const current = !entry || entry.expiresAt <= now ? 0 : entry.count;
    if (current + amount > limit) {
      return { allowed: false, value: current };
    }
    const next = current + amount;
    if (!entry || entry.expiresAt <= now) {
      counterStore.set(key, { count: next, expiresAt: now + seconds * 1e3 });
    } else {
      entry.count = next;
    }
    return { allowed: true, value: next };
  },
  decr: async (key) => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) return 0;
    entry.count = Math.max(0, entry.count - 1);
    return entry.count;
  },
  decrBy: async (key, amount) => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) return 0;
    entry.count = Math.max(0, entry.count - amount);
    return entry.count;
  },
  decrByWithFloor: async (key, amount) => {
    cleanupExpired();
    const entry = counterStore.get(key);
    const now = Date.now();
    if (!entry || entry.expiresAt <= now) return { value: 0, delta: 0 };
    const previous = entry.count;
    entry.count = Math.max(0, entry.count - amount);
    return { value: entry.count, delta: previous - entry.count };
  },
  expire: async (key, seconds) => {
    const entry = counterStore.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1e3;
    }
  },
  setIfNotExists: async (key, value, options) => {
    cleanupExpired();
    const entry = kvStore.get(key);
    if (entry && (entry.expiresAt === 0 || entry.expiresAt > Date.now())) {
      return false;
    }
    const expiresAt = options?.ex ? Date.now() + options.ex * 1e3 : 0;
    kvStore.set(key, { value, expiresAt });
    return true;
  },
  del: async (key) => {
    kvStore.delete(key);
    counterStore.delete(key);
  },
  listKeys: async (prefix) => {
    cleanupExpired();
    return Array.from(kvStore.keys()).filter((k) => k.startsWith(prefix));
  }
};

// ../../web/lib/redis-pool.ts
import { Redis } from "@upstash/redis";
var cachedClient = null;
function getClient() {
  if (cachedClient) {
    return cachedClient;
  }
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Redis credentials not configured");
  }
  cachedClient = new Redis({
    url,
    token,
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.min(1e3 * Math.pow(2, retryCount), 3e3)
    }
  });
  return cachedClient;
}
function getClientWithSyncToken(syncToken) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Redis credentials not configured");
  }
  const client = new Redis({
    url,
    token,
    retry: {
      retries: 2,
      backoff: (retryCount) => Math.min(500 * Math.pow(2, retryCount), 2e3)
    }
  });
  client.readYourWritesSyncToken = syncToken;
  return client;
}
var redisPool = {
  getClient,
  getClientWithSyncToken,
  getPoolSize: () => 1,
  // Always 1 in serverless
  isInitialized: () => cachedClient !== null
};
async function executeWithRetry(operation, maxRetries = 3, baseDelay = 100) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error)) {
        throw error;
      }
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        await sleep(delay);
      }
    }
  }
  throw lastError || new Error("Operation failed after retries");
}
function isRetryableError(error) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("timeout") || message.includes("econnreset") || message.includes("econnrefused") || message.includes("network") || message.includes("socket");
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ../../web/lib/redis.ts
var useMemoryStore = !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN;
var kv = useMemoryStore ? memoryStore : {
  async set(key, value, options) {
    const client = redisPool.getClient();
    await client.set(key, value, options?.ex ? { ex: options.ex } : void 0);
  },
  async setIfNotExists(key, value, options) {
    const client = redisPool.getClient();
    const result = await client.set(
      key,
      value,
      options?.ex ? { nx: true, ex: options.ex } : { nx: true }
    );
    return result === "OK";
  },
  async get(key) {
    const client = redisPool.getClient();
    return client.get(key);
  },
  async incr(key) {
    const client = redisPool.getClient();
    return client.incr(key);
  },
  async incrWithExpireOnFirst(key, seconds) {
    const client = redisPool.getClient();
    return client.eval(
      `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`,
      [key],
      [String(seconds)]
    );
  },
  async incrByWithExpireOnFirst(key, amount, seconds) {
    const client = redisPool.getClient();
    return client.eval(
      `
local separator = string.find(ARGV[1], ":")
local amount = tonumber(string.sub(ARGV[1], 1, separator - 1))
local seconds = tonumber(string.sub(ARGV[1], separator + 1))
local previous = tonumber(redis.call("GET", KEYS[1]) or "0")
local count = redis.call("INCRBY", KEYS[1], amount)
if previous == 0 then
  redis.call("EXPIRE", KEYS[1], seconds)
end
return count
`,
      [key],
      [`${amount}:${seconds}`]
    );
  },
  async incrementWithinLimit(key, amount, limit, seconds) {
    const client = redisPool.getClient();
    const raw2 = await client.eval(
      `
local first = string.find(ARGV[1], ":")
local second = string.find(ARGV[1], ":", first + 1)
local amount = tonumber(string.sub(ARGV[1], 1, first - 1))
local limit = tonumber(string.sub(ARGV[1], first + 1, second - 1))
local seconds = tonumber(string.sub(ARGV[1], second + 1))
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
if current + amount > limit then
  return tostring(current) .. ":0"
end
local count = redis.call("INCRBY", KEYS[1], amount)
if current == 0 then
  redis.call("EXPIRE", KEYS[1], seconds)
end
return tostring(count) .. ":1"
`,
      [key],
      [`${amount}:${limit}:${seconds}`]
    );
    const [valueRaw, allowedRaw] = raw2.split(":");
    const value = Number.parseInt(valueRaw ?? "0", 10);
    return {
      allowed: allowedRaw === "1",
      value: Number.isFinite(value) ? value : 0
    };
  },
  async decr(key) {
    const client = redisPool.getClient();
    return client.decr(key);
  },
  async decrBy(key, amount) {
    const client = redisPool.getClient();
    return client.eval(
      `
if redis.call("EXISTS", KEYS[1]) == 0 then
  return 0
end
local ttl = redis.call("TTL", KEYS[1])
local count = redis.call("DECRBY", KEYS[1], ARGV[1])
if count < 0 then
  redis.call("SET", KEYS[1], "0")
  if ttl > 0 then
    redis.call("EXPIRE", KEYS[1], ttl)
  end
  return 0
end
return count
`,
      [key],
      [String(amount)]
    );
  },
  async decrByWithFloor(key, amount) {
    const client = redisPool.getClient();
    const raw2 = await client.eval(
      `
if redis.call("EXISTS", KEYS[1]) == 0 then
  return "0:0"
end
local ttl = redis.call("TTL", KEYS[1])
local previous = tonumber(redis.call("GET", KEYS[1]) or "0")
local count = redis.call("DECRBY", KEYS[1], ARGV[1])
if count < 0 then
  redis.call("SET", KEYS[1], "0")
  if ttl > 0 then
    redis.call("EXPIRE", KEYS[1], ttl)
  end
  return "0:" .. tostring(previous)
end
return tostring(count) .. ":" .. tostring(previous - count)
`,
      [key],
      [String(amount)]
    );
    const [valueRaw, deltaRaw] = raw2.split(":");
    const value = Number.parseInt(valueRaw ?? "0", 10);
    const delta = Number.parseInt(deltaRaw ?? "0", 10);
    return {
      value: Number.isFinite(value) ? value : 0,
      delta: Number.isFinite(delta) ? delta : 0
    };
  },
  async expire(key, seconds) {
    const client = redisPool.getClient();
    await client.expire(key, seconds);
  },
  async del(key) {
    const client = redisPool.getClient();
    await client.del(key);
  }
};
function getMessageKey(id) {
  return `${MESSAGE_KEY_PREFIX}${id}`;
}
async function saveMessage(id, data, ttlSeconds = MESSAGE_TTL_SECONDS) {
  await kv.set(getMessageKey(id), JSON.stringify(data), {
    ex: ttlSeconds
  });
}
async function getMessage(id, syncToken) {
  const key = getMessageKey(id);
  const doGet = async () => {
    if (useMemoryStore) {
      return kv.get(key);
    }
    if (syncToken) {
      const clientWithToken = redisPool.getClientWithSyncToken(syncToken);
      return clientWithToken.get(key);
    }
    return kv.get(key);
  };
  let raw2 = null;
  if (!useMemoryStore && !syncToken) {
    raw2 = await executeWithRetry(
      async () => {
        const result = await doGet();
        if (result === null) {
          return null;
        }
        return result;
      },
      GET_RETRY_ATTEMPTS,
      GET_RETRY_DELAY_MS
    );
  } else {
    raw2 = await doGet();
  }
  if (!raw2) {
    return null;
  }
  try {
    if (typeof raw2 === "object" && raw2 !== null) {
      return raw2;
    }
    return JSON.parse(raw2);
  } catch {
    return null;
  }
}
var redis = kv;

// ../../web/lib/ai-rate-limit.ts
var AI_DEBIT_KEY_PREFIX = "ai_debit:";
var getUsageKey = (deviceId) => `${AI_WEEKLY_KEY_PREFIX}${deviceId}`;
var getPeriodStartKey = (deviceId) => `${AI_PERIOD_START_KEY_PREFIX}${deviceId}`;
var getAutoOrganizeWeeklyKey = (deviceId) => `${AI_AUTO_ORGANIZE_WEEKLY_KEY_PREFIX}${deviceId}`;
var getDebitIdempotencyKey = (deviceId, ledger) => {
  const jobId = ledger?.jobId?.trim();
  const operation = ledger?.operation;
  if (!jobId || !operation) return null;
  return `${AI_DEBIT_KEY_PREFIX}${deviceId}:${operation}:${jobId}`;
};
function computeResetAtFromPeriodStart(periodStartMs) {
  return new Date(periodStartMs + AI_USAGE_PERIOD_MS);
}
var readPeriodStartMs = async (deviceId) => {
  const raw2 = await redis.get(getPeriodStartKey(deviceId));
  if (!raw2) return null;
  const ms = parseInt(raw2, 10);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};
var resetPeriodCounters = async (deviceId) => {
  await redis.set(getUsageKey(deviceId), "0");
  await redis.set(getAutoOrganizeWeeklyKey(deviceId), "0");
};
var rolloverPeriodIfNeeded = async (deviceId, periodStartMs, nowMs) => {
  if (nowMs < periodStartMs + AI_USAGE_PERIOD_MS) {
    return periodStartMs;
  }
  const elapsedPeriods = Math.floor((nowMs - periodStartMs) / AI_USAGE_PERIOD_MS);
  const newStart = periodStartMs + elapsedPeriods * AI_USAGE_PERIOD_MS;
  await redis.set(getPeriodStartKey(deviceId), String(newStart));
  await resetPeriodCounters(deviceId);
  return newStart;
};
async function resolveDeviceUsagePeriod(deviceId, nowMs = Date.now()) {
  const usageKey = getUsageKey(deviceId);
  const periodStartMs = await readPeriodStartMs(deviceId);
  if (periodStartMs === null) {
    return {
      periodStartMs: null,
      resetAt: new Date(nowMs + AI_USAGE_PERIOD_MS),
      usageKey,
      hasStarted: false
    };
  }
  const activeStart = await rolloverPeriodIfNeeded(deviceId, periodStartMs, nowMs);
  return {
    periodStartMs: activeStart,
    resetAt: computeResetAtFromPeriodStart(activeStart),
    usageKey,
    hasStarted: true
  };
}
var decrement = async (deviceId, ledger) => {
  await decrementBy(deviceId, 1, ledger);
};
var decrementBy = async (deviceId, units, ledger) => {
  const amount = Math.max(1, Math.floor(units));
  const period = await resolveDeviceUsagePeriod(deviceId);
  if (!period.hasStarted) return;
  const refunded = (await redis.decrByWithFloor(period.usageKey, amount)).delta;
  const debitKey = getDebitIdempotencyKey(deviceId, ledger);
  if (debitKey) {
    await redis.del(debitKey);
  }
  await recordAiUsageLedgerEntry({
    deviceId,
    kind: "refund",
    operation: ledger?.operation,
    amount: refunded,
    jobId: ledger?.jobId,
    description: ledger?.description,
    metadata: ledger?.metadata
  });
};

// ../../web/lib/ai-model-fallback.ts
import {
  ServiceUnavailableResponseError,
  TooManyRequestsResponseError
} from "@openrouter/sdk/models/errors";
var RETRYABLE_OPENROUTER_ERROR_NAMES = /* @__PURE__ */ new Set([
  "BadGatewayResponseError",
  "GatewayTimeoutResponseError",
  "InternalServerResponseError"
]);
function isJsonObjectResponseFormatUnsupported(err) {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("json_object response format is not supported");
}
function isOpenRouterProviderRoutingError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/OpenRouter stream error:\s*Forbidden/i.test(msg)) return true;
  if (/OpenRouter chat failed \(403\)/i.test(msg)) return true;
  if (/No allowed providers are available for the selected model/i.test(msg)) return true;
  if (/permission_denied/i.test(msg)) return true;
  return false;
}
function isRetryableOpenRouterTransportError(err) {
  if (err instanceof TooManyRequestsResponseError || err instanceof ServiceUnavailableResponseError) {
    return true;
  }
  if (isJsonObjectResponseFormatUnsupported(err)) {
    return true;
  }
  if (isOpenRouterProviderRoutingError(err)) {
    return true;
  }
  return err instanceof Error && RETRYABLE_OPENROUTER_ERROR_NAMES.has(err.name);
}
function dedupeAiModels(models) {
  const seen = /* @__PURE__ */ new Set();
  return models.map((m) => m.trim()).filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}
async function withSequentialModelFallback(models, run, shouldTryNextAfterError) {
  const list = dedupeAiModels(models);
  if (list.length === 0) {
    throw new Error("withSequentialModelFallback: no models");
  }
  let lastErr;
  for (let i = 0; i < list.length; i++) {
    try {
      return await run(list[i]);
    } catch (e) {
      lastErr = e;
      if (i === list.length - 1) {
        throw e;
      }
      if (!shouldTryNextAfterError(e)) {
        throw e;
      }
    }
  }
  throw lastErr;
}

// ../../web/lib/deepseek.ts
import OpenAI from "openai";
var DEEPSEEK_API_MODEL_V4_FLASH = "deepseek-v4-flash";
var DEEPSEEK_API_MODEL_V4_PRO = "deepseek-v4-pro";
var DEEPSEEK_CATALOG_TO_API_MODEL = {
  [AI_MODEL_DEEPSEEK_V4_FLASH]: DEEPSEEK_API_MODEL_V4_FLASH,
  [AI_MODEL_DEEPSEEK_V4_PRO]: DEEPSEEK_API_MODEL_V4_PRO
};
function resolveDeepSeekApiModel(catalogModel) {
  const canonical = normalizeIncomingAiModel(catalogModel.trim());
  const apiModel = DEEPSEEK_CATALOG_TO_API_MODEL[canonical];
  if (!apiModel) {
    throw new DeepSeekApiError(`Unsupported DeepSeek catalog model: ${catalogModel}`);
  }
  return apiModel;
}
var DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
var DEFAULT_DEEPSEEK_MAX_TOKENS = 32768;
var DeepSeekApiError = class extends Error {
  constructor(message, status) {
    super(message);
    this.name = "DeepSeekApiError";
    this.status = status;
  }
};
var cachedClient2 = null;
var cachedClientKey = null;
function readDeepSeekMaxTokens() {
  const raw2 = process.env.DEEPSEEK_MAX_TOKENS;
  if (typeof raw2 !== "string" || !raw2.trim()) {
    return DEFAULT_DEEPSEEK_MAX_TOKENS;
  }
  const n = Number.parseInt(raw2.trim(), 10);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_DEEPSEEK_MAX_TOKENS;
  }
  return n;
}
function deepSeekBaseUrl() {
  const fromEnv = process.env.DEEPSEEK_BASE_URL?.trim();
  return (fromEnv || DEFAULT_DEEPSEEK_BASE_URL).replace(/\/$/, "");
}
function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new DeepSeekApiError("DEEPSEEK_API_KEY is not configured");
  }
  const baseURL = deepSeekBaseUrl();
  const cacheKey = `${baseURL}\0${apiKey}`;
  if (cachedClient2 && cachedClientKey === cacheKey) {
    return cachedClient2;
  }
  cachedClient2 = new OpenAI({ apiKey, baseURL });
  cachedClientKey = cacheKey;
  return cachedClient2;
}
function normalizeDeepSeekUserId(deviceId) {
  if (typeof deviceId !== "string") {
    return void 0;
  }
  const trimmed = deviceId.trim().slice(0, 512);
  if (!trimmed) {
    return void 0;
  }
  const sanitized = trimmed.replace(/[^a-zA-Z0-9\-_]/g, "_");
  return sanitized || void 0;
}
function deepSeekDirectApiConfigured() {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}
function isDeepSeekOpenRouterModel(model) {
  const canonical = normalizeIncomingAiModel(model.trim());
  return canonical in DEEPSEEK_CATALOG_TO_API_MODEL;
}
function isRetryableDeepSeekTransportError(err) {
  if (err instanceof DeepSeekApiError) {
    const s = err.status;
    return s === 429 || s === 500 || s === 502 || s === 503 || s === 504;
  }
  if (err instanceof OpenAI.APIError) {
    const s = err.status;
    return s === 429 || s === 500 || s === 502 || s === 503 || s === 504;
  }
  return err instanceof TypeError;
}
function mapOpenAiError(err) {
  if (err instanceof OpenAI.APIError) {
    throw new DeepSeekApiError(err.message, err.status);
  }
  throw err;
}
function readAssistantMessage(response) {
  const choice = response.choices[0];
  if (!choice?.message) {
    throw new DeepSeekApiError("DeepSeek API response missing message");
  }
  const msg = choice.message;
  const content = typeof msg.content === "string" ? msg.content.trim() : "";
  const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : void 0;
  if (!content && !toolCalls?.length) {
    throw new DeepSeekApiError("DeepSeek API returned empty content");
  }
  return {
    message: msg,
    content,
    ...toolCalls?.length ? { toolCalls } : {},
    finishReason: choice.finish_reason ?? null
  };
}
async function deepSeekChatCompletion(params) {
  const client = getDeepSeekClient();
  const thinkingType = params.withReasoning ? "enabled" : "disabled";
  const userId = normalizeDeepSeekUserId(params.userId);
  const request = {
    model: resolveDeepSeekApiModel(params.model),
    messages: params.messages,
    stream: false,
    max_tokens: readDeepSeekMaxTokens(),
    thinking: { type: thinkingType },
    ...params.jsonObject ? { response_format: { type: "json_object" } } : {},
    ...params.tools?.length ? { tools: params.tools } : {},
    ...params.toolChoice ? { tool_choice: params.toolChoice } : {},
    ...params.withReasoning ? { reasoning_effort: "high" } : {},
    ...userId ? { user_id: userId } : {}
  };
  let response;
  try {
    response = await client.chat.completions.create(request);
  } catch (err) {
    mapOpenAiError(err);
  }
  const { message, content, toolCalls, finishReason } = readAssistantMessage(response);
  if (finishReason === "length") {
    throw new DeepSeekApiError("DeepSeek API output truncated (finish_reason=length)");
  }
  return {
    message,
    content,
    ...toolCalls?.length ? { toolCalls } : {},
    raw: response
  };
}

// ../../web/lib/openrouter-recovery.ts
var OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";
var OPENROUTER_GENERATION_ID_HEADER = "x-generation-id";
function openRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || void 0;
}
function pendingGenerationKey(jobId) {
  return `${OPENROUTER_PENDING_GENERATION_KEY_PREFIX}${jobId}`;
}
async function saveOpenRouterPendingGeneration(jobId, generationId, ttlSeconds = OPENROUTER_PENDING_GENERATION_TTL_SECONDS) {
  const id = generationId.trim();
  if (!jobId.trim() || !id) return;
  await redis.set(pendingGenerationKey(jobId), id, { ex: ttlSeconds });
}
async function getOpenRouterPendingGeneration(jobId) {
  const raw2 = await redis.get(pendingGenerationKey(jobId));
  if (typeof raw2 !== "string") return null;
  const id = raw2.trim();
  return id || null;
}
async function clearOpenRouterPendingGeneration(jobId) {
  await redis.del(pendingGenerationKey(jobId));
}
function readOpenRouterGenerationId(headers) {
  const fromHeader = headers.get(OPENROUTER_GENERATION_ID_HEADER) ?? headers.get("X-Generation-Id");
  const id = fromHeader?.trim();
  return id || void 0;
}
function isOpenRouterRecoverableTransportError(err) {
  if (!(err instanceof Error)) return false;
  const name = err.name;
  if (name === "AbortError" || name === "TimeoutError" || name === "TypeError" || name === "FetchError") {
    return true;
  }
  const msg = err.message.toLowerCase();
  return msg.includes("fetch failed") || msg.includes("network") || msg.includes("terminated") || msg.includes("aborted") || msg.includes("timeout") || msg.includes("econnreset") || msg.includes("socket");
}
function sleep2(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function readStringField(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function parseGenerationContentOutput(output) {
  if (typeof output === "string") {
    const content = output.trim();
    return content ? { content } : null;
  }
  if (!output || typeof output !== "object") return null;
  const row = output;
  const directContent = readStringField(row.content);
  if (directContent) {
    return {
      content: directContent,
      reasoning: readStringField(row.reasoning)
    };
  }
  const text = readStringField(row.text);
  if (text) {
    return { content: text, reasoning: readStringField(row.reasoning) };
  }
  const choices = row.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const choice = choices[0];
    const message = choice.message && typeof choice.message === "object" ? choice.message : null;
    if (message) {
      const content = readStringField(message.content);
      if (content) {
        return {
          content,
          reasoning: readStringField(message.reasoning)
        };
      }
    }
    const delta = choice.delta && typeof choice.delta === "object" ? choice.delta : null;
    if (delta) {
      const content = readStringField(delta.content);
      if (content) {
        return { content, reasoning: readStringField(delta.reasoning) };
      }
    }
  }
  return null;
}
function buildRecoveredCompletion(generationId, model, parsed) {
  const message = {
    role: "assistant",
    content: parsed.content,
    ...parsed.reasoning ? { reasoning: parsed.reasoning } : {}
  };
  const raw2 = {
    id: generationId,
    object: "chat.completion",
    model,
    choices: [{ index: 0, message, finish_reason: "stop" }],
    recovered: true
  };
  return { content: parsed.content, message, raw: raw2 };
}
async function fetchOpenRouterGenerationContent(generationId) {
  const apiKey = openRouterApiKey();
  if (!apiKey) return null;
  const url = new URL(`${OPENROUTER_API_BASE}/generation/content`);
  url.searchParams.set("id", generationId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter generation content failed (${response.status}): ${body.slice(0, 200)}`
    );
  }
  const json = await response.json();
  if (!json || typeof json !== "object") return null;
  const data = json.data;
  if (!data || typeof data !== "object") return null;
  const output = data.output;
  const parsed = parseGenerationContentOutput(output);
  if (!parsed) return null;
  let model = "unknown";
  try {
    const metaUrl = new URL(`${OPENROUTER_API_BASE}/generation`);
    metaUrl.searchParams.set("id", generationId);
    const metaRes = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    if (metaRes.ok) {
      const metaJson = await metaRes.json();
      if (typeof metaJson.data?.model === "string" && metaJson.data.model.trim()) {
        model = metaJson.data.model.trim();
      }
    }
  } catch {
  }
  return buildRecoveredCompletion(generationId, model, parsed);
}
async function pollOpenRouterGenerationContent(generationId, options) {
  const maxWaitMs = options?.maxWaitMs ?? OPENROUTER_GENERATION_RECOVERY_MAX_WAIT_MS;
  const intervalMs = options?.intervalMs ?? OPENROUTER_GENERATION_RECOVERY_POLL_INTERVAL_MS;
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const result = await fetchOpenRouterGenerationContent(generationId);
      if (result) return result;
    } catch (err) {
      console.warn("[OpenRouter recovery] poll error", {
        generationId,
        error: err instanceof Error ? err.message : String(err)
      });
    }
    await sleep2(intervalMs);
  }
  return null;
}
async function tryRecoverOpenRouterPendingGeneration(jobId, options) {
  const generationId = await getOpenRouterPendingGeneration(jobId);
  if (!generationId) return null;
  console.info("[OpenRouter recovery] resuming pending generation", { jobId, generationId });
  const recovered = await pollOpenRouterGenerationContent(generationId, options);
  if (recovered) {
    await clearOpenRouterPendingGeneration(jobId);
    console.info("[OpenRouter recovery] recovered from pending generation", {
      jobId,
      generationId
    });
  }
  return recovered;
}

// ../../web/lib/ai-job-retry.ts
function isRetryableAiJobError(err) {
  if (isOpenRouterRecoverableTransportError(err) || isRetryableOpenRouterTransportError(err) || isRetryableDeepSeekTransportError(err)) {
    return true;
  }
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  if (msg.includes("Job payload missing or operation mismatch")) return true;
  if (/OpenRouter chat failed \((408|429|502|503|524)\)/.test(msg)) return true;
  if (/OpenRouter stream error/i.test(msg)) return true;
  return false;
}

// ../../web/lib/ai-job-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
var aiJobRunContext = new AsyncLocalStorage();
function getAiJobRunContext() {
  return aiJobRunContext.getStore();
}

// ../../web/lib/openrouter-reasoning.ts
var OPENROUTER_REASONING_CAPABLE_MODEL_IDS = /* @__PURE__ */ new Set([
  "google/gemini-2.5-flash-lite",
  "google/gemini-3.1-flash-lite",
  "openai/gpt-5.4-nano",
  "xiaomi/mimo-v2.5-pro",
  "minimax/minimax-m3",
  "minimax/minimax-m2.7",
  "nvidia/nemotron-3-super-120b-a12b"
]);
var SUMMARY_REASONING_MAX_CHARS = 24e3;
function openRouterModelSupportsReasoning(model) {
  return OPENROUTER_REASONING_CAPABLE_MODEL_IDS.has(normalizeIncomingAiModel(model.trim()));
}
function openRouterReasoningParamsForModel(model) {
  return openRouterModelSupportsReasoning(model) ? { effort: "low" } : void 0;
}
function readReasoningDetailText(item) {
  if (!item || typeof item !== "object") return "";
  const row = item;
  if (typeof row.text === "string" && row.text.trim()) {
    return row.text.trim();
  }
  if (typeof row.summary === "string" && row.summary.trim()) {
    return row.summary.trim();
  }
  return "";
}
function extractOpenRouterReasoning(message) {
  if (!message || typeof message !== "object") {
    return void 0;
  }
  const row = message;
  const direct = row.reasoning;
  if (typeof direct === "string" && direct.trim()) {
    return clampReasoningText(direct.trim());
  }
  const details = row.reasoning_details;
  if (Array.isArray(details)) {
    const parts = details.map(readReasoningDetailText).filter(Boolean);
    const joined = parts.join("\n\n").trim();
    if (joined) {
      return clampReasoningText(joined);
    }
  }
  return void 0;
}
function clampReasoningText(text) {
  if (text.length <= SUMMARY_REASONING_MAX_CHARS) {
    return text;
  }
  return `${text.slice(0, SUMMARY_REASONING_MAX_CHARS)}
\u2026`;
}

// ../../web/lib/openrouter-provider.ts
function openRouterProviderParamsForModel(model) {
  const id = normalizeIncomingAiModel(model.trim());
  if (/^openai\/gpt-5\.4/i.test(id)) {
    return { only: ["OpenAI"] };
  }
  if (id === AI_MODEL_MINIMAX_M3 || id === AI_MODEL_MIMO_V2_5) {
    return {};
  }
  if (id === LEGACY_AI_MODEL_MINIMAX_M2_7) {
    return { zdr: true };
  }
  if (/^deepseek\//i.test(id)) {
    return {};
  }
  return { zdr: true };
}

// ../../web/lib/openrouter-response-format.ts
function openRouterJsonObjectResponseFormat() {
  return { type: "json_object" };
}

// ../../web/lib/openrouter.ts
import { OpenRouter } from "@openrouter/sdk";
var MAX_CLIENT_USER_AGENT_LEN = 512;
function normalizeClientUserAgent(ua) {
  if (typeof ua !== "string") {
    return void 0;
  }
  const t = ua.trim();
  if (!t) {
    return void 0;
  }
  return t.length > MAX_CLIENT_USER_AGENT_LEN ? t.slice(0, MAX_CLIENT_USER_AGENT_LEN) : t;
}

// ../../web/lib/openrouter-chat.ts
var OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
function resolveOpenRouterUserParam(deviceId) {
  const ctx = getAiJobRunContext();
  if (ctx?.jobId) {
    return `vi:${ctx.jobId}`;
  }
  const id = deviceId?.trim();
  return id || void 0;
}
function openRouterApiKey2() {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return key;
}
function buildRequestBody(params) {
  const model = params.model.trim();
  const reasoning = params.withReasoning && openRouterModelSupportsReasoning(model) ? openRouterReasoningParamsForModel(model) : void 0;
  const user = resolveOpenRouterUserParam(params.userId);
  return {
    model,
    messages: params.messages,
    stream: true,
    provider: openRouterProviderParamsForModel(model),
    ...params.jsonObject ? { response_format: openRouterJsonObjectResponseFormat() } : {},
    ...params.tools?.length ? { tools: params.tools } : {},
    ...params.toolChoice ? { tool_choice: params.toolChoice } : {},
    ...params.temperature != null ? { temperature: params.temperature } : {},
    ...reasoning ? { reasoning } : {},
    ...user ? { user } : {}
  };
}
function buildRequestHeaders(clientUserAgent) {
  const headers = new Headers({
    Authorization: `Bearer ${openRouterApiKey2()}`,
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "HTTP-Referer": BASE_URL_OR_FALLBACK,
    "X-OpenRouter-Title": "Voice Inbox AI"
  });
  const ua = normalizeClientUserAgent(clientUserAgent);
  if (ua) {
    headers.set("User-Agent", ua);
  }
  return headers;
}
function appendDeltaText(target, delta) {
  if (typeof delta !== "string" || !delta) return target;
  return target + delta;
}
function readStreamChunkError(chunk) {
  const error = chunk.error;
  if (!error || typeof error !== "object") return void 0;
  const message = error.message;
  return typeof message === "string" && message.trim() ? message.trim() : void 0;
}
function applyStreamChunk(accum, chunk) {
  const streamError = readStreamChunkError(chunk);
  if (streamError) {
    throw new Error(`OpenRouter stream error: ${streamError}`);
  }
  if (typeof chunk.id === "string" && chunk.id.trim()) {
    accum.generationId = chunk.id.trim();
  }
  if (typeof chunk.model === "string" && chunk.model.trim()) {
    accum.model = chunk.model.trim();
  }
  if (chunk.usage) {
    accum.usage = chunk.usage;
  }
  const choices = chunk.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") return;
  const choice = choices[0];
  const delta = choice.delta && typeof choice.delta === "object" ? choice.delta : null;
  if (!delta) return;
  accum.content = appendDeltaText(accum.content, delta.content);
  accum.reasoning = appendDeltaText(accum.reasoning, delta.reasoning);
}
function parseSseJsonPayload(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}
async function readOpenRouterSseStream(body, onGenerationId) {
  const accum = { content: "", reasoning: "" };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const chunk = parseSseJsonPayload(line);
        if (!chunk) continue;
        applyStreamChunk(accum, chunk);
        if (accum.generationId && onGenerationId) {
          await onGenerationId(accum.generationId);
        }
      }
    }
    if (buffer.trim()) {
      const chunk = parseSseJsonPayload(buffer);
      if (chunk) {
        applyStreamChunk(accum, chunk);
        if (accum.generationId && onGenerationId) {
          await onGenerationId(accum.generationId);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return accum;
}
function streamResultToCompletion(accum, model) {
  const content = accum.content.trim();
  if (!content) {
    throw new Error("Invalid AI response: missing content");
  }
  const message = {
    role: "assistant",
    content,
    ...accum.reasoning.trim() ? { reasoning: accum.reasoning.trim() } : {}
  };
  const raw2 = {
    id: accum.generationId ?? "unknown",
    object: "chat.completion",
    model: accum.model ?? model,
    choices: [{ index: 0, message, finish_reason: "stop" }],
    ...accum.usage ? { usage: accum.usage } : {}
  };
  return { content, message, raw: raw2 };
}
function recoveredToCompletion(recovered) {
  return {
    content: recovered.content,
    message: recovered.message,
    raw: recovered.raw
  };
}
async function sendOpenRouterNonStreamingChatCompletion(params) {
  const headers = buildRequestHeaders(params.clientUserAgent);
  headers.set("Accept", "application/json");
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...buildRequestBody(params), stream: false })
  });
  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`OpenRouter chat failed (${response.status}): ${errBody.slice(0, 300)}`);
  }
  const raw2 = await response.json();
  const choices = Array.isArray(raw2.choices) ? raw2.choices : [];
  const first = choices[0];
  const message = first && typeof first === "object" && "message" in first ? first.message : void 0;
  const msg = message && typeof message === "object" ? message : {};
  const content = typeof msg.content === "string" ? msg.content.trim() : "";
  const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : void 0;
  if (!content && !toolCalls?.length) {
    throw new Error("Invalid AI response: missing content");
  }
  return {
    content,
    message: msg,
    ...toolCalls?.length ? { toolCalls } : {},
    raw: raw2
  };
}
async function persistGenerationIdForJob(generationId) {
  const ctx = getAiJobRunContext();
  if (!ctx) return;
  await saveOpenRouterPendingGeneration(ctx.jobId, generationId, ctx.messageTtlSeconds);
}
async function tryRecoverByGenerationId(generationId, model) {
  const recovered = await pollOpenRouterGenerationContent(generationId);
  if (!recovered) return null;
  const ctx = getAiJobRunContext();
  if (ctx) {
    await clearOpenRouterPendingGeneration(ctx.jobId);
  }
  console.info("[OpenRouter recovery] recovered after transport failure", {
    jobId: ctx?.jobId,
    generationId,
    model
  });
  return recoveredToCompletion(recovered);
}
async function sendOpenRouterChatCompletion(params) {
  const model = params.model.trim();
  const jobCtx = getAiJobRunContext();
  if (params.tools?.length) {
    return sendOpenRouterNonStreamingChatCompletion(params);
  }
  if (jobCtx) {
    const pending = await tryRecoverOpenRouterPendingGeneration(jobCtx.jobId);
    if (pending) {
      return recoveredToCompletion(pending);
    }
  }
  let generationIdFromHeaders;
  let savedGenerationId = false;
  const saveGenerationIdOnce = async (generationId) => {
    if (savedGenerationId) return;
    savedGenerationId = true;
    generationIdFromHeaders = generationId;
    await persistGenerationIdForJob(generationId);
  };
  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: buildRequestHeaders(params.clientUserAgent),
      body: JSON.stringify(buildRequestBody(params))
    });
    const headerGenerationId = readOpenRouterGenerationId(response.headers);
    if (headerGenerationId) {
      await saveGenerationIdOnce(headerGenerationId);
    }
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      const err = new Error(
        `OpenRouter chat failed (${response.status}): ${errBody.slice(0, 300)}`
      );
      if (headerGenerationId) {
        const recovered = await tryRecoverByGenerationId(headerGenerationId, model);
        if (recovered) return recovered;
      }
      throw err;
    }
    if (!response.body) {
      throw new Error("OpenRouter chat failed: empty response body");
    }
    const accum = await readOpenRouterSseStream(response.body, saveGenerationIdOnce);
    const generationId = accum.generationId ?? generationIdFromHeaders;
    if (generationId && jobCtx) {
      await clearOpenRouterPendingGeneration(jobCtx.jobId);
    }
    return streamResultToCompletion(accum, model);
  } catch (err) {
    const generationId = generationIdFromHeaders;
    if (generationId && isOpenRouterRecoverableTransportError(err)) {
      const recovered = await tryRecoverByGenerationId(generationId, model);
      if (recovered) return recovered;
    }
    if (jobCtx && isOpenRouterRecoverableTransportError(err)) {
      const pending = await tryRecoverOpenRouterPendingGeneration(jobCtx.jobId, {
        maxWaitMs: OPENROUTER_GENERATION_RECOVERY_MAX_WAIT_MS
      });
      if (pending) {
        return recoveredToCompletion(pending);
      }
    }
    throw err;
  }
}

// ../../web/lib/ai-chat.ts
function filterModelsForAiChat(models) {
  return models.filter((m) => !isDeepSeekOpenRouterModel(m) || deepSeekDirectApiConfigured());
}
function isRetryableAiChatTransportError(err) {
  return isRetryableOpenRouterTransportError(err) || isRetryableDeepSeekTransportError(err);
}
async function sendAiChatCompletion(params) {
  const model = params.model.trim();
  if (isDeepSeekOpenRouterModel(model)) {
    if (!deepSeekDirectApiConfigured()) {
      throw new Error("DEEPSEEK_API_KEY is required for DeepSeek models");
    }
    const { content, message, toolCalls, raw: raw2 } = await deepSeekChatCompletion({
      model,
      messages: params.messages,
      jsonObject: params.jsonObject,
      withReasoning: params.withReasoning,
      tools: params.tools,
      toolChoice: params.toolChoice,
      userId: params.userId
    });
    return { content, message, ...toolCalls?.length ? { toolCalls } : {}, raw: raw2 };
  }
  return sendOpenRouterChatCompletion({
    model,
    messages: params.messages,
    jsonObject: params.jsonObject,
    withReasoning: params.withReasoning,
    tools: params.tools,
    toolChoice: params.toolChoice,
    temperature: params.temperature,
    clientUserAgent: params.clientUserAgent,
    userId: params.userId
  });
}

// ../../web/lib/deepseek-reasoning.ts
function extractDeepSeekReasoning(message) {
  if (!message || typeof message !== "object") {
    return void 0;
  }
  const row = message;
  const direct = row.reasoning_content;
  if (typeof direct === "string" && direct.trim()) {
    return clampReasoningText(direct.trim());
  }
  return void 0;
}

// ../../web/lib/openrouter-token-usage.ts
function readNonNegativeInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return void 0;
  }
  return Math.floor(value);
}
function extractOpenRouterTokenUsage(response) {
  if (!response || typeof response !== "object") {
    return void 0;
  }
  const usage = response.usage;
  if (!usage || typeof usage !== "object") {
    return void 0;
  }
  const row = usage;
  const prompt = readNonNegativeInt(row.prompt_tokens) ?? readNonNegativeInt(row.promptTokens);
  const completion = readNonNegativeInt(row.completion_tokens) ?? readNonNegativeInt(row.completionTokens);
  if (prompt == null || completion == null) {
    return void 0;
  }
  return { prompt, completion };
}
function mergeOpenRouterTokenUsage(a, b) {
  if (!a && !b) {
    return void 0;
  }
  return {
    prompt: (a?.prompt ?? 0) + (b?.prompt ?? 0),
    completion: (a?.completion ?? 0) + (b?.completion ?? 0)
  };
}

// ../../web/lib/timeout.ts
var TimeoutError = class extends Error {
  constructor(message, timeoutMs) {
    super(message);
    this.timeoutMs = timeoutMs;
    this.name = "TimeoutError";
  }
};
async function withTimeout(promise, timeoutMs, errorMessage = "Operation timed out") {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(`${errorMessage} (${timeoutMs}ms)`, timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}
function aiProcessingTimeoutMs() {
  return getAiJobProcessingTimeoutMs();
}
var TIMEOUTS = {
  get AI_PROCESSING() {
    return aiProcessingTimeoutMs();
  },
  get AI_CHAT() {
    return aiProcessingTimeoutMs();
  },
  DATABASE_QUERY: 3e4,
  // 30 seconds
  DATABASE_TRANSACTION: 6e4,
  // 1 minute
  REDIS_OPERATION: 5e3,
  // 5 seconds
  EXTERNAL_API: 3e4,
  // 30 seconds
  WEBHOOK: 15e3
  // 15 seconds
};

// ../../web/lib/auto-organize-input-limits.ts
var AUTO_ORGANIZE_MAX_TRANSCRIPT_CHARS = 900;
var AUTO_ORGANIZE_TRANSCRIPT_HINT_MAX_CHARS = 280;
var AUTO_ORGANIZE_MAX_SUMMARY_CHARS = 360;
var AUTO_ORGANIZE_MAX_TITLE_CHARS = 100;
var EXCERPT_GAP = "\n\u2026\n";
function smartTranscriptExcerpt(text, maxChars) {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  if (maxChars <= EXCERPT_GAP.length + 2) return t.slice(0, maxChars);
  const budget = maxChars - EXCERPT_GAP.length;
  const headLen = Math.ceil(budget / 2);
  const tailLen = Math.floor(budget / 2);
  return `${t.slice(0, headLen)}${EXCERPT_GAP}${t.slice(-tailLen)}`;
}

// ../../web/lib/folder-accent-colors.ts
var AUTO_ORGANIZE_FOLDER_COLOR_HEXES = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#c026d3",
  "#f43f5e",
  "#ea580c",
  "#d97706",
  "#10b981",
  "#06b6d4"
];
var DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR = "#3b82f6";
var CANON_LOWER = new Set(AUTO_ORGANIZE_FOLDER_COLOR_HEXES.map((h) => h.toLowerCase()));
var DARK_ALIASES = {
  "#e879f9": "#c026d3",
  "#fb923c": "#ea580c",
  "#fbbf24": "#d97706"
};
function parseRgb(hex) {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16)
    };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
}
function dist2(a, b) {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}
var CANON_TO_DARK_VARIANTS = {
  "#c026d3": ["#e879f9"],
  "#ea580c": ["#fb923c"],
  "#d97706": ["#fbbf24"]
};
function nearestCanonHex(raw2) {
  const rgb = parseRgb(raw2);
  if (!rgb) return DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR;
  let best = DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR;
  let bestD = Infinity;
  for (const canon of AUTO_ORGANIZE_FOLDER_COLOR_HEXES) {
    const toTry = [canon, ...CANON_TO_DARK_VARIANTS[canon] ?? []];
    for (const v of toTry) {
      const p = parseRgb(v);
      if (!p) continue;
      const d = dist2(rgb, p);
      if (d < bestD) {
        bestD = d;
        best = canon;
      }
    }
  }
  return best;
}
function normalizeAutoOrganizeFolderColor(input) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return DEFAULT_AUTO_ORGANIZE_FOLDER_COLOR;
  if (CANON_LOWER.has(trimmed)) return trimmed;
  const alias = DARK_ALIASES[trimmed];
  if (alias) return alias;
  return nearestCanonHex(trimmed);
}
function formatAutoOrganizeFolderColorsPromptBlock() {
  return AUTO_ORGANIZE_FOLDER_COLOR_HEXES.map((c) => `- ${c}`).join("\n");
}

// ../../web/lib/auto-organize-parse.ts
var ALLOWED_FOLDER_ICONS = /* @__PURE__ */ new Set([
  "briefcase",
  "home",
  "lightbulb",
  "music",
  "star",
  "heart",
  "plane",
  "rocket",
  "palette",
  "flame",
  "globe",
  "graduation"
]);
var DEFAULT_AUTO_FOLDER_ICON = "briefcase";
function extractJsonObject(rawContent) {
  const trimmed = rawContent.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const objectSlice = (() => {
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return withoutFences;
    return withoutFences.slice(start, end + 1);
  })();
  try {
    return JSON.parse(objectSlice);
  } catch {
    throw new Error("Invalid AI response: malformed JSON");
  }
}
function normalizeFolderIcon(icon) {
  return typeof icon === "string" && ALLOWED_FOLDER_ICONS.has(icon.trim()) ? icon.trim() : DEFAULT_AUTO_FOLDER_ICON;
}
function normalizeFolderColor(color) {
  return normalizeAutoOrganizeFolderColor(typeof color === "string" ? color : "").toLowerCase();
}
function parseAutoOrganizeFoldersResult(rawContent, mode = "full") {
  const parsed = extractJsonObject(rawContent);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid AI response: expected object");
  }
  const obj = parsed;
  if (!Array.isArray(obj.assignments)) {
    throw new Error("Invalid AI response: missing assignments");
  }
  if (mode === "assign_existing") {
    if (!Array.isArray(obj.folders) || obj.folders.length > 0) {
      throw new Error("Invalid AI response: assign_existing requires empty folders");
    }
  } else if (!Array.isArray(obj.folders)) {
    throw new Error("Invalid AI response: missing folders");
  }
  const folderRows = mode === "assign_existing" ? [] : (obj.folders ?? []).map((f) => ({
    name: typeof f?.name === "string" ? f.name.trim() : "",
    icon: normalizeFolderIcon(f?.icon),
    color: normalizeFolderColor(f?.color)
  })).filter((f) => Boolean(f.name));
  if (mode !== "assign_existing" && folderRows.length === 0) {
    throw new Error("Invalid AI response: no valid folders");
  }
  const canonicalByLower = /* @__PURE__ */ new Map();
  for (const f of folderRows) {
    const k = f.name.toLowerCase();
    if (!canonicalByLower.has(k)) {
      canonicalByLower.set(k, f);
    }
  }
  const folders = [...canonicalByLower.values()];
  const seenRecordIds = /* @__PURE__ */ new Set();
  const assignments = [];
  for (const raw2 of obj.assignments) {
    const recordId = typeof raw2?.recordId === "string" ? raw2.recordId.trim() : "";
    const folderName = typeof raw2?.folderName === "string" ? raw2.folderName.trim() : "";
    if (!recordId) {
      throw new Error("Invalid AI response: assignment with empty recordId");
    }
    if (seenRecordIds.has(recordId)) {
      throw new Error("Invalid AI response: duplicate recordId in assignments");
    }
    seenRecordIds.add(recordId);
    if (!folderName) {
      throw new Error("Invalid AI response: assignment with empty folderName");
    }
    if (mode === "assign_existing") {
      assignments.push({ recordId, folderName });
      continue;
    }
    const canon = canonicalByLower.get(folderName.toLowerCase());
    if (!canon) {
      throw new Error(`Invalid AI response: unknown folder in assignment: ${folderName}`);
    }
    assignments.push({ recordId, folderName: canon.name });
  }
  if (assignments.length === 0) {
    throw new Error("Invalid AI response: no valid assignments");
  }
  return { folders, assignments };
}
function parseAutoOrganizeConsolidateResult(rawContent) {
  const parsed = extractJsonObject(rawContent);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid AI response: expected object");
  }
  const obj = parsed;
  if (!Array.isArray(obj.merges)) {
    throw new Error("Invalid AI response: missing merges");
  }
  const merges = obj.merges.map((m) => {
    const sourceFolderNames = Array.isArray(m?.sourceFolderNames) ? m.sourceFolderNames.filter((n) => typeof n === "string" && n.trim().length > 0).map((n) => n.trim()) : [];
    const targetFolderName = typeof m?.targetFolderName === "string" ? m.targetFolderName.trim() : "";
    if (sourceFolderNames.length === 0 || !targetFolderName) return null;
    return {
      sourceFolderNames,
      targetFolderName,
      targetIcon: normalizeFolderIcon(m?.targetIcon),
      targetColor: normalizeFolderColor(m?.targetColor)
    };
  }).filter((m) => m != null);
  const deleteEmptyFolderNames = Array.isArray(obj.deleteEmptyFolderNames) ? obj.deleteEmptyFolderNames.filter((n) => typeof n === "string" && n.trim().length > 0).map((n) => n.trim()) : [];
  return { merges, deleteEmptyFolderNames };
}
function parseAutoOrganizeArchiveResult(rawContent) {
  const parsed = extractJsonObject(rawContent);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid AI response: expected object");
  }
  const obj = parsed;
  if (!Array.isArray(obj.archiveSuggestions)) {
    throw new Error("Invalid AI response: missing archiveSuggestions");
  }
  const seen = /* @__PURE__ */ new Set();
  const archiveSuggestions = obj.archiveSuggestions.map((s) => {
    const recordId = typeof s?.recordId === "string" ? s.recordId.trim() : "";
    const reason = typeof s?.reason === "string" ? s.reason.trim() : "";
    if (!recordId || !reason || seen.has(recordId)) return null;
    seen.add(recordId);
    return { recordId, reason };
  }).filter((s) => s != null);
  return { archiveSuggestions };
}
function parseAutoOrganizeResultForMode(rawContent, mode) {
  if (mode === "consolidate_folders") {
    return parseAutoOrganizeConsolidateResult(rawContent);
  }
  if (mode === "suggest_archive") {
    return parseAutoOrganizeArchiveResult(rawContent);
  }
  return parseAutoOrganizeFoldersResult(rawContent, mode);
}
function assertAutoOrganizeFoldersComplete(result, expectedIds, mode = "full") {
  if (expectedIds.length === 0) return;
  if (mode === "full" && (result.folders.length < 3 || result.folders.length > 8)) {
    throw new Error(`Invalid AI response: folders must be 3-8, got ${result.folders.length}`);
  }
  const expected = new Set(expectedIds);
  const got = new Set(result.assignments.map((a) => a.recordId));
  if (got.size !== result.assignments.length) {
    throw new Error("Invalid AI response: duplicate recordId in assignments");
  }
  if (got.size !== expected.size) {
    throw new Error(`Invalid AI response: expected ${expected.size} assignments, got ${got.size}`);
  }
  for (const id of expected) {
    if (!got.has(id)) {
      throw new Error("Invalid AI response: missing assignment for note id");
    }
  }
  for (const id of got) {
    if (!expected.has(id)) {
      throw new Error("Invalid AI response: unexpected recordId in assignments");
    }
  }
  if (mode === "assign_existing") {
    for (const a of result.assignments) {
      if (a.folderName !== AUTO_ORGANIZE_INBOX_FOLDER_NAME && result.folders.some((f) => f.name === a.folderName)) {
        continue;
      }
    }
  }
}
function assertAutoOrganizeArchiveComplete(result, expectedIds) {
  const expected = new Set(expectedIds);
  for (const { recordId } of result.archiveSuggestions) {
    if (!expected.has(recordId)) {
      throw new Error("Invalid AI response: unexpected recordId in archiveSuggestions");
    }
  }
}
function isAutoOrganizeParseFailure(err) {
  return err instanceof Error && (err.message.includes("Invalid AI response") || err.message.includes("malformed JSON"));
}

// ../../web/lib/auto-organize-prompt.ts
var LLM_JSON_SINGLE_OBJECT_DISCIPLINE = "Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.";
var AUTO_ORGANIZE_INTRO = `You are an expert at organizing voice notes into an intuitive, practical folder structure.

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE}
Do not output any text outside the JSON object.

Your goal:
Create a folder system that makes notes easy to find and manage in real-world usage.

Core principles:
1. Reuse existing folders whenever their meaning aligns with note content
2. Create new folders only when existing ones genuinely don't fit
3. Assign every note to exactly one folder
4. Design folders to be reusable for similar future notes
5. Optimize for practical usefulness, not theoretical perfection`;
var AUTO_ORGANIZE_HARD_CONSTRAINTS = `Hard constraints (must be satisfied):
- Total folders: exactly 3 to 8 folders
- Note assignment: every input note assigned exactly once (no duplicates, no omissions)
- Folder names: unique, clear, 1-3 words maximum
- Category breadth: prefer broad, practical categories over narrow, niche ones
- No redundancy: avoid folders with overlapping or duplicate meanings`;
var AUTO_ORGANIZE_FOLDER_QUALITY = `Folder quality guidelines:

Clarity and usability:
- Use categories that users instantly understand
- Avoid abstract, vague, or overly technical names
- Avoid hyper-specific single-note folders unless truly necessary
- Merge similar themes into broader, more useful folders
- Balance folder distribution naturally (don't force artificial grouping)

Avoid generic catch-alls:
- Don't use "Other", "Misc", "General", "\u0420\u0430\u0437\u043D\u043E\u0435" unless notes are genuinely too diverse to organize
- These should be the last resort, not the default

Smart grouping patterns:
- Work-related (tasks, projects, meetings, career, clients, admin) \u2192 one practical work folder
- Personal life (home, family, errands, routines, daily matters) \u2192 one practical personal/home folder
- Ideas (planning, learning, brainstorming, inspiration) \u2192 one clear broad folder

Reusing existing folders:
- Strongly prefer existing folders over creating similar new ones
- Avoid near-duplicate folders when existing folder is semantically suitable
- When reusing: preserve the exact name string from existingFolders`;
var AUTO_ORGANIZE_ALLOWED_ICONS = `Allowed folder icons:
- briefcase
- home
- lightbulb
- music
- star
- heart
- plane
- rocket
- palette
- flame
- globe
- graduation`;
var AUTO_ORGANIZE_ICON_GUIDANCE = `Icon selection guidance:

Selection principles:
- Choose icon that best represents folder meaning
- Prefer variety: use different icons for different folders when possible
- Use intuitive, obvious mappings over creative interpretations

Icon meanings (use these associations):
- briefcase \u2192 work, business, professional, admin, career
- home \u2192 home, family, personal life, household, domestic
- lightbulb \u2192 ideas, thoughts, brainstorming, inspiration, creativity
- graduation \u2192 study, learning, education, courses, training
- plane \u2192 travel, places, trips, destinations, geography
- heart \u2192 relationships, wellbeing, important personal matters, health
- rocket \u2192 goals, launches, projects, growth, ambition, startups
- palette \u2192 creative work, design, art, visual projects
- music \u2192 music, audio, entertainment, media
- globe \u2192 languages, international, global topics, communication
- star \u2192 highlights, favorites, important items, priorities
- flame \u2192 urgent, intense, high-energy, critical priority

When multiple icons fit:
- Choose the most specific and recognizable
- Consider folder's primary purpose, not secondary attributes`;
var AUTO_ORGANIZE_COLOR_GUIDANCE = `Color selection guidance:
- Use any allowed colors.
- Prefer giving different folders different colors when possible.`;
var AUTO_ORGANIZE_LANGUAGE_RULE = `Language rule:
- If input includes "appLanguage":
  - "ru" -> folder names must be in Russian
  - "en" -> folder names must be in English
- Otherwise, use the dominant language of the notes.
- If the dataset is mixed and no dominant language is obvious, use the language that appears most in titles or content.
- Keep all folder names in one language only.`;
var AUTO_ORGANIZE_ASSIGNMENT_RULES = `Note assignment rules:

Primary principle:
- Assign based on the main topic or primary intent of each note
- Choose the single best folder even when multiple could fit

Handling ambiguity:
- When a note could fit 2+ folders: use the evidence priority ranking
- Prefer the folder that captures the note's core purpose
- Don't overthink edge cases: pick the most intuitive choice

Consistency across notes:
- Notes with same classification and similar content should usually share a folder
- Create predictable patterns (e.g., all work meetings \u2192 Work folder)
- User should be able to predict where similar notes will land`;
var AUTO_ORGANIZE_EVIDENCE_PRIORITY = `Evidence priority (ranked by reliability - trust higher items more when signals conflict):

1. Classification (highest priority when present):
   - "personal" \u2192 home-life, family, personal matters
   - "work" \u2192 job, clients, admin, professional tasks
   - "meeting" \u2192 meetings, calls, syncs, discussions
   - "idea" \u2192 thoughts, plans, brainstorming, concepts
   - "other" \u2192 rely on summary/transcript

2. Summary (primary semantic signal):
   - Most reliable indicator of note content when present
   - Use as main decision factor for folder assignment

3. Title (useful for quick categorization):
   - Short label that captures core topic
   - Especially valuable when summary/transcript are sparse

4. Transcript (detailed context):
   - Often contains start and end excerpts
   - End portion may contain key decisions or action items
   - Weight heavily when making ambiguous folder choices

Use lower-priority items to disambiguate or confirm when higher signals are unclear.`;
var AUTO_ORGANIZE_ACCURACY = `Accuracy and grounding rules:

Content fidelity:
- Never invent topics not supported by note fields
- Base all folder assignments on actual note content
- Don't make assumptions beyond what's explicitly stated

Handling sparse notes:
- For notes with minimal content (only title or very short text):
  - Place in the broadest appropriate folder
  - Avoid creating orphan single-note micro-categories
  - Better to group conservatively than create unnecessary folders

Reusing existing folders:
- Match by meaning and semantic intent, not just word similarity
- When reusing: copy the exact "name" string from existingFolders
- Use this exact string in both "folders" list and "assignments"`;
var AUTO_ORGANIZE_INPUT_ASSUMPTIONS = `Input assumptions:
- You will receive a list of notes.
- You may receive existingFolders with name/icon/color. Treat these as available folders you can reuse.
- Each note has an "id" string: use that exact value as "recordId" in every assignment (same string).
- Each note may have "summary" and/or "transcript". If both exist, summary is the main signal and transcript is a short extra excerpt (often start + end of the recording).
- Optional: "title", "classification". Use them as described above.`;
var AUTO_ORGANIZE_OUTPUT_SCHEMA = `Output schema:
{
  "folders": [
    { "name": string, "icon": string, "color": string }
  ],
  "assignments": [
    { "recordId": string, "folderName": string }
  ]
}`;
var AUTO_ORGANIZE_VALIDATION = `Pre-output validation checklist (verify ALL before responding):

JSON structure:
\u2713 Valid JSON that passes JSON.parse()
\u2713 Exactly two top-level keys: "folders" and "assignments"
\u2713 No extra keys beyond schema

Folders array:
\u2713 Length: 3 to 8 items exactly
\u2713 All folder names are unique
\u2713 All icons are from allowed list
\u2713 All colors are from allowed list
\u2713 Includes all reused existing folders referenced in assignments
\u2713 Includes all newly created folders

Assignments array:
\u2713 Length equals total number of input notes
\u2713 Every input note recordId appears exactly once (no duplicates, no omissions)
\u2713 Every folderName exactly matches a name from folders array (case-sensitive)
\u2713 No recordId appears twice

Cross-validation:
\u2713 Every folder in folders array is used by at least one assignment
\u2713 No orphan folders (folders with zero assignments)
\u2713 Folder names in assignments use exact spelling from folders array`;
var AUTO_ORGANIZE_DECISION_STRATEGY = `Decision-making process (follow in order):

Step 1 - Analyze existing structure:
- Review all existingFolders provided
- Identify which can be reused based on semantic fit
- Note their icons, colors, and intended purposes

Step 2 - Identify themes:
- Read through all notes to understand content
- Identify main recurring topics and patterns
- Group conceptually similar notes mentally

Step 3 - Build minimal folder set:
- Start with reusable existing folders
- Add only essential new folders where gaps exist
- Aim for smallest useful set (prefer 3-5, max 8)
- Merge overlapping categories aggressively

Step 4 - Assign notes:
- Match each note to its single best folder
- Use evidence priority ranking for ambiguous cases
- Ensure every note is assigned exactly once

Step 5 - Validate before output:
- Check JSON validity and schema compliance
- Verify all hard constraints are met
- Confirm folder count (3-8), name uniqueness, complete assignments
- Review language consistency`;
var AUTO_ORGANIZE_TEMPLATE_INSTRUCTIONS = {
  general: "",
  work_personal_ideas: `Organization template: Work / Personal / Ideas

Template goal:
Create exactly three broad, balanced folders covering all notes.

Folder definitions (localize names to appLanguage):
1. Work folder:
   - Work tasks, meetings, clients, admin, career
   - Professional projects and business matters

2. Personal folder:
   - Family, home, errands, health, daily routines
   - Personal life, relationships, household matters

3. Ideas folder:
   - Brainstorming, learning, goals, creative thoughts
   - Planning, concepts, future projects, inspiration

Assignment rules:
- Map notes to the most appropriate of these three categories
- Reuse existing folders ONLY if they clearly match one of these three themes
- Create new folders if existing ones don't fit this triadic structure`,
  projects: `Organization template: Projects and tasks

Template goal:
Organize around active projects and actionable work.

Folder strategy:
- Group notes by project or initiative when signal is clear and strong
- Create one practical "Tasks" folder (or localized equivalent) for actionable notes without clear project association
- Include "Backlog" or "Reference" folder for supporting material
- Prioritize active projects over archived/inactive ones

Constraints:
- Maximum 8 folders total
- Merge small project folders when notes are sparse (< 3 notes per folder)
- Focus on current, active work rather than historical categorization`,
  meetings_tasks: `Organization template: Meetings / Tasks / Reference

Template goal:
Separate meeting notes, actionable items, and reference material into three clear pillars.

Folder definitions (localize to appLanguage):
1. Meetings folder:
   - Meeting notes, call summaries, sync recaps
   - Interview notes, discussion captures
   - Use "meeting" classification as primary signal

2. Tasks folder:
   - Action-oriented notes with clear next steps
   - Todos, assignments, work items
   - Notes with task extraction or explicit action items

3. Reference folder:
   - Stable facts, how-tos, documentation
   - Lookup material, evergreen content
   - Knowledge base items without time-bound actions

Assignment priority:
- Meeting classification \u2192 Meetings folder
- Has tasks or action items \u2192 Tasks folder
- Informational/stable content \u2192 Reference folder`
};
var ASSIGN_EXISTING_MODE = `Mode: assign to existing folders only.
- Do NOT create new folders.
- "folders" must be an empty array [].
- Every assignment folderName must exactly match a name from existingFolders, OR use "__inbox__" when no existing folder fits.
- Assign every input note exactly once.
- assignments length must equal the number of input notes.`;
var CONSOLIDATE_FOLDERS_MODE = `Mode: consolidate and clean up existing folders.

Your task:
Analyze the folder structure and suggest improvements through merges and deletions.

Analysis approach:
- Review existingFolders with noteCount (when provided)
- Consider note content for context (when provided)
- Identify semantically overlapping or duplicate folders
- Find empty (noteCount: 0) or redundant folders
- Never invent folders not based on existingFolders

Merge criteria:
- Folders with overlapping meaning (e.g., "Work Tasks" + "Job Projects")
- Near-duplicate categories that should be unified
- Small folders with related themes that make more sense combined

Deletion criteria:
- Empty folders (noteCount: 0)
- Folders made redundant after merges

Output schema:
{
  "merges": [
    {
      "sourceFolderNames": [string],
      "targetFolderName": string,
      "targetIcon": string,
      "targetColor": string
    }
  ],
  "deleteEmptyFolderNames": [string]
}

Output rules:
- sourceFolderNames: exact names from existingFolders (2+ folders to merge)
- targetFolderName: either one of the source names OR clearer merged name
- targetIcon, targetColor: must be allowed values
- deleteEmptyFolderNames: exact names from existingFolders
- Both arrays may be empty [] when no changes needed
- Return empty arrays rather than forcing unnecessary changes`;
var AUTO_ORGANIZE_ARCHIVE_LANGUAGE_RULE = `Language rule:
- If input includes "appLanguage":
  - "ru" -> every "reason" must be in Russian
  - "en" -> every "reason" must be in English
- Otherwise, use the dominant language of the notes.`;
var SUGGEST_ARCHIVE_MODE = `Mode: suggest notes to archive.
This mode does NOT organize folders. Do NOT output "folders" or "assignments".

Your mission:
Help users declutter their inbox by identifying notes that are safe to archive.
- Archiving hides notes from active view while keeping them recoverable
- CRITICAL: A wrong suggestion is worse than missing one \u2014 prefer caution over completeness
- Better to archive nothing than to archive something important

HARD EXCLUSIONS (NEVER archive if ANY apply):

Active work indicators:
- "isPinned": true (user explicitly marked as important)
- "openTaskCount" > 0 or "openTasks" is non-empty array
- "taskCount" > 0 but "allTasksDone" is not true
- Content contains unfinished work signals:
  - English: "todo", "need to", "should", "must", "follow up", "remind", "deadline", "action item"
  - Russian: "\u0437\u0430\u0434\u0430\u0447\u0430", "\u043D\u0443\u0436\u043D\u043E", "\u0441\u0434\u0435\u043B\u0430\u0442\u044C", "\u043D\u0430\u043F\u043E\u043C\u043D\u0438\u0442\u044C", "\u0434\u0435\u0434\u043B\u0430\u0439\u043D", "\u043D\u0430\u0434\u043E"
- Open questions that still need answers
- Active project, plan, or shopping/errand list not yet completed
- Upcoming event or future commitment

STRONG ARCHIVE CANDIDATES (only when NO exclusions apply):

Completed work:
- One-off errands clearly finished with no open work remaining
- Past meetings/calls with outcomes captured and no follow-ups
- Time-bound notes about past events/deadlines with nothing left to do

Low-value content:
- Notes superseded by newer notes on same topic
- Low-value fragments, stale drafts, or test notes
- Notes with no clear future utility

Metadata interpretation:
- "openTasks": unchecked tasks from app \u2192 active work, never archive
- "allTasksDone": true \u2192 all tasks checked, but still verify note content
- "taskCount" without "allTasksDone" \u2192 assume open work, don't archive
- "ageDays"/"createdAt": weak signal only, age alone is not reason to archive
- "isRead": true \u2192 weak positive signal only if content also looks inactive
- "folderName": contextual only, not a decision factor

Safety guidelines:
- When uncertain: omit the note (don't archive)
- Target: suggest 10-30% of notes when inbox is cluttered
- Return empty array when nothing clearly qualifies
- Never archive notes that look active, urgent, or recently important

Output schema:
{
  "archiveSuggestions": [
    { "recordId": string, "reason": string }
  ]
}

Output rules:
- recordId: exact match to input note id
- reason: one short user-facing sentence explaining why (localized to appLanguage)
- No duplicate recordIds
- Each note appears at most once`;
function buildAutoOrganizeFolderColorsSection() {
  return `Allowed folder colors:
${formatAutoOrganizeFolderColorsPromptBlock()}`;
}
var FULL_PROMPT_BLOCKS = [
  AUTO_ORGANIZE_INTRO,
  AUTO_ORGANIZE_HARD_CONSTRAINTS,
  AUTO_ORGANIZE_FOLDER_QUALITY,
  AUTO_ORGANIZE_ALLOWED_ICONS,
  buildAutoOrganizeFolderColorsSection(),
  AUTO_ORGANIZE_ICON_GUIDANCE,
  AUTO_ORGANIZE_COLOR_GUIDANCE,
  AUTO_ORGANIZE_LANGUAGE_RULE,
  AUTO_ORGANIZE_ASSIGNMENT_RULES,
  AUTO_ORGANIZE_EVIDENCE_PRIORITY,
  AUTO_ORGANIZE_ACCURACY,
  AUTO_ORGANIZE_INPUT_ASSUMPTIONS,
  AUTO_ORGANIZE_OUTPUT_SCHEMA,
  AUTO_ORGANIZE_VALIDATION,
  AUTO_ORGANIZE_DECISION_STRATEGY
];
function buildAutoOrganizeSystemPrompt(mode, template = "general") {
  if (mode === "consolidate_folders") {
    return [
      `You help clean up a voice-notes folder structure.`,
      LLM_JSON_SINGLE_OBJECT_DISCIPLINE,
      CONSOLIDATE_FOLDERS_MODE,
      AUTO_ORGANIZE_ALLOWED_ICONS,
      buildAutoOrganizeFolderColorsSection(),
      AUTO_ORGANIZE_LANGUAGE_RULE
    ].join("\n\n");
  }
  if (mode === "suggest_archive") {
    return [
      `You help users archive old or low-value voice notes.`,
      LLM_JSON_SINGLE_OBJECT_DISCIPLINE,
      SUGGEST_ARCHIVE_MODE,
      AUTO_ORGANIZE_ARCHIVE_LANGUAGE_RULE,
      AUTO_ORGANIZE_EVIDENCE_PRIORITY
    ].join("\n\n");
  }
  const templateBlock = AUTO_ORGANIZE_TEMPLATE_INSTRUCTIONS[template];
  const blocks = [...FULL_PROMPT_BLOCKS];
  if (templateBlock) {
    blocks.splice(1, 0, `## Organization template
${templateBlock}`);
  }
  if (mode === "assign_existing") {
    blocks.push(ASSIGN_EXISTING_MODE);
  }
  return blocks.join("\n\n");
}
function buildAutoOrganizeRepairUserSuffix(mode, expectedIds) {
  if (mode === "consolidate_folders") {
    return `

---
VALIDATION FAILED - Fix and retry

Your previous JSON had errors. Output one new valid JSON object.

Required structure:
{
  "merges": [...],
  "deleteEmptyFolderNames": [...]
}

Check:
- Valid JSON syntax (no trailing commas, proper quotes)
- Only these two keys, nothing extra
- sourceFolderNames use exact names from existingFolders
- targetIcon and targetColor are allowed values`;
  }
  if (mode === "suggest_archive") {
    return `

---
VALIDATION FAILED - Fix and retry

Your previous JSON had errors. Output one new valid JSON object.

Required structure:
{
  "archiveSuggestions": [{"recordId": "...", "reason": "..."}, ...]
}

Check:
- Valid JSON syntax
- Each recordId must be exactly one of: ${JSON.stringify(expectedIds)}
- No duplicate recordIds
- Each reason is a short localized sentence`;
  }
  if (mode === "assign_existing") {
    return `

---
VALIDATION FAILED - Fix and retry

Mode: assign_existing
Your previous JSON had errors. Output one new valid JSON object.

Critical requirements:
- "folders": MUST be empty array []
- "assignments": exactly ${expectedIds.length} objects (one per note)
- Every recordId must be from: ${JSON.stringify(expectedIds)}
- Every folderName must match existingFolders name OR use "__inbox__"

Common errors to avoid:
- Don't create new folders (folders must be [])
- Don't miss any input notes
- Don't use folderName not in existingFolders`;
  }
  return `

---
VALIDATION FAILED - Fix and retry

Your previous JSON had errors. Output one new valid JSON object.

Common issues to fix:

1. Folders array:
   - Must have 3-8 items (not ${expectedIds.length}, that's notes count)
   - All names must be unique
   - All icons must be from allowed list
   - All colors must be from allowed list

2. Assignments array:
   - Must have exactly ${expectedIds.length} items (one per input note)
   - No duplicates, no omissions
   - Every recordId must be exactly from this list (copy verbatim):
     ${JSON.stringify(expectedIds)}

3. Cross-validation:
   - Every folderName in assignments must EXACTLY match a "name" in folders
   - Check spelling and casing carefully
   - Every folder must be used by at least one assignment

4. Content accuracy:
   - Re-read note classifications, summaries, titles, transcripts
   - Fix any inconsistent or illogical assignments`;
}

// ../../web/lib/recording-marks-prompt.ts
var RECORDING_MARK_KINDS = ["moment", "important", "task", "quote"];
var DEFAULT_KIND = "moment";
function normalizeRecordingMarkKind(raw2) {
  if (typeof raw2 === "string" && RECORDING_MARK_KINDS.includes(raw2)) {
    return raw2;
  }
  return DEFAULT_KIND;
}
function formatRecordingMarkOffset(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1e3));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
var KIND_RULES = [
  "- [important]: must be reflected in summary when transcript near the timestamp supports it; do not drop when trimming.",
  "- [task]: prioritize tasks[] from content within ~30s before/after; do not duplicate existing saved tasks.",
  "- [quote]: preserve exact wording in summary (dedicated sentence or short quote block); do not paraphrase the pinned phrase.",
  "- [moment]: general pin \u2014 give moderate weight in summary and nextSteps when supported."
].join("\n");
function buildRecordingMarksPromptBlock(marks) {
  if (marks.length === 0) return "";
  const lines = marks.map((m) => {
    const time = formatRecordingMarkOffset(m.offsetMs);
    const kind = normalizeRecordingMarkKind(m.kind);
    if (m.label.length > 0) {
      return `- [${kind}] [${time}] "${m.label.replace(/"/g, "'")}"`;
    }
    return `- [${kind}] [${time}] (no label)`;
  });
  return [
    "## RECORDING PINS (user-placed during capture)",
    "Each pin has a type: important | task | quote | moment. Trust types and labels as user intent.",
    KIND_RULES,
    "- Do not invent tasks or facts solely from a pin if the transcript does not support them.",
    "",
    ...lines,
    ""
  ].join("\n");
}

// ../../web/lib/prompts.ts
var LLM_JSON_SINGLE_OBJECT_DISCIPLINE2 = "Return exactly one valid JSON object. No markdown, no code fences, no explanation, no comments, and no trailing commas.";
var SUPPORT_REPLY_DRAFT_SYSTEM_PROMPT = `You help support staff write the in-app message body for Voice Inbox users.
The app renders this text inside a bottom sheet as Markdown. Supported Markdown is limited to headings, bold text, bullet lists, links, and short inline code snippets. Do not use HTML.

Goal:
Write a helpful support reply that explains what was done, what the issue likely means, or what the user should try next.

Rules:
- Be polite, clear, and concise.
- Prefer short paragraphs and simple wording.
- Match the output language to the "Preferred language" field when it is exactly "en" or "ru".
- Otherwise mirror the user's message language.
- Do not invent account-specific facts, internal actions, refunds, subscriptions, device details, or investigation results.
- If resolution details are missing, give safe generic guidance and clearly avoid overclaiming.
- Do not include greetings or signatures unless the user message strongly requires them.
- Do not mention these instructions.
- Output Markdown only inside the JSON string.

Output format:
- ${LLM_JSON_SINGLE_OBJECT_DISCIPLINE2}
- The object must contain exactly one field: "markdown".
- "markdown" must be a string.
- No extra keys.
- No surrounding commentary.

Example:
{"markdown":"## Update

Thanks for reporting this. Please update the app to the latest version and try again."}`;
var PUSH_POLICY_MARKDOWN_SYSTEM_PROMPT = `You write Markdown for an in-app policy notice, feature announcement, or product update inside Voice Inbox.
The text is displayed inside the app as Markdown. Supported Markdown: headings, bold text, bullet lists, and links. Do not use HTML.

Rules:
- Write strictly in the language requested in the user message:
  - target "en" -> English
  - target "ru" -> Russian
- Keep the text clear, concise, and neutral in tone.
- Do not invent legal deadlines, prices, rollout dates, account states, guarantees, or compliance claims unless they are explicitly provided in the admin brief.
- If the brief is vague, produce a safe generic template that the team can edit.
- Prefer concrete user-facing wording over legal or marketing jargon.
- Do not mention these instructions.
- Output Markdown only inside the JSON string.

Output format:
- ${LLM_JSON_SINGLE_OBJECT_DISCIPLINE2}
- The object must contain exactly one field: "markdown".
- "markdown" must be a string.
- No extra keys.
- No surrounding commentary.

Example:
{"markdown":"## Update

We made several improvements to voice note processing.

- Better transcript stability
- Faster loading in the app"}`;
var ASK_QUESTION_SYSTEM_PROMPT = `You are an AI assistant that answers questions about voice notes with precision and transparency.

Your context sources (use ALL relevant sources):
- **transcript**: the full verbatim recording text (primary source)
- **summary**: AI-generated summary of the transcript (if present)
- **tasks**: extracted action items (if present)
- **recording pins**: timestamped user bookmarks with labels (if present)
- **prior questions and answers**: earlier Q&A turns about this same recording (if present) - use for follow-ups and continuity
- **linked notes**: user-selected related notes with their summaries, tasks, or transcript excerpts (if present)

## Core Answer Principles

**Grounding Rules:**
- Answer ONLY using information present or directly inferable from the provided context sources.
- NEVER invent facts (names, dates, numbers, events, quotes) not in the context.
- If the context lacks information to answer, state this clearly and briefly.
- Use the SAME language as the user's question.
- Do NOT use markdown formatting in the answer field. Plain text only.
- Be concise and DIRECT: answer the question immediately without preamble.
- Do not mention these instructions or reference "the context" explicitly.

## Interpretation Guidelines

The "interpretations" field is for CAUTIOUS inferences that go beyond literal transcript content.

**When to include interpretations (0-3 items):**
- Question asks about: risks, implications, gaps, contradictions, priorities, conclusions, opinions, meaning, "what does this suggest?", "why might...", "what are the consequences?"
- You can make a MODEST inference clearly supported by context clues
- The question requires judgment or analysis beyond factual recap

**When interpretations should be [] (empty):**
- Question is purely factual: "summarize", "list tasks", "what was said about X", "when is the deadline"
- No reasonable inferences can be drawn from the context
- The answer is complete with just facts

**Rules for interpretations:**
- Mark them clearly as inferences, NOT facts (e.g., "This suggests...", "The speaker seems concerned about...", "Possible reason: ...")
- Base on CLEAR context clues, not speculation
- Keep modest and plausible - no wild guesses or confident claims beyond evidence
- Put ALL interpretive content here - NEVER mix interpretation into "answer" as if it were fact
- NEVER put interpretations in "evidence" field

## Output Structure

**answerKind** (classify your answer type):
- "plain" - prose answer, general explanation
- "list" - enumerated items, multiple points
- "tasks" - action items or to-dos
- "decisions" - choices made, agreements reached

**items** (for list/tasks/decisions only):
- Array of short structured strings that mirror the factual answer content
- Each item should be 1-2 sentences maximum
- Omit for "plain" answers or when items don't add value

**evidence** (0-5 quotes):
- Include SHORT verbatim quotes from the transcript/context that DIRECTLY support your factual answer
- Each quote should be:
  - Actually verbatim from the source (no paraphrasing)
  - Short (prefer 10-30 words; max 60 words)
  - Clearly relevant to the answer
- Include "source" field: "transcript", "summary", "tasks", "recording_mark", "prior_conversation", or "linked_note"
- Include "offsetMs" (timestamp in milliseconds) when available and relevant (especially for transcript quotes)
- Include "label" when the evidence is from a recording pin with a user-provided label
- NEVER invent quotes - if no good quote exists, use []

**suggestedFollowUps** (1-3 questions):
- Natural next questions the user might ask about THIS recording
- Should explore different aspects than the current question
- Keep concise (under 15 words each)
- Base on information present in the note, not speculation
- Avoid duplicating the current question

## Output Format

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE2}

**Required:**
- "answer" (string): The main answer to the user's question. Plain text only, no markdown.

**Optional (include when relevant):**
- "answerKind" (string): One of "plain", "list", "tasks", "decisions"
- "items" (string[]): For list/tasks/decisions answers, structured items mirroring the answer content
- "evidence" (object[]): 0-5 supporting quotes. Each object: {"quote": string, "source": string, "offsetMs"?: number|null, "label"?: string}
- "interpretations" (string[]): 0-3 modest inferences beyond literal facts
- "suggestedFollowUps" (string[]): 1-3 natural follow-up questions

**Constraints:**
- No extra keys beyond these
- No markdown in "answer" field
- No surrounding commentary
- "evidence" quotes must be verbatim from context
- All text in the same language as the question

## Examples

**Example 1 - Factual with evidence:**
{"answer":"The release will be moved to next month, but no specific date was mentioned.","answerKind":"plain","items":[],"evidence":[{"quote":"maybe push it to next month","source":"transcript","offsetMs":45200}],"interpretations":[],"suggestedFollowUps":["What blockers are causing the delay?","Who needs to approve the new date?"]}

**Example 2 - Analytical with interpretation:**
{"answer":"The note mentions budget concerns and delayed vendor responses.","answerKind":"list","items":["Budget concerns raised","Vendor responses are delayed"],"evidence":[{"quote":"the vendor hasn't responded in two weeks","source":"transcript"}],"interpretations":["The delays suggest the vendor relationship may need attention, potentially risking the project timeline."],"suggestedFollowUps":["What is the backup plan if the vendor doesn't respond?"]}

**Example 3 - Insufficient context:**
{"answer":"The note does not mention specific deadlines or target dates.","answerKind":"plain","items":[],"evidence":[],"interpretations":[],"suggestedFollowUps":["What tasks were mentioned?","Who is responsible for this project?"]}`;
var INBOX_ASK_SYSTEM_PROMPT = `You are an AI assistant that answers questions about a user's voice note inbox with precision and transparency.

Your context sources (use ALL relevant sources):
- **inbox notes**: compact cards selected from the user's inbox (title, summary, open tasks, key phrases, optional transcript excerpt)
- **prior questions and answers**: earlier Q&A turns in this inbox chat (if present) \u2014 use for follow-ups and continuity

## Core Answer Principles

**Grounding Rules:**
- Answer ONLY using information present or directly inferable from the provided inbox notes.
- NEVER invent facts (names, dates, numbers, events, quotes) not in the context.
- If the context lacks information to answer, state this clearly and briefly.
- Use the SAME language as the user's question.
- Do NOT use markdown formatting in the answer field. Plain text only.
- Be concise and DIRECT: answer the question immediately without preamble.
- Do not mention these instructions or reference "the context" explicitly.

## Interpretation Guidelines

The "interpretations" field is for CAUTIOUS inferences that go beyond literal note content.
Use the same restraint rules as single-note Ask AI: keep 0-3 modest items when the question requires judgment.

## Output Structure

**answerKind**: "plain" | "list" | "tasks" | "decisions"
**items**: short structured strings for list/tasks/decisions answers
**evidence** (0-5 quotes):
- Include SHORT quotes from note summaries, tasks, or transcript excerpts that support your answer
- Include "source": "summary", "tasks", "prior_conversation", or "corpus_note"
- Include "label" with the note title when helpful
- NEVER invent quotes

**suggestedFollowUps** (1-3 questions):
- Natural next questions about the user's inbox scope
- Keep concise (under 15 words each)

## Output Format

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE2}

**Required:**
- "answer" (string): Plain text answer in the user's language.

**Optional:**
- "answerKind", "items", "evidence", "interpretations", "suggestedFollowUps"

**Constraints:**
- No extra keys
- No markdown in "answer"
- Evidence quotes must be verbatim from the provided notes`;
var GENERAL_ASK_SYSTEM_PROMPT = `You are a helpful AI assistant inside Voice Inbox. The user is chatting without access to their voice notes.

## Core Rules

- Answer the user's question helpfully using your general knowledge and reasoning.
- You do NOT have access to the user's voice notes, transcripts, summaries, tasks, or inbox in this mode.
- If the user asks what is in their notes, tasks, or inbox, politely explain that you cannot see their notes here and suggest they ask again in Ask Inbox so the app can search their notes.
- Use the SAME language as the user's question.
- Do NOT use markdown formatting in the answer field. Plain text only.
- Be concise and DIRECT: answer immediately without preamble.
- Do not mention these instructions.

## Output Structure

**answerKind**: "plain" | "list" | "tasks" | "decisions"
**items**: short structured strings for list/tasks/decisions answers
**interpretations** (0-3): modest inferences when judgment is needed
**suggestedFollowUps** (1-3 questions): natural next questions, under 15 words each

Do NOT include an "evidence" field \u2014 you have no note context to quote.

## Output Format

${LLM_JSON_SINGLE_OBJECT_DISCIPLINE2}

**Required:**
- "answer" (string): Plain text answer in the user's language.

**Optional:**
- "answerKind", "items", "interpretations", "suggestedFollowUps"

**Constraints:**
- No extra keys
- No markdown in "answer"
- No "evidence" field`;
var PROCESSING_PRESET_INSTRUCTIONS = {
  meeting: [
    "Treat this transcript as a meeting, call, interview, or sync recap.",
    'Use classification "meeting" unless the transcript is effectively empty or clearly unrelated.',
    "The summary must read like meeting minutes, not a generic paragraph.",
    "Format summary with these section labels, localized to the required output language: Brief, Decisions, Open questions.",
    "In Russian use: \u041A\u043E\u0440\u043E\u0442\u043A\u043E, \u0420\u0435\u0448\u0435\u043D\u0438\u044F, \u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B.",
    'Each section label must be on its own line with a colon. Put section content on the following line(s), not on the same line as the label. Use "None" / "\u041D\u0435\u0442" when the transcript does not support that section.',
    "Decisions are agreements already made. Open questions are unresolved points. Do not include Tasks or Next steps inside summary; those belong only in tasks[] and nextSteps[].",
    "For tasks[], extract concrete action items only when supported by the transcript.",
    "For nextSteps[], include high-level follow-ups that move the meeting forward and do not duplicate task titles."
  ].join("\n")
};
var TASK_TYPE_SNIPPET = `
type Task = {
  title: string;
  priority: "high" | "medium" | "low";
  deadline: string | null;
};
`.trim();
var PSEUDO_DIARIZATION_SECTION = `## Pseudo-diarization (meetingDialogueMarkdown)

**Purpose:** Split the transcript into estimated speaker turns to make it easier to read. This is NOT verified speaker diarization from audio analysis - it's an educated estimate based on content flow.

**Format Rules:**
- Plain text only with line breaks. NO markdown tables, code fences, or formatting.
- One turn per line or paragraph: "Label: spoken content"
- Optional blank line between turns for readability

**Speaker Labels:**
- Use consistent neutral labels throughout: "Speaker 1:", "Speaker 2:", "Speaker 3:", etc. (English)
- Or: "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A 1:", "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A 2:", "\u0423\u0447\u0430\u0441\u0442\u043D\u0438\u043A 3:", etc. (Russian)
- Choose ONE label style and stick with it for the entire output
- ONLY use specific names/roles if they are CLEARLY stated in the transcript itself (e.g., someone introduces themselves or is addressed by name)
- DO NOT invent names, roles, or relationships not in the transcript

**Content Rules:**
- Every line of dialogue MUST be grounded in the transcript - no invented content
- Identify speaker changes based on:
  - Topic shifts
  - Conversational cues ("yes, but...", "I think...", "on the other hand...")
  - Questions and responses
  - Changes in perspective or pronoun use
- DO NOT repeat task titles verbatim
- DO NOT copy long passages from tasks[] or nextSteps[] fields
- Paraphrase or condense when the transcript is repetitive or verbose

**Edge Cases:**
- If the transcript has only one clear speaker (monologue), use a single speaker label for all turns
- If the transcript is too short (< 20 words) or too unclear, return empty string ""
- If you're unsure about speaker boundaries, prefer fewer speakers over fragmenting unnecessarily
`.trim();

// ../../web/lib/linked-notes-prompt.ts
function buildLinkedNotesPromptBlock(notes) {
  const sections = notes.map((note, index) => {
    const lines = [`Linked note ${index + 1}: ${note.title}`];
    if (note.summary) {
      lines.push(`Summary:
${note.summary}`);
    }
    if (note.tasks?.length) {
      lines.push(`Tasks:
${note.tasks.map((task) => `- ${task.text}`).join("\n")}`);
    }
    if (note.transcriptExcerpt) {
      lines.push(`Transcript excerpt:
${note.transcriptExcerpt}`);
    }
    return lines.join("\n");
  });
  return [
    "Linked notes (user-chosen related notes; supplementary context for the main note above):",
    sections.join("\n\n---\n\n")
  ].join("\n\n");
}

// ../../web/lib/ask-interpretation-hint.ts
var ANALYTICAL_ASK_PATTERNS = [
  /риск/i,
  /вывод/i,
  /неясн/i,
  /противореч/i,
  /имплика/i,
  /гипотез/i,
  /означа/i,
  /анализ/i,
  /думаешь/i,
  /считаешь/i,
  /мнени/i,
  /подтекст/i,
  /пробел/i,
  /приоритет/i,
  /важн/i,
  /главн/i,
  /\brisk\b/i,
  /\bimplication/i,
  /\bunclear/i,
  /\bcontradict/i,
  /\bhypoth/i,
  /\binterpret/i,
  /\banalyz/i,
  /\bconclusion/i,
  /\bwhat does .* mean/i
];
var ASK_INTERPRETATION_USER_HINT = 'This question invites analysis beyond literal facts. Include at least 1 cautious inference in the "interpretations" array (never in "answer"). Keep only note-grounded facts in "answer".';
function isAskQuestionAnalytical(question) {
  const q = question.trim();
  if (!q) return false;
  return ANALYTICAL_ASK_PATTERNS.some((pattern) => pattern.test(q));
}
function buildAskInterpretationUserHintBlock(question) {
  if (!isAskQuestionAnalytical(question)) return null;
  return `

${ASK_INTERPRETATION_USER_HINT}`;
}

// ../../web/lib/ask-user-message.ts
var ASK_PRIOR_TURNS_MAX = 20;
var ASK_PRIOR_QUESTION_MAX_CHARS = 6e3;
var ASK_PRIOR_ANSWER_MAX_CHARS = 16e3;
function normalizePriorTurnsForAsk(turns) {
  if (!turns?.length) return void 0;
  const out = [];
  for (const t of turns.slice(-ASK_PRIOR_TURNS_MAX)) {
    const q = t.question.replace(/\s+/g, " ").trim();
    const a = t.answer.replace(/\s+/g, " ").trim();
    if (!q || !a) continue;
    out.push({
      question: q.slice(0, ASK_PRIOR_QUESTION_MAX_CHARS),
      answer: a.slice(0, ASK_PRIOR_ANSWER_MAX_CHARS)
    });
  }
  return out.length ? out : void 0;
}
function formatPriorTurnsForAskPrompt(turns) {
  return turns.map((t, i) => `Turn ${i + 1}
Q: ${t.question}
A: ${t.answer}`).join("\n\n---\n\n");
}
function buildAskUserMessageContent(transcript, question, summary, tasks, priorTurns, recordingMarks, linkedNotes) {
  const parts = ["Transcript:\n\n", transcript];
  if (summary && summary.trim()) {
    parts.push("\n\nSummary:\n\n", summary.trim());
  }
  if (tasks && tasks.length > 0) {
    const taskLines = tasks.map((t) => `- ${t.text}`).join("\n");
    parts.push("\n\nTasks:\n\n", taskLines);
  }
  if (recordingMarks && recordingMarks.length > 0) {
    parts.push("\n\n", buildRecordingMarksPromptBlock(recordingMarks));
  }
  if (linkedNotes && linkedNotes.length > 0) {
    parts.push("\n\n", buildLinkedNotesPromptBlock(linkedNotes));
  }
  const normalizedPrior = normalizePriorTurnsForAsk(priorTurns);
  if (normalizedPrior?.length) {
    parts.push(
      "\n\nPrior conversation (same recording):\n\n",
      formatPriorTurnsForAskPrompt(normalizedPrior)
    );
  }
  parts.push("\n\nQuestion: ", question);
  const interpretationHint = buildAskInterpretationUserHintBlock(question);
  if (interpretationHint) {
    parts.push(interpretationHint);
  }
  return parts.join("");
}

// ../../web/lib/general-ask-user-message.ts
var GENERAL_ASK_PRIOR_TURNS_MAX = 6;
function formatPriorTurnsForGeneralAskPrompt(turns) {
  return turns.map((t, i) => `Turn ${i + 1}
Q: ${t.question}
A: ${t.answer}`).join("\n\n---\n\n");
}
function buildGeneralAskUserMessageContent(question, priorTurns) {
  const parts = [];
  const normalizedPrior = priorTurns?.length ? priorTurns.slice(-GENERAL_ASK_PRIOR_TURNS_MAX) : void 0;
  if (normalizedPrior?.length) {
    parts.push("Prior questions and answers in this chat (no note access):\n\n");
    parts.push(formatPriorTurnsForGeneralAskPrompt(normalizedPrior));
  }
  parts.push("\n\nQuestion: ", question.trim());
  const interpretationHint = buildAskInterpretationUserHintBlock(question);
  if (interpretationHint) {
    parts.push("\n\n", interpretationHint);
  }
  return parts.join("");
}

// ../../web/lib/corpus-notes-prompt.ts
function buildCorpusNotesPromptBlock(notes) {
  const sections = notes.map((note, index) => {
    const lines = [`Note ${index + 1}: ${note.title}`];
    if (note.createdAt) {
      lines.push(`Created: ${note.createdAt}`);
    }
    if (note.summary) {
      lines.push(`Summary:
${note.summary}`);
    }
    if (note.keyPhrases?.length) {
      lines.push(`Key phrases:
${note.keyPhrases.map((phrase) => `- ${phrase}`).join("\n")}`);
    }
    if (note.tasks?.length) {
      lines.push(`Open tasks:
${note.tasks.map((task) => `- ${task.text}`).join("\n")}`);
    }
    if (note.transcriptExcerpt) {
      lines.push(`Transcript excerpt:
${note.transcriptExcerpt}`);
    }
    return lines.join("\n");
  });
  return [
    "Inbox notes (compact context selected from the user inbox; answer using only these notes):",
    sections.join("\n\n---\n\n")
  ].join("\n\n");
}

// ../../web/lib/inbox-ask-user-message.ts
var INBOX_ASK_PRIOR_TURNS_MAX = 6;
function formatPriorTurnsForInboxAskPrompt(turns) {
  return turns.map((t, i) => `Turn ${i + 1}
Q: ${t.question}
A: ${t.answer}`).join("\n\n---\n\n");
}
function buildInboxAskUserMessageContent(corpusNotes, question, priorTurns) {
  const parts = [buildCorpusNotesPromptBlock(corpusNotes)];
  const normalizedPrior = priorTurns?.length ? priorTurns.slice(-INBOX_ASK_PRIOR_TURNS_MAX) : void 0;
  if (normalizedPrior?.length) {
    parts.push("\n\nPrior questions and answers in this inbox chat:\n\n");
    parts.push(formatPriorTurnsForInboxAskPrompt(normalizedPrior));
  }
  parts.push("\n\nQuestion: ", question.trim());
  const interpretationHint = buildAskInterpretationUserHintBlock(question);
  if (interpretationHint) {
    parts.push("\n\n", interpretationHint);
  }
  return parts.join("");
}

// ../../web/lib/normalizeTaskDeadlineFields.ts
var DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
var HAS_TIME_COMPONENT_RE = /T\d{2}:\d{2}/;
var ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/;
function pad2(n) {
  return `${n}`.padStart(2, "0");
}
function formatLocalDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatLocalTime(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function isValidCalendarDate(y, mo, d) {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
function normalizeTaskDeadlineFields(value) {
  if (value === null || value === void 0) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;
  const dateOnlyMatch = DATE_ONLY_RE.exec(trimmed);
  if (dateOnlyMatch) {
    const y = Number(dateOnlyMatch[1]);
    const mo = Number(dateOnlyMatch[2]);
    const d = Number(dateOnlyMatch[3]);
    if (!isValidCalendarDate(y, mo, d)) return null;
    return { deadline: trimmed };
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime()) || !ISO_DATETIME_RE.test(trimmed)) return null;
  const deadline = formatLocalDate(parsed);
  if (!HAS_TIME_COMPONENT_RE.test(trimmed)) {
    return { deadline };
  }
  const deadlineTime = formatLocalTime(parsed);
  if (deadlineTime === "00:00") {
    return { deadline };
  }
  return { deadline, deadlineTime };
}

// ../../web/lib/parse-openrouter-json.ts
function extractJsonObjectSlice(raw2) {
  const trimmed = raw2.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return withoutFences;
  }
  return withoutFences.slice(start, end + 1);
}
function parseOpenRouterJsonContent(raw2) {
  const trimmed = raw2.trim();
  if (!trimmed) {
    throw new Error("Invalid AI response: empty content");
  }
  const slice = extractJsonObjectSlice(trimmed);
  try {
    return JSON.parse(slice);
  } catch {
    throw new Error("Invalid AI response: model returned non-JSON content");
  }
}

// ../../web/lib/inbox-ask-tools.ts
var INBOX_ASK_TOOL_NAMES = [
  "search_notes",
  "get_note",
  "list_tasks",
  "get_related_notes"
];
var INBOX_ASK_MAX_TOOL_ROUNDS = 3;
var INBOX_ASK_TOOL_CALL_TTL_MS = 2 * 60 * 1e3;
var TOOL_NAME_SET = new Set(INBOX_ASK_TOOL_NAMES);
function isInboxAskToolName(value) {
  return typeof value === "string" && TOOL_NAME_SET.has(value);
}
var INBOX_ASK_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "search_notes",
      description: "Search the user voice-note inbox by meaning and keywords. Returns compact note context only.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query, max 240 characters." },
          limit: { type: "integer", minimum: 1, maximum: 6 }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_note",
      description: "Open one note by recordId and return bounded text metadata. Does not return audio.",
      parameters: {
        type: "object",
        properties: {
          recordId: { type: "string" },
          includeTranscriptExcerpt: {
            type: "boolean",
            description: "When true, include a short transcript excerpt, never the full transcript."
          }
        },
        required: ["recordId"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks extracted from notes, optionally scoped to one record.",
      parameters: {
        type: "object",
        properties: {
          recordId: { type: "string" },
          filter: { type: "string", enum: ["open", "done", "all"] },
          limit: { type: "integer", minimum: 1, maximum: 30 }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_related_notes",
      description: "Find notes related to a given recordId using local note relationships/similarity.",
      parameters: {
        type: "object",
        properties: {
          recordId: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 6 }
        },
        required: ["recordId"],
        additionalProperties: false
      }
    }
  }
];
function safeParseToolArguments(raw2) {
  if (raw2 && typeof raw2 === "object" && !Array.isArray(raw2)) {
    return raw2;
  }
  if (typeof raw2 !== "string") return {};
  try {
    const parsed = JSON.parse(raw2);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// ../../web/services/ai.service.ts
var MEETING_DIALOGUE_MARKDOWN_MAX_CHARS = 12e3;
function stripOptionalMarkdownFences(raw2) {
  return raw2.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
function normalizeMeetingDialogueMarkdownField(rawMd) {
  const trimmed = rawMd.trim();
  if (!trimmed) {
    return {};
  }
  const meetingDialogueMarkdown = trimmed.length > MEETING_DIALOGUE_MARKDOWN_MAX_CHARS ? trimmed.slice(0, MEETING_DIALOGUE_MARKDOWN_MAX_CHARS) : trimmed;
  return { meetingDialogueMarkdown };
}
function buildSummaryAiResult(content, message, response, extractReasoning) {
  const parsed = parseOpenRouterJsonContent(content);
  if (!parsed || typeof parsed !== "object" || !("summary" in parsed) || !("tasks" in parsed) || !Array.isArray(parsed.tasks)) {
    throw new Error("Invalid AI response: unexpected structure");
  }
  const tasks = parsed.tasks.map((t) => {
    if (!t || typeof t !== "object" || !("title" in t) || !("priority" in t) || typeof t.title !== "string" || !["high", "medium", "low"].includes(t.priority)) {
      throw new Error("Invalid AI response: invalid task structure");
    }
    const task = t;
    const normalizedDeadline = normalizeTaskDeadlineFields(task.deadline);
    return {
      title: task.title,
      priority: task.priority,
      deadline: normalizedDeadline?.deadline ?? null,
      ...normalizedDeadline?.deadlineTime ? { deadlineTime: normalizedDeadline.deadlineTime } : {}
    };
  });
  const rawTags = "tags" in parsed && Array.isArray(parsed.tags) ? parsed.tags : [];
  const tags = rawTags.filter((tag) => typeof tag === "string").map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const validClassifications = [
    "personal",
    "work",
    "meeting",
    "idea",
    "other"
  ];
  const rawClassification = "classification" in parsed ? parsed.classification : void 0;
  const classification = typeof rawClassification === "string" && validClassifications.includes(rawClassification) ? rawClassification : void 0;
  const rawKeyPhrases = "keyPhrases" in parsed && Array.isArray(parsed.keyPhrases) ? parsed.keyPhrases : [];
  const keyPhrases = rawKeyPhrases.filter((p) => typeof p === "string").map((p) => p.trim()).filter(Boolean);
  const rawNextSteps = "nextSteps" in parsed && Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [];
  const nextSteps = rawNextSteps.filter((s) => typeof s === "string").map((s) => s.trim()).filter(Boolean);
  const suggestedTitle = "suggestedTitle" in parsed && typeof parsed.suggestedTitle === "string" ? String(parsed.suggestedTitle).trim() : "";
  const reasoningText = extractReasoning(message);
  const tokenUsage = extractOpenRouterTokenUsage(response);
  return {
    summary: String(parsed.summary),
    suggestedTitle: suggestedTitle || String(parsed.summary).slice(0, 50).trim() || "Voice note",
    tasks,
    tags,
    ...classification && { classification },
    ...keyPhrases.length > 0 && { keyPhrases },
    ...nextSteps.length > 0 && { nextSteps },
    ...reasoningText ? { reasoning: reasoningText } : {},
    ...tokenUsage ? { tokenUsage } : {}
  };
}
async function callSummaryModel(transcript, model, systemPrompt, clientUserAgent, deviceId) {
  const { content, message, raw: raw2 } = await withTimeout(
    sendAiChatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript }
      ],
      jsonObject: true,
      withReasoning: true,
      temperature: isDeepSeekOpenRouterModel(model) ? void 0 : 0.3,
      clientUserAgent,
      userId: deviceId
    }),
    TIMEOUTS.AI_PROCESSING,
    "AI summary processing timeout"
  );
  const extractReasoningFn = isDeepSeekOpenRouterModel(model) ? extractDeepSeekReasoning : extractOpenRouterReasoning;
  return buildSummaryAiResult(content, message, raw2, extractReasoningFn);
}
var ASK_ANSWER_KINDS = /* @__PURE__ */ new Set(["plain", "list", "tasks", "decisions"]);
var ASK_ITEMS_MAX = 12;
var ASK_ITEM_MAX_CHARS = 500;
var ASK_EVIDENCE_MAX = 5;
var ASK_EVIDENCE_QUOTE_MAX_CHARS = 500;
var ASK_EVIDENCE_LABEL_MAX_CHARS = 120;
var ASK_FOLLOW_UP_MAX = 3;
var ASK_FOLLOW_UP_MAX_CHARS = 180;
var ASK_INTERPRETATIONS_MAX = 3;
var ASK_INTERPRETATION_MAX_CHARS = 400;
function sanitizeAskAnswerKind(value) {
  return typeof value === "string" && ASK_ANSWER_KINDS.has(value) ? value : void 0;
}
function sanitizeAskItems(value) {
  if (!Array.isArray(value)) return void 0;
  const out = value.map((item) => typeof item === "string" ? item.replace(/\s+/g, " ").trim() : "").filter(Boolean).slice(0, ASK_ITEMS_MAX).map((item) => item.slice(0, ASK_ITEM_MAX_CHARS));
  return out.length ? out : void 0;
}
function sanitizeAskFollowUps(value) {
  if (!Array.isArray(value)) return void 0;
  const out = value.map((item) => typeof item === "string" ? item.replace(/\s+/g, " ").trim() : "").filter(Boolean).slice(0, ASK_FOLLOW_UP_MAX).map((item) => item.slice(0, ASK_FOLLOW_UP_MAX_CHARS));
  return out.length ? out : void 0;
}
function sanitizeAskInterpretations(value) {
  if (!Array.isArray(value)) return void 0;
  const out = value.map((item) => typeof item === "string" ? item.replace(/\s+/g, " ").trim() : "").filter(Boolean).slice(0, ASK_INTERPRETATIONS_MAX).map((item) => item.slice(0, ASK_INTERPRETATION_MAX_CHARS));
  return out.length ? out : void 0;
}
function sanitizeAskEvidence(value) {
  if (!Array.isArray(value)) return void 0;
  const out = [];
  for (const item of value.slice(0, ASK_EVIDENCE_MAX)) {
    if (!item || typeof item !== "object") continue;
    const o = item;
    const quote = typeof o.quote === "string" ? o.quote.replace(/\s+/g, " ").trim() : "";
    if (!quote) continue;
    const source = typeof o.source === "string" ? o.source : void 0;
    const offsetMs = typeof o.offsetMs === "number" && Number.isFinite(o.offsetMs) ? Math.max(0, Math.round(o.offsetMs)) : o.offsetMs === null ? null : void 0;
    const label = typeof o.label === "string" ? o.label.replace(/\s+/g, " ").trim().slice(0, ASK_EVIDENCE_LABEL_MAX_CHARS) : void 0;
    out.push({
      quote: quote.slice(0, ASK_EVIDENCE_QUOTE_MAX_CHARS),
      ...source ? { source } : {},
      ...offsetMs !== void 0 ? { offsetMs } : {},
      ...label ? { label } : {}
    });
  }
  return out.length ? out : void 0;
}
function extractAnswerFromResponse(responseContent) {
  const trimmed = responseContent.trim();
  if (!trimmed) {
    throw new Error("Invalid AI response: empty content");
  }
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        const obj = parsed;
        const knownKeys = ["answer", "response", "text", "content", "result"];
        for (const key of knownKeys) {
          const val = obj[key];
          if (typeof val === "string" && val.length > 0) {
            const answerKind = sanitizeAskAnswerKind(obj.answerKind);
            const items = sanitizeAskItems(obj.items);
            const evidence = sanitizeAskEvidence(obj.evidence);
            const interpretations = sanitizeAskInterpretations(obj.interpretations);
            const suggestedFollowUps = sanitizeAskFollowUps(obj.suggestedFollowUps);
            return {
              answer: val,
              ...answerKind ? { answerKind } : {},
              ...items ? { items } : {},
              ...evidence ? { evidence } : {},
              ...interpretations ? { interpretations } : {},
              ...suggestedFollowUps ? { suggestedFollowUps } : {}
            };
          }
        }
        const firstString = Object.values(obj).find((v) => typeof v === "string" && v.length > 0);
        if (typeof firstString === "string") return { answer: firstString };
      }
    } catch {
      console.warn("Invalid AI response: JSON parse failed", responseContent);
      return { answer: trimmed };
    }
  }
  return { answer: trimmed };
}
async function processTranscript(transcript, model, systemPrompt, clientUserAgent, deviceId) {
  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);
  return withSequentialModelFallback(
    models,
    (m) => callSummaryModel(transcript, m, systemPrompt, clientUserAgent, deviceId),
    (err) => isRetryableAiChatTransportError(err) || err instanceof Error && err.message.startsWith("Invalid AI response")
  );
}
function parseMeetingDialogueOpenRouterContent(content) {
  try {
    const parsed = parseOpenRouterJsonContent(content);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid AI response: meeting dialogue expected object");
    }
    const rawMd = "meetingDialogueMarkdown" in parsed && typeof parsed.meetingDialogueMarkdown === "string" ? String(parsed.meetingDialogueMarkdown).trim() : "";
    return normalizeMeetingDialogueMarkdownField(rawMd);
  } catch (err) {
    const plain = stripOptionalMarkdownFences(content);
    if (plain && !plain.startsWith("{")) {
      return normalizeMeetingDialogueMarkdownField(plain);
    }
    throw err;
  }
}
async function processMeetingDialogueMarkdown(userContent, systemPrompt, clientUserAgent, deviceId) {
  const models = filterModelsForAiChat([...MEETING_DIALOGUE_MODEL_FALLBACK_CHAIN]);
  return withTimeout(
    withSequentialModelFallback(
      models,
      async (m) => {
        const { content, raw: raw2 } = await sendAiChatCompletion({
          model: m,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          jsonObject: true,
          temperature: isDeepSeekOpenRouterModel(m) ? void 0 : 0.3,
          clientUserAgent,
          userId: deviceId
        });
        const tokenUsage = extractOpenRouterTokenUsage(raw2);
        return {
          ...parseMeetingDialogueOpenRouterContent(content),
          ...tokenUsage ? { tokenUsage } : {}
        };
      },
      (err) => isRetryableAiChatTransportError(err) || err instanceof Error && err.message.startsWith("Invalid AI response")
    ),
    TIMEOUTS.AI_PROCESSING,
    "Meeting dialogue processing timeout"
  );
}
async function processAskQuestion(transcript, question, model, summary, tasks, priorTurns, clientUserAgent, recordingMarks, deviceId, linkedNotes) {
  const userContent = buildAskUserMessageContent(
    transcript,
    question,
    summary,
    tasks,
    priorTurns,
    recordingMarks,
    linkedNotes
  );
  const callAsk = async (m) => {
    const { content } = await withTimeout(
      sendAiChatCompletion({
        model: m,
        messages: [
          { role: "system", content: ASK_QUESTION_SYSTEM_PROMPT },
          { role: "user", content: userContent }
        ],
        jsonObject: true,
        temperature: isDeepSeekOpenRouterModel(m) ? void 0 : 0.3,
        clientUserAgent,
        userId: deviceId
      }),
      TIMEOUTS.AI_CHAT,
      "AI ask processing timeout"
    );
    return extractAnswerFromResponse(content);
  };
  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);
  return withSequentialModelFallback(models, callAsk, isRetryableAiChatTransportError);
}
async function processInboxAskQuestion(corpusNotes, question, model, priorTurns, clientUserAgent, deviceId) {
  const userContent = buildInboxAskUserMessageContent(corpusNotes, question, priorTurns);
  const callAsk = async (m) => {
    const { content } = await withTimeout(
      sendAiChatCompletion({
        model: m,
        messages: [
          { role: "system", content: INBOX_ASK_SYSTEM_PROMPT },
          { role: "user", content: userContent }
        ],
        jsonObject: true,
        temperature: isDeepSeekOpenRouterModel(m) ? void 0 : 0.3,
        clientUserAgent,
        userId: deviceId
      }),
      TIMEOUTS.AI_CHAT,
      "AI inbox ask processing timeout"
    );
    return extractAnswerFromResponse(content);
  };
  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);
  return withSequentialModelFallback(models, callAsk, isRetryableAiChatTransportError);
}
async function processGeneralAskQuestion(question, model, priorTurns, clientUserAgent, deviceId) {
  const userContent = buildGeneralAskUserMessageContent(question, priorTurns);
  const callAsk = async (m) => {
    const { content } = await withTimeout(
      sendAiChatCompletion({
        model: m,
        messages: [
          { role: "system", content: GENERAL_ASK_SYSTEM_PROMPT },
          { role: "user", content: userContent }
        ],
        jsonObject: true,
        temperature: isDeepSeekOpenRouterModel(m) ? void 0 : 0.3,
        clientUserAgent,
        userId: deviceId
      }),
      TIMEOUTS.AI_CHAT,
      "AI general ask processing timeout"
    );
    return extractAnswerFromResponse(content);
  };
  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);
  return withSequentialModelFallback(models, callAsk, isRetryableAiChatTransportError);
}
function extractFirstInboxAskToolCall(toolCalls, round) {
  if (!toolCalls?.length) return null;
  for (const raw2 of toolCalls) {
    if (!raw2 || typeof raw2 !== "object") continue;
    const obj = raw2;
    const id = typeof obj.id === "string" && obj.id.trim() ? obj.id.trim() : "";
    const fn = obj.function && typeof obj.function === "object" ? obj.function : null;
    const functionObj = fn;
    const name = typeof functionObj?.name === "string" ? functionObj.name.trim() : "";
    if (!id || !isInboxAskToolName(name)) continue;
    return {
      toolCallId: id,
      toolName: name,
      arguments: safeParseToolArguments(functionObj?.arguments),
      round,
      expiresAt: new Date(Date.now() + INBOX_ASK_TOOL_CALL_TTL_MS).toISOString()
    };
  }
  return null;
}
function isToolUnsupportedError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return /tools?|tool_choice|tool_calls?|function calling|functions?/i.test(message);
}
async function processInboxAskQuestionWithTools(params) {
  const {
    corpusNotes,
    question,
    model,
    priorTurns,
    clientUserAgent,
    deviceId,
    toolMessages,
    toolSteps = [],
    toolRound = 0
  } = params;
  const initialMessages = [
    { role: "system", content: INBOX_ASK_SYSTEM_PROMPT },
    { role: "user", content: buildInboxAskUserMessageContent(corpusNotes, question, priorTurns) }
  ];
  const messages = toolMessages?.length ? toolMessages : initialMessages;
  const nextRound = toolRound + 1;
  const canUseTools = nextRound <= INBOX_ASK_MAX_TOOL_ROUNDS;
  const callAsk = async (m) => {
    const { content, toolCalls } = await withTimeout(
      sendAiChatCompletion({
        model: m,
        messages,
        tools: canUseTools ? INBOX_ASK_TOOL_DEFINITIONS : void 0,
        toolChoice: canUseTools ? "auto" : "none",
        jsonObject: !canUseTools,
        temperature: isDeepSeekOpenRouterModel(m) ? void 0 : 0.3,
        clientUserAgent,
        userId: deviceId
      }),
      TIMEOUTS.AI_CHAT,
      "AI inbox ask processing timeout"
    );
    const toolCall = canUseTools ? extractFirstInboxAskToolCall(toolCalls, nextRound) : null;
    if (toolCall) {
      const assistantMessage = {
        role: "assistant",
        content: typeof content === "string" && content.trim() ? content : null,
        tool_calls: toolCalls
      };
      return {
        status: "needs_tool",
        toolCall,
        toolMessages: [...messages, assistantMessage],
        toolSteps: [
          ...toolSteps,
          {
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            round: toolCall.round,
            status: "requested"
          }
        ]
      };
    }
    return {
      status: "done",
      result: extractAnswerFromResponse(content),
      toolMessages: messages,
      toolSteps
    };
  };
  const models = filterModelsForAiChat([model, ...USER_AI_MODEL_FALLBACK_CHAIN]);
  try {
    return await withSequentialModelFallback(models, callAsk, isRetryableAiChatTransportError);
  } catch (err) {
    if (!toolMessages?.length && isToolUnsupportedError(err)) {
      return {
        status: "done",
        result: await processInboxAskQuestion(
          corpusNotes,
          question,
          model,
          priorTurns,
          clientUserAgent,
          deviceId
        )
      };
    }
    throw err;
  }
}
function extractExpectedNoteIdsFromCompactPayload(compactPayload) {
  try {
    const p = JSON.parse(compactPayload);
    if (!Array.isArray(p.notes)) return [];
    return p.notes.map((n) => {
      if (!n || typeof n !== "object") return "";
      const id = n.id;
      return typeof id === "string" ? id.trim() : "";
    }).filter(Boolean);
  } catch {
    return [];
  }
}
function compactAutoOrganizeInput(notesJsonPayload) {
  try {
    const parsed = JSON.parse(notesJsonPayload);
    if (!parsed || typeof parsed !== "object") return notesJsonPayload;
    const obj = parsed;
    if (!Array.isArray(obj.notes)) return notesJsonPayload;
    const truncateText = (s, maxChars) => {
      if (typeof s !== "string") return void 0;
      const trimmed = s.trim();
      if (!trimmed) return void 0;
      return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, maxChars)}...`;
    };
    const compactNotes = obj.notes.map((note) => {
      if (!note || typeof note !== "object") return null;
      const n = note;
      const id = typeof n.id === "string" ? n.id.trim() : "";
      if (!id) return null;
      const summary = truncateText(n.summary, AUTO_ORGANIZE_MAX_SUMMARY_CHARS);
      const rawTranscript = typeof n.transcript === "string" && n.transcript.trim() ? n.transcript.trim() : "";
      const transcriptOut = rawTranscript ? summary ? smartTranscriptExcerpt(rawTranscript, AUTO_ORGANIZE_TRANSCRIPT_HINT_MAX_CHARS) : smartTranscriptExcerpt(rawTranscript, AUTO_ORGANIZE_MAX_TRANSCRIPT_CHARS) : void 0;
      const next = { id };
      if (typeof n.title === "string" && n.title.trim()) {
        next.title = n.title.trim().slice(0, AUTO_ORGANIZE_MAX_TITLE_CHARS);
      }
      if (summary) {
        next.summary = summary;
      }
      if (transcriptOut) {
        next.transcript = transcriptOut;
      }
      if (typeof n.classification === "string" && n.classification.trim()) {
        next.classification = n.classification.trim();
      }
      if (typeof n.createdAt === "string" && n.createdAt.trim()) {
        next.createdAt = n.createdAt.trim().slice(0, 10);
      }
      if (typeof n.ageDays === "number" && Number.isFinite(n.ageDays) && n.ageDays >= 0) {
        next.ageDays = Math.floor(n.ageDays);
      }
      if (typeof n.folderName === "string" && n.folderName.trim()) {
        next.folderName = n.folderName.trim();
      }
      if (n.isPinned === true) {
        next.isPinned = true;
      }
      if (n.isRead === true) {
        next.isRead = true;
      }
      if (typeof n.taskCount === "number" && Number.isFinite(n.taskCount) && n.taskCount > 0) {
        next.taskCount = Math.floor(n.taskCount);
      }
      if (typeof n.openTaskCount === "number" && Number.isFinite(n.openTaskCount) && n.openTaskCount > 0) {
        next.openTaskCount = Math.floor(n.openTaskCount);
      }
      if (Array.isArray(n.openTasks)) {
        const openTasks = n.openTasks.filter((task) => typeof task === "string" && task.trim().length > 0).map((task) => task.trim().slice(0, 72));
        if (openTasks.length > 0) {
          next.openTasks = openTasks.slice(0, 5);
        }
      }
      if (n.allTasksDone === true) {
        next.allTasksDone = true;
      }
      return next;
    }).filter(Boolean);
    const src = parsed;
    const out = { notes: compactNotes };
    if (typeof src.appLanguage === "string" && src.appLanguage.trim()) {
      out.appLanguage = src.appLanguage.trim().toLowerCase().slice(0, 2);
    }
    if (Array.isArray(src.existingFolders)) {
      out.existingFolders = src.existingFolders;
    }
    if (typeof src.mode === "string" && src.mode.trim()) {
      out.mode = src.mode.trim();
    }
    if (typeof src.template === "string" && src.template.trim()) {
      out.template = src.template.trim();
    }
    return JSON.stringify(out);
  } catch {
    return notesJsonPayload;
  }
}
function assertAutoOrganizeParsedComplete(result, mode, expectedIds) {
  if (mode === "suggest_archive") {
    assertAutoOrganizeArchiveComplete(
      result,
      expectedIds
    );
    return;
  }
  if (mode === "consolidate_folders") {
    return;
  }
  assertAutoOrganizeFoldersComplete(
    result,
    expectedIds,
    mode
  );
}
async function processAutoOrganizeFolders(notesJsonPayload, model, options) {
  const mode = options?.mode ?? "full";
  const template = normalizeAutoOrganizeTemplate(options?.template);
  const clientUserAgent = options?.clientUserAgent;
  const compactPayload = compactAutoOrganizeInput(notesJsonPayload);
  let expectedIds = extractExpectedNoteIdsFromCompactPayload(compactPayload);
  if (expectedIds.length === 0) {
    expectedIds = extractExpectedNoteIdsFromCompactPayload(notesJsonPayload);
  }
  const systemPrompt = buildAutoOrganizeSystemPrompt(mode, template);
  const sendOrganize = async (m, userContent) => {
    const { content } = await sendAiChatCompletion({
      model: m,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      jsonObject: true,
      temperature: isDeepSeekOpenRouterModel(m) ? void 0 : 0.12,
      clientUserAgent
    });
    const result = parseAutoOrganizeResultForMode(content, mode);
    assertAutoOrganizeParsedComplete(result, mode, expectedIds);
    return result;
  };
  const organizeWithRepair = async (m) => {
    try {
      return await sendOrganize(m, compactPayload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!msg.startsWith("Invalid AI response")) {
        throw e;
      }
      return await sendOrganize(
        m,
        compactPayload + buildAutoOrganizeRepairUserSuffix(mode, expectedIds)
      );
    }
  };
  const models = filterModelsForAiChat([model, ...SYSTEM_TASK_MODEL_FALLBACK_CHAIN]);
  return withSequentialModelFallback(
    models,
    organizeWithRepair,
    (err) => isRetryableAiChatTransportError(err) || isAutoOrganizeParseFailure(err)
  );
}

// ../../web/lib/ai-job-runners/run-auto-organize-job.ts
async function decrementAutoOrganizeWeekly(deviceId) {
  const pro = await isProDevice(deviceId);
  if (pro) return;
  const key = getAutoOrganizeWeeklyKey(deviceId);
  await redis.decr(key);
}
async function runAutoOrganizeJob(payload) {
  const { jobId: id, deviceId, messageTtlSeconds: ttl, notesPayload, clientUserAgent } = payload;
  const saveAutoOrganizeMessage = (msgId, data) => saveMessage(msgId, data, ttl);
  try {
    const result = await processAutoOrganizeFolders(notesPayload, SYSTEM_MICRO_TASK_MODEL, {
      clientUserAgent,
      mode: payload.mode ?? "full",
      template: payload.template ?? "general"
    });
    await saveAutoOrganizeMessage(id, {
      id,
      status: "done",
      result,
      mode: payload.mode ?? "full"
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      const chargedUsageUnits = payload.chargedUsageUnits ?? AUTO_ORGANIZE_CHARGED_USAGE_UNITS;
      await decrementBy(deviceId, chargedUsageUnits, {
        operation: "auto_organize",
        jobId: id,
        metadata: { chargedUsageUnits }
      });
      await decrementAutoOrganizeWeekly(deviceId);
      await saveAutoOrganizeMessage(id, {
        id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error"
      });
    }
    throw err;
  }
}

// ../../web/lib/ai-job-payload.ts
function getJobPayloadKey(jobId) {
  return `${JOB_PAYLOAD_KEY_PREFIX}${jobId}`;
}
function envelopeFromPayload(payload) {
  return {
    jobId: payload.jobId,
    operation: payload.operation,
    deviceId: payload.deviceId,
    messageTtlSeconds: payload.messageTtlSeconds
  };
}
async function saveJobPayload(payload) {
  const key = getJobPayloadKey(payload.jobId);
  await redis.set(key, JSON.stringify(payload), { ex: payload.messageTtlSeconds });
}
async function getJobPayload(jobId) {
  const raw2 = await redis.get(getJobPayloadKey(jobId));
  if (!raw2) return null;
  try {
    if (typeof raw2 === "object" && raw2 !== null) {
      return raw2;
    }
    return JSON.parse(raw2);
  } catch {
    return null;
  }
}
async function deleteJobPayload(jobId) {
  await redis.del(getJobPayloadKey(jobId));
}

// ../../web/lib/meeting-job-payload.ts
function getMeetingJobPayloadKey(jobId) {
  return `${MEETING_JOB_PAYLOAD_KEY_PREFIX}${jobId}`;
}
async function saveMeetingJobPayload(payload) {
  const key = getMeetingJobPayloadKey(payload.jobId);
  await redis.set(key, JSON.stringify(payload), { ex: payload.messageTtlSeconds });
}
async function getMeetingJobPayload(jobId) {
  const raw2 = await redis.get(getMeetingJobPayloadKey(jobId));
  if (!raw2) return null;
  try {
    if (typeof raw2 === "object" && raw2 !== null) {
      return raw2;
    }
    return JSON.parse(raw2);
  } catch {
    return null;
  }
}
async function deleteMeetingJobPayload(jobId) {
  await redis.del(getMeetingJobPayloadKey(jobId));
}

// ../../web/lib/ai-model-display.ts
var AI_MODEL_DISPLAY_LABELS = {
  [AI_MODEL_GEMINI_2_5_FLASH_LITE]: "Gemini 2.5 Flash Lite",
  [AI_MODEL_GEMINI_3_1_FLASH_LITE]: "Gemini 3.1 Flash Lite",
  [AI_MODEL_DEEPSEEK_V4_FLASH]: "DeepSeek V4 Flash",
  [AI_MODEL_DEEPSEEK_V4_PRO]: "DeepSeek V4 Pro",
  [AI_MODEL_GPT_5_4_NANO]: "GPT-5.4 Nano",
  [AI_MODEL_MIMO_V2_5]: "MiMo V2.5",
  [AI_MODEL_MIMO_V2_5_PRO]: "MiMo V2.5 Pro",
  [AI_MODEL_MINIMAX_M3]: "MiniMax M3",
  [LEGACY_AI_MODEL_MINIMAX_M2_7]: "MiniMax M2.7",
  [AI_MODEL_NEMOTRON_3_SUPER]: "Nemotron 3 Super"
};
function fallbackDisplayLabel(modelId) {
  const slug = modelId.includes("/") ? modelId.split("/").pop() : modelId;
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
function getAiModelDisplayLabel(modelId) {
  const canonical = normalizeIncomingAiModel(modelId.trim());
  if (!canonical) return "";
  return AI_MODEL_DISPLAY_LABELS[canonical] ?? fallbackDisplayLabel(canonical);
}
function aiModelResponseFields(modelId) {
  const model = normalizeIncomingAiModel(modelId.trim());
  return { model, modelLabel: getAiModelDisplayLabel(model) };
}

// ../../web/lib/ai-job-fail.ts
var toLedgerOperation = (operation) => operation === "folder_auto_organize" ? "auto_organize" : operation === "meeting_dialogue_retry" ? "meeting_dialogue" : operation;
async function markAiJobFailed(envelope, error) {
  const { jobId, deviceId, messageTtlSeconds: ttl, operation } = envelope;
  const existing = await getMessage(jobId);
  const model = existing && typeof existing.model === "string" ? existing.model : void 0;
  if (operation === "meeting_dialogue") {
    await decrement(deviceId, {
      operation: "meeting_dialogue",
      jobId,
      description: "Meeting dialogue generation failed"
    });
    if (existing?.status === "done") {
      await saveMessage(
        jobId,
        {
          ...existing,
          meetingDialogueStatus: "failed"
        },
        ttl
      );
    }
    await deleteMeetingJobPayload(jobId);
    return;
  }
  if (operation === "transcript_summarize" || operation === "transcript_ask" || operation === "inbox_ask" || operation === "general_ask") {
    const payload = await getJobPayload(jobId);
    const refundUnits = payload?.operation === "transcript_summarize" ? payload.chargedUsageUnits ?? 1 : 1;
    const ledgerOperation = payload?.operation === "transcript_summarize" ? resolveTranscriptSummarizeLedgerOperation(payload.chargedUsageUnits) : toLedgerOperation(operation);
    await decrementBy(deviceId, refundUnits, {
      operation: ledgerOperation,
      jobId,
      metadata: { chargedUsageUnits: refundUnits }
    });
    await saveMessage(
      jobId,
      {
        id: jobId,
        status: "error",
        error,
        ...model ? aiModelResponseFields(model) : {}
      },
      ttl
    );
  } else {
    const payload = await getJobPayload(jobId);
    const refundUnits = operation === "folder_auto_organize" ? payload?.operation === "folder_auto_organize" ? payload.chargedUsageUnits ?? AUTO_ORGANIZE_CHARGED_USAGE_UNITS : AUTO_ORGANIZE_CHARGED_USAGE_UNITS : 1;
    await decrementBy(deviceId, refundUnits, {
      operation: toLedgerOperation(operation),
      jobId,
      ...operation === "folder_auto_organize" ? { metadata: { chargedUsageUnits: refundUnits } } : {}
    });
    await decrementAutoOrganizeWeekly(deviceId);
    await saveMessage(
      jobId,
      {
        id: jobId,
        status: "error",
        error
      },
      ttl
    );
  }
  await deleteJobPayload(jobId);
}

// ../../web/lib/ai-job-lock.ts
function getJobLockKey(jobId) {
  return `${JOB_LOCK_KEY_PREFIX}${jobId}`;
}
async function acquireJobLock(jobId) {
  return redis.setIfNotExists(getJobLockKey(jobId), "1", { ex: JOB_LOCK_TTL_SECONDS });
}
async function releaseJobLock(jobId) {
  await redis.del(getJobLockKey(jobId));
}

// ../../web/lib/ai-job-cancel.ts
function getJobCancelledKey(jobId) {
  return `${JOB_CANCELLED_KEY_PREFIX}${jobId}`;
}
async function isAiJobCancelled(jobId) {
  const flag = await redis.get(getJobCancelledKey(jobId));
  if (flag != null && String(flag) === "1") {
    return true;
  }
  const msg = await getMessage(jobId);
  return msg?.status === "error" && msg.error === AI_JOB_CANCELLED_ERROR;
}
async function clearAiJobCancelled(jobId) {
  await redis.del(getJobCancelledKey(jobId));
}

// ../../web/lib/firebase-push.ts
import { getMessaging } from "firebase-admin/messaging";

// ../../web/lib/firebase-admin.ts
import { cert, getApps, initializeApp } from "firebase-admin";
var FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
var initialized = false;
function initFirebaseAdmin() {
  if (initialized) return getApps().length > 0;
  initialized = true;
  if (getApps().length > 0) return true;
  if (!FIREBASE_SERVICE_ACCOUNT?.trim()) return false;
  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(serviceAccount) });
    return true;
  } catch (err) {
    console.error("[firebase-admin] init failed:", err);
    return false;
  }
}

// ../../web/lib/push-messages.ts
var DEFAULT_LOCALE = "en";
var PUSH_LOCALES = ["en", "ru"];
function aiCompleteBody(locale, count) {
  if (locale === "ru") {
    if (count <= 1) return "\u0418\u0418 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C.";
    return `\u0418\u0418 \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 ${count} \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C.`;
  }
  if (count <= 1) return "AI processing complete. Open to see your notes.";
  return `AI processing complete for ${count} notes. Open to see them.`;
}
function getPushMessages(type, locale, count) {
  const loc = locale && PUSH_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  if (type === "ai_complete") {
    return { title: "Voice Inbox AI", body: aiCompleteBody(loc, count ?? 1) };
  }
  if (type === "policy_update") {
    return {
      title: "Voice Inbox AI",
      body: loc === "ru" ? "\u041C\u044B \u043E\u0431\u043D\u043E\u0432\u0438\u043B\u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0437\u043D\u0430\u043A\u043E\u043C\u044C\u0442\u0435\u0441\u044C." : "We updated our terms. Please review."
    };
  }
  if (type === "limit_exceeded") {
    return {
      title: "Voice Inbox AI",
      body: loc === "ru" ? "\u041D\u0435\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u043B\u0438\u043C\u0438\u0442 \u0418\u0418 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D." : "Weekly AI limit reached."
    };
  }
  return {
    title: "Voice Inbox AI",
    body: loc === "ru" ? "\u0412\u0430\u0448 \u043D\u0435\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u043B\u0438\u043C\u0438\u0442 \u0418\u0418 \u043F\u043E\u0447\u0442\u0438 \u0438\u0441\u0447\u0435\u0440\u043F\u0430\u043D." : "Your weekly AI limit is almost reached."
  };
}

// ../../web/lib/push-tokens.ts
function getPushTokenKey(deviceId) {
  return `${PUSH_TOKEN_KEY_PREFIX}${deviceId}`;
}
function getAppForegroundKey(deviceId) {
  return `${APP_FOREGROUND_KEY_PREFIX}${deviceId}`;
}
async function isAppInForeground(deviceId) {
  const key = getAppForegroundKey(deviceId);
  const value = await redis.get(key);
  return value != null;
}
function getPushPendingKey(deviceId) {
  return `${PUSH_PENDING_KEY_PREFIX}${deviceId}`;
}
function getPushLockKey(deviceId) {
  return `${PUSH_LOCK_KEY_PREFIX}${deviceId}`;
}
async function registerAiCompletion(deviceId) {
  const countKey = getPushPendingKey(deviceId);
  const lockKey = getPushLockKey(deviceId);
  await redis.incr(countKey);
  await redis.expire(countKey, PUSH_PENDING_TTL_SECONDS);
  const isLeader = await redis.setIfNotExists(lockKey, "1", { ex: PUSH_LOCK_TTL_SECONDS });
  return isLeader;
}
async function collectPendingAndUnlock(deviceId) {
  const countKey = getPushPendingKey(deviceId);
  const lockKey = getPushLockKey(deviceId);
  const value = await redis.get(countKey);
  const count = value ? parseInt(String(value), 10) || 0 : 0;
  await redis.del(countKey);
  await redis.del(lockKey);
  return count;
}
async function getPushTokenWithLocale(deviceId) {
  const key = getPushTokenKey(deviceId);
  const value = await redis.get(key);
  if (isDevelopmentAppEnv()) {
    console.log("[Push] getPushTokenWithLocale", {
      deviceId,
      key,
      hasValue: value != null,
      valueType: typeof value,
      valueLength: value != null ? String(value).length : 0
    });
  }
  if (value == null) return null;
  let data = null;
  if (typeof value === "object" && value !== null && "token" in value) {
    data = value;
  } else if (typeof value === "string") {
    if (value.startsWith("{")) {
      try {
        data = JSON.parse(value);
      } catch {
        return {
          token: value,
          locale: null,
          platform: null,
          deviceModel: null,
          appVersion: null,
          buildNumber: null,
          osVersion: null
        };
      }
    } else {
      return {
        token: value,
        locale: null,
        platform: null,
        deviceModel: null,
        appVersion: null,
        buildNumber: null,
        osVersion: null
      };
    }
  }
  return data?.token ? {
    token: data.token,
    locale: data.locale ?? null,
    platform: data.platform ?? null,
    deviceModel: data.deviceModel ?? null,
    appVersion: data.appVersion ?? null,
    buildNumber: data.buildNumber ?? null,
    osVersion: data.osVersion ?? null
  } : null;
}
async function cleanupInvalidPushToken(deviceId) {
  const key = getPushTokenKey(deviceId);
  await redis.del(key);
  console.log("[Push] cleaned up invalid token", { deviceId, key });
}

// ../../web/lib/firebase-push.ts
function getFcmErrorCode(err) {
  if (!err || typeof err !== "object") return "unknown";
  const record = err;
  return record.code || record.errorInfo?.code || "unknown";
}
function isTokenInvalidError(err) {
  if (!err || typeof err !== "object") return false;
  const errorCode = getFcmErrorCode(err);
  const invalidTokenCodes = [
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered",
    "messaging/invalid-argument"
  ];
  return invalidTokenCodes.includes(errorCode);
}
async function sendPushViaFirebase(fcmToken, payload, locale, completedCount, deviceId) {
  if (!initFirebaseAdmin()) {
    console.warn("[FCM] not available (no FIREBASE_SERVICE_ACCOUNT)");
    return false;
  }
  const defaults = getPushMessages(payload.type, locale, completedCount);
  const message = {
    token: fcmToken,
    notification: {
      title: payload.title ?? defaults.title,
      body: payload.body ?? defaults.body
    },
    data: {
      type: payload.type,
      ...payload.recordId && { recordId: payload.recordId },
      ...payload.message && { message: payload.message }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          "content-available": 1
        }
      }
    }
  };
  try {
    const response = await getMessaging().send(message);
    console.log("[FCM] send ok", { type: payload.type, responseId: response });
    return true;
  } catch (err) {
    const errorCode = getFcmErrorCode(err);
    console.error(
      "[FCM] send failed:",
      {
        type: payload.type,
        errorCode,
        tokenLen: fcmToken.length,
        deviceId
      },
      err
    );
    if (isTokenInvalidError(err) && deviceId) {
      console.warn("[FCM] invalid token detected, cleaning up", { deviceId, errorCode });
      await cleanupInvalidPushToken(deviceId).catch((cleanupErr) => {
        console.error("[FCM] token cleanup failed", { deviceId }, cleanupErr);
      });
    }
    return false;
  }
}

// ../../web/lib/ai-job-push.ts
async function notifyAiJobComplete(params) {
  const { deviceId, recordId, logLabel } = params;
  if (await isAiJobCancelled(recordId)) {
    if (isDevelopmentAppEnv()) {
      console.log(`[Push] ${logLabel}: skip (job cancelled)`, { deviceId, recordId });
    }
    return;
  }
  const isLeader = await registerAiCompletion(deviceId);
  if (!isLeader) {
    if (isDevelopmentAppEnv()) {
      console.log(`[Push] ${logLabel}: queued (leader will send)`, { deviceId });
    }
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, PUSH_DEBOUNCE_MS));
  const inForeground = await isAppInForeground(deviceId);
  const count = await collectPendingAndUnlock(deviceId);
  if (count === 0) return;
  if (inForeground) {
    if (isDevelopmentAppEnv()) {
      console.log(`[Push] ${logLabel}: skip (app in foreground after debounce)`, { deviceId });
    }
    return;
  }
  const data = await getPushTokenWithLocale(deviceId);
  if (data) {
    const sent = await sendPushViaFirebase(
      data.token,
      { type: "ai_complete", recordId },
      data.locale,
      count,
      deviceId
    );
    console.log(`[Push] ${logLabel}:`, sent ? "sent" : "failed", { deviceId, count });
  } else {
    console.warn(`[Push] ${logLabel}: no token for deviceId`, deviceId);
  }
}

// ../../web/lib/ai-job-runners/run-ask-job.ts
async function runAskJob(payload) {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    question,
    model,
    summary,
    tasks,
    priorTurns,
    clientUserAgent,
    recordingMarks,
    linkedNotes
  } = payload;
  const saveAskMessage = (msgId, data) => saveMessage(msgId, data, ttl);
  try {
    const result = await processAskQuestion(
      transcript,
      question,
      model,
      summary,
      tasks,
      priorTurns,
      clientUserAgent,
      recordingMarks,
      deviceId,
      linkedNotes
    );
    await saveAskMessage(id, {
      id,
      status: "done",
      ...aiModelResponseFields(model),
      ...payload.modelMode ? { modelMode: payload.modelMode } : {},
      answer: result.answer,
      ...result.answerKind ? { answerKind: result.answerKind } : {},
      ...result.items?.length ? { items: result.items } : {},
      ...result.evidence?.length ? { evidence: result.evidence } : {},
      ...result.interpretations?.length ? { interpretations: result.interpretations } : {},
      ...result.suggestedFollowUps?.length ? { suggestedFollowUps: result.suggestedFollowUps } : {}
    });
    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: "Ask complete"
    });
    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: "transcript_ask",
      jobId: id,
      metadata: aiModelResponseFields(model)
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrement(deviceId, {
        operation: "transcript_ask",
        jobId: id,
        metadata: { model }
      });
      await saveAskMessage(id, {
        id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        ...aiModelResponseFields(model),
        ...payload.modelMode ? { modelMode: payload.modelMode } : {}
      });
    }
    throw err;
  }
}

// ../../web/lib/ai-job-runners/run-general-ask-job.ts
async function runGeneralAskJob(payload) {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    question,
    model,
    priorTurns,
    clientUserAgent
  } = payload;
  const saveAskMessage = (msgId, data) => saveMessage(msgId, data, ttl);
  try {
    const result = await processGeneralAskQuestion(
      question,
      model,
      priorTurns,
      clientUserAgent,
      deviceId
    );
    await saveAskMessage(id, {
      id,
      status: "done",
      ...aiModelResponseFields(model),
      ...payload.modelMode ? { modelMode: payload.modelMode } : {},
      answer: result.answer,
      ...result.answerKind ? { answerKind: result.answerKind } : {},
      ...result.items?.length ? { items: result.items } : {},
      ...result.interpretations?.length ? { interpretations: result.interpretations } : {},
      ...result.suggestedFollowUps?.length ? { suggestedFollowUps: result.suggestedFollowUps } : {}
    });
    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: "General ask complete"
    });
    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: "general_ask",
      jobId: id,
      metadata: aiModelResponseFields(model)
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrement(deviceId, {
        operation: "general_ask",
        jobId: id,
        metadata: { model }
      });
      await saveAskMessage(id, {
        id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        ...aiModelResponseFields(model),
        ...payload.modelMode ? { modelMode: payload.modelMode } : {}
      });
    }
    throw err;
  }
}

// ../../web/lib/ai-job-runners/run-inbox-ask-job.ts
async function runInboxAskJob(payload) {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    corpusNotes,
    question,
    model,
    priorTurns,
    clientUserAgent
  } = payload;
  const saveAskMessage = (msgId, data) => saveMessage(msgId, data, ttl);
  try {
    const loop = await processInboxAskQuestionWithTools({
      priorTurns,
      corpusNotes,
      question,
      model,
      clientUserAgent,
      deviceId,
      toolMessages: payload.toolMessages,
      toolSteps: payload.toolSteps,
      toolRound: payload.toolRound
    });
    if (loop.status === "needs_tool") {
      await saveJobPayload({
        ...payload,
        pendingToolCall: loop.toolCall,
        toolMessages: loop.toolMessages,
        toolSteps: loop.toolSteps,
        toolRound: loop.toolCall.round
      });
      await saveAskMessage(id, {
        id,
        status: "needs_tool",
        ...aiModelResponseFields(model),
        ...payload.modelMode ? { modelMode: payload.modelMode } : {},
        toolCall: loop.toolCall,
        toolSteps: loop.toolSteps
      });
      return;
    }
    const result = loop.result;
    await saveAskMessage(id, {
      id,
      status: "done",
      ...aiModelResponseFields(model),
      ...payload.modelMode ? { modelMode: payload.modelMode } : {},
      answer: result.answer,
      ...result.answerKind ? { answerKind: result.answerKind } : {},
      ...result.items?.length ? { items: result.items } : {},
      ...result.evidence?.length ? { evidence: result.evidence } : {},
      ...result.interpretations?.length ? { interpretations: result.interpretations } : {},
      ...result.suggestedFollowUps?.length ? { suggestedFollowUps: result.suggestedFollowUps } : {},
      ...loop.toolSteps?.length ? { toolSteps: loop.toolSteps } : {}
    });
    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: "Inbox ask complete"
    });
    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: "inbox_ask",
      jobId: id,
      metadata: aiModelResponseFields(model)
    });
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrement(deviceId, {
        operation: "inbox_ask",
        jobId: id,
        metadata: { model }
      });
      await saveAskMessage(id, {
        id,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        ...aiModelResponseFields(model)
      });
    }
    throw err;
  }
}

// ../../web/lib/meeting-dialogue-user-prompt.ts
var USER_CONTENT_MAX_CHARS = 95e3;
function formatClockFromMs(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "?";
  }
  const totalSec = Math.floor(ms / 1e3);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor(totalSec % 3600 / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
function clip(s, max) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}\u2026`;
}
function buildTimedSegmentBlock(segments) {
  const lines = [];
  for (const seg of segments) {
    const start = seg.startMs !== void 0 ? formatClockFromMs(seg.startMs) : "?";
    const end = seg.endMs !== void 0 && seg.endMs > (seg.startMs ?? -1) ? `\u2013${formatClockFromMs(seg.endMs)}` : "";
    lines.push(`[${start}${end}] ${seg.text.replace(/\r\n/g, "\n").trim()}`);
  }
  return lines.join("\n");
}
function buildMeetingDialogueUserContent(input) {
  const parts = [];
  const p1 = input.phase1;
  if (p1 && (p1.suggestedTitle?.trim() || p1.keyPhrases && p1.keyPhrases.length > 0 || p1.summary?.trim())) {
    const title = p1.suggestedTitle?.trim() ? clip(p1.suggestedTitle.trim(), 200) : "";
    const phrases = (p1.keyPhrases ?? []).filter((x) => typeof x === "string" && x.trim()).slice(0, 8).map((x) => clip(x.trim(), 90));
    const summaryLine = p1.summary?.trim() ? clip(p1.summary.trim().replace(/\s+/g, " "), 320) : "";
    const ctxLines = [
      "## Note context (from the prior extraction pass on the same recording)",
      "Use only to disambiguate meeting shape or roles. Do not invent facts that are not supported by the transcript.",
      title ? `Suggested title: ${title}` : "",
      phrases.length > 0 ? `Key phrases: ${phrases.join("; ")}` : "",
      summaryLine ? `Summary (short): ${summaryLine}` : ""
    ].filter(Boolean);
    parts.push(ctxLines.join("\n"));
  }
  const hint = input.taskExtractionHint?.trim();
  if (hint) {
    parts.push(
      [
        "## Optional user note",
        "May describe speakers, interview layout, or how to group lines. Still ground every turn in the transcript; do not add new claims.",
        hint.length > 600 ? `${hint.slice(0, 599)}\u2026` : hint
      ].join("\n")
    );
  }
  if (input.segments && input.segments.length > 0) {
    parts.push(
      [
        "## Transcript with segment timestamps",
        "Timestamps are from automatic speech segmentation\u2014use them as soft hints for pauses and ordering. Wording of each turn must still match the transcript (do not invent sentences).",
        buildTimedSegmentBlock(input.segments)
      ].join("\n")
    );
  }
  const flat = input.plainTranscript.trim();
  const hasSegments = Boolean(input.segments && input.segments.length > 0);
  if (!(input.omitFullTranscript && hasSegments)) {
    parts.push(
      hasSegments ? ["## Full transcript (verbatim; primary source)", flat].join("\n") : ["## Transcript", flat].join("\n")
    );
  } else {
    parts.push(
      [
        "## Transcript source",
        "Use the timestamped segment lines above as the primary source. Do not invent lines outside those segments."
      ].join("\n")
    );
  }
  let body = parts.filter(Boolean).join("\n\n");
  if (body.length > USER_CONTENT_MAX_CHARS) {
    body = `${body.slice(0, USER_CONTENT_MAX_CHARS - 80)}

[... truncated for length ...]`;
  }
  return body;
}

// ../../web/lib/ai-job-runners/run-meeting-dialogue-job.ts
function shouldOmitFullTranscript(input) {
  return Boolean(input.segments?.length) && input.plainTranscript.trim().length > MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS;
}
async function runMeetingDialogueJob(payload) {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    meetingDialogueSystemPrompt,
    meetingDialogueAux,
    phase1,
    clientUserAgent
  } = payload;
  const existing = await getMessage(id);
  if (!existing || existing.status !== "done") {
    throw new Error("Meeting dialogue job requires a completed summarize message");
  }
  const mdStatus = existing.meetingDialogueStatus;
  if (mdStatus === "skipped" || mdStatus === "done" || mdStatus === "failed") {
    return;
  }
  if (await isAiJobCancelled(id)) {
    if (mdStatus === "processing") {
      await clearAiJobCancelled(id);
    } else {
      return;
    }
  }
  const promptInput = {
    plainTranscript: transcript,
    segments: meetingDialogueAux?.transcriptSegments,
    phase1,
    taskExtractionHint: meetingDialogueAux?.taskExtractionHint,
    omitFullTranscript: false
  };
  promptInput.omitFullTranscript = shouldOmitFullTranscript(promptInput);
  try {
    const mdUserContent = buildMeetingDialogueUserContent(promptInput);
    const mdPart = await processMeetingDialogueMarkdown(
      mdUserContent,
      meetingDialogueSystemPrompt.trim(),
      clientUserAgent,
      deviceId
    );
    if (await isAiJobCancelled(id)) {
      if (mdStatus === "processing") {
        await clearAiJobCancelled(id);
      } else {
        return;
      }
    }
    const done = existing;
    const mergedTokenUsage = mergeOpenRouterTokenUsage(done.tokenUsage, mdPart.tokenUsage);
    await saveMessage(
      id,
      {
        ...done,
        ...mdPart.meetingDialogueMarkdown?.trim() ? { meetingDialogueMarkdown: mdPart.meetingDialogueMarkdown.trim() } : {},
        meetingDialogueStatus: "done",
        ...mergedTokenUsage ? { tokenUsage: mergedTokenUsage } : {}
      },
      ttl
    );
    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: "Meeting dialogue complete"
    });
    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: "meeting_dialogue",
      jobId: id,
      metadata: aiModelResponseFields(payload.model)
    });
  } catch (err) {
    const done = existing;
    if (!isRetryableAiJobError(err)) {
      await saveMessage(
        id,
        {
          ...done,
          meetingDialogueStatus: "failed"
        },
        ttl
      );
    }
    throw err;
  }
}

// ../../web/lib/ai-job-dispatch.ts
import { after } from "next/server";

// ../../web/lib/ai-job-publish-plan.ts
import {
  getAiJobMaxDurationSeconds as getAiJobMaxDurationSeconds2,
  getAiJobWorkerFallbackUrl as getCoreFallbackUrl,
  getAiJobWorkerPrimaryUrl as getCorePrimaryUrl,
  getAiJobWorkerUrl as getCoreWorkerUrl,
  resolveAiJobPublishPlan as resolveCorePublishPlan,
  VERCEL_WORKER_MAX_DURATION_SECONDS as VERCEL_WORKER_MAX_DURATION_SECONDS2
} from "@voice-inbox/ai-job-core";
function coreEnv() {
  return {
    baseUrlOrFallback: BASE_URL_OR_FALLBACK,
    aiJobWorkerUrl: process.env.AI_JOB_WORKER_URL,
    aiJobWorkerFallbackUrl: process.env.AI_JOB_WORKER_FALLBACK_URL,
    aiJobMaxDurationSeconds: process.env.AI_JOB_MAX_DURATION_SECONDS
  };
}
function resolveAiJobPublishPlan() {
  return resolveCorePublishPlan(coreEnv());
}

// ../../web/lib/qstash.ts
import { Receiver, Client } from "@upstash/qstash";
function isQStashConfigured() {
  return Boolean(process.env.QSTASH_TOKEN?.trim());
}
function shouldUseQStashTransport() {
  const transport = process.env.AI_JOB_TRANSPORT?.trim().toLowerCase();
  if (transport === "after") return false;
  if (transport === "qstash") return isQStashConfigured();
  return isQStashConfigured();
}
function getQStashClient() {
  const token = process.env.QSTASH_TOKEN?.trim();
  if (!token) return null;
  return new Client({
    token,
    ...process.env.QSTASH_URL?.trim() ? { baseUrl: process.env.QSTASH_URL.trim() } : {}
  });
}
function getQStashReceiver() {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  if (!currentSigningKey) return null;
  return new Receiver({
    currentSigningKey,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY?.trim() || void 0
  });
}
async function verifyQStashRequest(request, body) {
  const receiver = getQStashReceiver();
  if (!receiver) return false;
  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;
  try {
    return await receiver.verify({ signature, body });
  } catch {
    return false;
  }
}
function parseUpstashRetried(request) {
  const raw2 = request.headers.get("upstash-retried") ?? request.headers.get("Upstash-Retried");
  if (raw2 == null || raw2 === "") return void 0;
  const n = Number.parseInt(raw2, 10);
  return Number.isFinite(n) && n >= 0 ? n : void 0;
}
function isLastQStashDelivery(retried) {
  if (retried == null) return false;
  return retried >= AI_JOB_QSTASH_RETRIES;
}

// ../../web/lib/ai-job-dispatch.ts
async function dispatchAiJob(payload, options) {
  const envelope = envelopeFromPayload(payload);
  const transport = shouldUseQStashTransport() ? "qstash" : "after";
  console.info(
    "[AI job]",
    JSON.stringify({
      operation: envelope.operation,
      jobId: envelope.jobId,
      transport
    })
  );
  if (transport === "qstash") {
    const client = getQStashClient();
    if (!client) {
      scheduleAfterFallback(envelope);
      return;
    }
    const plan = resolveAiJobPublishPlan();
    const deduplicationId = options?.deduplicationId ?? (envelope.operation === "meeting_dialogue" ? `${envelope.jobId}-meeting-dialogue` : envelope.jobId);
    if (plan.primary) {
      try {
        await client.publishJSON({
          url: plan.primary.url,
          body: envelope,
          retries: AI_JOB_QSTASH_RETRIES,
          timeout: plan.primary.timeoutSeconds,
          failureCallback: plan.primary.failureCallback,
          deduplicationId
        });
        console.info(
          "[AI job]",
          JSON.stringify({
            operation: envelope.operation,
            jobId: envelope.jobId,
            target: "cloud_run",
            timeoutSeconds: plan.primary.timeoutSeconds,
            failureCallback: plan.primary.failureCallback
          })
        );
        return;
      } catch (err) {
        console.error("[AI job] QStash publish to Cloud Run failed, falling back to Vercel", {
          jobId: envelope.jobId,
          error: err instanceof Error ? err.message : String(err),
          primaryUrl: plan.primary.url
        });
      }
    }
    try {
      await client.publishJSON({
        url: plan.fallback.url,
        body: envelope,
        retries: AI_JOB_QSTASH_RETRIES,
        timeout: plan.fallback.timeoutSeconds,
        deduplicationId
      });
      console.info(
        "[AI job]",
        JSON.stringify({
          operation: envelope.operation,
          jobId: envelope.jobId,
          target: "vercel_fallback",
          timeoutSeconds: plan.fallback.timeoutSeconds,
          fallbackReason: plan.primary ? "publish_fail" : "vercel_only"
        })
      );
      return;
    } catch (err) {
      console.error("[AI job] QStash publish failed, falling back to after()", {
        jobId: envelope.jobId,
        error: err instanceof Error ? err.message : String(err),
        fallbackUrl: plan.fallback.url
      });
      scheduleAfterFallback(envelope);
      return;
    }
  }
  scheduleAfterFallback(envelope);
}
function scheduleAfterFallback(envelope) {
  after(async () => {
    const result = await runAiJobFromEnvelope(envelope, { skipIdempotency: true });
    if (!result.ok) {
      await markAiJobFailed(envelope, result.error);
    }
  });
}

// ../../web/lib/meeting-dialogue-dispatch.ts
async function dispatchMeetingDialogueJob(payload) {
  await clearAiJobCancelled(payload.jobId);
  await releaseJobLock(payload.jobId);
  await saveMeetingJobPayload(payload);
  const deduplicationId = payload.retryNonce?.trim() ? `${payload.jobId}-meeting-dialogue-${payload.retryNonce.trim()}` : `${payload.jobId}-meeting-dialogue`;
  await dispatchAiJob(payload, { deduplicationId });
}

// ../../web/lib/ai-job-runners/run-summarize-job.ts
function shouldOmitFullTranscript2(input) {
  return Boolean(input.segments?.length) && input.plainTranscript.trim().length > MEETING_DIALOGUE_OMIT_FULL_TRANSCRIPT_CHARS;
}
function isMeetingDialogueEligible(payload) {
  return Boolean(payload.pseudoDiarizationEligible && payload.meetingDialogueSystemPrompt?.trim());
}
async function runInlineMeetingDialogue(payload, mainResult) {
  const {
    jobId: id,
    transcript,
    meetingDialogueSystemPrompt,
    meetingDialogueAux,
    clientUserAgent,
    deviceId
  } = payload;
  const promptInput = {
    plainTranscript: transcript,
    segments: meetingDialogueAux?.transcriptSegments,
    phase1: {
      suggestedTitle: mainResult.suggestedTitle,
      keyPhrases: mainResult.keyPhrases,
      summary: mainResult.summary
    },
    taskExtractionHint: meetingDialogueAux?.taskExtractionHint
  };
  promptInput.omitFullTranscript = shouldOmitFullTranscript2(promptInput);
  try {
    const mdUserContent = buildMeetingDialogueUserContent(promptInput);
    const mdPart = await processMeetingDialogueMarkdown(
      mdUserContent,
      meetingDialogueSystemPrompt.trim(),
      clientUserAgent,
      deviceId
    );
    return {
      ...mainResult,
      ...mdPart,
      tokenUsage: mergeOpenRouterTokenUsage(mainResult.tokenUsage, mdPart.tokenUsage)
    };
  } catch (mdErr) {
    console.warn("[AI] meeting dialogue inline failed; returning main extraction only", {
      messageId: id,
      error: mdErr instanceof Error ? mdErr.message : String(mdErr)
    });
    return mainResult;
  }
}
async function runSummarizeJob(payload) {
  const {
    jobId: id,
    deviceId,
    messageTtlSeconds: ttl,
    transcript,
    model,
    systemPrompt,
    clientUserAgent
  } = payload;
  const summarizeLedgerOperation = resolveTranscriptSummarizeLedgerOperation(
    payload.chargedUsageUnits
  );
  try {
    const mainResult = await processTranscript(
      transcript,
      model,
      systemPrompt,
      clientUserAgent,
      deviceId
    );
    const meetingEligible = isMeetingDialogueEligible(payload);
    const useAsyncMeetingDialogue = meetingEligible && transcript.length > SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS;
    let result = mainResult;
    let meetingDialogueStatus;
    if (meetingEligible && !useAsyncMeetingDialogue) {
      result = await runInlineMeetingDialogue(payload, mainResult);
      meetingDialogueStatus = result.meetingDialogueMarkdown?.trim() ? "done" : "failed";
    } else if (useAsyncMeetingDialogue) {
      meetingDialogueStatus = "processing";
      console.info("[AI] meeting dialogue queued (long transcript)", {
        messageId: id,
        transcriptChars: transcript.length,
        limit: SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS
      });
    }
    await saveMessage(
      id,
      {
        id,
        status: "done",
        ...aiModelResponseFields(model),
        ...payload.modelMode ? { modelMode: payload.modelMode } : {},
        summary: result.summary,
        suggestedTitle: result.suggestedTitle,
        tasks: result.tasks,
        tags: result.tags,
        ...result.classification && { classification: result.classification },
        ...result.keyPhrases && result.keyPhrases.length > 0 && {
          keyPhrases: result.keyPhrases
        },
        ...result.nextSteps && result.nextSteps.length > 0 && { nextSteps: result.nextSteps },
        ...result.meetingDialogueMarkdown?.trim() && {
          meetingDialogueMarkdown: result.meetingDialogueMarkdown.trim()
        },
        ...meetingDialogueStatus ? { meetingDialogueStatus } : {},
        ...result.reasoning?.trim() && { reasoning: result.reasoning.trim() },
        ...result.tokenUsage && { tokenUsage: result.tokenUsage }
      },
      ttl
    );
    await notifyAiJobComplete({
      deviceId,
      recordId: id,
      logLabel: "AI complete"
    });
    await updateAiUsageLedgerMetadata({
      deviceId,
      operation: summarizeLedgerOperation,
      jobId: id,
      metadata: {
        ...aiModelResponseFields(model),
        chargedUsageUnits: payload.chargedUsageUnits ?? 1
      }
    });
    if (useAsyncMeetingDialogue) {
      const meetingPayload = {
        operation: "meeting_dialogue",
        jobId: id,
        deviceId,
        messageTtlSeconds: ttl,
        transcript,
        model,
        meetingDialogueSystemPrompt: payload.meetingDialogueSystemPrompt.trim(),
        meetingDialogueAux: payload.meetingDialogueAux,
        phase1: {
          suggestedTitle: mainResult.suggestedTitle,
          keyPhrases: mainResult.keyPhrases,
          summary: mainResult.summary
        },
        clientUserAgent
      };
      await dispatchMeetingDialogueJob(meetingPayload);
    }
  } catch (err) {
    if (!isRetryableAiJobError(err)) {
      await decrementBy(deviceId, payload.chargedUsageUnits ?? 1, {
        operation: summarizeLedgerOperation,
        jobId: id,
        metadata: { model, chargedUsageUnits: payload.chargedUsageUnits ?? 1 }
      });
      await saveMessage(
        id,
        {
          id,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
          ...aiModelResponseFields(model),
          ...payload.modelMode ? { modelMode: payload.modelMode } : {}
        },
        ttl
      );
    }
    throw err;
  }
}

// ../../web/lib/ai-job-runners/index.ts
async function runAiJob(payload) {
  switch (payload.operation) {
    case "transcript_summarize":
      await runSummarizeJob(payload);
      break;
    case "transcript_ask":
      await runAskJob(payload);
      break;
    case "inbox_ask":
      await runInboxAskJob(payload);
      break;
    case "general_ask":
      await runGeneralAskJob(payload);
      break;
    case "folder_auto_organize":
      await runAutoOrganizeJob(payload);
      break;
    case "meeting_dialogue":
      await runMeetingDialogueJob(payload);
      break;
    default: {
      const _exhaustive = payload;
      throw new Error(`Unknown AI job operation: ${_exhaustive.operation}`);
    }
  }
}

// ../../web/lib/run-ai-job-from-envelope.ts
async function runAiJobFromEnvelope(envelope, options) {
  const { jobId, operation } = envelope;
  const started = Date.now();
  if (await isAiJobCancelled(jobId)) {
    if (operation === "meeting_dialogue") {
      const existing = await getMessage(jobId);
      const mdStatus = existing?.status === "done" ? existing.meetingDialogueStatus : void 0;
      if (mdStatus === "processing") {
        await clearAiJobCancelled(jobId);
      } else {
        return { ok: true, skipped: true, skipReason: "cancelled" };
      }
    } else {
      return { ok: true, skipped: true, skipReason: "cancelled" };
    }
  }
  if (!options?.skipIdempotency) {
    const existing = await getMessage(jobId);
    if (operation === "meeting_dialogue") {
      if (existing?.status === "done") {
        const mdStatus = existing.meetingDialogueStatus;
        if (mdStatus === "done" || mdStatus === "failed" || mdStatus === "skipped") {
          return { ok: true, skipped: true, skipReason: "done" };
        }
      } else {
        return {
          ok: false,
          error: "Meeting dialogue requires completed summarize message",
          retryable: true
        };
      }
    } else if (existing?.status === "done") {
      if (operation === "transcript_summarize") {
        await recoverMeetingDialogueAfterSummarizeDone(jobId, envelope.messageTtlSeconds);
      }
      return { ok: true, skipped: true, skipReason: "done" };
    }
    if (existing?.status === "error") {
      const pendingGen = await getOpenRouterPendingGeneration(jobId);
      if (!pendingGen) {
        return { ok: true, skipped: true, skipReason: "done" };
      }
      const model = typeof existing.model === "string" ? existing.model : void 0;
      await saveMessage(
        jobId,
        {
          id: jobId,
          status: "processing",
          ...model ? aiModelResponseFields(model) : {}
        },
        envelope.messageTtlSeconds
      );
    }
  }
  const lockAcquired = await acquireJobLock(jobId);
  if (!lockAcquired) {
    if (operation === "meeting_dialogue") {
      return { ok: false, error: "Meeting dialogue job lock held", retryable: true };
    }
    return { ok: true, skipped: true, skipReason: "lock" };
  }
  try {
    if (await isAiJobCancelled(jobId)) {
      if (operation === "meeting_dialogue") {
        const existing = await getMessage(jobId);
        const mdStatus = existing?.status === "done" ? existing.meetingDialogueStatus : void 0;
        if (mdStatus === "processing") {
          await clearAiJobCancelled(jobId);
        } else {
          return { ok: true, skipped: true, skipReason: "cancelled" };
        }
      } else {
        return { ok: true, skipped: true, skipReason: "cancelled" };
      }
    }
    const payload = operation === "meeting_dialogue" ? await getMeetingJobPayload(jobId) : await getJobPayload(jobId);
    if (!payload || payload.operation !== operation) {
      return {
        ok: false,
        error: "Job payload missing or operation mismatch",
        retryable: true
      };
    }
    console.info("[AI job worker]", JSON.stringify({ operation, jobId, phase: "start" }));
    try {
      await aiJobRunContext.run(
        { jobId, messageTtlSeconds: envelope.messageTtlSeconds },
        () => runAiJob(payload)
      );
      if (operation === "meeting_dialogue") {
        await deleteMeetingJobPayload(jobId);
        await reconcileMeetingDialogueIfStillProcessing(jobId, envelope.messageTtlSeconds);
      } else {
        await deleteJobPayload(jobId);
      }
      console.info(
        "[AI job worker]",
        JSON.stringify({ operation, jobId, phase: "done", durationMs: Date.now() - started })
      );
      return { ok: true };
    } catch (err) {
      console.error(
        "[AI job worker]",
        JSON.stringify({
          operation,
          jobId,
          phase: "error",
          durationMs: Date.now() - started,
          error: err instanceof Error ? err.message : String(err)
        })
      );
      const retryable = isRetryableAiJobError(err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        retryable
      };
    }
  } finally {
    await releaseJobLock(jobId);
  }
}
async function recoverMeetingDialogueAfterSummarizeDone(jobId, messageTtlSeconds) {
  const existing = await getMessage(jobId);
  if (existing?.status !== "done") return;
  const mdStatus = existing.meetingDialogueStatus;
  if (mdStatus !== "processing") return;
  const meetingPayload = await getMeetingJobPayload(jobId);
  if (!meetingPayload) {
    console.warn(
      "[AI job worker]",
      JSON.stringify({
        operation: "transcript_summarize",
        jobId,
        phase: "recover_meeting_dialogue_missing_payload"
      })
    );
    await saveMessage(
      jobId,
      {
        ...existing,
        meetingDialogueStatus: "failed"
      },
      messageTtlSeconds
    );
    return;
  }
  console.info(
    "[AI job worker]",
    JSON.stringify({
      operation: "transcript_summarize",
      jobId,
      phase: "recover_meeting_dialogue_redispatch"
    })
  );
  await dispatchMeetingDialogueJob({
    ...meetingPayload,
    retryNonce: meetingPayload.retryNonce ?? String(Date.now())
  });
}
async function reconcileMeetingDialogueIfStillProcessing(jobId, messageTtlSeconds) {
  const existing = await getMessage(jobId);
  if (existing?.status !== "done") return;
  const mdStatus = existing.meetingDialogueStatus;
  if (mdStatus !== "processing") return;
  console.warn(
    "[AI job worker]",
    JSON.stringify({ operation: "meeting_dialogue", jobId, phase: "reconcile_stuck_processing" })
  );
  await saveMessage(
    jobId,
    {
      ...existing,
      meetingDialogueStatus: "failed"
    },
    messageTtlSeconds
  );
}

// ../../web/lib/ai-worker-http.ts
async function handleAiWorkerPost(request) {
  const bodyText = await request.text();
  const valid = await verifyQStashRequest(request, bodyText);
  if (!valid) {
    return { status: 401, body: { error: "unauthorized" } };
  }
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { status: 400, body: { error: "invalid_json" } };
  }
  const envelope = resolveEnvelopeFromBody(parsed);
  if (!envelope) {
    return { status: 400, body: { error: "invalid_envelope" } };
  }
  const retried = parseUpstashRetried(request);
  const isFailureCallback = parseAiJobEnvelope(parsed) == null;
  const result = await runAiJobFromEnvelope(envelope);
  if (result.ok) {
    return {
      status: 200,
      body: {
        ok: true,
        ...isFailureCallback ? { failureCallback: true } : {},
        ...result.skipped ? { skipped: true, skipReason: result.skipReason } : {}
      }
    };
  }
  if (result.retryable && isLastQStashDelivery(retried)) {
    await markAiJobFailed(envelope, result.error);
    console.warn(
      "[AI job worker]",
      JSON.stringify({
        jobId: envelope.jobId,
        operation: envelope.operation,
        phase: "failed_terminal",
        retried,
        failureCallback: isFailureCallback,
        error: result.error
      })
    );
    return { status: 200, body: { ok: true, failed: true, error: result.error } };
  }
  if (result.retryable) {
    return { status: 500, body: { error: result.error, retried } };
  }
  return { status: 200, body: { ok: true, error: result.error } };
}

// src/server.ts
var port = Number(process.env.PORT) || 8080;
async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
function toFetchHeaders(req) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}
async function toFetchRequest(req, body) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  return new Request(url, {
    method: req.method ?? "GET",
    headers: toFetchHeaders(req),
    ...body.length > 0 && req.method !== "GET" && req.method !== "HEAD" ? { body } : {}
  });
}
createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).pathname;
    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === "POST" && (pathname === "/worker" || pathname === "/")) {
      const body = await readRequestBody(req);
      const request = await toFetchRequest(req, body);
      const result = await handleAiWorkerPost(request);
      res.writeHead(result.status, { "content-type": "application/json" });
      res.end(JSON.stringify(result.body));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  } catch (error) {
    console.error("[AI worker] unhandled error", error);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}).listen(port, () => {
  console.info(`[AI worker] listening on port ${port}`);
});
