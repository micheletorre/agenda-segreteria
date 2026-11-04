import React, { useState, useEffect } from 'react';
import { X, Calendar, UserCheck } from 'lucide-react';
import type { DailyNote } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: DailyNote) => void;
  onDelete?: (id: string) => void;
  initialData?: DailyNote | null;
  defaultDate?: string;
}

export const DailyNoteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  defaultDate,
}) => {
  const [employeeName, setEmployeeName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [noteType, setNoteType] = useState<'ferie' | 'avviso'>('ferie');

  useEffect(() => {
    if (initialData) {
      setStartDate(initialData.start_date);
      setEndDate(initialData.end_date);
      setNoteType(initialData.note_type === 'chiusura' ? 'avviso' : initialData.note_type);
      // Estrai il nome dal testo se possibile
      const match = initialData.note_text.match(/^(.*?)\s+in ferie/i);
      if (match) {
        setEmployeeName(match[1]);
      } else {
        setEmployeeName(initialData.note_text);
      }
    } else {
      const today = defaultDate || new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setEmployeeName('');
      setNoteType('ferie');
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !startDate || !endDate) return;

    const [, sm, sd] = startDate.split('-');
    const [, em, ed] = endDate.split('-');

    let noteText = '';
    if (noteType === 'ferie') {
      if (startDate === endDate) {
        noteText = `${employeeName.trim()} in ferie il ${sd}.${sm}`;
      } else {
        noteText = `${employeeName.trim()} in ferie dal ${sd}.${sm} al ${ed}.${em}`;
      }
    } else {
      noteText = employeeName.trim();
    }

    onSave({
      id: initialData?.id || `note-${Date.now()}`,
      start_date: startDate,
      end_date: endDate,
      note_text: noteText,
      note_type: noteType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-sky-50 border-b border-sky-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-sky-900 flex items-center gap-2">
            <UserCheck size={20} className="text-sky-600" />
            {initialData ? 'Modifica Ferie / Avviso' : 'Registra Ferie / Assenza'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {noteType === 'ferie' ? 'Nome del Dipendente' : 'Testo Avviso / Chiusura'}
            </label>
            <input
              type="text"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder={noteType === 'ferie' ? 'es. Andrea Acciari, Paolo Ferranti...' : 'es. Chiusura uffici...'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-medium text-base"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-400" /> Dal
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-400" /> Al
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 text-sm font-medium"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-sky-800">
            💡 L'avviso comparirà automaticamente in cima a tutti i giorni inclusi nel periodo con il classico testo in azzurro dell'agenda.
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {initialData && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Vuoi eliminare questa voce di ferie?')) {
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
                className="px-6 py-2.5 rounded-xl bg-sky-600 text-white hover:bg-sky-700 font-semibold text-sm shadow-md transition"
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
