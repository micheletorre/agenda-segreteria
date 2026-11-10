import type { Appointment, DailyNote, Contact } from './types';
import { HISTORICAL_EXCEL_DATA } from './data/historicalData';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'cont-1',
    title: 'D.ssa',
    name: 'Canestrari',
    phone: '+39 06 1234567',
    email: 'canestrari@studio.it',
    company: 'Consulenze Mediche',
    notes: 'Referente Monte Citorio'
  },
  {
    id: 'cont-2',
    title: 'Dott.',
    name: 'Nitoglia',
    phone: '+39 06 7654321',
    email: 'nitoglia@commercialisti.it',
    company: 'Studio Nitoglia',
    notes: 'Appuntamenti periodici giovedì/martedì'
  },
  {
    id: 'cont-3',
    title: 'Dott.ssa',
    name: 'Galli',
    phone: '+39 06 9988776',
    email: 'galli@studiolegale.it',
    company: 'Studio Legale',
    notes: 'Incontri c/o sua sede'
  },
  {
    id: 'cont-4',
    title: 'Dott.ssa',
    name: 'Spagnolo',
    phone: '+39 06 4433221',
    company: 'Clinica Ars Biomedica'
  },
  {
    id: 'cont-5',
    title: 'Sig.',
    name: 'Paolini',
    company: 'DLG Impianti',
    notes: 'Inversione stagionale e manutenzione'
  },
  {
    id: 'cont-6',
    title: 'Sig.',
    name: 'Ricci F.',
    company: 'Impresa Edile',
    notes: 'Sopralluoghi e pittura'
  },
  // Nuovi contatti e riferimenti richiesti
  {
    id: 'cont-7',
    name: 'Bios Euclide',
    company: 'Centro Medico',
    address: 'Via Domenico Chelini, 39',
    notes: 'Andare 15 minuti prima'
  },
  {
    id: 'cont-1794235944892',
    title: 'Dott.',
    name: 'Antonio Gasbarrini',
    address: 'Via Flaminia, 173'
  },
  {
    id: 'cont-9',
    title: 'Dott.ssa',
    name: 'Laura Tessieri',
    company: 'Quisisana',
    address: 'Via Gian Giacomo Porro, 5'
  },
  {
    id: 'cont-10',
    title: 'Dott.ssa',
    name: 'Debora Rasio',
    address: 'Via Senafè, 27'
  },
  {
    id: 'cont-11',
    title: 'Dott.ssa',
    name: 'Insalaco',
    address: 'Via Antonio Chinotto, 1'
  },
  {
    id: 'cont-12',
    title: 'Dott.ssa',
    name: 'Barbaro',
    company: 'Ars Biomedica',
    address: 'Via Luigi Bodio, 58'
  },
  {
    id: 'cont-13',
    name: 'Milano V.',
    company: 'Studio Milano',
    notes: 'Riferimento interno'
  },
  {
    id: 'cont-14',
    name: 'Torre M.',
    company: 'Consulenza Direzione',
    notes: 'Riferimento interno'
  },
  {
    id: 'cont-15',
    name: 'Ferrante R.',
    company: 'Studio Ferrante',
    notes: 'Riferimento interno'
  },
  {
    id: 'cont-16',
    name: 'Ricci A.',
    company: 'Gestione Immobili',
    notes: 'Riferimento interno'
  },
  {
    id: 'cont-17',
    title: 'Geom.',
    name: 'Paolini D.',
    company: 'Studio Tecnico',
    notes: 'Referente tecnico'
  },
  {
    id: 'cont-18',
    title: 'Avv.',
    name: 'Bonazzi',
    company: 'Studio Legale Bonazzi',
    notes: 'Consulenza Legale'
  }
];

// Appuntamenti base con flag per_portineria e sedi aggiornate
const BASE_APPOINTMENTS: Appointment[] = [
  // Mercoledì 04 novembre
  {
    id: 'app-1',
    date: '2026-11-04',
    time_label: 'in mattinata',
    referent: 'Monte Citorio',
    title: 'DLG impianti per inversione stagionale CDZ',
    side_note: '(Geom. Paolini D.)',
    category: 'standard',
    for_gatehouse: true,
  },
  {
    id: 'app-2',
    date: '2026-11-04',
    time_label: 'h 10.00',
    referent: 'Monte Citorio',
    title: 'AU riceve D.ssa Canestrari',
    category: 'internal_red',
    for_gatehouse: true,
  },
  {
    id: 'app-3',
    date: '2026-11-04',
    time_label: 'h 10.00',
    referent: 'Via Giulia',
    title: 'sopralluogo bagni e pittura',
    side_note: '(Ricci A.)',
    category: 'standard',
    for_gatehouse: false,
  },
  {
    id: 'app-4',
    date: '2026-11-04',
    time_label: 'a seguire',
    referent: 'Risorgimento',
    title: 'sopralluogo bagni e pittura',
    side_note: '(Ricci A.)',
    category: 'standard',
    for_gatehouse: false,
  },

  // Giovedì 05 novembre
  {
    id: 'app-5',
    date: '2026-11-05',
    time_label: 'h 10.00',
    referent: 'Monte Citorio',
    title: 'AU riceve Dott. Nitoglia',
    category: 'internal_red',
    for_gatehouse: true,
  },

  // Venerdì 06 novembre
  {
    id: 'app-6',
    date: '2026-11-06',
    time_label: 'h 10.00',
    referent: 'Monte Citorio',
    title: 'AU riceve D.ssa Canestrari',
    category: 'internal_red',
    for_gatehouse: true,
  },

  // Lunedì 09 novembre
  {
    id: 'app-7',
    date: '2026-11-09',
    time_label: 'h 11.45',
    referent: '',
    title: 'AU c/o Dott.ssa Galli',
    category: 'external_yellow',
    for_gatehouse: false,
  },

  // Martedì 10 novembre
  {
    id: 'app-8',
    date: '2026-11-10',
    time_label: 'h 10.00',
    referent: 'Monte Citorio',
    title: 'AU riceve Dott. Nitoglia',
    category: 'internal_red',
    for_gatehouse: true,
  },

  // Mercoledì 11 novembre
  {
    id: 'app-9',
    date: '2026-11-11',
    time_label: 'h 09.00',
    referent: '',
    title: 'AU c/o Ars Biomedica',
    category: 'external_yellow',
    for_gatehouse: false,
  },

  // Giovedì 12 novembre
  {
    id: 'app-10',
    date: '2026-11-12',
    time_label: 'h 10.00',
    referent: 'Monte Citorio',
    title: 'AU riceve Dott. Nitoglia',
    category: 'internal_red',
    for_gatehouse: true,
  },

  // Venerdì 13 novembre
  {
    id: 'app-11',
    date: '2026-11-13',
    time_label: 'h 10.00',
    referent: 'Monte Citorio',
    title: 'AU riceve D.ssa Canestrari',
    category: 'internal_red',
    for_gatehouse: true,
  },

  // Lunedì 16 novembre
  {
    id: 'app-12',
    date: '2026-11-16',
    time_label: 'h 15.00',
    referent: '',
    title: 'AU c/o Dott.ssa Spagnolo',
    category: 'external_yellow',
    for_gatehouse: false,
  },

  // Martedì 17 novembre
  {
    id: 'app-13',
    date: '2026-11-17',
    time_label: 'h 09.00',
    referent: '',
    title: 'AU c/o Bios Euclide (andare 15 minuti prima)',
    category: 'external_yellow',
    for_gatehouse: false,
  },
];

// Generazione id univoci per i dati storici Excel (convertendo MC -> Monte Citorio)
const historicalMapped: Appointment[] = HISTORICAL_EXCEL_DATA
  .filter((h) => h.date < '2026-11-04')
  .map((h, i) => {
    let ref = h.referent || '';
    if (ref === 'MC') ref = 'Monte Citorio';
    if (ref === 'Giulia') ref = 'Via Giulia';
    if (ref === 'Risorg') ref = 'Risorgimento';

    return {
      id: `app-hist-${i + 1}`,
      date: h.date,
      time_label: h.time_label,
      order_index: i,
      referent: ref,
      title: h.title,
      category: h.category,
      side_note: h.side_note || '',
      location: h.location || '',
      for_gatehouse: true,
    };
  });

export const INITIAL_APPOINTMENTS: Appointment[] = [
  ...historicalMapped,
  ...BASE_APPOINTMENTS,
];

export const INITIAL_DAILY_NOTES: DailyNote[] = [
  {
    id: 'note-1',
    start_date: '2026-11-05',
    end_date: '2026-11-07',
    note_text: 'Andrea Acciari in ferie dal 05.11 al 07.11',
    note_type: 'ferie',
  },
  {
    id: 'note-2',
    start_date: '2026-11-16',
    end_date: '2026-11-22',
    note_text: 'Paolo Ferranti in ferie dal 16.11 al 22.11',
    note_type: 'ferie',
  },
];
