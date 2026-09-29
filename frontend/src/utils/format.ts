export function formatCurrency(amount: string | number, currency: string): string {
  if (amount === null || amount === undefined || amount === "") return `0 ${currency}`;
  const clean = typeof amount === "string" ? amount.replace(/,/g, "").trim() : amount;
  const value = typeof clean === "string" ? parseFloat(clean) : clean;
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "KHR" ? 0 : 2,
      maximumFractionDigits: currency === "KHR" ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(d);
}

export function formatPercent(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isNaN(n) ? String(value) : `${n}%`;
}
