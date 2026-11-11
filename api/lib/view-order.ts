// Parses the optional viewOrder field. 0 is a valid order, so only empty values become null.
export function parseViewOrder(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}
