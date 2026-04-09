/** Festivos laborales de ámbito estatal en España (calendario habitual; sin CCAA ni locales). */

export type SpainNationalHoliday = {
  date: Date;
  /** Nombre en inglés (referencia UI). */
  nameEn: string;
  /** Nombre en español. */
  nameEs: string;
};

function westernEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function goodFriday(year: number): Date {
  const easter = westernEasterSunday(year);
  const d = new Date(easter);
  d.setDate(d.getDate() - 2);
  return d;
}

function atLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fixed(year: number, monthIndex: number, day: number, nameEn: string, nameEs: string): SpainNationalHoliday {
  return { date: new Date(year, monthIndex, day), nameEn, nameEs };
}

export function getSpainNationalHolidaysForYear(year: number): SpainNationalHoliday[] {
  const gf = goodFriday(year);
  return [
    fixed(year, 0, 1, "New Year's Day", "Año Nuevo"),
    fixed(year, 0, 6, "Epiphany", "Epifanía / Reyes Magos"),
    { date: gf, nameEn: "Good Friday", nameEs: "Viernes Santo" },
    fixed(year, 4, 1, "Labor Day", "Día del Trabajador"),
    fixed(year, 7, 15, "Assumption of Mary", "Asunción de la Virgen"),
    fixed(year, 9, 12, "Hispanic Heritage Day", "Fiesta Nacional de España"),
    fixed(year, 10, 1, "All Saints' Day", "Todos los Santos"),
    fixed(year, 11, 6, "Constitution Day", "Día de la Constitución"),
    fixed(year, 11, 8, "Immaculate Conception", "Inmaculada Concepción"),
    fixed(year, 11, 25, "Christmas", "Navidad"),
  ].sort((x, y) => x.date.getTime() - y.date.getTime());
}

/** Próximos festivos desde `from` (inclusive, comparando solo día local). */
export function getUpcomingSpainNationalHolidays(from: Date, limit: number): SpainNationalHoliday[] {
  const y = from.getFullYear();
  const merged = [...getSpainNationalHolidaysForYear(y), ...getSpainNationalHolidaysForYear(y + 1)];
  const seen = new Set<string>();
  const unique: SpainNationalHoliday[] = [];
  for (const h of merged) {
    const key = `${h.date.getFullYear()}-${h.date.getMonth()}-${h.date.getDate()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(h);
  }
  const t0 = atLocalMidnight(from).getTime();
  return unique
    .filter((h) => atLocalMidnight(h.date).getTime() >= t0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, limit);
}

function englishOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** Formato tipo referencia: "Fri Apr 3rd". */
export function formatSpainHolidayDateEn(d: Date): string {
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(d);
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d);
  const day = d.getDate();
  return `${weekday} ${month} ${day}${englishOrdinalSuffix(day)}`;
}
