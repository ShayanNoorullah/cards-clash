/**
 * Small, dependency-free logger. Nothing leaves the device: there is no analytics
 * or remote reporting. Recent entries are kept in a ring buffer so a crash/error
 * screen can display them and the player can copy them into a bug report.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LogEntry {
  time: number;
  level: LogLevel;
  tag: string;
  message: string;
  data?: unknown;
}

export type LogSink = (entry: LogEntry) => void;

export const consoleSink: LogSink = (entry) => {
  const line = `[${entry.tag}] ${entry.message}`;
  const args: unknown[] = entry.data === undefined ? [line] : [line, entry.data];
  switch (entry.level) {
    case 'debug':
      console.debug(...args);
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
};

export class Logger {
  private minLevel: LogLevel;
  private readonly buffer: LogEntry[] = [];
  private readonly sinks: LogSink[];
  private readonly capacity: number;
  private readonly now: () => number;

  constructor(
    options: { minLevel?: LogLevel; capacity?: number; sinks?: LogSink[]; now?: () => number } = {},
  ) {
    this.minLevel = options.minLevel ?? 'info';
    this.capacity = options.capacity ?? 200;
    this.sinks = options.sinks ?? [consoleSink];
    this.now = options.now ?? (() => Date.now());
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  get level(): LogLevel {
    return this.minLevel;
  }

  addSink(sink: LogSink): void {
    this.sinks.push(sink);
  }

  /** Returns a tagged child view sharing the same buffer and sinks. */
  child(tag: string): TaggedLogger {
    return new TaggedLogger(this, tag);
  }

  log(level: LogLevel, tag: string, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;
    const entry: LogEntry = { time: this.now(), level, tag, message };
    if (data !== undefined) entry.data = data;
    this.buffer.push(entry);
    if (this.buffer.length > this.capacity) this.buffer.shift();
    for (const sink of this.sinks) {
      try {
        sink(entry);
      } catch {
        // A failing sink must never break the game.
      }
    }
  }

  /** Most recent entries, oldest first. */
  recent(count = this.capacity): LogEntry[] {
    return this.buffer.slice(-count);
  }

  /** Plain-text dump suitable for copy/paste into a bug report. */
  dump(): string {
    return this.buffer
      .map((e) => `${new Date(e.time).toISOString()} ${e.level.toUpperCase()} [${e.tag}] ${e.message}`)
      .join('\n');
  }

  clear(): void {
    this.buffer.length = 0;
  }
}

export class TaggedLogger {
  constructor(
    private readonly parent: Logger,
    private readonly tag: string,
  ) {}

  debug(message: string, data?: unknown): void {
    this.parent.log('debug', this.tag, message, data);
  }
  info(message: string, data?: unknown): void {
    this.parent.log('info', this.tag, message, data);
  }
  warn(message: string, data?: unknown): void {
    this.parent.log('warn', this.tag, message, data);
  }
  error(message: string, data?: unknown): void {
    this.parent.log('error', this.tag, message, data);
  }
}

/** Application-wide logger instance. */
export const logger = new Logger({
  minLevel: typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'debug' : 'info',
});
