// Derives a short project code from its name: "Customer Portal" → "CP",
// "Payments" → "PAY". Shared by the form preview and the server action.
export function deriveProjectCode(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 3);
  return words
    .map((w) => w[0])
    .join('')
    .slice(0, 4);
}

export function normaliseProjectCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
