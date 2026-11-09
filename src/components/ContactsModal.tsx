import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  Building, 
  Edit2, 
  Trash2, 
  Check, 
  BookUser,
  MapPin
} from 'lucide-react';
import type { Contact } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSaveContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onSelectContact?: (contact: Contact) => void;
}

export const ContactsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  contacts,
  onSaveContact,
  onDeleteContact,
  onSelectContact,
}) => {
  const [search, setSearch] = useState('');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Campi form
  const [title, setTitle] = useState('Dott.');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const startEdit = (c: Contact) => {
    setEditingContact(c);
    setTitle(c.title || 'Dott.');
    setName(c.name || '');
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setCompany(c.company || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setIsAddingNew(true);
  };

  const startNew = () => {
    setEditingContact(null);
    setTitle('Dott.');
    setName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setAddress('');
    setNotes('');
    setIsAddingNew(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveContact({
      id: editingContact?.id || `cont-${Date.now()}`,
      title: title.trim(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      company: company.trim(),
      address: address.trim(),
      notes: notes.trim(),
      created_at: editingContact?.created_at || new Date().toISOString(),
    });

    setIsAddingNew(false);
    setEditingContact(null);
  };

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.title && c.title.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Intestazione */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-bold">
              <BookUser size={19} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Anagrafica & Rubrica Segreteria</h2>
              <p className="text-xs text-slate-300">Contatti per appuntamenti veloci e note di direzione</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra Ricerca e Nuovo Contatto */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per nome, società, indirizzo, telefono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          {!isAddingNew && (
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
            >
              <UserPlus size={16} /> Aggiungi Contatto
            </button>
          )}
        </div>

        {/* Form Aggiunta / Modifica Rapida (collapsible) */}
        {isAddingNew && (
          <form onSubmit={handleSubmit} className="p-5 bg-blue-50/50 border-b border-blue-100 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-blue-200/60">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                {editingContact ? 'Modifica Contatto' : 'Nuova Scheda Contatto'}
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-semibold"
              >
                Annulla
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Titolo</label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Dott.">Dott.</option>
                  <option value="D.ssa">D.ssa</option>
                  <option value="Dott.ssa">Dott.ssa</option>
                  <option value="Avv.">Avv.</option>
                  <option value="Ing.">Ing.</option>
                  <option value="Arch.">Arch.</option>
                  <option value="Geom.">Geom.</option>
                  <option value="Sig.">Sig.</option>
                  <option value="Sig.ra">Sig.ra</option>
                  <option value="">Nessuno</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome e Cognome *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Mario Rossi, Canestrari..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefono / Cellulare</label>
                <input
                  type="tel"
                  placeholder="es. 333 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="es. nome@studio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Società / Studio / Ruolo</label>
                <input
                  type="text"
                  placeholder="es. Ars Biomedica, DLG"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin size={12} className="text-slate-400" /> Indirizzo (non obbligatorio)
              </label>
              <input
                type="text"
                placeholder="es. Via Flaminia 123, Roma"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
              >
                Chiudi
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                {editingContact ? 'Aggiorna Scheda' : 'Salva Contatto'}
              </button>
            </div>
          </form>
        )}

        {/* Lista Contatti */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <BookUser size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Nessun contatto trovato</p>
              <p className="text-xs text-slate-400 mt-1">Aggiungine uno con il pulsante in alto</p>
            </div>
          ) : (
            filtered.map((contact) => (
              <div
                key={contact.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50/50 transition flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    {contact.title && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {contact.title}
                      </span>
                    )}
                    <span className="font-bold text-slate-900 text-base">
                      {contact.name}
                    </span>
                    {contact.company && (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <Building size={12} /> {contact.company}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-600">
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                        <Phone size={12} className="text-slate-400" /> {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-blue-600">
                        <Mail size={12} className="text-slate-400" /> {contact.email}
                      </a>
                    )}
                    {contact.address && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin size={12} className="text-amber-600 shrink-0" /> {contact.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onSelectContact && (
                    <button
                      onClick={() => onSelectContact(contact)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 transition"
                      title="Usa per questo appuntamento"
                    >
                      <Check size={13} /> Scegli
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(contact)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Modifica"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Eliminare il contatto "${contact.name}"?`)) {
                        onDeleteContact(contact.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Elimina"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>{contacts.length} contatti registrati in anagrafica</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold transition"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};
