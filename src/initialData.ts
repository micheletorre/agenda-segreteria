import type { Appointment, DailyNote, Contact } from './types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'cont-1',
    title: 'D.ssa',
    name: 'Canestrari',
    phone: '+39 06 1234567',
    email: 'canestrari@studio.it',
    company: 'Consulenze Mediche',
    notes: 'Referente MC'
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
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  // Mercoledì 04 novembre
  {
    id: 'app-1',
    date: '2026-11-04',
    time_label: 'in mattinata',
    referent: 'MC',
    title: 'DLG impianti per inversione stagionale CDZ',
    side_note: '(Paolini)',
    category: 'standard',
  },
  {
    id: 'app-2',
    date: '2026-11-04',
    time_label: 'h 10.00',
    referent: 'MC',
    title: 'AU riceve D.ssa Canestrari',
    category: 'internal_red',
  },
  {
    id: 'app-3',
    date: '2026-11-04',
    time_label: 'h 10.00',
    referent: 'Giulia',
    title: 'sopralluogo bagni e pittura',
    side_note: '(Ricci F.)',
    category: 'standard',
  },
  {
    id: 'app-4',
    date: '2026-11-04',
    time_label: 'a seguire',
    referent: 'Risorg',
    title: 'sopralluogo bagni e pittura',
    side_note: '(Ricci F.)',
    category: 'standard',
  },

  // Giovedì 05 novembre
  {
    id: 'app-5',
    date: '2026-11-05',
    time_label: 'h 10.00',
    referent: 'MC',
    title: 'AU riceve Dott. Nitoglia',
    category: 'internal_red',
  },

  // Venerdì 06 novembre
  {
    id: 'app-6',
    date: '2026-11-06',
    time_label: 'h 10.00',
    referent: 'MC',
    title: 'AU riceve D.ssa Canestrari',
    category: 'internal_red',
  },

  // Lunedì 09 novembre
  {
    id: 'app-7',
    date: '2026-11-09',
    time_label: 'h 11.45',
    referent: '',
    title: 'AU c/o Dott.ssa Galli',
    category: 'external_yellow',
  },

  // Martedì 10 novembre
  {
    id: 'app-8',
    date: '2026-11-10',
    time_label: 'h 10.00',
    referent: 'MC',
    title: 'AU riceve Dott. Nitoglia',
    category: 'internal_red',
  },

  // Mercoledì 11 novembre
  {
    id: 'app-9',
    date: '2026-11-11',
    time_label: 'h 09.00',
    referent: '',
    title: 'AU c/o Ars Biomedica',
    category: 'external_yellow',
  },

  // Giovedì 12 novembre
  {
    id: 'app-10',
    date: '2026-11-12',
    time_label: 'h 10.00',
    referent: 'MC',
    title: 'AU riceve Dott. Nitoglia',
    category: 'internal_red',
  },

  // Venerdì 13 novembre
  {
    id: 'app-11',
    date: '2026-11-13',
    time_label: 'h 10.00',
    referent: 'MC',
    title: 'AU riceve D.ssa Canestrari',
    category: 'internal_red',
  },

  // Lunedì 16 novembre
  {
    id: 'app-12',
    date: '2026-11-16',
    time_label: 'h 15.00',
    referent: '',
    title: 'AU c/o Dott.ssa Spagnolo',
    category: 'external_yellow',
  },

  // Martedì 17 novembre
  {
    id: 'app-13',
    date: '2026-11-17',
    time_label: 'h 09.00',
    referent: '',
    title: 'AU c/o Bios Euclide (andare 15 minuti prima)',
    category: 'external_yellow',
  },
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
