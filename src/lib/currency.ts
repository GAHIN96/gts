/**
 * Currency rounding utilities.
 *
 * All monetary math in the app (per-night price × nights × rooms, taxes,
 * discounts) MUST flow through these helpers so totals are deterministic and
 * never drift due to IEEE-754 floating-point representation
 * (e.g. 0.1 + 0.2 = 0.30000000000000004).
 *
 * Strategy:
 *   - Round each line item to 2 decimals using "round half away from zero"
 *     (banker-friendly, matches what users see on invoices).
 *   - Sum the ALREADY-ROUNDED line items so the displayed total always equals
 *     the sum of displayed line totals.
 */

/** Round a single monetary value to 2 decimals (half away from zero). */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Use exponential-string rounding to bypass IEEE-754 representation errors
  // such as `1.005 * 100 === 100.49999999999999`. This is the standard JS
  // workaround for half-away-from-zero decimal rounding.
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const rounded = Number(Math.round(Number(`${abs}e+2`)) + "e-2");
  return sign * rounded;
}

/** Sum a list of monetary values, rounding each first then the total. */
export function sumCurrency(values: ReadonlyArray<number>): number {
  const rounded = values.map(roundCurrency).reduce((a, b) => a + b, 0);
  return roundCurrency(rounded);
}

/**
 * Compute a per-line total `unitPrice × quantity` rounded once,
 * then sum across all lines using the rounded line totals.
 *
 * Use this for "price per night × nights × rooms" style breakdowns so the
 * grand total displayed to the user always matches the sum of the line
 * totals shown in the breakdown.
 */
export function totalLineItems(
  lines: ReadonlyArray<{ unitPrice: number; quantity: number }>,
): number {
  const lineTotals = lines.map((l) => roundCurrency(l.unitPrice * l.quantity));
  return sumCurrency(lineTotals);
}
