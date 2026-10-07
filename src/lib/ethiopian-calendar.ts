// Ethiopian <-> Gregorian conversion via Julian Day Numbers (Beyene–Kudlek algorithm)

const ETHIOPIC_EPOCH = 1723856; // Amete Mihret era

export interface EthiopianDate {
  year: number;
  month: number; // 1-13 (13 = Pagume)
  day: number;
}

export const ETHIOPIAN_MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miyazya", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
] as const;

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

export function isValidEthiopianDate({ year, month, day }: EthiopianDate): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1 || month < 1 || month > 13 || day < 1) return false;
  if (month <= 12) return day <= 30;
  return day <= (isEthiopianLeapYear(year) ? 6 : 5); // Pagume
}

function ethiopianToJdn({ year, month, day }: EthiopianDate): number {
  return ETHIOPIC_EPOCH + 365 + 365 * (year - 1) + Math.floor(year / 4) + 30 * month + day - 31;
}

function jdnToEthiopian(jdn: number): EthiopianDate {
  const r = (jdn - ETHIOPIC_EPOCH) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - ETHIOPIC_EPOCH) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  return { year, month, day };
}

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

export function ethiopianToGregorian(ed: EthiopianDate): Date {
  const { year, month, day } = jdnToGregorian(ethiopianToJdn(ed));
  return new Date(Date.UTC(year, month - 1, day));
}

export function gregorianToEthiopian(date: Date): EthiopianDate {
  return jdnToEthiopian(
    gregorianToJdn(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  );
}

/** Parse "dd/mm/yyyy", "dd/mm/yy" or "dd/mmyyyy" Ethiopian date strings. Returns null if invalid. */
export function parseEthiopianDateString(value: string): EthiopianDate | null {
  const v = value.trim();
  let day: number, month: number, year: number;

  const full = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  const glued = full ? null : v.match(/^(\d{1,2})[\/\-.](\d{1,2})(\d{4})$/); // "09/012011"
  const m = full ?? glued;
  if (!m) return null;

  day = Number(m[1]);
  month = Number(m[2]);
  year = Number(m[3]);
  // 2-digit years are 2000s EC (e.g. "10" → 2010)
  if (year < 100) year += 2000;

  const ed = { day, month, year };
  return isValidEthiopianDate(ed) ? ed : null;
}

export function formatEthiopianDate(ed: EthiopianDate): string {
  const dd = String(ed.day).padStart(2, "0");
  const mm = String(ed.month).padStart(2, "0");
  return `${dd}/${mm}/${ed.year}`;
}

export function formatEthiopianDateLong(ed: EthiopianDate): string {
  return `${ETHIOPIAN_MONTHS[ed.month - 1]} ${ed.day}, ${ed.year}`;
}

/** Formats an ISO timestamp as Ethiopian date + local time, e.g. "27/01/2019 EC 14:30". */
export function formatDateTimeEC(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // Use local date components so the EC day matches the viewer's wall clock
  const localDay = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const ed = gregorianToEthiopian(localDay);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatEthiopianDate(ed)} EC ${hh}:${mm}`;
}
