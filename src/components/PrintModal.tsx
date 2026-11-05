import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  AlertCircle, 
  Check, 
  FileText 
} from 'lucide-react';
import { parseISODate, toISODate } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentStartDate: string;
  onApplyAndPrint: (fromIso: string, daysCount: number) => void;
}

export const PrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentStartDate,
  onApplyAndPrint,
}) => {
  const [fromDate, setFromDate] = useState<string>(currentStartDate);
  
  // Calcola default a 14 giorni (2 settimane)
  const [toDate, setToDate] = useState<string>(() => {
    const d = parseISODate(currentStartDate);
    d.setDate(d.getDate() + 13);
    return toISODate(d);
  });

  if (!isOpen) return null;

  // Calcola numero di giorni selezionati
  const start = parseISODate(fromDate);
  const end = parseISODate(toDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;

  // Verifica validità e limite massimo di 14 giorni
  const isInvalidRange = diffDays < 1;
  const exceedsMaxLimit = diffDays > 14;

  const handleFromChange = (newFrom: string) => {
    setFromDate(newFrom);
    // Se toDate supera 14 giorni o è prima di fromDate, riallinea toDate a +13 giorni
    const s = parseISODate(newFrom);
    const e = parseISODate(toDate);
    const dDays = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    if (dDays < 1 || dDays > 14) {
      const newEnd = new Date(s);
      newEnd.setDate(s.getDate() + 13);
      setToDate(toISODate(newEnd));
    }
  };

  const handleToChange = (newTo: string) => {
    setToDate(newTo);
  };

  const setPreset = (days: number) => {
    const s = parseISODate(fromDate);
    const newEnd = new Date(s);
    newEnd.setDate(s.getDate() + (days - 1));
    setToDate(toISODate(newEnd));
  };

  const handlePrintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalidRange || exceedsMaxLimit) return;

    onApplyAndPrint(fromDate, diffDays);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-bold">
              <Printer size={19} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Configura Stampa A4</h2>
              <p className="text-xs text-slate-300">Scegli il periodo (massimo 14 giorni per impaginazione)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handlePrintSubmit} className="p-6 space-y-4">
          
          {/* Preset Rapidi */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Scorciatoie Periodo
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreset(7)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                  diffDays === 7
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                1 Settimana (7 giorni)
              </button>
              <button
                type="button"
                onClick={() => setPreset(14)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                  diffDays === 14
                    ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                2 Settimane (14 giorni)
              </button>
            </div>
          </div>

          {/* Selezione Da / A */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stampa Da:
              </label>
              <input
                type="date"
                required
                value={fromDate}
                onChange={(e) => handleFromChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Stampa A:
              </label>
              <input
                type="date"
                required
                value={toDate}
                onChange={(e) => handleToChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Riepilogo e Controllo Limite */}
          <div className="pt-2">
            {exceedsMaxLimit ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Periodo troppo lungo ({diffDays} giorni):</span> il limite fissato per garantire la perfetta resa e leggibilità del foglio A4 è di <strong>massimo 14 giorni (2 settimane)</strong>. Riduci l'intervallo per procedere.
                </div>
              </div>
            ) : isInvalidRange ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0" />
                <span>La data di fine deve essere uguale o successiva alla data di inizio.</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium">
                  <Check size={15} className="text-emerald-600" />
                  <span>Periodo valido: <strong>{diffDays} giorni</strong></span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                  {diffDays <= 7 ? '1 Facciata A4' : '2 Facciate A4 (Fronte/Retro)'}
                </span>
              </div>
            )}
          </div>

          {/* Avviso Zoom Stampa */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
            <FileText size={14} className="text-blue-500 shrink-0" />
            <span>Il foglio è calibrato per adattarsi a <strong>scala 100%</strong> senza dover modificare lo zoom manuale nella stampante.</span>
          </div>

          {/* Bottoni Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isInvalidRange || exceedsMaxLimit}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Printer size={15} /> Avvia Stampa A4
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
