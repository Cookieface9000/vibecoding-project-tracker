// Copying to the clipboard, and confirming it. Client-only (uses the browser clipboard).

export const TOAST_EVENT = 'vt:toast';
export type ToastRequest = { kind: 'ok' | 'error'; text: string };

/** Copy text; falls back to a hidden textarea where the async clipboard API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** Show a confirmation toast. The board's Toast listens for these (Board.tsx). */
export function announce(request: ToastRequest) {
  window.dispatchEvent(new CustomEvent<ToastRequest>(TOAST_EVENT, { detail: request }));
}

/** Copy a Markdown briefing and confirm it with a toast naming what was copied. */
export async function copyBriefing(text: string, what: string) {
  const ok = await copyText(text);
  announce(
    ok
      ? { kind: 'ok', text: `Copied ${what} (${text.length.toLocaleString()} characters). Paste it into your AI tool.` }
      : { kind: 'error', text: "Couldn't copy: your browser blocked the clipboard. Select the text and copy it instead." },
  );
  return ok;
}
