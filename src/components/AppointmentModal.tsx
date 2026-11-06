import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  User, 
  FileText, 
  Tag, 
  AlignLeft, 
  BookUser, 
  Check, 
  UserPlus,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import type { Appointment, AppointmentCategory, Contact } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
  onDelete?: (id: string) => void;
  initialData?: Appointment | null;
  defaultDate?: string;
  contacts?: Contact[];
  onQuickSaveContact?: (contact: Contact) => void;
}

export const AppointmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  defaultDate,
  contacts = [],
  onQuickSaveContact,
}) => {
  const [date, setDate] = useState('');
  const [timeLabel, setTimeLabel] = useState('');
  const [referent, setReferent] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AppointmentCategory>('standard');
  const [sideNote, setSideNote] = useState('');
  const [location, setLocation] = useState('');
  const [forGatehouse, setForGatehouse] = useState(false);
  const [contactId, setContactId] = useState<string | undefined>(undefined);

  // Autocomplete contatti
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [savedContactSuccess, setSavedContactSuccess] = useState(false);

  const handleQuickSaveCurrent = () => {
    if (!onQuickSaveContact) return;
    const raw = sideNote.replace(/[()]/g, '').trim() || title.replace(/AU riceve\s*/i, '').trim();
    if (!raw) return;
    onQuickSaveContact({
      id: `cont-${Date.now()}`,
      name: raw,
      title: 'Dott.',
    });
    setSavedContactSuccess(true);
    setTimeout(() => setSavedContactSuccess(false), 2000);
  };

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setTimeLabel(initialData.time_label || '');
      setReferent(initialData.referent || '');
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'standard');
      setSideNote(initialData.side_note || '');
      setLocation(initialData.location || '');
      setForGatehouse(Boolean(initialData.for_gatehouse));
      setContactId(initialData.contact_id);
    } else {
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTimeLabel('h 10.00');
      setReferent('MC');
      setTitle('');
      setCategory('standard');
      setSideNote('');
      setLocation('');
      setForGatehouse(false); // Default spento come richiesto
      setContactId(undefined);
    }
    setShowContactPicker(false);
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
      contact_id: contactId,
      for_gatehouse: forGatehouse,
      location: location.trim(),
    });
    onClose();
  };

  const handlePickContact = (c: Contact) => {
    const formattedTitle = c.title ? `${c.title} ${c.name}` : c.name;
    if (!title.trim() || title === 'AU riceve ' || title.startsWith('AU riceve')) {
      setTitle(`AU riceve ${formattedTitle}`);
      setCategory('internal_red');
    }
    setContactId(c.id);
    setShowContactPicker(false);
  };

  const QUICK_TIMES = ['h 09.00', 'h 10.00', 'h 11.45', 'h 15.00', 'in mattinata', 'a seguire', 'pomeriggio'];
  const QUICK_REFERENTS = ['Monte Citorio', 'Via Giulia', 'Risorgimento', ''];
  const QUICK_LOCATIONS = [
    'Banca Passadore',
    'BPM',
    'Duferco',
    'Clifford Chance',
    'Studio Laghi',
    'Fondazione Terzo Pilastro',
    'Fondazione Cultura e Arte',
    'Nexi',
    'Lottomatica',
    'Deas',
    'Sky',
    'GFA',
    'Boehringer Ing.',
    'Banca Intesa'
  ];
  const QUICK_SIDE_NOTES = [
    'Milano V.',
    'Torre M.',
    'Ferrante R.',
    'Ricci A.',
    'Geom. Paolini D.',
    'Avv. Bonazzi'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold leading-tight">
              {initialData ? 'Modifica Appuntamento' : 'Nuovo Appuntamento'}
            </h2>
            <p className="text-xs text-slate-300">Compilazione rapida per agenda di segreteria</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
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
                  className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    timeLabel === qt
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {qt}
                </button>
              ))}
            </div>
          </div>

          {/* Luogo / Sede */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <MapPin size={16} className="text-slate-400" /> Luogo / Sede (per foglio portineria)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="es. DEAS, Boehringer Ing., Intesa Sanpaolo, Nexi (o lascia vuoto)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
            />
            {/* Scorciatoie Luogo */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    location === loc
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {loc}
                </button>
              ))}
              {location && (
                <button
                  type="button"
                  onClick={() => setLocation('')}
                  className="text-xs px-2 py-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Azzera
                </button>
              )}
            </div>
          </div>

          {/* Referente / Sigla Ufficio */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
              <User size={16} className="text-slate-400" /> Sigla / Referente
            </label>
            <input
              type="text"
              value={referent}
              onChange={(e) => setReferent(e.target.value)}
              placeholder="es. MC, Giulia, Risorg (o lascia vuoto)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
            />
            {/* Scorciatoie Referente */}
            <div className="flex gap-1.5 mt-2">
              {QUICK_REFERENTS.map((qr) => (
                <button
                  key={qr || 'nessuno'}
                  type="button"
                  onClick={() => setReferent(qr)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    referent === qr
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {qr || 'Nessuno'}
                </button>
              ))}
            </div>
          </div>

          {/* Oggetto / Descrizione + Selezione da Anagrafica */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <FileText size={16} className="text-slate-400" /> Oggetto / Descrizione
              </label>
              <div className="flex items-center gap-3">
                {onQuickSaveContact && (
                  <button
                    type="button"
                    onClick={handleQuickSaveCurrent}
                    className="text-xs text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Salva nome inserito in Rubrica"
                  >
                    {savedContactSuccess ? <Check size={13} className="text-emerald-600" /> : <UserPlus size={13} />}
                    {savedContactSuccess ? 'Salvato!' : '+ Salva in Rubrica'}
                  </button>
                )}
                {contacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowContactPicker(!showContactPicker)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <BookUser size={13} /> {showContactPicker ? 'Nascondi rubrica' : 'Scegli da Anagrafica'}
                  </button>
                )}
              </div>
            </div>

            {/* Dropdown rapido contatti anagrafica */}
            {showContactPicker && (
              <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase px-1">Seleziona contatto:</div>
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePickContact(c)}
                    className="w-full text-left px-2 py-1 rounded-lg hover:bg-white hover:shadow-2xs text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="font-semibold text-slate-800">
                      {c.title ? `${c.title} ` : ''}{c.name}
                    </span>
                    <span className="text-[11px] text-slate-400">{c.company || c.phone || ''}</span>
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. AU riceve D.ssa Canestrari, AU c/o Ars Biomedica, ditta con targa mezzo..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
              required
            />
          </div>

          {/* Tipo e Stile di Visualizzazione */}
          <div>
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
              <Tag size={16} className="text-slate-400" /> Stile ed Evidenziazione
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('standard')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  category === 'standard'
                    ? 'border-slate-800 bg-slate-100 ring-2 ring-slate-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs text-slate-500 mb-0.5">Normale / Ditte</div>
                <div className="text-sm font-semibold text-slate-800">Standard</div>
              </button>

              <button
                type="button"
                onClick={() => setCategory('internal_red')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
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
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                  category === 'external_yellow'
                    ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400'
                    : 'border-slate-200 hover:bg-amber-50/50'
                }`}
              >
                <div className="text-xs text-amber-700 mb-0.5">AU Fuori sede</div>
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
              placeholder="es. Paolini, Ricci F. (le parentesi vengono aggiunte in automatico)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-base"
            />
            {/* Scorciatoie Riferimento */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_SIDE_NOTES.map((sn) => (
                <button
                  key={sn}
                  type="button"
                  onClick={() => setSideNote(sn)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    sideNote.includes(sn)
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sn}
                </button>
              ))}
              {sideNote && (
                <button
                  type="button"
                  onClick={() => setSideNote('')}
                  className="text-xs px-2 py-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Azzera
                </button>
              )}
            </div>
          </div>

          {/* TOGGLE PER FOGLIO PORTINERIA */}
          <div className="pt-1">
            <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
              forGatehouse
                ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition ${
                  forGatehouse ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Includi nel foglio Portineria
                    {forGatehouse && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">
                        Attivo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Stampa nel foglio autorizzazioni e accessi giornalieri per i portieri
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={forGatehouse}
                onChange={(e) => setForGatehouse(e.target.checked)}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
            </label>
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
                className="px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 font-semibold text-sm transition cursor-pointer"
              >
                Elimina
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm shadow-md transition cursor-pointer"
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
