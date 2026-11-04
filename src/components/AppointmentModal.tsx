import React, { useState, useEffect } from 'react';
import { X, Clock, User, FileText, Tag, AlignLeft } from 'lucide-react';
import type { Appointment, AppointmentCategory } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
  onDelete?: (id: string) => void;
  initialData?: Appointment | null;
  defaultDate?: string;
}

export const AppointmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  defaultDate,
}) => {
  const [date, setDate] = useState('');
  const [timeLabel, setTimeLabel] = useState('');
  const [referent, setReferent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AppointmentCategory>('standard');
  const [sideNote, setSideNote] = useState('');

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setTimeLabel(initialData.time_label || '');
      setReferent(initialData.referent || '');
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'standard');
      setSideNote(initialData.side_note || '');
    } else {
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTimeLabel('h 10.00');
      setReferent('MC');
      setTitle('');
      setCategory('standard');
      setSideNote('');
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    // Formatta nota tra parentesi se non le ha già
    let formattedSideNote = sideNote.trim();
    if (formattedSideNote && !formattedSideNote.startsWith('(')) {
      formattedSideNote = `(${formattedSideNote})`;
    }

    onSave({
      id: initialData?.id || `app-${Date.now()}`,
      date,
      time_label: timeLabel.trim() || 'in mattinata',
      referent: referent.trim(),
      title: title.trim(),
      category,
      side_note: formattedSideNote,
    });
    onClose();
  };

  const QUICK_TIMES = ['h 09.00', 'h 10.00', 'h 11.45', 'h 15.00', 'in mattinata', 'a seguire', 'pomeriggio'];
  const QUICK_REFERENTS = ['MC', 'Giulia', 'Risorg', ''];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Data */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
              required
            />
          </div>

          {/* Orario / Fascia */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock size={16} className="text-slate-400" /> Orario / Tempistica
              </label>
            </div>
            <input
              type="text"
              value={timeLabel}
              onChange={(e) => setTimeLabel(e.target.value)}
              placeholder="es. h 10.00, in mattinata, a seguire"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
              required
            />
            {/* Scorciatoie Orario */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_TIMES.map((qt) => (
                <button
                  key={qt}
                  type="button"
                  onClick={() => setTimeLabel(qt)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    timeLabel === qt
                      ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          {/* Referente / Sigla */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <User size={16} className="text-slate-400" /> Referente / Sigla Ufficio
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referent}
                onChange={(e) => setReferent(e.target.value)}
                placeholder="es. MC, Giulia, Risorg"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {QUICK_REFERENTS.map((qr) => (
                <button
                  key={qr || 'vuoto'}
                  type="button"
                  onClick={() => setReferent(qr)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    referent === qr
                      ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {qr || 'Nessuno'}
                </button>
              ))}
            </div>
          </div>

          {/* Oggetto / Descrizione */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <FileText size={16} className="text-slate-400" /> Oggetto / Descrizione
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. AU riceve D.ssa Canestrari, AU c/o Ars Biomedica..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
              required
            />
          </div>

          {/* Tipo e Stile di Visualizzazione */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
              <Tag size={16} className="text-slate-400" /> Stile Grafico ed Evidenziazione
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('standard')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  category === 'standard'
                    ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs text-slate-500 mb-0.5">Normale / Ditte</div>
                <div className="text-sm font-semibold text-slate-800">Standard</div>
              </button>

              <button
                type="button"
                onClick={() => setCategory('internal_red')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  category === 'internal_red'
                    ? 'border-red-500 bg-red-50 ring-2 ring-red-400'
                    : 'border-slate-200 hover:bg-red-50/50'
                }`}
              >
                <div className="text-xs text-red-600 mb-0.5">AU Riceve</div>
                <div className="text-sm font-bold text-red-700">Testo Rosso</div>
              </button>

              <button
                type="button"
                onClick={() => setCategory('external_yellow')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  category === 'external_yellow'
                    ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400'
                    : 'border-slate-200 hover:bg-amber-50/50'
                }`}
              >
                <div className="text-xs text-amber-700 mb-0.5">AU Fuori sede (c/o)</div>
                <div className="text-sm font-bold bg-amber-200 text-amber-950 px-1 rounded">Giallo Soft</div>
              </button>
            </div>
          </div>

          {/* Riferimento a destra (tra parentesi) */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <AlignLeft size={16} className="text-slate-400" /> Riferimento / Contatto a destra (opzionale)
            </label>
            <input
              type="text"
              value={sideNote}
              onChange={(e) => setSideNote(e.target.value)}
              placeholder="es. Paolini, Ricci F. (le parentesi vengono aggiunte da sole)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
            />
          </div>

          {/* Bottoni footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Vuoi eliminare questo appuntamento?')) {
                    onDelete(initialData.id);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-semibold text-sm transition"
              >
                Elimina
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm shadow-md transition"
              >
                Salva
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
