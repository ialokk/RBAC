// Placeholder pure helpers — extended as each phase needs shared formatting/geo/money logic.

/** Formats an integer amount in minor currency units (paise) as a display string, e.g. 12345 -> "123.45". */
export function formatMinorCurrency(amountInMinorUnits: number): string {
  return (amountInMinorUnits / 100).toFixed(2);
}
