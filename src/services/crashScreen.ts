/**
 * Crash-safe error screen. An uncaught error in the game loop stops Phaser, so
 * this is plain DOM (it works even when the canvas does not). The save is
 * written on every change and keeps a backup, so reloading loses nothing but
 * the current match.
 */
import { logger } from './logger';

const log = logger.child('Crash');
const ID = 'crash-screen';

/** Errors that are harmless noise in some browsers and must not show the screen. */
const IGNORED = [/ResizeObserver loop/i, /Script error\.?$/i];

export interface CrashInfo {
  message: string;
  stack?: string;
  version: string;
  when: string;
  userAgent: string;
}

let shown = false;

function details(err: unknown, message: string, version: string): CrashInfo {
  const e = err instanceof Error ? err : null;
  return {
    message: e?.message ?? message,
    ...(e?.stack ? { stack: e.stack } : {}),
    version,
    when: new Date().toISOString(),
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style: Partial<CSSStyleDeclaration>,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node.style, style);
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Shows the error screen (once). Exported for tests and for fatal boot errors. */
export function showCrashScreen(info: CrashInfo): void {
  if (shown || typeof document === 'undefined') return;
  shown = true;
  const overlay = el('div', {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    background: 'rgba(18, 12, 43, 0.97)',
    color: '#f4efff',
    fontFamily: '"Barlow Condensed", system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    textAlign: 'center',
    gap: '16px',
  });
  overlay.id = ID;
  overlay.setAttribute('role', 'alertdialog');
  overlay.setAttribute('aria-label', 'Something went wrong');
  overlay.append(
    el('div', { fontSize: '56px' }, '🃏'),
    el(
      'h1',
      { margin: '0', fontFamily: '"Oswald", system-ui, sans-serif', fontSize: '32px', color: '#ffd23f' },
      'Something went wrong',
    ),
    el(
      'p',
      { margin: '0', maxWidth: '520px', fontSize: '20px', lineHeight: '1.35' },
      'The game hit an unexpected error. Your progress is saved: reload to continue. ' +
        'If it keeps happening, copy the details and include them in a bug report.',
    ),
    el(
      'code',
      { maxWidth: '520px', fontSize: '15px', opacity: '0.7', wordBreak: 'break-word' },
      info.message,
    ),
  );
  const row = el('div', { display: 'flex', gap: '12px', marginTop: '8px' });
  const button = (label: string, primary: boolean, onClick: () => void) => {
    const b = el(
      'button',
      {
        font: 'inherit',
        fontSize: '22px',
        padding: '12px 28px',
        borderRadius: '14px',
        border: 'none',
        cursor: 'pointer',
        color: primary ? '#1b1235' : '#f4efff',
        background: primary ? '#ffd23f' : '#3a2f6b',
      },
      label,
    );
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };
  const copy = button('Copy details', false, () => {
    const text = JSON.stringify(info, null, 2);
    void navigator.clipboard?.writeText(text).then(
      () => (copy.textContent = 'Copied!'),
      () => (copy.textContent = 'Copy failed'),
    );
  });
  row.append(
    button('Reload', true, () => location.reload()),
    copy,
  );
  overlay.append(row);
  document.body.append(overlay);
}

/**
 * Installs the global handlers. `beforeShow` gets a chance to flush the save.
 * Uncaught errors show the screen; unhandled promise rejections are only
 * logged (they are usually a failed request, and the game keeps running).
 */
export function installCrashHandler(version: string, beforeShow?: () => void): void {
  window.addEventListener('error', (e) => {
    const message = e.message || String(e.error ?? 'Unknown error');
    log.error(`Uncaught: ${message}`, e.error);
    if (IGNORED.some((r) => r.test(message))) return;
    try {
      beforeShow?.();
    } catch {
      // never let the handler itself throw
    }
    showCrashScreen(details(e.error, message, version));
  });
  window.addEventListener('unhandledrejection', (e) => log.error('Unhandled promise rejection', e.reason));
}
