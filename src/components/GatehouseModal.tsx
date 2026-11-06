import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  Plus, 
  Trash2
} from 'lucide-react';
import type { Appointment } from '../types';
import { toISODate, formatGatehouseDate } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointments: Appointment[];
  onToggleGatehouse: (id: string, forGatehouse: boolean) => void;
  onQuickAddAccess: (item: Partial<Appointment>) => void;
  onDeleteAppointment?: (id: string) => void;
}

export const GatehouseModal: React.FC<Props> = ({
  isOpen,
  onClose,
  appointments,
  onToggleGatehouse,
  onQuickAddAccess,
  onDeleteAppointment,
}) => {
  // Data selezionata di default: domani (la segreteria stampa la sera per il giorno dopo)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  });

  // Modalità aggiunta rapida
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newTime, setNewTime] = useState('h 10.00');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newNote, setNewNote] = useState('');

  const todayIso = useMemo(() => toISODate(new Date()), []);
  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }, []);

  // Tutti gli appuntamenti della data selezionata
  const dayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate);
  }, [appointments, selectedDate]);

  // Appuntamenti abilitati per la portineria (for_gatehouse === true)
  const gatehouseItems = useMemo(() => {
    return dayAppointments.filter((a) => a.for_gatehouse);
  }, [dayAppointments]);

  // Numero di righe vuote per riempire il foglio A4 (almeno 24 righe totali per simulare il modulo originale)
  const TOTAL_GRID_ROWS = 24;
  const fillerRowCount = Math.max(0, TOTAL_GRID_ROWS - Math.max(gatehouseItems.length, 1));

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('printing-gatehouse');
    const cleanup = () => {
      document.body.classList.remove('printing-gatehouse');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    let formattedSideNote = newNote.trim();
    if (formattedSideNote && !formattedSideNote.startsWith('(')) {
      formattedSideNote = `(${formattedSideNote})`;
    }

    onQuickAddAccess({
      id: `app-gh-${Date.now()}`,
      date: selectedDate,
      time_label: newTime.trim() || 'in giornata',
      location: newLocation.trim(),
      title: newDesc.trim(),
      side_note: formattedSideNote,
      category: 'standard',
      for_gatehouse: true,
    });

    setNewDesc('');
    setNewNote('');
    setShowQuickAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden">
        
        {/* HEADER MODALE */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
                Foglio Portineria - Accessi e Appuntamenti
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                  A4 Ufficiale
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Seleziona il giorno, controlla gli accessi autorizzati e avvia la stampa per la portineria
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* BARRA CONTROLLI E SELEZIONE DATA */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Selettore rapido giorno */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Giorno di consegna:</span>
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  selectedDate === todayIso
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Oggi ({todayIso.split('-').slice(1).reverse().join('/')})
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowIso)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  selectedDate === tomorrowIso
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                Domani ({tomorrowIso.split('-').slice(1).reverse().join('/')})
              </button>

              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Azioni Rapide Stampa e Aggiungi */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus size={14} className="text-emerald-600" />
                {showQuickAdd ? 'Chiudi inserimento' : '+ Aggiungi Accesso Rapido'}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Printer size={15} />
                Stampa Foglio A4
              </button>
            </div>

          </div>

          {/* Form Inserimento Rapido */}
          {showQuickAdd && (
            <form onSubmit={handleQuickAddSubmit} className="p-3 bg-white rounded-xl border border-emerald-200 shadow-sm space-y-2 animate-in fade-in duration-100">
              <div className="text-xs font-bold text-emerald-900">Nuovo accesso/fornitore per il {formatGatehouseDate(selectedDate)}:</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Orario (es. h 10.30, in mattinata)"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800"
                />
                <input
                  type="text"
                  placeholder="Luogo (es. DEAS, Boehringer, Nexi)"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800"
                />
                <input
                  type="text"
                  placeholder="Descrizione ditta, nomi, targa mezzo"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 sm:col-span-2"
                  required
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <input
                  type="text"
                  placeholder="Referente interno tra parentesi (es. Paolini, Ferrante)"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-800 max-w-sm w-full"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800 cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    Inserisci
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Checklist appuntamenti del giorno */}
          {dayAppointments.length > 0 && (
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Appuntamenti registrati in agenda per questa data ({dayAppointments.length}):</span>
                <span className="text-emerald-700 font-semibold lowercase">
                  {gatehouseItems.length} inclusi nel foglio portineria
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {dayAppointments.map((app) => (
                  <div
                    key={app.id}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition ${
                      app.for_gatehouse
                        ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={Boolean(app.for_gatehouse)}
                        onChange={(e) => onToggleGatehouse(app.id, e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                      />
                      <span className="font-bold text-slate-700 shrink-0">{app.time_label}</span>
                      {app.location && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-bold text-slate-700 shrink-0">
                          {app.location}
                        </span>
                      )}
                      <span className="truncate">{app.title}</span>
                      {app.side_note && <span className="text-slate-500 shrink-0">{app.side_note}</span>}
                    </label>

                    {onDeleteAppointment && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Eliminare questo appuntamento?')) {
                            onDeleteAppointment(app.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 transition ml-2 cursor-pointer"
                        title="Elimina"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ANTEPRIMA DEL DOCUMENTO A4 PER LA PORTINERIA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex justify-center">
          <div 
            id="gatehouse-print-area" 
            className="gatehouse-sheet bg-white text-black p-8 sm:p-10 shadow-lg border border-slate-300 w-full max-w-[210mm] min-h-[297mm] flex flex-col justify-between font-montserrat"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            <div>
              {/* TITOLO SUPERIORE */}
              <div className="border border-black py-2.5 px-4 text-center mb-5 bg-slate-50/50">
                <h1 className="text-lg sm:text-xl font-bold tracking-wide uppercase text-black m-0">
                  AGENDA APPUNTAMENTI E ACCESSI
                </h1>
              </div>

              {/* DATA CENTRATA IN ITALIANO PER ESTESO */}
              <div className="text-center font-bold text-base sm:text-lg text-black mb-6 lowercase">
                {formatGatehouseDate(selectedDate)}
              </div>

              {/* TABELLA A 3 COLONNE IDENTICA AL DOCUMENTO CARTACEO */}
              <div className="border-t border-l border-r border-black">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-black bg-slate-100/70 text-black font-bold uppercase text-[11px] sm:text-xs">
                      <th className="border-r border-black py-2 px-3 text-left w-[18%]">ORA</th>
                      <th className="border-r border-black py-2 px-3 text-left w-[22%]">LUOGO</th>
                      <th className="py-2 px-3 text-left w-[60%]">DESCRIZIONE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gatehouseItems.length > 0 ? (
                      gatehouseItems.map((item, idx) => (
                        <tr 
                          key={item.id} 
                          className={`border-b border-black align-top ${idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                        >
                          <td className="border-r border-black py-2 px-3 font-semibold text-black whitespace-nowrap">
                            {item.time_label}
                          </td>
                          <td className="border-r border-black py-2 px-3 font-medium text-black">
                            {item.location || ''}
                          </td>
                          <td className="py-2 px-3 text-black">
                            <span className="font-medium">{item.title}</span>
                            {item.side_note && (
                              <span className="ml-2 font-normal text-slate-800">{item.side_note}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-b border-black">
                        <td className="border-r border-black py-2 px-3 font-medium text-slate-400"></td>
                        <td className="border-r border-black py-2 px-3 font-medium text-slate-400"></td>
                        <td className="py-2.5 px-3 italic text-slate-600 font-medium">
                          Nessun appuntamento
                        </td>
                      </tr>
                    )}

                    {/* RIGHE VUOTE DI COMPLETAMENTO FINO A FONDO FOGLIO A4 */}
                    {Array.from({ length: fillerRowCount }).map((_, i) => (
                      <tr key={`filler-${i}`} className="border-b border-black/70 h-7">
                        <td className="border-r border-black py-1 px-3">&nbsp;</td>
                        <td className="border-r border-black py-1 px-3">&nbsp;</td>
                        <td className="py-1 px-3">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEZIONE FIRME IN BASSO IDENTICA AL MODULO CARTACEO */}
            <div className="mt-8 pt-4">
              <div className="grid grid-cols-2 gap-8 items-end">
                {/* Sinistra: Firma per Ricevuta */}
                <div className="space-y-6">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-black">
                    FIRMA PER RICEVUTA
                  </div>
                  <div className="border-b border-black w-4/5 h-6"></div>
                </div>

                {/* Destra: Firma Portiere per Visione con righe tratteggiate */}
                <div className="space-y-2">
                  <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-black">
                    NOME E FIRMA PORTIERE PER VISIONE
                  </div>
                  <div className="border-b border-dotted border-black h-4 w-full"></div>
                  <div className="border-b border-dotted border-black h-4 w-full"></div>
                  <div className="border-b border-dotted border-black h-4 w-full"></div>
                  <div className="border-b border-dotted border-black h-4 w-full"></div>
                </div>
              </div>

              {/* Dicitura Sviluppo in Montserrat a fondo pagina */}
              <div className="mt-6 pt-2 border-t border-slate-300 text-[10px] text-slate-500 text-center font-medium">
                Sviluppo e supporto: Michele Torre
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER AZIONI MODALE */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Foglio impaginato a <strong className="text-slate-800">scala 100%</strong> pronto per stampa diretta su A4 o salvataggio PDF.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
            >
              Chiudi
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Printer size={15} /> Avvia Stampa A4
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
