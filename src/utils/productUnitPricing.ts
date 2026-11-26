/** Return a comparable per-kg/litre/piece price only when the catalogue unit is explicit. */
export function formatProductUnitPrice(price: number, unit: string): string | null {
  if (!Number.isFinite(price) || price < 0 || typeof unit !== 'string') return null;
  const match = unit.trim().match(/^(\d+(?:\.\d+)?)\s*(kg|g|l|lt|litre|liter|ml|piece|pc|pcs)$/i);
  if (!match) return null;
  const quantity = Number(match[1]);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const rawUnit = match[2].toLowerCase();
  let divisor = quantity;
  let label = 'piece';
  if (rawUnit === 'g') { divisor = quantity / 1000; label = 'kg'; }
  else if (rawUnit === 'kg') label = 'kg';
  else if (rawUnit === 'ml') { divisor = quantity / 1000; label = 'L'; }
  else if (['l', 'lt', 'litre', 'liter'].includes(rawUnit)) label = 'L';
  else if (['pc', 'pcs'].includes(rawUnit)) label = 'piece';
  const perUnit = price / divisor;
  if (!Number.isFinite(perUnit)) return null;
  return `₹${Number(perUnit.toFixed(2)).toLocaleString('en-IN')}/${label}`;
}
