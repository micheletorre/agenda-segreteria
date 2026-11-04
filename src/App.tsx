import { useState, useMemo } from 'react';
import { 
  Printer, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  Clock, 
  Search,
  Edit2,
  Trash2
} from 'lucide-react';
import type { Appointment, DailyNote } from './types';
import { INITIAL_APPOINTMENTS, INITIAL_DAILY_NOTES } from './initialData';
import { 
  formatDayTitle, 
  formatHeaderDate, 
  formatTimestamp, 
  getDaysRange, 
  parseISODate,
  toISODate 
} from './utils/dateUtils';
import { AppointmentModal } from './components/AppointmentModal';
import { DailyNoteModal } from './components/DailyNoteModal';

export default function App() {
  // Data e Appuntamenti
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [dailyNotes, setDailyNotes] = useState<DailyNote[]>(INITIAL_DAILY_NOTES);
  const [lastUpdateDate, setLastUpdateDate] = useState<Date>(new Date(2026, 10, 3, 18, 30));

  // Visualizzazione e navigazione
  // Impostiamo di base il 4 novembre 2026 come nella foto
  const [startDateStr, setStartDateStr] = useState<string>('2026-11-04');
  const [daysCount, setDaysCount] = useState<number>(14); // 14 giorni predefiniti per 2 pagine A4 fronte/retro
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modali
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string>('');

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DailyNote | null>(null);

  // Giorni visibili nella griglia
  const visibleDays = useMemo(() => {
    return getDaysRange(startDateStr, daysCount);
  }, [startDateStr, daysCount]);

  // Navigazione
  const handlePrevRange = () => {
    const cur = parseISODate(startDateStr);
    cur.setDate(cur.getDate() - daysCount);
    setStartDateStr(toISODate(cur));
  };

  const handleNextRange = () => {
    const cur = parseISODate(startDateStr);
    cur.setDate(cur.getDate() + daysCount);
    setStartDateStr(toISODate(cur));
  };

  const handleToday = () => {
    setStartDateStr('2026-11-04'); // o toISODate(new Date())
  };

  // Operazioni CRUD Appuntamenti
  const handleSaveAppointment = (app: Appointment) => {
    setAppointments((prev) => {
      const idx = prev.findIndex((a) => a.id === app.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = app;
        return next;
      }
      return [...prev, app];
    });
    setLastUpdateDate(new Date());
  };

  const handleDeleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    setLastUpdateDate(new Date());
  };

  // Operazioni CRUD Ferie / Assenze
  const handleSaveNote = (note: DailyNote) => {
    setDailyNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === note.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = note;
        return next;
      }
      return [...prev, note];
    });
    setLastUpdateDate(new Date());
  };

  const handleDeleteNote = (id: string) => {
    setDailyNotes((prev) => prev.filter((n) => n.id !== id));
    setLastUpdateDate(new Date());
  };

  // Stampa
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 pb-12 print:bg-white print:p-0 print:pb-0">
      {/* BARRA SUPERIORE MODERNA (Nascosta in Stampa) */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Titolo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-bold text-lg">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">AGENDA</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Segreteria
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Clock size={12} /> {formatTimestamp(lastUpdateDate)}
              </p>
            </div>
          </div>

          {/* Navigazione temporale */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevRange}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
              title="Periodo precedente"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white hover:text-slate-900 transition"
            >
              Novembre '26
            </button>
            <button
              onClick={handleNextRange}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition"
              title="Periodo successivo"
            >
              <ChevronRight size={18} />
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Scelta Range */}
            <select
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer pr-1"
            >
              <option value={7}>7 giorni (1 pag.)</option>
              <option value={14}>14 giorni (2 pag. Fronte/Retro)</option>
              <option value={28}>28 giorni (1 mese)</option>
            </select>
          </div>

          {/* Ricerca Rapida */}
          <div className="relative hidden md:block w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca impegno o ditta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {/* Pulsanti Azione Principali */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingAppointment(null);
                setModalDefaultDate(startDateStr);
                setIsAppModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow transition"
            >
              <Plus size={16} /> Nuovo Appuntamento
            </button>

            <button
              onClick={() => {
                setEditingNote(null);
                setModalDefaultDate(startDateStr);
                setIsNoteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 font-semibold text-sm transition"
            >
              <UserPlus size={16} /> Ferie / Assenza
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold text-sm shadow-sm transition"
              title="Stampa A4 pulita fronte/retro"
            >
              <Printer size={16} /> Stampa A4
            </button>
          </div>
        </div>
      </header>

      {/* CONTENITORE FOGLIO AGENDA (A4-Style sia a video che in stampa) */}
      <main className="max-w-5xl mx-auto mt-6 px-4 print:max-w-none print:m-0 print:p-0">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-10 print:shadow-none print:border-none print:p-0 print:rounded-none">
          
          {/* INTESTAZIONE IDENTICA AL DOCUMENTO CARTACEO */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex justify-between items-start text-sm sm:text-base font-semibold">
              {/* Sinistra: Data emissione in rosso */}
              <div className="text-red-700 font-bold tracking-tight">
                {formatHeaderDate(parseISODate(startDateStr))}
              </div>
              {/* Destra: Aggiornamento con timestamp */}
              <div className="text-slate-800 font-serif italic text-xs sm:text-sm">
                {formatTimestamp(lastUpdateDate)}
              </div>
            </div>
            
            {/* Titolo Centrato AGENDA */}
            <h2 className="text-center font-bold text-2xl sm:text-3xl text-slate-900 tracking-wider mt-1">
              AGENDA
            </h2>
          </div>

          {/* LISTA GIORNI E APPUNTAMENTI */}
          <div className="space-y-4 print:space-y-3">
            {visibleDays.map((isoDay) => {
              const { dayName, dateStr, isWeekend } = formatDayTitle(isoDay);
              
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
                  className="day-block group border-b border-slate-300 print:border-black/70 pb-3 transition"
                >
                  {/* INTESTAZIONE GIORNO */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-baseline gap-4 sm:gap-6">
                      <span
                        className={`text-lg sm:text-xl font-bold tracking-tight min-w-[110px] sm:min-w-[130px] ${
                          isWeekend ? 'text-rose-800 print:text-[#991b1b]' : 'text-slate-950'
                        }`}
                      >
                        {dayName}
                      </span>
                      <span
                        className={`text-lg sm:text-xl font-bold tracking-tight ${
                          isWeekend ? 'text-rose-800 print:text-[#991b1b]' : 'text-slate-950'
                        }`}
                      >
                        {dateStr}
                      </span>
                    </div>

                    {/* Bottone rapido aggiunta su giorno (+ visibile al passaggio mouse) */}
                    <button
                      onClick={() => {
                        setEditingAppointment(null);
                        setModalDefaultDate(isoDay);
                        setIsAppModalOpen(true);
                      }}
                      className="no-print opacity-0 group-hover:opacity-100 transition p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg text-xs flex items-center gap-1 font-semibold"
                      title="Aggiungi appuntamento a questa data"
                    >
                      <Plus size={14} /> Aggiungi
                    </button>
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
                              setEditingNote(note);
                              setIsNoteModalOpen(true);
                            }}
                            className="text-sky-600 print:text-[#0284c7] font-medium text-base sm:text-lg cursor-pointer hover:underline"
                          >
                            {note.note_text}
                          </div>
                          <div className="no-print opacity-0 group-hover/note:opacity-100 transition flex gap-1">
                            <button
                              onClick={() => {
                                setEditingNote(note);
                                setIsNoteModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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
                          className="appointment-row group/app flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-x-4 py-0.5 hover:bg-slate-50/80 rounded-md transition px-1"
                        >
                          {/* Blocco Principale: Orario + Sigla + Descrizione */}
                          <div className="flex flex-wrap sm:flex-nowrap items-baseline gap-x-3 sm:gap-x-6 min-w-0 flex-1">
                            {/* Orario / Fascia */}
                            <span className="text-base sm:text-lg font-medium text-slate-900 min-w-[95px] sm:min-w-[110px] shrink-0">
                              {app.time_label}
                            </span>

                            {/* Sigla / Referente Ufficio */}
                            <span className="text-base sm:text-lg font-medium text-slate-800 min-w-[50px] sm:min-w-[65px] shrink-0">
                              {app.referent || ''}
                            </span>

                            {/* Descrizione / Titolo con codifica cromatica */}
                            <div className="min-w-0">
                              {app.category === 'internal_red' ? (
                                <span className="text-base sm:text-lg font-bold text-red-600 print:text-[#dc2626]">
                                  {app.title}
                                </span>
                              ) : app.category === 'external_yellow' ? (
                                <span className="text-base sm:text-lg font-bold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-xs print:bg-[#fef08a] print:text-black">
                                  {app.title}
                                </span>
                              ) : (
                                <span className="text-base sm:text-lg font-medium text-slate-900">
                                  {app.title}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Riferimento / Contatto a destra + Azioni rapide */}
                          <div className="flex items-center gap-3 shrink-0 ml-auto">
                            {app.side_note && (
                              <span className="text-base sm:text-lg font-medium text-slate-800 print:text-black">
                                {app.side_note}
                              </span>
                            )}

                            {/* Tasti Modifica / Cancella (solo schermo) */}
                            <div className="no-print opacity-0 group-hover/app:opacity-100 transition flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingAppointment(app);
                                  setIsAppModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Modifica"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteAppointment(app.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Elimina"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Spazio vuoto naturale se non ci sono appuntamenti (come i weekend nell'immagine)
                    <div className="h-2" />
                  )}
                </div>
              );
            })}
          </div>

          {/* NOTA A FONDO PAGINA */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-xs text-slate-400 flex items-center justify-between no-print">
            <span>Agenda Direzione / Segreteria - Vista a 14 giorni (A4 Fronte/Retro)</span>
            <span>Usa il pulsante <strong>Stampa A4</strong> per una copia cartacea pulita</span>
          </div>
        </div>
      </main>

      {/* MODALI INTERATTIVI */}
      <AppointmentModal
        isOpen={isAppModalOpen}
        onClose={() => setIsAppModalOpen(false)}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        initialData={editingAppointment}
        defaultDate={modalDefaultDate}
      />

      <DailyNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
        initialData={editingNote}
        defaultDate={modalDefaultDate}
      />
    </div>
  );
}
