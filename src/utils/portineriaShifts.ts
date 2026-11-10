import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * Integrazione in tempo reale con l'applicazione Portineria · Turni & Servizio.
 * Si collega direttamente al database cloud Supabase di Portineria per recuperare
 * i turni reali, le eccezioni approvate, i permessi e le ferie effettivi.
 * Include fallback matematico alla matrice di rotazione in caso di assenza di rete.
 */

export const TURNI_SUPABASE_URL = 'https://wijtpuytlgrwcvbsocsf.supabase.co';
export const TURNI_SUPABASE_ANON_KEY = 'sb_publishable_IphdlkA75YZxr__nHwX1eQ_HFGQluyu';

export const turniSupabase = createClient(TURNI_SUPABASE_URL, TURNI_SUPABASE_ANON_KEY);

export interface PortiereShiftInfo {
  nome: string;
  ruolo: string;
  fascia: 'MATTINA' | 'CAVALLO' | 'POMERIGGIO' | 'NOTTE' | 'RIPOSO';
  orario: string;
  note?: string;
  ore?: number;
}

export interface DayPortineriaShifts {
  dataIso: string;
  giornoNome: string;
  isReale: boolean; // true se caricato dal database cloud reale
  mattina: PortiereShiftInfo[];
  cavallo: PortiereShiftInfo[];
  pomeriggio: PortiereShiftInfo[];
  notte: PortiereShiftInfo[];
  riposo: PortiereShiftInfo[];
  assentiSpeciali: PortiereShiftInfo[]; // Ferie, permessi, malattia con ore registrate
}

export const UUID_TO_DIPENDENTE_MAP: Record<string, string> = {
  'a5c2b2fe-17e8-4b07-8f41-8fc28d49105d': 'Ferranti',
  '50c95d62-ac32-40a2-8672-087bbfde9612': 'Cenciotti',
  '96cfe81d-d13e-4141-a48e-d5b6fb7b62f7': 'Gasparro',
  'b1345b35-3467-467b-a076-1533adb730ea': 'De Cillia',
  'a0156d5b-70aa-45bb-8e21-7a48f133612d': 'Acciari',
  'f14d008f-b9b6-446a-af03-304eff02a35c': 'Califano',
  'f8d641c0-f195-46e1-bfc3-42bc75a27a71': 'Serpi',
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

export const MATRICE_ROTAZIONE_COMPLETA: Record<string, ('N' | 'P' | 'C' | 'M')[]> = {
  FERRANTI: ['N', 'P', 'C', 'M', 'P', 'C', 'M'],
  CENCIOTTI: ['M', 'N', 'P', 'C', 'M', 'P', 'C'],
  GASPARRO: ['C', 'M', 'N', 'P', 'C', 'M', 'P'],
  'DE CILLIA': ['P', 'C', 'M', 'N', 'P', 'C', 'M'],
  ACCIARI: ['M', 'P', 'C', 'M', 'N', 'P', 'C'],
  CALIFANO: ['C', 'M', 'P', 'C', 'M', 'N', 'P'],
  SERPI: ['P', 'C', 'M', 'P', 'C', 'M', 'N'],
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
 * Calcola i turni teorici da matrice matematica (utilizzato come fallback)
 */
export function calcolaPortineriaShiftsTeorici(dateIso: string): DayPortineriaShifts {
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
    isReale: false,
    mattina: [],
    cavallo: [],
    pomeriggio: [],
    notte: [],
    riposo: [],
    assentiSpeciali: [],
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
        ore: dayIdx === 0 ? 2 : 9,
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
          ore: dayIdx === 0 ? 7 : 0,
        });
      } else if (dayIdx >= 2 && dayIdx <= 4) {
        result.pomeriggio.push({
          nome: dipName,
          ruolo,
          fascia: 'POMERIGGIO',
          orario: '15:00 - 22:00',
          note: dayIdx === 2 ? 'Rientro smontante' : '',
          ore: 7,
        });
      } else if (dayIdx === 6) {
        result.pomeriggio.push({
          nome: dipName,
          ruolo,
          fascia: 'POMERIGGIO',
          orario: '14:00 - 22:00',
          ore: 8,
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
          ore: 0,
        });
      } else {
        const orario = (dayIdx >= 2 && dayIdx <= 4) ? '07:00 - 14:00' : '07:00 - 15:00';
        result.mattina.push({
          nome: dipName,
          ruolo,
          fascia: 'MATTINA',
          orario,
          ore: (dayIdx >= 2 && dayIdx <= 4) ? 7 : 8,
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
          ore: 0,
        });
      } else {
        const orario = (dayIdx >= 2 && dayIdx <= 4) ? '08:00 - 15:00' : '07:00 - 15:00';
        result.mattina.push({
          nome: dipName,
          ruolo,
          fascia: 'MATTINA',
          orario,
          ore: (dayIdx >= 2 && dayIdx <= 4) ? 7 : 8,
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
        ore: (dayIdx >= 2 && dayIdx <= 4) ? 7 : 8,
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
          ore: 0,
        });
      } else {
        const orario = (dayIdx >= 2 && dayIdx <= 4) ? '15:00 - 22:00' : '14:00 - 22:00';
        result.pomeriggio.push({
          nome: dipName,
          ruolo,
          fascia: 'POMERIGGIO',
          orario,
          ore: (dayIdx >= 2 && dayIdx <= 4) ? 7 : 8,
        });
      }
      continue;
    }

    result.riposo.push({
      nome: dipName,
      ruolo,
      fascia: 'RIPOSO',
      orario: 'Riposo',
      ore: 0,
    });
  }

  return result;
}

// Cache in memoria delle risposte per evitare fetch duplicate
const shiftsCache = new Map<string, DayPortineriaShifts>();
const listenersByDate = new Map<string, Set<(shifts: DayPortineriaShifts) => void>>();

function notifyListeners(dateIso: string, shifts: DayPortineriaShifts) {
  const set = listenersByDate.get(dateIso);
  if (set) {
    set.forEach((fn) => fn(shifts));
  }
}

/**
 * Recupera i turni reali dal database Cloud Supabase di Portineria
 */
export async function fetchRealPortineriaShifts(dateIso: string): Promise<DayPortineriaShifts> {
  if (shiftsCache.has(dateIso) && shiftsCache.get(dateIso)?.isReale) {
    return shiftsCache.get(dateIso)!;
  }

  const d = parseISODate(dateIso);
  const dayOfWeek = d.getDay();
  const dayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const NOMI_GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  const giornoNome = NOMI_GIORNI[dayIdx];

  try {
    const { data, error } = await turniSupabase
      .from('turni')
      .select('*')
      .eq('data', dateIso);

    if (error || !data || data.length === 0) {
      const fallback = calcolaPortineriaShiftsTeorici(dateIso);
      shiftsCache.set(dateIso, fallback);
      return fallback;
    }

    const realShifts: DayPortineriaShifts = {
      dataIso: dateIso,
      giornoNome,
      isReale: true,
      mattina: [],
      cavallo: [],
      pomeriggio: [],
      notte: [],
      riposo: [],
      assentiSpeciali: [],
    };

    for (const r of data) {
      const nome = UUID_TO_DIPENDENTE_MAP[r.dipendente_id] || 'Custode';
      const ruolo = DIPENDENTI_RUOLI[nome] || 'Portiere';
      let note = r.note || '';
      let orario = '';

      // Estrai orario tag es. <!--t:07:00-15:00-->
      const matchTime = note.match(/<!--t:(\d{2}:\d{2})-(\d{2}:\d{2})-->/);
      if (matchTime) {
        orario = `${matchTime[1]} - ${matchTime[2]}`;
        note = note.replace(/<!--t:\d{2}:\d{2}-\d{2}:\d{2}-->/g, '').trim();
      }
      const cleanNote = note.replace(/<!--e:1-->/g, '').trim();
      const fascia = (r.tipo_turno || 'RIPOSO').toUpperCase() as PortiereShiftInfo['fascia'];
      const ore = Number(r.ore) || 0;

      // Fallback orari tipici se non indicati esplicitamente
      if (!orario) {
        if (fascia === 'NOTTE') orario = '22:00 - 07:00';
        else if (fascia === 'CAVALLO') orario = (dayIdx >= 2 && dayIdx <= 4) ? '10:00 - 18:00' : '09:00 - 18:00';
        else if (fascia === 'MATTINA') orario = (dayIdx >= 2 && dayIdx <= 4) ? '08:00 - 15:00' : '07:00 - 15:00';
        else if (fascia === 'POMERIGGIO') orario = (dayIdx >= 2 && dayIdx <= 4) ? '15:00 - 22:00' : '14:00 - 22:00';
      }

      const info: PortiereShiftInfo = {
        nome,
        ruolo,
        fascia,
        orario,
        note: cleanNote,
        ore,
      };

      if (fascia === 'MATTINA') realShifts.mattina.push(info);
      else if (fascia === 'CAVALLO') realShifts.cavallo.push(info);
      else if (fascia === 'POMERIGGIO') realShifts.pomeriggio.push(info);
      else if (fascia === 'NOTTE') realShifts.notte.push(info);
      else {
        realShifts.riposo.push(info);
        if (/ferie|permesso|malattia/i.test(cleanNote) || ore > 0) {
          realShifts.assentiSpeciali.push(info);
        }
      }
    }

    shiftsCache.set(dateIso, realShifts);
    notifyListeners(dateIso, realShifts);
    return realShifts;
  } catch (err) {
    console.error('Errore recupero turni reali da Portineria Cloud:', err);
    const fallback = calcolaPortineriaShiftsTeorici(dateIso);
    shiftsCache.set(dateIso, fallback);
    return fallback;
  }
}

/**
 * Funzione sincrona di lettura rapida (ritorna il valore in cache o la stima teorica immediata)
 */
export function getPortineriaShiftsForDate(dateIso: string): DayPortineriaShifts {
  if (shiftsCache.has(dateIso)) {
    return shiftsCache.get(dateIso)!;
  }
  // Avvia fetch asincrono in background per popolare la cache
  fetchRealPortineriaShifts(dateIso);
  return calcolaPortineriaShiftsTeorici(dateIso);
}

/**
 * Hook React per avere i turni reali e reattivi per qualsiasi data
 */
export function usePortineriaShifts(dateIso: string): DayPortineriaShifts {
  const [shifts, setShifts] = useState<DayPortineriaShifts>(() => {
    return shiftsCache.get(dateIso) || calcolaPortineriaShiftsTeorici(dateIso);
  });

  useEffect(() => {
    let isMounted = true;

    // Registra listener
    if (!listenersByDate.has(dateIso)) {
      listenersByDate.set(dateIso, new Set());
    }
    const listener = (newShifts: DayPortineriaShifts) => {
      if (isMounted) setShifts(newShifts);
    };
    listenersByDate.get(dateIso)!.add(listener);

    // Carica dati reali da Supabase
    fetchRealPortineriaShifts(dateIso).then((res) => {
      if (isMounted) setShifts(res);
    });

    return () => {
      isMounted = false;
      const set = listenersByDate.get(dateIso);
      if (set) {
        set.delete(listener);
        if (set.size === 0) listenersByDate.delete(dateIso);
      }
    };
  }, [dateIso]);

  return shifts;
}

/**
 * URL ufficiale dell'applicazione Portineria · Turni & Servizio
 */
export const PORTINERIA_APP_URL = 'https://turni-portineria.vercel.app';

export function getPortineriaUrlForDate(dateIso: string, isMobile: boolean = false): string {
  if (isMobile) {
    return `${PORTINERIA_APP_URL}/?vista=mobile&data=${dateIso}`;
  }
  return `${PORTINERIA_APP_URL}/?vista=segreteria&data=${dateIso}`;
}

/**
 * Determina se un turno con orario (es. "07:00 - 15:00", "22:00 - 07:00") è attivo adesso
 */
export function isShiftActiveNow(orario?: string): boolean {
  if (!orario) return false;
  const match = orario.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return false;

  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  const startMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  const endMinutes = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);

  if (endMinutes > startMinutes) {
    return curMinutes >= startMinutes && curMinutes < endMinutes;
  }
  // Turno notturno attraverso la mezzanotte (es. 22:00 - 07:00)
  return curMinutes >= startMinutes || curMinutes < endMinutes;
}
