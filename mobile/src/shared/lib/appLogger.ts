import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

const LOG_DIR = `${getCachesDirectoryPath()}/logs`;
const LOG_FILE_PATH = `${LOG_DIR}/app.log`;
const MAX_LOG_FILE_BYTES = 2_500_000;
const FLUSH_DELAY_MS = 200;
const SUPPORT_LOG_MAX_CHARS = 32_000;
const SUPPORT_LOG_TAIL_BYTES = SUPPORT_LOG_MAX_CHARS;

const sensitiveValueRegex =
  /\b(api_key|apiKey|access_token|refresh_token|id_token|secret|password|pass|token|key)\b\s*[:=]\s*(['"]?)([^'"\s,;]+)/gi;
const bearerTokenRegex = /\b(Bearer)\s+([A-Za-z0-9\-._~+/]+=*)/gi;
const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

let logQueue: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

function serializeArg(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ''}`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sanitizeLogText(value: string): string {
  return value
    .replace(bearerTokenRegex, '$1 [REDACTED]')
    .replace(sensitiveValueRegex, '$1: [REDACTED]')
    .replace(emailRegex, '[REDACTED_EMAIL]');
}

function formatLogEntry(level: string, message: string): string {
  return `[${new Date().toISOString()}] [${level}] ${sanitizeLogText(message)}`;
}

async function ensureLogDirectory() {
  try {
    if (!(await NitroFS.exists(LOG_DIR))) {
      await NitroFS.mkdir(LOG_DIR);
    }
  } catch {
    // ignore errors while ensuring the log directory
  }
}

async function rotateLogFileIfNeeded() {
  try {
    const stat = await NitroFS.stat(LOG_FILE_PATH);
    const size = stat.size ?? 0;
    if (size <= MAX_LOG_FILE_BYTES) {
      return;
    }

    const raw = await NitroFS.readFile(LOG_FILE_PATH, 'utf8');
    const tail = raw.slice(-Math.floor(MAX_LOG_FILE_BYTES / 2));
    const rotated = `--- LOG ROTATED ${new Date().toISOString()} ---\n${tail}`;

    await NitroFS.writeFile(LOG_FILE_PATH, rotated, 'utf8');
  } catch {
    // ignore rotation failures
  }
}

async function appendToLogFile(payload: string) {
  try {
    await ensureLogDirectory();
    const appendFn = (NitroFS as any).appendFile;
    if (typeof appendFn === 'function') {
      await appendFn(LOG_FILE_PATH, payload, 'utf8');
      return;
    }

    const exists = await NitroFS.exists(LOG_FILE_PATH);
    if (exists) {
      const current = await NitroFS.readFile(LOG_FILE_PATH, 'utf8');
      await NitroFS.writeFile(LOG_FILE_PATH, current + payload, 'utf8');
    } else {
      await NitroFS.writeFile(LOG_FILE_PATH, payload, 'utf8');
    }
  } catch {
    try {
      await NitroFS.writeFile(LOG_FILE_PATH, payload, 'utf8');
    } catch {
      // swallow errors, logging should never crash the app
    }
  }
}

async function flushLogs() {
  if (logQueue.length === 0) {
    return;
  }

  const entries = logQueue.splice(0, logQueue.length);
  const payload = `${entries.join('\n')}\n`;

  await appendToLogFile(payload);
  await rotateLogFileIfNeeded();
}

function scheduleFlush() {
  if (flushTimer != null) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushLogs();
  }, FLUSH_DELAY_MS);
}

function enqueueLog(level: string, items: unknown[]) {
  const message = items.map(serializeArg).join(' ');
  logQueue.push(formatLogEntry(level, message));
  scheduleFlush();
}

export function setupAppLogger() {
  if (initialized) {
    return;
  }

  initialized = true;

  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  console.warn = (...args: Array<unknown>) => {
    enqueueLog('WARN', args);
    originalWarn(...args);
  };

  console.error = (...args: Array<unknown>) => {
    enqueueLog('ERROR', args);
    originalError(...args);
  };

  enqueueLog('INFO', ['App logger initialized.']);
}

export function logDebug(...items: unknown[]) {
  enqueueLog('DEBUG', items);
}

export function logInfo(...items: unknown[]) {
  enqueueLog('INFO', items);
}

export function logWarn(...items: unknown[]) {
  enqueueLog('WARN', items);
}

export function logError(...items: unknown[]) {
  enqueueLog('ERROR', items);
}

export async function readAppLogTail(maxBytes = SUPPORT_LOG_TAIL_BYTES) {
  try {
    if (!(await NitroFS.exists(LOG_FILE_PATH))) {
      return '';
    }

    const contents = await NitroFS.readFile(LOG_FILE_PATH, 'utf8');
    if (contents.length <= maxBytes) {
      return contents;
    }

    return `--- Showing last ${Math.ceil(maxBytes / 1024)} KB of log ---\n${contents.slice(-maxBytes)}`;
  } catch {
    return '';
  }
}

export async function clearAppLogs() {
  try {
    await ensureLogDirectory();
    await NitroFS.writeFile(LOG_FILE_PATH, '', 'utf8');
  } catch {
    // ignore
  }
}

export async function getAppLogSize() {
  try {
    const stat = await NitroFS.stat(LOG_FILE_PATH);
    return stat.size ?? 0;
  } catch {
    return 0;
  }
}

export async function getAppLogPath() {
  await ensureLogDirectory();
  return LOG_FILE_PATH;
}
