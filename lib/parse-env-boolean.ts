const TRUTHY = new Set(['true', '1', 'yes', 'on']);

/** Tolerates casing, whitespace and surrounding quotes (e.g. `"true"`, ` TRUE `, `1`). */
export function parseEnvBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value !== 'string') return fallback;
  const normalized = value
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase();
  if (normalized === '') return fallback;
  return TRUTHY.has(normalized);
}
