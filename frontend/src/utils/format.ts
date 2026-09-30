export function formatCurrency(amount: string | number, currency: string, locale?: string): string {
  if (amount === null || amount === undefined || amount === "") return `0 ${currency}`;
  const clean = typeof amount === "string" ? amount.replace(/,/g, "").trim() : amount;
  const value = typeof clean === "string" ? parseFloat(clean) : clean;
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  const currentLang = locale || (typeof window !== "undefined" ? localStorage.getItem("smartloan.locale") : "en") || "en";
  try {
    return new Intl.NumberFormat(currentLang === "km" ? "km-KH" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "KHR" ? 0 : 2,
      maximumFractionDigits: currency === "KHR" ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

export function formatDate(dateStr: string, locale?: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const currentLang = locale || (typeof window !== "undefined" ? localStorage.getItem("smartloan.locale") : "en") || "en";
  return new Intl.DateTimeFormat(currentLang === "km" ? "km-KH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(dateStr: string, locale?: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const currentLang = locale || (typeof window !== "undefined" ? localStorage.getItem("smartloan.locale") : "en") || "en";
  return new Intl.DateTimeFormat(currentLang === "km" ? "km-KH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatPercent(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return Number.isNaN(n) ? String(value) : `${n}%`;
}

export function convertCurrencyAmount(
  amount: number | string,
  from: string,
  to: string,
  rate: number = 4100
): number {
  if (amount === null || amount === undefined || amount === "") return 0;
  const clean = typeof amount === "string" ? amount.replace(/,/g, "").trim() : amount;
  const num = typeof clean === "string" ? parseFloat(clean) || 0 : Number(clean) || 0;
  if (from === to) return num;
  const safeRate = Number(rate) > 0 ? Number(rate) : 4100;
  if (from === "USD" && to === "KHR") {
    return Math.round(num * safeRate);
  }
  if (from === "KHR" && to === "USD") {
    return Math.round((num / safeRate) * 100) / 100;
  }
  return num;
}

export function formatConvertedCurrency(
  amount: number | string,
  from: string,
  to: string,
  rate: number = 4100,
  locale?: string
): string {
  const converted = convertCurrencyAmount(amount, from, to, rate);
  return formatCurrency(converted, to, locale);
}

