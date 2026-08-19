/**
 * The only logging surface in this app. See docs/CODING_STANDARDS.md § Logging.
 *
 * Emits one JSON object per line. Never use `console.*` outside this file.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogValue = string | number | boolean | null | undefined;

export type LogFields = Record<string, LogValue>;

/**
 * Field names that must never reach a log sink. The logger redacts them as a
 * backstop — it is not a licence to pass them. Callers are still expected to
 * log identifiers rather than the values themselves.
 */
const REDACTED_FIELDS = new Set([
  "email",
  "password",
  "token",
  "apiKey",
  "authorization",
  "cardNumber",
  "cvv",
  "ssn",
  "taxId",
]);

const LEVEL_RANK = {
  debug: 10,
  error: 40,
  info: 20,
  warn: 30,
} satisfies Record<LogLevel, number>;

function minLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function redact(fields: LogFields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      REDACTED_FIELDS.has(key) ? "[redacted]" : value,
    ])
  );
}

export interface Logger {
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
  /** Derive a logger that carries `fields` on every subsequent line. */
  child: (fields: LogFields) => Logger;
}

/** Swappable so tests can assert on emitted lines. */
export type LogSink = (line: string) => void;

const defaultSink: LogSink = (line) => process.stdout.write(`${line}\n`);

export function createLogger(
  bound: LogFields = {},
  sink: LogSink = defaultSink
): Logger {
  const threshold = LEVEL_RANK[minLevel()];

  function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
    if (LEVEL_RANK[level] < threshold) {return;}
    sink(
      JSON.stringify({
        event,
        level,
        timestamp: new Date().toISOString(),
        ...redact(bound),
        ...redact(fields),
      })
    );
  }

  return {
    child: (fields) => createLogger({ ...bound, ...fields }, sink),
    debug: (event, fields) => emit("debug", event, fields),
    error: (event, fields) => emit("error", event, fields),
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
  };
}

/**
 * Root logger. Request-scoped code should use the context-bound logger from
 * `src/server/context.ts` instead, so `requestId` and `tenantId` are attached.
 */
export const logger = createLogger();
