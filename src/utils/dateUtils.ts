const ITALIAN_DAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const ITALIAN_DAYS_LOWER = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const ITALIAN_MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

export function parseISODate(isoStr: string): Date {
  const [year, month, day] = isoStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDayTitle(isoStr: string): { dayName: string; dateStr: string; isWeekend: boolean } {
  const d = parseISODate(isoStr);
  const dayName = ITALIAN_DAYS[d.getDay()];
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthName = ITALIAN_MONTHS[d.getMonth()];
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

  return {
    dayName,
    dateStr: `${dayNum} ${monthName}`,
    isWeekend,
  };
}

export function formatGatehouseDate(isoStr: string): string {
  const d = parseISODate(isoStr);
  const dayName = ITALIAN_DAYS_LOWER[d.getDay()];
  const dayNum = d.getDate();
  const monthName = ITALIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${dayNum} ${monthName} ${year}`;
}

export function formatHeaderDate(d: Date): string {
  const dayName = ITALIAN_DAYS[d.getDay()];
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${dayName} ${dayNum}.${monthNum}.${year}`;
}

export function formatTimestamp(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthNum = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `Aggiornata alle ore ${hours}.${minutes} del ${dayNum}.${monthNum}.${year}`;
}

export function getDaysRange(startDateIso: string, count: number): string[] {
  const result: string[] = [];
  const current = parseISODate(startDateIso);

  for (let i = 0; i < count; i++) {
    result.push(toISODate(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

export function getDaysBetween(startDateIso: string, endDateIso: string): string[] {
  const start = parseISODate(startDateIso);
  const end = parseISODate(endDateIso);
  const result: string[] = [];

  if (start > end) {
    result.push(startDateIso);
    return result;
  }

  const current = new Date(start);
  // Limite di sicurezza: massimo 730 giorni (2 anni)
  let count = 0;
  while (current <= end && count < 730) {
    result.push(toISODate(current));
    current.setDate(current.getDate() + 1);
    count++;
  }

  return result;
}

/**
 * Converte etichette di orario (es. "h 09.00", "10:30", "in mattinata", "nel pomeriggio")
 * in minuti dal giorno (0..1440) per l'ordinamento cronologico rigoroso.
 */
export function parseTimeToMinutes(timeLabel?: string | null): number {
  if (!timeLabel) return 9999;
  const clean = timeLabel.toLowerCase().trim();

  // 1. Orari con minuti: "h 09.00", "09:30", "9.15", "h 15:00", "ore 10.30"
  const matchHoursMinutes = clean.match(/(?:h\s*|\bore\s*)?(\d{1,2})[:.](\d{2})/);
  if (matchHoursMinutes) {
    const hours = parseInt(matchHoursMinutes[1], 10);
    const minutes = parseInt(matchHoursMinutes[2], 10);
    return hours * 60 + minutes;
  }

  // 2. Orari con sola ora: "h 9", "h 10", "ore 11"
  const matchOnlyHours = clean.match(/(?:h\s*|\bore\s*)(\d{1,2})\b/);
  if (matchOnlyHours) {
    const hours = parseInt(matchOnlyHours[1], 10);
    return hours * 60;
  }

  // 3. Etichette descrittive di fascia oraria
  if (clean.includes('mattina') || clean.includes('mattinata') || clean.includes('presto')) {
    return 8 * 60 + 30; // 08:30
  }
  if (clean.includes('seguire')) {
    return 11 * 60 + 30; // 11:30
  }
  if (clean.includes('pranzo') || clean.includes('mezzogiorno')) {
    return 13 * 60; // 13:00
  }
  if (clean.includes('pomeriggio')) {
    return 14 * 60 + 30; // 14:30
  }
  if (clean.includes('sera') || clean.includes('serata')) {
    return 18 * 60; // 18:00
  }
  if (clean.includes('giornata') || clean.includes('chiusura')) {
    return 20 * 60; // 20:00
  }

  return 9999;
}
