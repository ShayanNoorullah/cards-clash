/**
 * Online/offline detection for the online modes. Uses the browser's
 * `navigator.onLine` plus its online/offline events (Capacitor's WebView
 * reports the same). "Online" only means a network is available; the game
 * server itself can still fail, which callers handle as a normal error.
 */

type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();
let installed = false;

function install(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const notify = () => {
    const now = isOnline();
    for (const l of [...listeners]) l(now);
  };
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
}

/** Whether the device has a network connection (true where unknown, e.g. in tests). */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/** Calls `cb` whenever the connection comes or goes. Returns an unsubscribe function. */
export function onNetworkChange(cb: Listener): () => void {
  install();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const OFFLINE_MESSAGE =
  "You're offline. Online modes need an internet connection; everything else still works.";
