import { createClient } from '@supabase/supabase-js';
import type { Appointment } from '../types';
import { parseTimeToMinutes } from './dateUtils';

/**
 * Progetto Supabase dedicato a Portineria (Palazzo Macchi di Cellere):
 * Gestisce la condivisione bidirezionale degli appuntamenti attesi al varco
 * e la registrazione in tempo reale degli arrivi registrati dai custodi.
 */
export const PORTINERIA_SUPABASE_URL = 'https://wijtpuytlgrwcvbsocsf.supabase.co';
export const PORTINERIA_SUPABASE_KEY = 'sb_publishable_IphdlkA75YZxr__nHwX1eQ_HFGQluyu';

export const portineriaSupabase = createClient(
  PORTINERIA_SUPABASE_URL,
  PORTINERIA_SUPABASE_KEY
);

export const CLOUD_KEY_APPUNTAMENTI_PREFIX = '__appuntamenti_portineria_';

export interface PortineriaAppointmentItem {
  id: string;              // ID univoco dell'appuntamento in Agenda
  dataStr: string;         // "YYYY-MM-DD"
  ora?: string;            // "HH:mm"
  nominativo: string;      // Nome ospite / ditta / visitatore
  destinazione?: string;   // Ufficio / referente / luogo nel Palazzo
  note?: string;           // Note utili per la portineria
  conAutomezzo?: boolean;  // true se arriva in auto
  targa?: string;          // targa eventuale
  arrivato?: boolean;      // impostato a true dalla Portineria allo smarcamento
  oraArrivo?: string;      // "HH:mm" impostato dalla Portineria
  scalaArrivo?: 'SCALA A' | 'SCALA B';
  operatoreArrivo?: string;
}

/**
 * Costruisce la chiave univoca per la riga in registro_segnalazioni.
 */
export function getCloudKeyForDate(dataStr: string): string {
  return `${CLOUD_KEY_APPUNTAMENTI_PREFIX}${dataStr}__`;
}

/**
 * Estrae una stringa HH:mm pulita dall'etichetta orario (es. "h 10.00" -> "10:00").
 */
export function extractHHMM(timeLabel?: string | null): string | undefined {
  if (!timeLabel) return undefined;
  const clean = timeLabel.toLowerCase().trim();

  const match = clean.match(/(?:h\s*|\bore\s*)?(\d{1,2})[:.](\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }

  const matchHour = clean.match(/(?:h\s*|\bore\s*)(\d{1,2})\b/);
  if (matchHour) {
    const hh = matchHour[1].padStart(2, '0');
    return `${hh}:00`;
  }

  return undefined;
}

/**
 * Recupera l'array di segnalazioni per una data dal database di Portineria.
 */
export async function fetchPortineriaAppointmentsForDate(dataStr: string): Promise<PortineriaAppointmentItem[]> {
  if (!dataStr) return [];
  try {
    const { data, error } = await portineriaSupabase
      .from('registro_segnalazioni')
      .select('segnalazioni')
      .eq('data_str', getCloudKeyForDate(dataStr))
      .maybeSingle();

    if (!error && data && Array.isArray(data.segnalazioni)) {
      return data.segnalazioni as PortineriaAppointmentItem[];
    }
  } catch (err) {
    console.warn('Errore lettura appuntamenti portineria per data:', dataStr, err);
  }
  return [];
}

/**
 * Recupera la mappa di stato arrivi (id -> PortineriaAppointmentItem) per un insieme di date.
 */
export async function fetchPortineriaStatusMapForDates(dates: string[]): Promise<Map<string, PortineriaAppointmentItem>> {
  const statusMap = new Map<string, PortineriaAppointmentItem>();
  if (!dates || dates.length === 0) return statusMap;

  const keys = dates.map(getCloudKeyForDate);
  try {
    const { data, error } = await portineriaSupabase
      .from('registro_segnalazioni')
      .select('data_str, segnalazioni')
      .in('data_str', keys);

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        if (Array.isArray(row.segnalazioni)) {
          for (const item of row.segnalazioni as PortineriaAppointmentItem[]) {
            if (item && item.id) {
              statusMap.set(item.id, item);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Errore caricamento stato arrivi portineria:', err);
  }

  return statusMap;
}

/**
 * Sincronizza gli appuntamenti di una data con il database di Portineria.
 * PRESERVA TASSATIVAMENTE lo stato di arrivo smarcato dai custodi (arrivato, oraArrivo, scalaArrivo, operatoreArrivo).
 */
export async function syncDateToPortineria(dataStr: string, allAppointments: Appointment[]): Promise<void> {
  if (!dataStr) return;

  try {
    // 1. Legge prima la riga eventualmente già presente su Portineria
    const existingList = await fetchPortineriaAppointmentsForDate(dataStr);
    const existingMap = new Map<string, PortineriaAppointmentItem>();
    for (const item of existingList) {
      if (item && item.id) {
        existingMap.set(item.id, item);
      }
    }

    // 2. Filtra gli appuntamenti dell'Agenda spuntati con "Invia a portineria" (for_gatehouse === true)
    const gatehouseAppointments = allAppointments.filter(
      (a) => a.date === dataStr && Boolean(a.for_gatehouse)
    );

    // 3. Mappa costruendo gli elementi, fondendo e preservando i dati registrati dalla portineria
    const mergedItems: PortineriaAppointmentItem[] = gatehouseAppointments.map((app) => {
      const existing = existingMap.get(app.id);
      const ora = extractHHMM(app.time_label) || existing?.ora;

      const item: PortineriaAppointmentItem = {
        id: app.id,
        dataStr: app.date,
        ora,
        nominativo: app.title,
        destinazione: app.referent || app.location || undefined,
        note: app.side_note || undefined,
        conAutomezzo: existing?.conAutomezzo ?? false,
        targa: existing?.targa || undefined,
        arrivato: existing?.arrivato ?? false,
        oraArrivo: existing?.oraArrivo,
        scalaArrivo: existing?.scalaArrivo,
        operatoreArrivo: existing?.operatoreArrivo,
      };

      return item;
    });

    // 4. Ordina cronologicamente per ora
    mergedItems.sort((a, b) => {
      const timeA = parseTimeToMinutes(a.ora);
      const timeB = parseTimeToMinutes(b.ora);
      if (timeA !== timeB) return timeA - timeB;
      return (a.nominativo || '').localeCompare(b.nominativo || '');
    });

    // 5. Upsert su registro_segnalazioni
    const payload = {
      data_str: getCloudKeyForDate(dataStr),
      segnalazioni: mergedItems,
      updated_at: new Date().toISOString(),
      note_generali: `Appuntamenti attesi in portineria per il ${dataStr}`,
      ultimo_aggiornamento: new Date().toISOString(),
    };

    const { error } = await portineriaSupabase
      .from('registro_segnalazioni')
      .upsert(payload, { onConflict: 'data_str' });

    if (error) {
      console.warn('Avviso sincronizzazione Portineria Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Errore inatteso sincronizzazione data Portineria:', dataStr, err);
  }
}
