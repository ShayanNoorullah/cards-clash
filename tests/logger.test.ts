import { describe, expect, it } from 'vitest';
import { Logger, type LogEntry } from '../src/services/logger';

function makeLogger(minLevel: 'debug' | 'info' | 'warn' | 'error' = 'debug', capacity = 5) {
  const seen: LogEntry[] = [];
  const log = new Logger({ minLevel, capacity, sinks: [(e) => seen.push(e)], now: () => 1_700_000_000_000 });
  return { log, seen };
}

describe('Logger', () => {
  it('filters by minimum level', () => {
    const { log, seen } = makeLogger('warn');
    const t = log.child('T');
    t.debug('d');
    t.info('i');
    t.warn('w');
    t.error('e');
    expect(seen.map((e) => e.level)).toEqual(['warn', 'error']);
  });

  it('keeps a bounded ring buffer of recent entries', () => {
    const { log } = makeLogger('debug', 3);
    for (let i = 0; i < 10; i++) log.log('info', 'T', `m${i}`);
    expect(log.recent().map((e) => e.message)).toEqual(['m7', 'm8', 'm9']);
    expect(log.recent(1).map((e) => e.message)).toEqual(['m9']);
  });

  it('attaches data only when provided and tags entries', () => {
    const { log, seen } = makeLogger();
    log.child('Net').info('hello');
    log.child('Net').error('boom', { code: 7 });
    expect(seen[0]).toEqual({ time: 1_700_000_000_000, level: 'info', tag: 'Net', message: 'hello' });
    expect(seen[1]?.data).toEqual({ code: 7 });
  });

  it('never throws when a sink fails', () => {
    const log = new Logger({
      sinks: [
        () => {
          throw new Error('sink failure');
        },
      ],
    });
    expect(() => log.log('error', 'T', 'x')).not.toThrow();
    expect(log.recent()).toHaveLength(1);
  });

  it('dumps plain text and can be cleared', () => {
    const { log } = makeLogger();
    log.log('warn', 'Save', 'disk full');
    expect(log.dump()).toBe('2023-11-14T22:13:20.000Z WARN [Save] disk full');
    log.clear();
    expect(log.recent()).toHaveLength(0);
  });

  it('can change level at runtime', () => {
    const { log, seen } = makeLogger('error');
    log.log('info', 'T', 'hidden');
    log.setLevel('info');
    log.log('info', 'T', 'shown');
    expect(log.level).toBe('info');
    expect(seen.map((e) => e.message)).toEqual(['shown']);
  });
});
