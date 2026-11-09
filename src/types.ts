export type AppointmentCategory = 'standard' | 'internal_red' | 'external_yellow';

export interface Contact {
  id: string;
  name: string; // Nome e cognome
  title?: string; // Dott., D.ssa, Avv., Ing., Arch., Sig., ecc.
  phone?: string;
  email?: string;
  company?: string;
  address?: string; // Indirizzo (non obbligatorio)
  notes?: string;
  created_at?: string;
}

export interface Appointment {
  id: string;
  date: string; // ISO format 'YYYY-MM-DD'
  time_label: string; // e.g. 'h 10.00', 'in mattinata', 'a seguire'
  order_index?: number;
  referent?: string; // e.g. 'MC', 'Giulia', 'Risorg'
  title: string; // e.g. 'AU riceve D.ssa Canestrari'
  category: AppointmentCategory;
  side_note?: string; // e.g. '(Paolini)', '(Ricci F.)'
  contact_id?: string;
  for_gatehouse?: boolean; // Flag per includere nel foglio portineria
  location?: string; // Sede / Luogo specifico (es. DEAS, Boehringer, Intesa Sanpaolo, ecc.)
  is_concluded?: boolean; // Depubblicato / concluso (nascosto dalla vista 2 settimane, ma conservato in storico)
}

export interface DailyNote {
  id: string;
  start_date: string; // 'YYYY-MM-DD'
  end_date: string; // 'YYYY-MM-DD'
  note_text: string; // e.g. 'Andrea Acciari in ferie dal 05.11 al 07.11'
  note_type: 'ferie' | 'permesso' | 'assente' | 'avviso' | 'chiusura';
}
