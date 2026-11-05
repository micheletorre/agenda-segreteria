import type { Appointment } from '../types';

/**
 * Converte data e time_label (es. 'h 10.00', '10:00', 'h 15.30', 'in mattinata') in orari effettivi
 */
export function extractAppointmentTime(dateStr: string, timeLabel: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('-').map(Number);
  let startHour = 10;
  let startMin = 0;

  // Cerca pattern orari es. 'h 10.00', 'h 09.30', '15:00', '11.45'
  const match = timeLabel.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    startHour = parseInt(match[1], 10);
    startMin = parseInt(match[2], 10);
  } else if (timeLabel.toLowerCase().includes('pomeriggio')) {
    startHour = 15;
    startMin = 0;
  } else if (timeLabel.toLowerCase().includes('mattina')) {
    startHour = 9;
    startMin = 30;
  } else if (timeLabel.toLowerCase().includes('seguire')) {
    startHour = 11;
    startMin = 0;
  }

  const start = new Date(year, month - 1, day, startHour, startMin, 0);
  const end = new Date(start);
  end.setMinutes(start.getMinutes() + 45); // default 45 minuti

  return { start, end };
}

function formatDateToICS(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const min = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}${m}${day}T${h}${min}${s}`;
}

/**
 * Genera il link diretto per Google Calendar
 */
export function getGoogleCalendarUrl(app: Appointment): string {
  const { start, end } = extractAppointmentTime(app.date, app.time_label);
  const startIso = formatDateToICS(start);
  const endIso = formatDateToICS(end);

  const title = encodeURIComponent(app.title);
  const details = encodeURIComponent(
    `Orario: ${app.time_label}\nReferente: ${app.referent || 'Nessuno'}\nNote: ${app.side_note || 'Nessuna'}\n\nAgenda Segreteria di Direzione`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
}

/**
 * Genera e scarica il file .ics per Apple Calendar / Outlook / iCal
 */
export function downloadICS(app: Appointment): void {
  const { start, end } = extractAppointmentTime(app.date, app.time_label);
  const startIso = formatDateToICS(start);
  const endIso = formatDateToICS(end);
  const nowIso = formatDateToICS(new Date());

  const cleanTitle = app.title.replace(/[\n\r]/g, ' ');
  const cleanDesc = `Orario: ${app.time_label} - Referente: ${app.referent || ''} ${app.side_note || ''}`.replace(/[\n\r]/g, ' ');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Segreteria//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:agenda-${app.id}-${Date.now()}@agenda-segreteria`,
    `DTSTAMP:${nowIso}`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDesc}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${app.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
