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
  CalendarPlus,
  Building2,
  CheckCircle2,
  FileText,
  ShieldCheck,
  MapPin,
  GripVertical,
  Archive,
  ArchiveRestore,
  Filter,
  Check,
  Lock,
  Unlock
} from 'lucide-react';
import type { Appointment, DailyNote, Contact } from './types';
import { INITIAL_APPOINTMENTS, INITIAL_DAILY_NOTES, INITIAL_CONTACTS } from './initialData';
import { 
  formatDayTitle, 
  formatHeaderDate, 
  formatTimestamp, 
  getDaysBetween,
  parseISODate,
  toISODate 
} from './utils/dateUtils';
import { getGoogleCalendarUrl, downloadICS } from './utils/calendarUtils';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { AppointmentModal } from './components/AppointmentModal';
import { DailyNoteModal } from './components/DailyNoteModal';
import { ContactsModal } from './components/ContactsModal';
import { ShareModal } from './components/ShareModal';
import { GatehouseModal } from './components/GatehouseModal';
import { PinModal } from './components/PinModal';

// Nome applicazione configurabile (pronto per essere personalizzato su indicazione della segreteria)
export const APP_NAME = 'AGENDA SEGRETERIA';
export const APP_SUBTITLE = 'Direzione';
export const CREDIT_LABEL = 'Sviluppo e supporto: Michele Torre';

export const SECRET_PIN = '1967';

function isMobileInitial(): boolean {
  if (typeof window === 'undefined') return false;
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const hasMobileParam = (
    search.includes('vista=mobile') ||
    hash.includes('vista=mobile') ||
    hash.includes('mobile')
  );
  return hasMobileParam || window.innerWidth < 768;
}

// Normalizzazione automatica delle sigle storiche
function normalizeReferents(list: Appointment[]): { changed: boolean; updated: Appointment[] } {
  let changed = false;
  const updated = list.map((a) => {
    let ref = a.referent || '';
    let mod = false;
    if (ref === 'MC') { ref = 'Monte Citorio'; mod = true; }
    else if (ref === 'Giulia') { ref = 'Via Giulia'; mod = true; }
    else if (ref === 'Risorg') { ref = 'Risorgimento'; mod = true; }
    if (mod) {
      changed = true;
      return { ...a, referent: ref };
    }
    return a;
  });
  return { changed, updated };
}

export default function App() {
  // Modalità di visualizzazione: Gestione (desktop) vs Consultazione (mobile / sola lettura)
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => isMobileInitial());
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('agenda_admin_unlocked') === 'true';
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Data e Appuntamenti (con fallback localStorage)
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('agenda_appointments');
    const list = saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
    const { updated } = normalizeReferents(list);
    return updated;
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

  // Visualizzazione e navigazione (default dinamico alla data odierna)
    // Visualizzazione e navigazione tramite intervallo continuo "Da ... A ..."
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDate = urlParams.get('data');
      if (urlDate && /^\d{4}-\d{2}-\d{2}$/.test(urlDate)) {
        return urlDate;
      }
    }
    return toISODate(new Date());
  });

  const [endDateStr, setEndDateStr] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13);
    return toISODate(d);
  });

    const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtri vista
  const [onlyDaysWithContent, setOnlyDaysWithContent] = useState<boolean>(true); // Nasconde giorni vuoti
  const [showConcluded, setShowConcluded] = useState<boolean>(false); // Mostra archivio conclusi

  // Drag & drop state
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  // Modali
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);

  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isGatehouseModalOpen, setIsGatehouseModalOpen] = useState(false);

  // Monitoraggio dinamico larghezza schermo (mobile vs desktop)
  useEffect(() => {
    const handleResize = () => {
      setIsMobileMode(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Caricamento e Realtime con Supabase
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) return;

    const fetchSupabaseData = async () => {
      try {
        const { data: appsData } = await client.from('appointments').select('*').order('date', { ascending: true });
        if (appsData && appsData.length > 0) {
          const { changed, updated } = normalizeReferents(appsData);
          setAppointments(updated);
          localStorage.setItem('agenda_appointments', JSON.stringify(updated));
          if (changed) {
            for (const app of updated) {
              if (app.referent === 'Monte Citorio' || app.referent === 'Via Giulia' || app.referent === 'Risorgimento') {
                await client.from('appointments').upsert(app);
              }
            }
          }
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

    // Calcola la data dell'ultimo appuntamento inserito nel database
  const latestAppointmentDate = useMemo(() => {
    if (appointments.length === 0) return startDateStr;
    return appointments.reduce((max, a) => (a.date > max ? a.date : max), startDateStr);
  }, [appointments, startDateStr]);

  // Lista base dei giorni nell'intervallo continuo selezionato
  const visibleDays = useMemo(() => {
    return getDaysBetween(startDateStr, endDateStr);
  }, [startDateStr, endDateStr]);

  const daysCount = visibleDays.length;

  // Mappa del numero di appuntamenti per data (per evidenziare il calendario)
  const appsCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) {
      if (!a.is_concluded || showConcluded) {
        map.set(a.date, (map.get(a.date) || 0) + 1);
      }
    }
    return map;
  }, [appointments, showConcluded]);

  // In modalità Desktop l'editing è sempre attivo; su Mobile si attiva col lucchetto (PIN 1967)
  const canEdit = !isMobileMode || isAdminUnlocked;

  // Giorni effettivamente visualizzati:
  // - Su Mobile: agenda perpetua scrollabile da OGGI fino a fine agenda, solo giorni impegnati
  // - Su Desktop: intervallo selezionato nel selettore date
  const displayDays = useMemo(() => {
    if (isMobileMode) {
      const todayIso = toISODate(new Date());
      let maxDate = todayIso;
      for (const a of appointments) {
        if (!a.is_concluded && a.date > maxDate) maxDate = a.date;
      }
      for (const n of dailyNotes) {
        if (n.end_date > maxDate) maxDate = n.end_date;
      }
      const allFutureDays = getDaysBetween(todayIso, maxDate);
      const busyDays = allFutureDays.filter((isoDay) => {
        const hasApps = appointments.some(
          (a) => a.date === isoDay && !a.is_concluded
        );
        const hasNotes = dailyNotes.some(
          (n) => isoDay >= n.start_date && isoDay <= n.end_date
        );
        return hasApps || hasNotes;
      });
      return busyDays.length > 0 ? busyDays : [todayIso];
    }

    if (!onlyDaysWithContent) return visibleDays;
    const filtered = visibleDays.filter((isoDay) => {
      const hasApps = appointments.some(
        (a) => a.date === isoDay && (showConcluded || !a.is_concluded)
      );
      const hasNotes = dailyNotes.some(
        (n) => isoDay >= n.start_date && isoDay <= n.end_date
      );
      return hasApps || hasNotes;
    });
    return filtered.length > 0 ? filtered : visibleDays.slice(0, 1);
  }, [isMobileMode, visibleDays, appointments, dailyNotes, onlyDaysWithContent, showConcluded]);

  const concludedCount = useMemo(() => {
    return appointments.filter((a) => a.is_concluded).length;
  }, [appointments]);

  const handlePinSuccess = () => {
    sessionStorage.setItem('agenda_admin_unlocked', 'true');
    setIsAdminUnlocked(true);
  };

  const handleLockAdmin = () => {
    sessionStorage.removeItem('agenda_admin_unlocked');
    setIsAdminUnlocked(false);
  };

  // Handlers Navigazione Temporale a blocchi
  const handlePrevRange = () => {
    const diff = Math.max(1, daysCount);
    const s = parseISODate(startDateStr);
    s.setDate(s.getDate() - diff);
    const e = parseISODate(endDateStr);
    e.setDate(e.getDate() - diff);
    setStartDateStr(toISODate(s));
    setEndDateStr(toISODate(e));
  };

  const handleNextRange = () => {
    const diff = Math.max(1, daysCount);
    const s = parseISODate(startDateStr);
    s.setDate(s.getDate() + diff);
    const e = parseISODate(endDateStr);
    e.setDate(e.getDate() + diff);
    setStartDateStr(toISODate(s));
    setEndDateStr(toISODate(e));
  };

  // CRUD Appuntamenti con posizionamento in basso e salvataggio
  const handleSaveAppointment = async (app: Appointment) => {
    // Se order_index non è definito, posizionalo in fondo al giorno
    let order_index = app.order_index;
    if (order_index === undefined || order_index === null) {
      const sameDay = appointments.filter((a) => a.date === app.date && a.id !== app.id);
      const maxOrder = sameDay.reduce((max, a) => Math.max(max, a.order_index ?? 0), 0);
      order_index = maxOrder + 10;
    }
    const appToSave: Appointment = { ...app, order_index };

    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === appToSave.id);
      if (exists) {
        return prev.map((a) => (a.id === appToSave.id ? appToSave : a));
      }
      return [...prev, appToSave];
    });
    setLastUpdateDate(new Date());

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('appointments').upsert(appToSave);
        if (error && (error.code === '42703' || error.message?.includes('column'))) {
          const { for_gatehouse, location, is_concluded, ...rest } = appToSave;
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

  const handleToggleConcluded = async (id: string, isConcluded: boolean) => {
    const target = appointments.find((a) => a.id === id);
    if (!target) return;
    const updated = { ...target, is_concluded: isConcluded };
    await handleSaveAppointment(updated);
  };

  // Drag & drop su un giorno
  const handleDropOnDay = async (targetDate: string) => {
    if (!draggedAppId) return;
    const target = appointments.find((a) => a.id === draggedAppId);
    if (!target || target.date === targetDate) return;
    const sameDay = appointments.filter((a) => a.date === targetDate);
    const maxOrder = sameDay.reduce((max, a) => Math.max(max, a.order_index ?? 0), 0);
    const updated = { ...target, date: targetDate, order_index: maxOrder + 10 };
    await handleSaveAppointment(updated);
    setDraggedAppId(null);
  };

  // Drag & drop su uno specifico appuntamento (riordino nello stesso giorno o spostamento mirato)
  const handleDropOnAppointment = async (targetAppId: string, targetDate: string) => {
    if (!draggedAppId || draggedAppId === targetAppId) return;
    const dragged = appointments.find((a) => a.id === draggedAppId);
    const target = appointments.find((a) => a.id === targetAppId);
    if (!dragged || !target) return;

    const dayApps = appointments
      .filter((a) => a.date === targetDate && a.id !== draggedAppId)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    const targetIdx = dayApps.findIndex((a) => a.id === targetAppId);
    const moved = { ...dragged, date: targetDate };
    dayApps.splice(targetIdx >= 0 ? targetIdx : dayApps.length, 0, moved);

    const reordered = dayApps.map((a, i) => ({ ...a, order_index: (i + 1) * 10 }));

    setAppointments((prev) => {
      const others = prev.filter((a) => a.date !== targetDate && a.id !== draggedAppId);
      return [...others, ...reordered];
    });
    setLastUpdateDate(new Date());

    if (isSupabaseConfigured && supabase) {
      for (const app of reordered) {
        try {
          await supabase.from('appointments').upsert(app);
        } catch (e) {
          console.warn(e);
        }
      }
    }
    setDraggedAppId(null);
  };

  const handleQuickAddGatehouse = (partial: Partial<Appointment>) => {
    const sameDay = appointments.filter((a) => a.date === (partial.date || startDateStr));
    const maxOrder = sameDay.reduce((max, a) => Math.max(max, a.order_index ?? 0), 0);
    const newApp: Appointment = {
      id: partial.id || `app-${Date.now()}`,
      date: partial.date || startDateStr,
      time_label: partial.time_label || 'in giornata',
      location: partial.location || '',
      title: partial.title || '',
      side_note: partial.side_note || '',
      category: partial.category || 'standard',
      for_gatehouse: true,
      order_index: maxOrder + 10,
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

  
  // Calcolo etichetta periodo corrente per l'header
  const periodLabel = useMemo(() => {
    const s = parseISODate(startDateStr);
    const e = parseISODate(endDateStr);
    return `${formatHeaderDate(s)} — ${formatHeaderDate(e)}`;
  }, [startDateStr, endDateStr]);

  return (
    <div className={`min-h-screen antialiased pb-16 print:bg-white print:text-black print:p-0 print:pb-0 ${
      isMobileMode 
        ? 'bg-slate-900 text-slate-100' 
        : 'bg-slate-100/90 text-slate-900'
    }`}>
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER SCURO MODERNO                               */}
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

          {/* SU MOBILE: Lucchetto Area Segreteria per emergenze (PIN 1967) */}
          {isMobileMode && (
            <div className="flex items-center gap-2 flex-wrap">
              {!isAdminUnlocked ? (
                <button
                  onClick={() => setIsPinModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 text-amber-300 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 shadow-xs transition cursor-pointer"
                  title="Sblocca inserimento appuntamenti di emergenza tramite PIN"
                >
                  <Lock size={13} className="text-amber-400" /> Area Segreteria
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingAppointment(null);
                      setModalDefaultDate(toISODate(new Date()));
                      setIsAppModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    <Plus size={14} /> Nuovo Impegno
                  </button>
                  <button
                    onClick={() => {
                      setEditingNote(null);
                      setModalDefaultDate(toISODate(new Date()));
                      setIsNoteModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-semibold text-xs transition cursor-pointer"
                  >
                    <UserPlus size={14} /> Ferie
                  </button>
                  <button
                    onClick={handleLockAdmin}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 bg-amber-500 text-slate-950 hover:bg-amber-400 font-black shadow-md transition cursor-pointer"
                    title="Blocca modifiche e torna in sola lettura"
                  >
                    <Unlock size={13} /> Blocca
                  </button>
                </>
              )}
            </div>
          )}

          {/* SU DESKTOP: Azioni Rapide Barra Superiore SEMPRE ATTIVE */}
          {!isMobileMode && (
            <div className="flex items-center gap-2 flex-wrap">
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
                onClick={handleExecutePrint}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Stampa diretta del periodo selezionato (A4 Montserrat)"
              >
                <Printer size={14} /> Stampa A4
              </button>
            </div>
          )}

        </div>

        {/* ======================================================== */}
        {/* RIGA INFERIORE (SOLO DESKTOP): SELETTORE DATE E FILTRI   */}
        {/* ======================================================== */}
        {!isMobileMode && (
          <div className="bg-slate-950 border-t border-slate-800/80 px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
              
              {/* SELETTORE DATE AD ALTO CONTRASTO "DA ... A ..." CON PULSANTE FINE AGENDA */}
              <div className="flex items-center gap-2 bg-white text-slate-900 px-3 py-1.5 rounded-xl border-2 border-amber-500 shadow-sm flex-wrap">
                <CalendarIcon size={16} className="text-amber-600 shrink-0" />

                <button
                  type="button"
                  onClick={handlePrevRange}
                  className="p-1 rounded-lg text-slate-700 hover:text-black hover:bg-slate-100 transition cursor-pointer font-bold"
                  title="Periodo precedente"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">Da:</span>
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => {
                      setStartDateStr(e.target.value);
                      if (e.target.value > endDateStr) setEndDateStr(e.target.value);
                    }}
                    className="bg-slate-100 text-slate-950 border border-slate-300 text-xs font-bold px-2 py-1 rounded-lg focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    title="Data inizio visualizzazione"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">A:</span>
                  <input
                    type="date"
                    value={endDateStr}
                    min={startDateStr}
                    onChange={(e) => setEndDateStr(e.target.value)}
                    className="bg-slate-100 text-slate-950 border border-slate-300 text-xs font-bold px-2 py-1 rounded-lg focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    title="Data fine visualizzazione"
                  />
                </div>

                <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block" />

                {/* Scorciatoie Rapide */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const today = toISODate(new Date());
                      setStartDateStr(today);
                      setEndDateStr(today);
                    }}
                    className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                  >
                    Oggi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const s = parseISODate(startDateStr);
                      const e = new Date(s);
                      e.setDate(e.getDate() + 13);
                      setEndDateStr(toISODate(e));
                    }}
                    className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                  >
                    +14 Giorni
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const s = parseISODate(startDateStr);
                      const e = new Date(s);
                      e.setDate(e.getDate() + 30);
                      setEndDateStr(toISODate(e));
                    }}
                    className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                  >
                    +1 Mese
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEndDateStr(latestAppointmentDate);
                    }}
                    className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-xs flex items-center gap-1"
                    title={`Imposta data fine fino all'ultimo appuntamento inserito (${latestAppointmentDate})`}
                  >
                    <span>Fine Agenda</span>
                    <span className="text-[10px] opacity-80">({latestAppointmentDate.split('-').slice(1).reverse().join('/')})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextRange}
                    className="p-1 rounded-lg text-slate-700 hover:text-black hover:bg-slate-100 transition cursor-pointer font-bold"
                    title="Periodo successivo"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <span className="hidden xl:inline text-xs font-semibold text-slate-500 ml-1">
                    ({periodLabel})
                  </span>
                </div>
              </div>

              {/* FILTRI DI VISUALIZZAZIONE */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOnlyDaysWithContent(!onlyDaysWithContent)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    onlyDaysWithContent
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Se attivo, mostra e stampa solo le giornate che hanno appuntamenti o ferie"
                >
                  <Filter size={13} />
                  {onlyDaysWithContent ? 'Solo giorni con impegni (Attivo)' : 'Tutti i giorni'}
                </button>

                <button
                  onClick={() => setShowConcluded(!showConcluded)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    showConcluded
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Mostra gli appuntamenti conclusi/depubblicati"
                >
                  <Archive size={13} />
                  Conclusi ({concludedCount})
                </button>
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

              {/* Pulsanti per aggiunta appuntamenti (SEMPRE ATTIVI SU DESKTOP) */}
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

            </div>

            {/* STRISCIA RAPIDA GIORNI CON APPUNTAMENTI EVIDENZIATI */}
            <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Impegni periodo:
              </span>
              {visibleDays.map((isoDay) => {
                const count = appsCountByDate.get(isoDay) || 0;
                const hasNotes = dailyNotes.some((n) => isoDay >= n.start_date && isoDay <= n.end_date);
                const { dayName, dateStr } = formatDayTitle(isoDay);
                const dayAbbr = dayName.slice(0, 3);
                const dayNum = dateStr.split(' ')[0];
                const isSelected = isoDay === startDateStr;

                return (
                  <button
                    key={isoDay}
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`day-${isoDay}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`px-2 py-1 rounded-lg border text-center shrink-0 transition cursor-pointer flex items-center gap-1 ${
                      count > 0 || hasNotes
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                    } ${isSelected ? 'ring-2 ring-amber-400' : ''}`}
                    title={`${dayName} ${dateStr}: ${count} appuntamenti`}
                  >
                    <span>{dayAbbr} {dayNum}</span>
                    {count > 0 && (
                      <span className="px-1 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                        {count}
                      </span>
                    )}
                    {hasNotes && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        )}
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
              {/* Sinistra: Data emissione corretta e dinamica in rosso */}
              <div className="text-red-700 font-bold tracking-tight text-base sm:text-lg">
                {formatHeaderDate(parseISODate(displayDays[0] || startDateStr))}
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

          {/* LISTA GIORNI E APPUNTAMENTI (CON FILTRO GIORNI VUOTI E DRAG & DROP) */}
          <div className="space-y-3.5 print:space-y-2">
            {displayDays.map((isoDay, index) => {
              const { dayName, dateStr, isWeekend } = formatDayTitle(isoDay);
              
              // Alternanza sfondo: pari bianco, dispari grigio chiaro morbido
              const isEven = index % 2 === 0;
              const zebraClass = isEven 
                ? 'bg-white border-slate-200/90 print-zebra-even' 
                : 'bg-slate-50/90 border-slate-200 print-zebra-odd';

              // Filtra appuntamenti del giorno (e ordina per order_index)
              const dayApps = appointments
                .filter((a) => {
                  const matchesDate = a.date === isoDay;
                  if (!matchesDate) return false;
                  if ((isMobileMode || !showConcluded) && a.is_concluded) return false;
                  if (isMobileMode || !searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    a.title.toLowerCase().includes(q) ||
                    (a.referent && a.referent.toLowerCase().includes(q)) ||
                    (a.side_note && a.side_note.toLowerCase().includes(q)) ||
                    (a.location && a.location.toLowerCase().includes(q))
                  );
                })
                .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

              // Filtra note / ferie che coprono questa data
              const dayNotes = dailyNotes.filter(
                (n) => isoDay >= n.start_date && isoDay <= n.end_date
              );

              return (
                <div
                  key={isoDay}
                  id={`day-${isoDay}`}
                  onDragOver={(e) => {
                    if (!canEdit || isMobileMode) return;
                    e.preventDefault();
                    setDragOverDay(isoDay);
                  }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={(e) => {
                    if (!canEdit || isMobileMode) return;
                    e.preventDefault();
                    handleDropOnDay(isoDay);
                    setDragOverDay(null);
                  }}
                  className={`day-block group rounded-xl p-3 sm:p-4 border transition ${zebraClass} ${
                    dragOverDay === isoDay ? 'ring-3 ring-blue-500 bg-blue-50/70 shadow-md' : ''
                  }`}
                >
                  {/* INTESTAZIONE GIORNO CON TESTI GRANDI E BEN LEGGIBILI (FONT MONTSERRAT) */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-baseline gap-3 sm:gap-6">
                      <span
                        className={`text-base sm:text-xl font-bold tracking-tight min-w-[100px] sm:min-w-[130px] ${
                          isWeekend ? 'text-rose-800 print-weekend' : 'text-slate-950'
                        }`}
                      >
                        {dayName}
                      </span>
                      <span
                        className={`text-base sm:text-xl font-bold tracking-tight ${
                          isWeekend ? 'text-rose-800 print-weekend' : 'text-slate-950'
                        }`}
                      >
                        {dateStr}
                      </span>
                    </div>

                    {/* Bottone rapido aggiunta su giorno */}
                    {canEdit && (
                      <button
                        onClick={() => {
                          setEditingAppointment(null);
                          setModalDefaultDate(isoDay);
                          setIsAppModalOpen(true);
                        }}
                        className={`no-print transition p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs flex items-center gap-1 font-semibold cursor-pointer ${
                          isMobileMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title="Aggiungi appuntamento in fondo a questa data"
                      >
                        <Plus size={14} /> Aggiungi
                      </button>
                    )}
                  </div>

                  {/* NOTE GIORNATA / FERIE / ASSENZE (AZZURRO CHIARO) */}
                  {dayNotes.length > 0 && (
                    <div className="mt-1 mb-2 space-y-1">
                      {dayNotes.map((note) => (
                        <div
                          key={note.id}
                          className="flex items-center justify-between group/note pl-0 sm:pl-[130px]"
                        >
                          <div
                            onClick={() => {
                              if (canEdit) {
                                setEditingNote(note);
                                setIsNoteModalOpen(true);
                              }
                            }}
                            className={`text-sky-600 print-sky font-medium text-sm sm:text-base flex items-center gap-1.5 ${
                              canEdit ? 'cursor-pointer hover:underline' : ''
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block shrink-0" />
                            {note.note_text}
                          </div>
                          {canEdit && (
                            <div className={`no-print transition flex gap-1 ${isMobileMode ? 'opacity-100' : 'opacity-0 group-hover/note:opacity-100'}`}>
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

                  {/* ======================================================== */}
                  {/* APPUNTAMENTI DELLA GIORNATA                              */}
                  {/* ======================================================== */}
                  {dayApps.length > 0 ? (
                    <div className="space-y-1.5 mt-1">
                      {dayApps.map((app) => (
                        isMobileMode ? (
                          /* ==================================================== */
                          /* LAYOUT MOBILE COMPATTO, ELEGANTE E SENZA NOMI TAGLIATI */
                          /* ==================================================== */
                          <div
                            key={app.id}
                            className={`p-2.5 rounded-xl border mb-2 transition ${
                              app.is_concluded ? 'opacity-60 bg-slate-100' : 'bg-white'
                            } border-slate-200 shadow-2xs`}
                          >
                            {/* Riga Superiore Mobile: Orario + Referente + Micro-Pulsanti Calendario */}
                            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400" />
                                  {app.time_label}
                                </span>
                                {app.referent && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200 text-slate-800">
                                    {app.referent}
                                  </span>
                                )}
                                {app.location && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    {app.location}
                                  </span>
                                )}
                              </div>

                              {/* Micro-Pulsanti per Google Calendar e Apple Calendar (.ics) + Gestione Emergenza se sbloccato */}
                              <div className="flex items-center gap-1 shrink-0">
                                {isAdminUnlocked && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingAppointment(app);
                                        setIsAppModalOpen(true);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-blue-600 text-white hover:bg-blue-500 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                      title="Modifica appuntamento"
                                    >
                                      <Edit2 size={11} /> Modifica
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAppointment(app.id)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                      title="Elimina"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </>
                                )}
                                <a
                                  href={getGoogleCalendarUrl(app)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold flex items-center gap-0.5"
                                  title="Aggiungi a Google Calendar"
                                >
                                  <CalendarPlus size={11} /> Google
                                </a>
                                <button
                                  type="button"
                                  onClick={() => downloadICS(app)}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                                  title="Scarica iCal / Apple"
                                >
                                  <CalendarIcon size={11} /> iCal
                                </button>
                              </div>
                            </div>

                            {/* Riga Inferiore Mobile: Titolo ed eventuale Nota */}
                            <div className="pt-1.5 text-xs font-semibold leading-relaxed">
                              {app.category === 'internal_red' ? (
                                <span className="text-red-700 font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 size={13} className="text-red-600 shrink-0" />
                                  {app.title}
                                </span>
                              ) : app.category === 'external_yellow' ? (
                                <span className="bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-bold inline-block">
                                  {app.title}
                                </span>
                              ) : (
                                <span className="text-slate-900">{app.title}</span>
                              )}
                              {app.side_note && (
                                <span className="text-slate-600 font-medium ml-1.5 italic text-xs">
                                  {app.side_note}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* ==================================================== */
                          /* LAYOUT DESKTOP CON DRAG & DROP E AZIONI IMMEDIATE     */
                          /* ==================================================== */
                          <div
                            key={app.id}
                            draggable={true}
                            onDragStart={(e) => {
                              setDraggedAppId(app.id);
                              e.dataTransfer.setData('text/plain', app.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDropOnAppointment(app.id, isoDay);
                              setDragOverDay(null);
                            }}
                            className={`appointment-row group/app flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-x-4 py-1 hover:bg-white/95 rounded-lg transition px-2 ${
                              app.is_concluded ? 'opacity-50 line-through bg-slate-100/60' : ''
                            } ${draggedAppId === app.id ? 'opacity-30 border border-dashed border-blue-400' : ''}`}
                          >
                            {/* Drag Handle + Orario + Sigla + Descrizione */}
                            <div className="flex flex-wrap sm:flex-nowrap items-baseline gap-x-2 sm:gap-x-4 min-w-0 flex-1">
                              
                              {/* Grip Icon per Drag & Drop Desktop */}
                              <span 
                                className="no-print opacity-0 group-hover/app:opacity-100 text-slate-300 hover:text-slate-600 cursor-grab shrink-0 self-center"
                                title="Trascina per riordinare o spostare di giorno"
                              >
                                <GripVertical size={13} />
                              </span>

                              {/* Orario / Fascia */}
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

                              {/* Descrizione / Titolo con codifica cromatica */}
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

                              {/* Riferimento tra parentesi */}
                              {app.side_note && (
                                <span className="text-base sm:text-lg font-medium text-slate-700 print:text-black flex items-center gap-1">
                                  <FileText size={13} className="text-slate-400 shrink-0 print:hidden" />
                                  {app.side_note}
                                </span>
                              )}

                              {/* AZIONI DESKTOP: Portineria + Concludi/Ripristina + Modifica + Elimina */}
                              <div className="no-print opacity-0 group-hover/app:opacity-100 transition flex items-center gap-1">
                                
                                {/* Badge / Tasto Rapido Portineria */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleGatehouse(app.id, !app.for_gatehouse);
                                  }}
                                  className={`p-1 rounded-md transition cursor-pointer ${
                                    app.for_gatehouse
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-1 ring-emerald-400'
                                      : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-60'
                                  }`}
                                  title={
                                    app.for_gatehouse
                                      ? 'Incluso nel foglio Portineria (clicca per rimuovere)'
                                      : 'Non incluso in Portineria (clicca per includere)'
                                  }
                                >
                                  <ShieldCheck size={14} />
                                </button>

                                {/* Tasto Rapido Concludi / Ripristina (Archivio) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleConcluded(app.id, !app.is_concluded);
                                  }}
                                  className={`p-1 rounded-md transition cursor-pointer ${
                                    app.is_concluded
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={
                                    app.is_concluded
                                      ? 'Ripristina in agenda attiva'
                                      : 'Segna come concluso (nascondi dalla vista 2 settimane)'
                                  }
                                >
                                  {app.is_concluded ? <ArchiveRestore size={14} /> : <Check size={14} />}
                                </button>

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

                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1 pl-2">
                      Nessun appuntamento registrato
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* PIÈ DI PAGINA */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
            <div>{CREDIT_LABEL}</div>
            
            {/* Tasto discreto sblocco segreteria (SOLO SU MOBILE) */}
            {isMobileMode && (
              <div className="no-print mt-3">
                {!isAdminUnlocked ? (
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(true)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 transition cursor-pointer"
                  >
                    <Lock size={11} className="text-amber-500" /> Accesso Segreteria
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLockAdmin}
                    className="text-[11px] text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 transition cursor-pointer font-bold"
                  >
                    <Unlock size={11} /> Blocca modifiche
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. MODALI DELL'APPLICAZIONE                              */}
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

      
      <GatehouseModal
        isOpen={isGatehouseModalOpen}
        onClose={() => setIsGatehouseModalOpen(false)}
        appointments={appointments}
        onToggleGatehouse={handleToggleGatehouse}
        onQuickAddAccess={handleQuickAddGatehouse}
        onDeleteAppointment={handleDeleteAppointment}
      />

          <PinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onSuccess={handlePinSuccess}
        correctPin={SECRET_PIN}
      />
    </div>
  );
}
