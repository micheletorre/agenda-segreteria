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
