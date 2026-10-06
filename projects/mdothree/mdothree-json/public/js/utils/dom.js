// utils/dom.js — small shared UI helpers (no innerHTML for user/engine text).

/** Render a single alert into `container` using textContent (safe for any message). */
export function showAlert(container, type, message) {
  if (!container) return;
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = message;
  container.replaceChildren(div);
}

/** Copy text; returns true on success. Falls back to execCommand when the async API is unavailable/denied. */
export async function copyText(text) {
  const value = String(text ?? '');
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

const _timers = new WeakMap();
/** Copy and flash honest feedback on the button ("Copied!" only when it actually worked). */
export async function copyWithFeedback(btn, text, restoreLabel) {
  const ok = await copyText(text);
  if (btn) {
    const restore = restoreLabel ?? btn.dataset.label ?? btn.textContent;
    btn.dataset.label = restore;
    clearTimeout(_timers.get(btn));
    btn.textContent = ok ? '✅ Copied!' : '⚠️ Copy failed';
    _timers.set(btn, setTimeout(() => { btn.textContent = restore; }, 2000));
  }
  return ok;
}
