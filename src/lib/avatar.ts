// Generated profile pictures. A member's `avatar` is a short key, never an image file:
//   null            → their initials
//   "letter:K"      → a big letter on a coloured background
//   "pattern:a1b2"  → a symmetric 5×5 pattern grown from the seed
// Everything is drawn as SVG in the browser, so nothing is uploaded or stored.
// Safe to import from client or server code.

export const AVATAR_KEY = /^(letter:[A-Z]|pattern:[a-z0-9]{1,12})$/;

export type AvatarDrawing =
  | { kind: 'initials'; text: string; hue: number }
  | { kind: 'letter'; text: string; hue: number }
  | { kind: 'pattern'; cells: boolean[]; hue: number };

/** FNV-1a: a small, stable string hash. */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** What to draw for a member: their chosen key, or initials when none (or an invalid one) is set. */
export function avatarDrawing(name: string, avatar: string | null | undefined): AvatarDrawing {
  if (avatar && AVATAR_KEY.test(avatar)) {
    const [kind, value] = avatar.split(':');
    if (kind === 'letter') return { kind: 'letter', text: value, hue: hash(value) % 360 };
    const h = hash(value);
    // 5×5 grid mirrored left↔right: 15 independent cells (columns 0–2), one bit each.
    const cells = Array.from({ length: 25 }, (_, i) => {
      const row = Math.floor(i / 5);
      const col = Math.min(i % 5, 4 - (i % 5));
      return ((h >>> (row * 3 + col)) & 1) === 1;
    });
    return { kind: 'pattern', cells, hue: (h >>> 16) % 360 };
  }
  return { kind: 'initials', text: initials(name) || '?', hue: hash(name) % 360 };
}

/** n fresh random pattern keys, for the picker's "Shuffle". */
export function randomPatternKeys(n: number) {
  return Array.from({ length: n }, () => `pattern:${Math.random().toString(36).slice(2, 10)}`);
}

export const LETTER_KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => `letter:${l}`);
