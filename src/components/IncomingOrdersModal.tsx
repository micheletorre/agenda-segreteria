import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Mail,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Building2,
  Calendar,
  Tag,
} from 'lucide-react';
import {
  type IncomingOrder,
  type OrderStatus,
  QUICK_COMPANIES,
  QUICK_SUPPLIERS,
  QUICK_DEPARTMENTS,
  generateDemoOrders,
  saveDepartmentRule,
} from '../utils/incomingOrdersSync';
import { toISODate } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: IncomingOrder[];
  onSaveOrders: (nextOrders: IncomingOrder[]) => Promise<void>;
  onRefreshOrders: () => Promise<void>;
}

const GOOGLE_APPS_SCRIPT_CODE = `// ============================================================================
// GOOGLE APPS SCRIPT PER: ordini.veggismontecitorio@gmail.com
// Legge le email non ancora elaborate, applica l'etichetta automatica
// e invia i dati al gestionale Palazzo Macchi di Cellere.
// ============================================================================

const WEBHOOK_URL = 'https://agenda-segreteria.vercel.app/api/inbound-order';
const LABEL_DONE = 'Ordini/Registrato';

function processIncomingOrderEmails() {
  let doneLabel = GmailApp.getUserLabelByName(LABEL_DONE);
  if (!doneLabel) {
    // Crea automaticamente l'etichetta se non esiste
    GmailApp.createLabel('Ordini');
    doneLabel = GmailApp.createLabel(LABEL_DONE);
  }

  // Cerca le email in arrivo (o etichettate) non ancora contrassegnate come registrate
  const threads = GmailApp.search('-label:"' + LABEL_DONE + '" (in:inbox OR label:"Edilizia Veggis Monte Citorio" OR label:"Plutarco")', 0, 15);
  for (const thread of threads) {
    const messages = thread.getMessages();
    const lastMsg = messages[messages.length - 1];
    const threadLabels = thread.getLabels().map(function(l) { return l.getName(); });

    const payload = {
      to: lastMsg.getTo(),
      from: lastMsg.getFrom(),
      subject: lastMsg.getSubject(),
      body: lastMsg.getPlainBody() || '',
      date: lastMsg.getDate().toISOString(),
      labels: threadLabels,
    };

    try {
      const response = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });

      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        thread.addLabel(doneLabel);
        thread.markRead();
      }
    } catch (e) {
      Logger.log('Errore invio ordine: ' + e);
    }
  }
}`;

export const IncomingOrdersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orders,
  onSaveOrders,
  onRefreshOrders,
}) => {
  const todayIso = useMemo(() => toISODate(new Date()), []);
  const [filterCompany, setFilterCompany] = useState<string>('TUTTE');
  const [filterView, setFilterView] = useState<'ATTIVI' | 'OGGI' | 'PORTINERIA' | 'DA_ASSEGNARE' | 'CONSEGNATI'>('ATTIVI');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showGmailSetup, setShowGmailSetup] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [ruleToast, setRuleToast] = useState<string | null>(null);
  const [customDeptForId, setCustomDeptForId] = useState<string | null>(null);
  const [customDeptText, setCustomDeptText] = useState('');

  // Form nuovo ordine manuale
  const [newCompany, setNewCompany] = useState<string>('Monte Citorio');
  const [newSupplier, setNewSupplier] = useState<string>('Amazon');
  const [newItems, setNewItems] = useState('');
  const [newDate, setNewDate] = useState<string>(todayIso);
  const [newDept, setNewDept] = useState<string>('');
  const [newNotes, setNewNotes] = useState('');

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshOrders();
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const handleAssignDepartment = async (order: IncomingOrder, dept: string) => {
    const cleanDept = dept.trim();
    if (!cleanDept) return;

    const nextOrders = orders.map((o) =>
      o.id === order.id
        ? { ...o, department: cleanDept, updatedAt: new Date().toISOString() }
        : o
    );
    await onSaveOrders(nextOrders);
    await saveDepartmentRule(order.itemsSummary, cleanDept, order.company);
    setCustomDeptForId(null);
    setCustomDeptText('');
    setRuleToast(`Reparto "${cleanDept}" assegnato e memorizzato per ordini simili`);
    setTimeout(() => setRuleToast(null), 3200);
  };

  const handleUpdateStatus = async (order: IncomingOrder, nextStatus: OrderStatus) => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nextOrders = orders.map((o) => {
      if (o.id !== order.id) return o;
      if (nextStatus === 'ARRIVATO_PORTINERIA') {
        return {
          ...o,
          status: nextStatus,
          arrivedAt: o.arrivedAt || hhmm,
          arrivedDate: o.arrivedDate || todayIso,
          updatedAt: now.toISOString(),
        };
      }
      if (nextStatus === 'CONSEGNATO') {
        return {
          ...o,
          status: nextStatus,
          deliveredAt: hhmm,
          deliveredTo: o.department || 'Reparto',
          updatedAt: now.toISOString(),
        };
      }
      return { ...o, status: nextStatus, updatedAt: now.toISOString() };
    });
    await onSaveOrders(nextOrders);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('Eliminare questo ordine dalla lista?')) return;
    await onSaveOrders(orders.filter((o) => o.id !== id));
  };

  const handleAddManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItems.trim()) return;
    const nowIso = new Date().toISOString();
    const newOrder: IncomingOrder = {
      id: `ord-${Date.now()}`,
      company: newCompany,
      supplier: newSupplier,
      itemsSummary: newItems.trim(),
      expectedDate: newDate || undefined,
      status: newDate === todayIso ? 'IN_CONSEGNA_OGGI' : 'ORDINATO',
      department: newDept.trim() || undefined,
      notes: newNotes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    await onSaveOrders([newOrder, ...orders]);
    if (newDept.trim()) {
      await saveDepartmentRule(newOrder.itemsSummary, newDept.trim(), newCompany);
    }
    setNewItems('');
    setNewNotes('');
    setNewDept('');
    setShowNewForm(false);
  };

  const handleLoadDemo = async () => {
    const demo = generateDemoOrders();
    await onSaveOrders(demo);
    setRuleToast('Acquisti demo ricaricati');
    setTimeout(() => setRuleToast(null), 2500);
  };

  // KPI
  const activeOrders = orders.filter((o) => o.status !== 'CONSEGNATO');
  const arrivingTodayCount = activeOrders.filter(
    (o) => o.expectedDate === todayIso || o.status === 'IN_CONSEGNA_OGGI'
  ).length;
  const inPortineriaCount = orders.filter((o) => o.status === 'ARRIVATO_PORTINERIA').length;
  const unassignedCount = activeOrders.filter((o) => !o.department).length;

  const filteredOrders = orders.filter((o) => {
    if (filterCompany !== 'TUTTE' && o.company !== filterCompany) return false;
    if (filterView === 'ATTIVI') return o.status !== 'CONSEGNATO';
    if (filterView === 'OGGI') return o.status !== 'CONSEGNATO' && (o.expectedDate === todayIso || o.status === 'IN_CONSEGNA_OGGI');
    if (filterView === 'PORTINERIA') return o.status === 'ARRIVATO_PORTINERIA';
    if (filterView === 'DA_ASSEGNARE') return o.status !== 'CONSEGNATO' && !o.department;
    if (filterView === 'CONSEGNATI') return o.status === 'CONSEGNATO';
    return true;
  });

  const renderStatusBadge = (order: IncomingOrder) => {
    switch (order.status) {
      case 'ARRIVATO_PORTINERIA':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
            In Portineria {order.arrivedAt ? `ore ${order.arrivedAt}` : ''}
          </span>
        );
      case 'IN_CONSEGNA_OGGI':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
            <Truck size={12} className="text-amber-700 shrink-0" />
            In consegna oggi
          </span>
        );
      case 'IN_TRANSITO':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
            <Truck size={12} className="text-sky-600 shrink-0" />
            In transito
          </span>
        );
      case 'CONSEGNATO':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700 border border-slate-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
            <Check size={12} className="text-slate-600 shrink-0" />
            Consegnato {order.deliveredAt ? `ore ${order.deliveredAt}` : ''}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
            <Package size={12} className="text-slate-500 shrink-0" />
            Ordinato
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header scuro istituzionale */}
        <div className="bg-slate-900 text-white px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <Package size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight whitespace-nowrap truncate">
                In Arrivo a Palazzo · Ordini &amp; Pacchi
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Tracciamento consegne aziendali prima dell&apos;apertura dei colli · Sync tempo reale
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Aggiorna</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGmailSetup((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition ${
                showGmailSetup
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
            >
              <Mail size={13} />
              <span>Configura Gmail</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-sm"
            >
              <Plus size={14} />
              <span>Nuovo Ordine</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Chiudi"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Corpo scrollabile */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {ruleToast && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-600 shrink-0" />
              <span>{ruleToast}</span>
            </div>
          )}

          {/* Pannello Configurazione Gmail & Etichette Automatiche */}
          {showGmailSetup && (
            <div className="bg-white rounded-2xl border-2 border-amber-300 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-amber-600 shrink-0" />
                  <h3 className="text-sm font-black text-slate-900">
                    Collegamento Automatico Gmail: ordini.veggismontecitorio@gmail.com
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGmailSetup(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Chiudi guida
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">1. Inoltro dalle Aziende (Alias +)</div>
                  <p>Su ciascuna casella Gmail aziendale imposta un filtro di inoltro per le email da Amazon, Maury&apos;s, corrieri verso:</p>
                  <ul className="font-mono text-[11px] text-blue-800 space-y-0.5 pt-1">
                    <li>• ordini.veggismontecitorio<strong>+montecitorio</strong>@gmail.com</li>
                    <li>• ordini.veggismontecitorio<strong>+veggis</strong>@gmail.com</li>
                    <li>• ordini.veggismontecitorio<strong>+plutarco</strong>@gmail.com</li>
                    <li>• ordini.veggismontecitorio<strong>+proprieta</strong>@gmail.com</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">2. Etichette Automatiche Colorate</div>
                  <p>Su <strong>ordini.veggismontecitorio@gmail.com</strong> crea i filtri:</p>
                  <ul className="text-[11px] space-y-0.5 pt-1">
                    <li>• A: <code className="bg-slate-200 px-1 rounded">+veggis</code> → Etichetta <strong>Edilizia Veggis</strong></li>
                    <li>• A: <code className="bg-slate-200 px-1 rounded">+montecitorio</code> → Etichetta <strong>Monte Citorio</strong></li>
                    <li>• A: <code className="bg-slate-200 px-1 rounded">+plutarco</code> → Etichetta <strong>Plutarco</strong></li>
                    <li>• Lo script aggiunge poi in automatico l&apos;etichetta verde <strong>Ordini/Registrato</strong> appena lo carica qui.</li>
                  </ul>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900">3. Attivazione Script (1 volta)</div>
                  <p className="text-[11px]">
                    Apri <strong>script.google.com</strong> loggato su <code className="bg-slate-200 px-1 rounded">ordini.veggismontecitorio@gmail.com</code>, incolla lo script qui sotto e imposta un Trigger ogni <strong>5 minuti</strong> sulla funzione <code className="bg-slate-200 px-1 rounded">processIncomingOrderEmails</code>.
                  </p>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 text-[11px] font-mono p-3 rounded-xl overflow-x-auto max-h-48">
                  {GOOGLE_APPS_SCRIPT_CODE}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  {copiedScript ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedScript ? 'Copiato!' : 'Copia Script'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Form Nuovo Ordine Manuale */}
          {showNewForm && (
            <form onSubmit={handleAddManualOrder} className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-blue-900">
                Inserimento Rapido Ordine
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Azienda</label>
                  <select
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                  >
                    {QUICK_COMPANIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fornitore</label>
                  <select
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                  >
                    {QUICK_SUPPLIERS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Data Arrivo Prevista</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Reparto / Destinatario</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="es. Amministrazione (o vuoto)"
                    className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-2 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Contenuto / Articoli nel pacco</label>
                  <input
                    type="text"
                    required
                    value={newItems}
                    onChange={(e) => setNewItems(e.target.value)}
                    placeholder="es. 2x Toner HP, 5 risme carta A4..."
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Note (opz.)</label>
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Note consegna..."
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                >
                  Salva Ordine
                </button>
              </div>
            </form>
          )}

          {/* Barra KPI Riepilogo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => setFilterView('OGGI')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                filterView === 'OGGI' ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-300' : 'bg-white border-slate-200 hover:border-amber-300'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">In Arrivo Oggi</div>
              <div className="text-xl font-black text-amber-700 mt-0.5">{arrivingTodayCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterView('PORTINERIA')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                filterView === 'PORTINERIA' ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300' : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">In Portineria</div>
              <div className="text-xl font-black text-emerald-700 mt-0.5">{inPortineriaCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterView('DA_ASSEGNARE')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                filterView === 'DA_ASSEGNARE' ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300' : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500 uppercase whitespace-nowrap">Da Assegnare</div>
              <div className="text-xl font-black text-rose-700 mt-0.5">{unassignedCount}</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterView('ATTIVI')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                filterView === 'ATTIVI' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className={`text-[11px] font-bold uppercase whitespace-nowrap ${filterView === 'ATTIVI' ? 'text-amber-300' : 'text-slate-500'}`}>
                Totale Attivi
              </div>
              <div className="text-xl font-black mt-0.5">{activeOrders.length}</div>
            </button>
          </div>

          {/* Filtri Azienda + Vista */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase px-1 whitespace-nowrap">Azienda:</span>
              {['TUTTE', ...QUICK_COMPANIES].map((comp) => (
                <button
                  key={comp}
                  type="button"
                  onClick={() => setFilterCompany(comp)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                    filterCompany === comp
                      ? 'bg-slate-900 text-amber-300 border-slate-800'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {comp === 'TUTTE' ? 'Tutte' : comp}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterView(filterView === 'CONSEGNATI' ? 'ATTIVI' : 'CONSEGNATI')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer whitespace-nowrap ${
                  filterView === 'CONSEGNATI'
                    ? 'bg-slate-800 text-white border-slate-700'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {filterView === 'CONSEGNATI' ? 'Torna agli Attivi' : 'Archivio Consegnati'}
              </button>
              {orders.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer whitespace-nowrap"
                >
                  Carica Ordini Demo
                </button>
              )}
            </div>
          </div>

          {/* Lista Ordini */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              Nessun ordine presente in questa vista.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border p-3.5 shadow-2xs transition ${
                    order.status === 'ARRIVATO_PORTINERIA'
                      ? 'border-emerald-300 ring-1 ring-emerald-200'
                      : !order.department && order.status !== 'CONSEGNATO'
                      ? 'border-rose-300 ring-1 ring-rose-100'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Riga 1: Fornitore, Azienda, Data, Stato, Azioni */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-xs font-black whitespace-nowrap">
                        {order.supplier}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap">
                        <Building2 size={11} className="text-slate-500 shrink-0" />
                        {order.company}
                      </span>
                      {order.expectedDate && (
                        <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          {order.expectedDate === todayIso
                            ? 'Oggi'
                            : order.expectedDate.split('-').reverse().join('/')}
                        </span>
                      )}
                      {order.orderNumber && (
                        <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                          #{order.orderNumber}
                        </span>
                      )}
                      {order.isUnannounced && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10.5px] font-bold inline-flex items-center gap-1 whitespace-nowrap">
                          <AlertTriangle size={11} /> Pacco non annunciato
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {renderStatusBadge(order)}
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="Elimina ordine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Riga 2: Contenuto completo del pacco (MAI troncato) */}
                  <div className="py-2">
                    <div className="text-sm font-bold text-slate-900 leading-snug break-words">
                      {order.itemsSummary}
                    </div>
                    {order.notes && (
                      <div className="text-xs text-slate-500 mt-1 break-words">
                        {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Riga 3: Assegnazione Reparto a 1 clic + Azioni Consegna */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {order.department ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap">
                            <Tag size={12} className="text-blue-600 shrink-0" />
                            Reparto: {order.department}
                          </span>
                          {order.status !== 'CONSEGNATO' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomDeptForId(customDeptForId === order.id ? null : order.id);
                                setCustomDeptText(order.department || '');
                              }}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer whitespace-nowrap"
                            >
                              Cambia
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap mr-1">
                            <AlertTriangle size={11} /> Reparto da assegnare:
                          </span>
                          {QUICK_DEPARTMENTS.map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => handleAssignDepartment(order, dept)}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 border border-slate-200 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                            >
                              {dept}
                            </button>
                          ))}
                        </div>
                      )}

                      {customDeptForId === order.id && (
                        <div className="flex items-center gap-1 ml-1">
                          <input
                            type="text"
                            value={customDeptText}
                            onChange={(e) => setCustomDeptText(e.target.value)}
                            placeholder="Nome reparto..."
                            className="text-xs border border-slate-300 rounded-lg px-2 py-1 w-36"
                          />
                          <button
                            type="button"
                            onClick={() => handleAssignDepartment(order, customDeptText)}
                            className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            Salva
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Bottoni di avanzamento stato */}
                    {order.status !== 'CONSEGNATO' && (
                      <div className="flex items-center gap-1.5 ml-auto shrink-0">
                        {order.status !== 'ARRIVATO_PORTINERIA' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order, 'ARRIVATO_PORTINERIA')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold cursor-pointer whitespace-nowrap"
                          >
                            Arrivato in Portineria
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(order, 'CONSEGNATO')}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap shadow-xs inline-flex items-center gap-1"
                        >
                          <Check size={13} />
                          Consegnato
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
