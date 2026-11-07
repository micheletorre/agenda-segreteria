/**
 * Algoritmo di rotazione e anagrafica della squadra portineria.
 * Calcola matematicamente i custodi in servizio per qualsiasi data dell'anno,
 * sincronizzato al 100% con l'applicazione Turni Portineria.
 */

export interface PortiereShiftInfo {
  nome: string;
  ruolo: string;
  fascia: 'MATTINA' | 'CAVALLO' | 'POMERIGGIO' | 'NOTTE' | 'RIPOSO';
  orario: string;
  note?: string;
}

export interface DayPortineriaShifts {
  dataIso: string;
  giornoNome: string;
  mattina: PortiereShiftInfo[];
  cavallo: PortiereShiftInfo[];
  pomeriggio: PortiereShiftInfo[];
  notte: PortiereShiftInfo[];
  riposo: PortiereShiftInfo[];
}

export const MATRICE_ROTAZIONE_COMPLETA: Record<string, ('N' | 'P' | 'C' | 'M')[]> = {
  FERRANTI: ['N', 'P', 'C', 'M', 'P', 'C', 'M'],
  CENCIOTTI: ['M', 'N', 'P', 'C', 'M', 'P', 'C'],
  GASPARRO: ['C', 'M', 'N', 'P', 'C', 'M', 'P'],
  'DE CILLIA': ['P', 'C', 'M', 'N', 'P', 'C', 'M'],
  ACCIARI: ['M', 'P', 'C', 'M', 'N', 'P', 'C'],
  CALIFANO: ['C', 'M', 'P', 'C', 'M', 'N', 'P'],
  SERPI: ['P', 'C', 'M', 'P', 'C', 'M', 'N'],
};

export const NID_DIPENDENTI = [
  'Ferranti',
  'Cenciotti',
  'Gasparro',
  'De Cillia',
  'Acciari',
  'Califano',
  'Serpi',
];

export const DIPENDENTI_RUOLI: Record<string, string> = {
  Ferranti: 'Portiere Titolare',
  Cenciotti: 'Portiere Titolare',
  Gasparro: 'Custode Residente',
  'De Cillia': 'Portiere Sostituto',
  Acciari: 'Vigilanza Notturna',
  Califano: 'Portiere Titolare',
  Serpi: 'Portiere Titolare',
};

function parseISODate(str: string): Date {
  const parts = str.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d, 12, 0, 0, 0);
  }
  const dt = new Date(str);
  dt.setHours(12, 0, 0, 0);
  return dt;
}

function getLunediSettimana(d: Date): Date {
  const date = new Date(d);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const lunedi = new Date(date);
  lunedi.setDate(date.getDate() + diffToMonday);
  lunedi.setHours(12, 0, 0, 0);
  return lunedi;
}

function calcolaFaseRotazione(date: Date): number {
  const baseLunedi = new Date(2026, 9, 19); // 19 Ottobre 2026 = Lunedì base
  baseLunedi.setHours(0, 0, 0, 0);
  const target = getLunediSettimana(date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - baseLunedi.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  return (((4 + (diffWeeks % 7)) % 7) + 7) % 7;
}

/**
 * Calcola esattamente i portieri di servizio per una data specifica (ISO YYYY-MM-DD).
 */
export function getPortineriaShiftsForDate(dateIso: string): DayPortineriaShifts {
  const d = parseISODate(dateIso);
  const lunedi = getLunediSettimana(d);
  const faseNorm = calcolaFaseRotazione(lunedi);
  const normalizedFase = ((faseNorm % 7) + 7) % 7;

  const dayOfWeek = d.getDay();
  const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Lun, 6=Dom

  const NOMI_GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const giornoNome = NOMI_GIORNI[dayIdx];

  const nomeNotteAttuale = NID_DIPENDENTI.find(
    (dip) => MATRICE_ROTAZIONE_COMPLETA[dip.toUpperCase()][normalizedFase] === 'N'
  ) || 'Acciari';

  const fasePrecedente = (normalizedFase - 1 + 7) % 7;
  const nomeSmontante = NID_DIPENDENTI.find(
    (dip) => MATRICE_ROTAZIONE_COMPLETA[dip.toUpperCase()][fasePrecedente] === 'N'
  ) || 'De Cillia';

  const faseSuccessiva = (normalizedFase + 1) % 7;
  const nomeMontante = NID_DIPENDENTI.find(
    (dip) => MATRICE_ROTAZIONE_COMPLETA[dip.toUpperCase()][faseSuccessiva] === 'N'
  ) || 'Califano';

  const result: DayPortineriaShifts = {
    dataIso: dateIso,
    giornoNome,
    mattina: [],
    cavallo: [],
    pomeriggio: [],
    notte: [],
    riposo: [],
  };

  for (const dipName of NID_DIPENDENTI) {
    const isNotte = dipName.toLowerCase() === nomeNotteAttuale.toLowerCase();
    const isSmontante = dipName.toLowerCase() === nomeSmontante.toLowerCase();
    const isMontante = dipName.toLowerCase() === nomeMontante.toLowerCase();
    const codiceTeorico = MATRICE_ROTAZIONE_COMPLETA[dipName.toUpperCase()][normalizedFase];
    const ruolo = DIPENDENTI_RUOLI[dipName] || 'Portiere';

    if (isNotte) {
      result.notte.push({
        nome: dipName,
        ruolo,
        fascia: 'NOTTE',
        orario: '22:00 - 07:00',
      });
      continue;
    }

    if (isSmontante) {
      if (dayIdx === 0 || dayIdx === 1 || dayIdx === 5) {
        result.riposo.push({
          nome: dipName,
          ruolo,
          fascia: 'RIPOSO',
          orario: 'Riposo',
          note: dayIdx === 0 ? 'Smontante notte' : 'Riposo smontante',
        });
      } else if (dayIdx >= 2 && dayIdx <= 4) {
        result.pomeriggio.push({
          nome: dipName,
          ruolo,
          fascia: 'POMERIGGIO',
          orario: '15:00 - 22:00',
          note: dayIdx === 2 ? 'Rientro smontante' : '',
        });
      } else if (dayIdx === 6) {
        result.pomeriggio.push({
          nome: dipName,
          ruolo,
          fascia: 'POMERIGGIO',
          orario: '14:00 - 22:00',
        });
      }
      continue;
    }

    if (isMontante) {
      if (dayIdx === 6) {
        result.riposo.push({
          nome: dipName,
          ruolo,
          fascia: 'RIPOSO',
          orario: 'Riposo',
        });
      } else {
        const orario = (dayIdx >= 2 && dayIdx <= 4) ? '07:00 - 14:00' : '07:00 - 15:00';
        result.mattina.push({
          nome: dipName,
          ruolo,
          fascia: 'MATTINA',
          orario,
        });
      }
      continue;
    }

    if (codiceTeorico === 'M') {
      if (dayIdx === 5) {
        result.riposo.push({
          nome: dipName,
          ruolo,
          fascia: 'RIPOSO',
          orario: 'Riposo',
        });
      } else {
        const orario = (dayIdx >= 2 && dayIdx <= 4) ? '08:00 - 15:00' : '07:00 - 15:00';
        result.mattina.push({
          nome: dipName,
          ruolo,
          fascia: 'MATTINA',
          orario,
        });
      }
      continue;
    }

    if (codiceTeorico === 'C') {
      const orario = (dayIdx >= 2 && dayIdx <= 4) ? '10:00 - 18:00' : '09:00 - 18:00';
      result.cavallo.push({
        nome: dipName,
        ruolo,
        fascia: 'CAVALLO',
        orario,
        note: dayIdx === 6 ? 'Scala B chiusa' : 'Scala B',
      });
      continue;
    }

    if (codiceTeorico === 'P') {
      if (dayIdx === 6) {
        result.riposo.push({
          nome: dipName,
          ruolo,
          fascia: 'RIPOSO',
          orario: 'Riposo',
        });
      } else {
        const orario = (dayIdx >= 2 && dayIdx <= 4) ? '15:00 - 22:00' : '14:00 - 22:00';
        result.pomeriggio.push({
          nome: dipName,
          ruolo,
          fascia: 'POMERIGGIO',
          orario,
        });
      }
      continue;
    }

    result.riposo.push({
      nome: dipName,
      ruolo,
      fascia: 'RIPOSO',
      orario: 'Riposo',
    });
  }

  return result;
}

/**
 * URL ufficiale dell'applicazione Portineria · Turni & Servizio
 */
export const PORTINERIA_APP_URL = 'https://turni-portineria.vercel.app';

export function getPortineriaUrlForDate(dateIso: string): string {
  return `${PORTINERIA_APP_URL}/?vista=segreteria&data=${dateIso}`;
}
