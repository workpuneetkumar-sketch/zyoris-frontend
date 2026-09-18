// utils/currencyFormat.ts
// Consistent currency presentation for multi-currency display.
// Does NOT calculate exchange rates or perform local conversions.
// Formats backend-provided amounts using Intl.NumberFormat according to the currency code.

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "CA$",
  AUD: "AU$",
  SGD: "SG$",
  AED: "AED ",
};

export function formatCurrencyAmount(
  amount?: number | null,
  currency: string = "USD",
  compact: boolean = false
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || `${currency} `;
    return `${symbol}0`;
  }

  const curr = currency.toUpperCase();

  if (compact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";
    const symbol = CURRENCY_SYMBOLS[curr] || `${curr} `;

    if (curr === "INR") {
      if (abs >= 10_000_000) return `${sign}${symbol}${(abs / 10_000_000).toFixed(1)}Cr`;
      if (abs >= 100_000) return `${sign}${symbol}${(abs / 100_000).toFixed(1)}L`;
      if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}K`;
    } else {
      if (abs >= 1_000_000_000) return `${sign}${symbol}${(abs / 1_000_000_000).toFixed(1)}B`;
      if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}K`;
    }
    return `${sign}${symbol}${abs.toLocaleString()}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const symbol = CURRENCY_SYMBOLS[curr] || `${curr} `;
    return `${symbol}${amount.toLocaleString("en-US")}`;
  }
}
