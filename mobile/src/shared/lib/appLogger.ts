import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

const LOG_DIR = `${getCachesDirectoryPath()}/logs`;
const LOG_FILE_PATH = `${LOG_DIR}/app.log`;
const MAX_LOG_FILE_BYTES = 2_500_000;
const FLUSH_DELAY_MS = 200;
const SUPPORT_LOG_MAX_CHARS = 32_000;
const SUPPORT_LOG_TAIL_BYTES = SUPPORT_LOG_MAX_CHARS;
const MAX_LOG_FIELD_CHARS = 500;

const sensitiveValueRegex =
  /\b(api_key|apiKey|access_token|refresh_token|id_token|secret|password|pass|token)\b\s*[:=]\s*(['"]?)([^'"\s,;]+)/gi;
const bearerTokenRegex = /\b(Bearer)\s+([A-Za-z0-9\-._~+/]+=*)/gi;
const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

const SENSITIVE_OBJECT_KEYS = new Set([
  'transcript',
  'transcriptsegments',
  'answer',
  'body',
  'text',
  'content',
  'message',
  'evidence',
  'items',
  'summary',
  'suggestedtitle',
  'keyphrases',
  'password',
  'secret',
  'authorization',
  'rawurl',
]);

const PATH_LIKE_OBJECT_KEYS = new Set([
  'uri',
  'fileuri',
  'filecopyuri',
  'path',
  'audiopath',
  'pdfpath',
]);

let logQueue: string[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;
let originalConsoleWarn: (...items: unknown[]) => void = console.warn.bind(console);
let originalConsoleError: (...items: unknown[]) => void = console.error.bind(console);
// eslint-disable-next-line no-console
let originalConsoleLog: (...items: unknown[]) => void = console.log.bind(console);

function truncateString(value: string): string {
  if (value.length <= MAX_LOG_FIELD_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_LOG_FIELD_CHARS)}…[truncated]`;
}

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname || '/';
    return parsed.search ? `${path}?[REDACTED]` : path;
  } catch {
    const trimmed = url.trim();
    if (trimmed.startsWith('/')) {
      const [path, query] = trimmed.split('?');
      return query != null ? `${path}?[REDACTED]` : path;
    }
    return '[REDACTED_URL]';
  }
}

function redactPath(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  const tail = parts[parts.length - 1];
  return tail ? `…/${tail}` : '[REDACTED_PATH]';
}

function sanitizeLogText(value: string): string {
  return truncateString(
    value
      .replace(bearerTokenRegex, '$1 [REDACTED]')
      .replace(sensitiveValueRegex, '$1: [REDACTED]')
      .replace(emailRegex, '[REDACTED_EMAIL]'),
  );
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return '[MAX_DEPTH]';
  }

  if (value == null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return sanitizeLogText(value);
  }

  if (value instanceof Error) {
    return sanitizeLogText(`${value.name}: ${value.message}`);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase();

      if (SENSITIVE_OBJECT_KEYS.has(normalizedKey)) {
        out[key] = '[REDACTED]';
        continue;
      }

      if (
        (normalizedKey === 'url' || normalizedKey === 'host' || normalizedKey === 'webapihost') &&
        typeof nestedValue === 'string'
      ) {
        out[key] = normalizedKey === 'url' ? redactUrl(nestedValue) : '[REDACTED]';
        continue;
      }

      if (PATH_LIKE_OBJECT_KEYS.has(normalizedKey) && typeof nestedValue === 'string') {
        out[key] = redactPath(nestedValue);
        continue;
      }

      out[key] = sanitizeForLog(nestedValue, depth + 1);
    }

    return out;
  }

  return String(value);
}

function serializeArg(value: unknown): string {
  const sanitized = sanitizeForLog(value);

  if (typeof sanitized === 'string') {
    return sanitized;
  }

  if (sanitized instanceof Error) {
    return `${sanitized.name}: ${sanitized.message}${sanitized.stack ? `\n${sanitized.stack}` : ''}`;
  }

  try {
    return JSON.stringify(sanitized);
  } catch {
    return String(sanitized);
  }
}

function formatLogEntry(level: string, message: string): string {
  return `[${new Date().toISOString()}] [${level}] ${message}`;
}

function writeToDevConsole(level: 'log' | 'warn' | 'error', items: unknown[]) {
  if (!__DEV__) {
    return;
  }

  const writer =
    level === 'log'
      ? originalConsoleLog
      : level === 'warn'
        ? originalConsoleWarn
        : originalConsoleError;

  writer(...items);
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

  originalConsoleWarn = console.warn.bind(console);
  originalConsoleError = console.error.bind(console);
  // eslint-disable-next-line no-console
  originalConsoleLog = console.log.bind(console);

  console.warn = (...args: Array<unknown>) => {
    enqueueLog('WARN', args);
    originalConsoleWarn(...args);
  };

  console.error = (...args: Array<unknown>) => {
    enqueueLog('ERROR', args);
    originalConsoleError(...args);
  };

  enqueueLog('INFO', ['App logger initialized.']);
}

/** Metro only — verbose diagnostics that should not land in on-device logs. */
export function devLog(...items: unknown[]) {
  writeToDevConsole('log', items);
}

/** Metro only — verbose warnings that should not land in on-device logs. */
export function devWarn(...items: unknown[]) {
  writeToDevConsole('warn', items);
}

/** Always persisted to the on-device log; mirrored to Metro in dev builds. */
export function diagInfo(...items: unknown[]) {
  enqueueLog('INFO', items);
  writeToDevConsole('log', items);
}

/** Always persisted to the on-device log; mirrored to Metro in dev builds. */
export function diagWarn(...items: unknown[]) {
  enqueueLog('WARN', items);
  writeToDevConsole('warn', items);
}

/** Always persisted to the on-device log; mirrored to Metro in dev builds. */
export function diagError(...items: unknown[]) {
  enqueueLog('ERROR', items);
  writeToDevConsole('error', items);
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
