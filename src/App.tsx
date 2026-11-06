import { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  Clock, 
  Search,
  Edit2,
  Trash2,
  Wifi,
  WifiOff,
  BookUser,
  Share2,
  Calendar as CalendarIcon,
  Smartphone,
  LayoutDashboard,
  CalendarPlus,
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import type { Appointment, DailyNote, Contact } from './types';
import { INITIAL_APPOINTMENTS, INITIAL_DAILY_NOTES, INITIAL_CONTACTS } from './initialData';
import { 
  formatDayTitle, 
  formatHeaderDate, 
  formatTimestamp, 
  getDaysRange, 
  parseISODate,
  toISODate 
} from './utils/dateUtils';
import { getGoogleCalendarUrl, downloadICS } from './utils/calendarUtils';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { AppointmentModal } from './components/AppointmentModal';
import { DailyNoteModal } from './components/DailyNoteModal';
import { ContactsModal } from './components/ContactsModal';
import { ShareModal } from './components/ShareModal';
import { PrintModal } from './components/PrintModal';
import { GatehouseModal } from './components/GatehouseModal';

// Nome applicazione configurabile (pronto per essere personalizzato su indicazione della segreteria)
export const APP_NAME = 'AGENDA SEGRETERIA';
export const APP_SUBTITLE = 'Direzione';
export const CREDIT_LABEL = 'Sviluppo e supporto: Michele Torre';

function isMobileRouteRequested(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  return (
    search.includes('vista=mobile') ||
    search.includes('sola_lettura=true') ||
    hash.includes('vista=mobile') ||
    hash.includes('mobile')
  );
}

export default function App() {
  // Modalità di visualizzazione: Gestione (desktop) vs Consultazione (mobile / sola lettura)
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => isMobileRouteRequested());

  // Data e Appuntamenti (con fallback localStorage)
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('agenda_appointments');
    return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
  });

  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>(() => {
    const saved = localStorage.getItem('agenda_daily_notes');
    return saved ? JSON.parse(saved) : INITIAL_DAILY_NOTES;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('agenda_contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [lastUpdateDate, setLastUpdateDate] = useState<Date>(new Date());

  // Visualizzazione e navigazione
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDate = urlParams.get('data');
      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        return urlDate;
      }
    }
    return '2026-11-04';
  });

  const [daysCount, setDaysCount] = useState<number>(14); // 14 giorni predefiniti (2 pagine A4 fronte/retro)
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modali
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);

  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isGatehouseModalOpen, setIsGatehouseModalOpen] = useState(false);

  // Caricamento e Realtime con Supabase
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) return;

    const fetchSupabaseData = async () => {
      try {
        const { data: appsData } = await client.from('appointments').select('*').order('date', { ascending: true });
        if (appsData && appsData.length > 0) {
          setAppointments(appsData);
          localStorage.setItem('agenda_appointments', JSON.stringify(appsData));
        }

        const { data: notesData } = await client.from('daily_notes').select('*').order('start_date', { ascending: true });
        if (notesData && notesData.length > 0) {
          setDailyNotes(notesData);
          localStorage.setItem('agenda_daily_notes', JSON.stringify(notesData));
        }

        const { data: contactsData } = await client.from('contacts').select('*').order('name', { ascending: true });
        if (contactsData && contactsData.length > 0) {
          setContacts(contactsData);
          localStorage.setItem('agenda_contacts', JSON.stringify(contactsData));
        }

        setLastUpdateDate(new Date());
      } catch (err) {
        console.warn('Fallback a storage locale:', err);
      }
    };

    fetchSupabaseData();

    // Sottoscrizione Realtime
    const channel = client
      .channel('agenda-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_notes' }, () => {
        fetchSupabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        fetchSupabaseData();
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // Salva su LocalStorage
  useEffect(() => {
    localStorage.setItem('agenda_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('agenda_daily_notes', JSON.stringify(dailyNotes));
  }, [dailyNotes]);

  useEffect(() => {
    localStorage.setItem('agenda_contacts', JSON.stringify(contacts));
  }, [contacts]);

  // Lista giorni da visualizzare
  const visibleDays = useMemo(() => {
    return getDaysRange(startDateStr, daysCount);
  }, [startDateStr, daysCount]);

  // Handlers Navigazione Temporale
  const handlePrevRange = () => {
    const d = parseISODate(startDateStr);
    d.setDate(d.getDate() - daysCount);
    setStartDateStr(toISODate(d));
  };

  const handleNextRange = () => {
    const d = parseISODate(startDateStr);
    d.setDate(d.getDate() + daysCount);
    setStartDateStr(toISODate(d));
  };

  const handleToday = () => {
    setStartDateStr(toISODate(new Date()));
  };

  const handleDirectDatePick = (isoDate: string) => {
    if (isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      setStartDateStr(isoDate);
    }
  };

  // CRUD Appuntamenti
    const handleSaveAppointment = async (app: Appointment) => {
    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === app.id);
      if (exists) {
        return prev.map((a) => (a.id === app.id ? app : a));
      }
      return [...prev, app];
    });
    setLastUpdateDate(new Date());

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('appointments').upsert(app);
        if (error && (error.code === '42703' || error.message?.includes('column'))) {
          // Fallback se le colonne non sono ancora state aggiunte a Supabase
          const { for_gatehouse, location, ...rest } = app;
          await supabase.from('appointments').upsert(rest);
        }
      } catch (err) {
        console.warn('Errore sincronizzazione Supabase:', err);
      }
    }
  };

  const handleToggleGatehouse = async (id: string, newState: boolean) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return;
    const updated = { ...target, for_gatehouse: newState };
    await handleSaveAppointment(updated);
  };

  const handleQuickAddGatehouse = (partial: Partial<Appointment>) => {
    const newApp: Appointment = {
      id: partial.id || `app-${Date.now()}`,
      date: partial.date || startDateStr,
      time_label: partial.time_label || 'in giornata',
      location: partial.location || '',
      title: partial.title || '',
      side_note: partial.side_note || '',
      category: partial.category || 'standard',
      for_gatehouse: true,
    };
    handleSaveAppointment(newApp);
  };

  const handleDeleteAppointment = async (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    setLastUpdateDate(new Date());

    if (isSupabaseConfigured && supabase) {
      await supabase.from('appointments').delete().eq('id', id);
    }
  };

  // CRUD Note Giornata / Ferie
  const handleSaveNote = async (note: DailyNote) => {
    setDailyNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id);
      if (exists) {
        return prev.map((n) => (n.id === note.id ? note : n));
      }
      return [...prev, note];
    });
    setLastUpdateDate(new Date());

    if (isSupabaseConfigured && supabase) {
      await supabase.from('daily_notes').upsert(note);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setDailyNotes((prev) => prev.filter((n) => n.id !== id));
    setLastUpdateDate(new Date());

    if (isSupabaseConfigured && supabase) {
      await supabase.from('daily_notes').delete().eq('id', id);
    }
  };

  // CRUD Contatti Anagrafica
  const handleSaveContact = async (contact: Contact) => {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === contact.id);
      if (exists) {
        return prev.map((c) => (c.id === contact.id ? contact : c));
      }
      return [...prev, contact];
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contacts').upsert(contact);
    }
  };

  const handleDeleteContact = async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (isSupabaseConfigured && supabase) {
      await supabase.from('contacts').delete().eq('id', id);
    }
  };

  // Stampa
  const handleExecutePrint = () => {
    window.print();
  };

  const handleApplyAndPrint = (fromIso: string, count: number) => {
    setStartDateStr(fromIso);
    setDaysCount(count);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Calcolo etichetta periodo corrente per l'header
  const periodLabel = useMemo(() => {
    const s = parseISODate(startDateStr);
    const e = new Date(s);
    e.setDate(s.getDate() + (daysCount - 1));
    return `${formatHeaderDate(s)} — ${formatHeaderDate(e)}`;
  }, [startDateStr, daysCount]);

  return (
    <div className={`min-h-screen antialiased pb-16 print:bg-white print:text-black print:p-0 print:pb-0 ${
      isMobileMode 
        ? 'bg-slate-900 text-slate-100' 
        : 'bg-slate-100/90 text-slate-900'
    }`}>
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER SCURO MODERNO (Ispirato all'app Turni)      */}
      {/* ======================================================== */}
      <header className="no-print bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg text-white">
        {/* Riga Superiore: Brand, Indicatori di stato e Cambio Vista */}
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Titolo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center shadow-md font-black text-lg">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wide text-white text-base sm:text-lg">
                  {APP_NAME} <span className="text-amber-400 font-normal">· {APP_SUBTITLE}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> Direzione
                </span>

                {isSupabaseConfigured ? (
                  <span className="text-[11px] px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-md flex items-center gap-1 font-semibold" title="Sincronizzazione Cloud Supabase attiva">
                    <Wifi size={12} /> Cloud Realtime
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded-md flex items-center gap-1 font-medium" title="Dati salvati in locale">
                    <WifiOff size={12} /> Locale
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock size={11} className="text-slate-500" /> {formatTimestamp(lastUpdateDate)}
              </p>
            </div>
          </div>

          {/* Pill Selector: Modalità Gestione vs Consultazione Mobile */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setIsMobileMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                !isMobileMode
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={14} /> Modalità Segreteria
            </button>
            <button
              onClick={() => setIsMobileMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isMobileMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone size={14} /> Anteprima Mobile
            </button>
          </div>

          {/* Azioni Rapide Barra Superiore */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsContactsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Apri Rubrica Anagrafica"
            >
              <BookUser size={14} className="text-blue-400" /> Anagrafica ({contacts.length})
            </button>

            <button
              onClick={() => setIsGatehouseModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Apri e stampa Foglio Portineria A4 per gli accessi del giorno"
            >
              <ShieldCheck size={14} /> Foglio Portineria
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Condivisione serale con PDF per Mail, WhatsApp e SMS"
            >
              <Share2 size={14} /> Condividi Sera
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="Configura e stampa il foglio A4"
            >
              <Printer size={14} /> Stampa A4
            </button>
          </div>

        </div>

        {/* Riga Inferiore: Barra di Navigazione Data Picker, Filtri e Nuovo Impegno */}
        <div className="bg-slate-900/95 border-t border-slate-800/80 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            
            {/* Blocco Navigazione Temporale */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={handlePrevRange}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Periodo precedente"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                title="Salta alla data odierna"
              >
                Oggi
              </button>

              {/* Data Picker Diretto per saltare a qualsiasi mese */}
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={startDateStr}
                  onChange={(e) => handleDirectDatePick(e.target.value)}
                  className="bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  title="Seleziona data di partenza dell'agenda"
                />
              </div>

              <button
                onClick={handleNextRange}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Periodo successivo"
              >
                <ChevronRight size={16} />
              </button>

              <div className="h-4 w-px bg-slate-800 mx-1" />

              {/* Selettore ampiezza periodo */}
              <div className="flex items-center gap-2">
                <select
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-300 focus:outline-hidden cursor-pointer pr-1"
                >
                  <option value={7} className="bg-slate-900 text-white">7 giorni (1 facciata A4)</option>
                  <option value={14} className="bg-slate-900 text-white">14 giorni (2 facciate A4)</option>
                  <option value={28} className="bg-slate-900 text-white">28 giorni (1 mese)</option>
                </select>
                <span className="hidden xl:inline text-[11px] font-semibold text-slate-400">
                  ({periodLabel})
                </span>
              </div>
            </div>

            {/* Ricerca Rapida Impegni o Ditte */}
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca per impegno, ditta o contatto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>

            {/* Pulsanti per aggiunta appuntamenti (nascosti in modalità mobile di sola lettura) */}
            {!isMobileMode ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingAppointment(null);
                    setModalDefaultDate(startDateStr);
                    setIsAppModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  <Plus size={15} /> Nuovo Appuntamento
                </button>

                <button
                  onClick={() => {
                    setEditingNote(null);
                    setModalDefaultDate(startDateStr);
                    setIsNoteModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  <UserPlus size={15} /> Ferie / Assenza
                </button>
              </div>
            ) : (
              <div className="text-xs text-amber-400/90 font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                👁️ Sola Lettura: tocca Google o iCal per salvare sul tuo calendario
              </div>
            )}

          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. CONTENITORE PRINCIPALE: FOGLIO AGENDA                  */}
      {/* ======================================================== */}
      <main className="max-w-5xl mx-auto mt-6 px-4 print:max-w-none print:m-0 print:p-0">
        
        {/* FOGLIO BIANCO PERFETTO SIA A SCHERMO CHE IN STAMPA A4 */}
        <div className="print-page-container bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-9 print:shadow-none print:border-none print:p-0 print:rounded-none">
          
          {/* INTESTAZIONE IDENTICA AL DOCUMENTO CARTACEO */}
          <div className="border-b-2 border-slate-900 pb-3 mb-5">
            <div className="flex justify-between items-start text-sm sm:text-base font-semibold">
              {/* Sinistra: Data emissione in rosso */}
              <div className="text-red-700 font-bold tracking-tight text-base sm:text-lg">
                {formatHeaderDate(parseISODate(startDateStr))}
              </div>
              {/* Destra: Aggiornamento con timestamp in font Montserrat */}
              <div className="text-slate-600 font-medium text-xs sm:text-sm tracking-tight">
                {formatTimestamp(lastUpdateDate)}
              </div>
            </div>
            
            {/* Titolo Centrato AGENDA */}
            <h2 className="text-center font-black text-2xl sm:text-4xl text-slate-950 tracking-wider mt-1">
              {APP_NAME}
            </h2>
          </div>

          {/* LISTA GIORNI E APPUNTAMENTI CON SFONDO ALTERNATO (ZEBRA-STRIPING ANCHE IN STAMPA) */}
          <div className="space-y-3.5 print:space-y-2">
            {visibleDays.map((isoDay, index) => {
              const { dayName, dateStr, isWeekend } = formatDayTitle(isoDay);
              
              // Alternanza sfondo: pari bianco, dispari grigio chiaro morbido
              const isEven = index % 2 === 0;
              const zebraClass = isEven 
                ? 'bg-white border-slate-200/90 print-zebra-even' 
                : 'bg-slate-50/90 border-slate-200 print-zebra-odd';

              // Filtra appuntamenti del giorno
              const dayApps = appointments.filter((a) => {
                const matchesDate = a.date === isoDay;
                if (!matchesDate) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  a.title.toLowerCase().includes(q) ||
                  (a.referent && a.referent.toLowerCase().includes(q)) ||
                  (a.side_note && a.side_note.toLowerCase().includes(q))
                );
              });

              // Filtra note / ferie che coprono questa data
              const dayNotes = dailyNotes.filter(
                (n) => isoDay >= n.start_date && isoDay <= n.end_date
              );

              return (
                <div
                  key={isoDay}
                  className={`day-block group rounded-xl p-3 sm:p-4 border transition ${zebraClass}`}
                >
                  {/* INTESTAZIONE GIORNO CON TESTI GRANDI E BEN LEGGIBILI (FONT MONTSERRAT) */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-baseline gap-4 sm:gap-6">
                      <span
                        className={`text-lg sm:text-xl font-bold tracking-tight min-w-[110px] sm:min-w-[130px] ${
                          isWeekend ? 'text-rose-800 print-weekend' : 'text-slate-950'
                        }`}
                      >
                        {dayName}
                      </span>
                      <span
                        className={`text-lg sm:text-xl font-bold tracking-tight ${
                          isWeekend ? 'text-rose-800 print-weekend' : 'text-slate-950'
                        }`}
                      >
                        {dateStr}
                      </span>
                    </div>

                    {/* Bottone rapido aggiunta su giorno (solo modalità desktop di gestione) */}
                    {!isMobileMode && (
                      <button
                        onClick={() => {
                          setEditingAppointment(null);
                          setModalDefaultDate(isoDay);
                          setIsAppModalOpen(true);
                        }}
                        className="no-print opacity-0 group-hover:opacity-100 transition p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer"
                        title="Aggiungi appuntamento a questa data"
                      >
                        <Plus size={14} /> Aggiungi
                      </button>
                    )}
                  </div>

                  {/* NOTE GIORNATA / FERIE (AZZURRO CHIARO) */}
                  {dayNotes.length > 0 && (
                    <div className="mt-1 mb-2 space-y-1">
                      {dayNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center justify-between group/note pl-0 sm:pl-[130px]"
                        >
                          <div
                            onClick={() => {
                              if (!isMobileMode) {
                                setEditingNote(note);
                                setIsNoteModalOpen(true);
                              }
                            }}
                            className={`text-sky-600 print-sky font-medium text-base sm:text-lg flex items-center gap-1.5 ${
                              !isMobileMode ? 'cursor-pointer hover:underline' : ''
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block shrink-0" />
                            {note.note_text}
                          </div>
                          {!isMobileMode && (
                            <div className="no-print opacity-0 group-hover/note:opacity-100 transition flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingNote(note);
                                  setIsNoteModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* APPUNTAMENTI DELLA GIORNATA */}
                  {dayApps.length > 0 ? (
                    <div className="space-y-1.5 mt-1">
                      {dayApps.map((app) => (
                        <div
                          key={app.id}
                          className="appointment-row group/app flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-x-4 py-1 hover:bg-white/90 rounded-lg transition px-2"
                        >
                          {/* Blocco Principale: Orario + Sigla + Descrizione con Micro-Icone */}
                          <div className="flex flex-wrap sm:flex-nowrap items-baseline gap-x-3 sm:gap-x-6 min-w-0 flex-1">
                            {/* Orario / Fascia con icona orologio */}
                            <span className="text-base sm:text-lg font-medium text-slate-900 min-w-[95px] sm:min-w-[110px] shrink-0 flex items-center gap-1">
                              <Clock size={13} className="text-slate-400 shrink-0 inline print:hidden" />
                              {app.time_label}
                            </span>

                            {/* Sigla / Referente Ufficio in badge elegante */}
                            <span className="text-base sm:text-lg font-semibold text-slate-800 min-w-[50px] sm:min-w-[65px] shrink-0">
                              {app.referent ? (
                                <span className="px-1.5 py-0.5 rounded-md text-xs font-bold bg-slate-200/70 text-slate-800 border border-slate-300">
                                  {app.referent}
                                </span>
                              ) : ''}
                            </span>

                            {/* Descrizione / Titolo con codifica cromatica e micro-icone */}
                            <div className="min-w-0 flex-1">
                              {app.category === 'internal_red' ? (
                                <span className="text-base sm:text-lg font-bold text-red-600 print-red flex items-baseline gap-1">
                                  <CheckCircle2 size={14} className="text-red-500 shrink-0 inline self-center print:hidden" />
                                  <span>{app.title}</span>
                                </span>
                              ) : app.category === 'external_yellow' ? (
                                <span className="text-base sm:text-lg font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-xs print-yellow inline-flex items-center gap-1">
                                  <Building2 size={13} className="text-amber-800 shrink-0 inline print:hidden" />
                                  <span>{app.title}</span>
                                </span>
                              ) : (
                                <span className="text-base sm:text-lg font-medium text-slate-900">
                                  {app.title}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Riferimento / Contatto a destra + Azioni rapide */}
                          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                            {/* Chip Luogo / Sede */}
                            {app.location && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 border border-slate-300 inline-flex items-center gap-1 shrink-0 print:border-black">
                                <MapPin size={11} className="print:hidden text-slate-500" />
                                {app.location}
                              </span>
                            )}

                            {/* Badge / Tasto Rapido Portineria */}
                            {!isMobileMode && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleGatehouse(app.id, !app.for_gatehouse);
                                }}
                                className={`no-print p-1 rounded-md transition cursor-pointer ${
                                  app.for_gatehouse
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-1 ring-emerald-400'
                                    : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-60 group-hover/app:opacity-100'
                                }`}
                                title={
                                  app.for_gatehouse
                                    ? 'Incluso nel foglio Portineria (clicca per rimuovere)'
                                    : 'Non incluso in Portineria (clicca per includere)'
                                }
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}
                            {app.side_note && (
                              <span className="text-base sm:text-lg font-medium text-slate-700 print:text-black flex items-center gap-1">
                                <FileText size={13} className="text-slate-400 shrink-0 print:hidden" />
                                {app.side_note}
                              </span>
                            )}

                            {/* AZIONI SPECIALI PER LA VERSIONE MOBILE (Aggiungi a Calendario) */}
                            {isMobileMode ? (
                              <div className="no-print flex items-center gap-1.5 ml-2">
                                <a
                                  href={getGoogleCalendarUrl(app)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1 transition"
                                  title="Aggiungi a Google Calendar"
                                >
                                  <CalendarPlus size={13} /> Google
                                </a>
                                <button
                                  onClick={() => downloadICS(app)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                                  title="Scarica file per Apple Calendar o Outlook (.ics)"
                                >
                                  <CalendarIcon size={13} /> iCal / Apple
                                </button>
                              </div>
                            ) : (
                              /* Tasti Modifica / Cancella (in modalità Gestione Desktop) */
                              <div className="no-print opacity-0 group-hover/app:opacity-100 transition flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingAppointment(app);
                                    setIsAppModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                                  title="Modifica appuntamento"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteAppointment(app.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                                  title="Elimina"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Spazio vuoto naturale se non ci sono appuntamenti
                    <div className="h-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* NOTA A FONDO PAGINA E CREDITI (VISIBILI ANCHE IN STAMPA) */}
          <div className="mt-8 pt-4 border-t border-slate-300 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              {APP_NAME} — Vista a {daysCount} giorni
            </span>
            <span className="font-semibold text-slate-600 tracking-wide">
              {CREDIT_LABEL}
            </span>
          </div>

        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. MODALI INTERATTIVI COMPLETI                           */}
      {/* ======================================================== */}
      <AppointmentModal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        initialData={editingAppointment}
        defaultDate={modalDefaultDate}
        contacts={contacts}
        onQuickSaveContact={handleSaveContact}
      />

      <DailyNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        initialData={editingNote}
        defaultDate={modalDefaultDate}
      />

      <ContactsModal
        isOpen={isContactsModalOpen}
        onClose={() => setIsContactsModalOpen(false)}
        contacts={contacts}
        onSaveContact={handleSaveContact}
        onDeleteContact={handleDeleteContact}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        startDateStr={startDateStr}
        daysCount={daysCount}
        appointments={appointments}
        dailyNotes={dailyNotes}
        onTriggerPrint={handleExecutePrint}
      />

      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        currentStartDate={startDateStr}
                onApplyAndPrint={handleApplyAndPrint}
      />

      <GatehouseModal
        isOpen={isGatehouseModalOpen}
        onClose={() => setIsGatehouseModalOpen(false)}
        appointments={appointments}
        onToggleGatehouse={handleToggleGatehouse}
        onQuickAddAccess={handleQuickAddGatehouse}
        onDeleteAppointment={handleDeleteAppointment}
      />

    </div>
  );
}
