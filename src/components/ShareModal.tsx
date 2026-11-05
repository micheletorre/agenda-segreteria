import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Copy, 
  Check, 
  FileDown, 
  Printer, 
  Info
} from 'lucide-react';
import type { Appointment, DailyNote } from '../types';
import { formatHeaderDate, parseISODate } from '../utils/dateUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  startDateStr: string;
  daysCount: number;
  appointments: Appointment[];
  dailyNotes: DailyNote[];
  onTriggerPrint: () => void;
}

export const ShareModal: React.FC<Props> = ({
  isOpen,
  onClose,
  startDateStr,
  daysCount,
  appointments,
  dailyNotes,
  onTriggerPrint,
}) => {
  const [copiedType, setCopiedType] = useState<'email' | 'wa' | 'sms' | 'link' | null>(null);
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp' | 'sms'>('email');

  if (!isOpen) return null;

  // Calcolo intervallo date
  const startDate = parseISODate(startDateStr);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (daysCount - 1));

  const startFormatted = formatHeaderDate(startDate);
  const endFormatted = formatHeaderDate(endDate);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://agenda-segreteria.vercel.app';
  const mobileLink = `${baseUrl}/?vista=mobile&data=${startDateStr}`;

  // Testo Oggetto Email
  const emailSubject = `[AGENDA SEGRETERIA] Programma appuntamenti ${startFormatted} - ${endFormatted}`;

  // Testo Corpo Email Formale
  const emailBody = `Gentili,\n\nin allegato trasmetto il prospetto aggiornato dell'Agenda di Direzione per il periodo:\n${startFormatted} - ${endFormatted}.\n\nÈ inoltre possibile consultare l'agenda in tempo reale da smartphone al seguente indirizzo:\n${mobileLink}\n\nResto a disposizione per qualsiasi chiarimento.\n\nCordiali saluti,\nSegreteria di Direzione`;

  // Testo per WhatsApp Web
  const waMessage = `📅 *AGENDA SEGRETERIA DI DIREZIONE*\n🗓️ Periodo: *${startFormatted}* - *${endFormatted}*\n\nIn allegato il prospetto ufficiale in PDF.\n\n🔗 *Consultazione rapida da smartphone:*\n${mobileLink}\n\n_Segreteria di Direzione_`;

  // Testo per SMS rapido
  const smsMessage = `Agenda Direzione aggiornata (${startFormatted} - ${endFormatted}). Consulta gli impegni su: ${mobileLink}`;

  const copyToClipboard = (text: string, type: 'email' | 'wa' | 'sms' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleOpenMailto = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleOpenWhatsApp = () => {
    const waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, '_blank');
  };

  const handleDownloadPdf = () => {
    onTriggerPrint();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center font-bold">
              <Share2 size={19} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Condivisione Agenda Fine Serata</h2>
              <p className="text-xs text-slate-300">
                Periodo: {startFormatted} - {endFormatted} ({appointments.length} appuntamenti, {dailyNotes.length} note)
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

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* STEP 1: PDF DA SCARICARE */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 mt-0.5">
                <FileDown size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. Genera / Salva il PDF dell'Agenda</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Scarica il foglio A4 pronto da allegare alle email o alle chat.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition shrink-0 cursor-pointer"
            >
              <Printer size={15} /> Scarica / Stampa PDF
            </button>
          </div>

          {/* STEP 2: CANALI DI INVIO DA PC */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-800">2. Scegli il Canale di Invio dal PC</h3>
            </div>

            {/* Tab Selector */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200">
              <button
                onClick={() => setActiveTab('email')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'email'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail size={15} /> Email Aziendale
              </button>
              <button
                onClick={() => setActiveTab('whatsapp')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'whatsapp'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare size={15} /> WhatsApp Web
              </button>
              <button
                onClick={() => setActiveTab('sms')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'sms'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone size={15} /> SMS Rapido
              </button>
            </div>

            {/* TAB CONTENT: EMAIL */}
            {activeTab === 'email' && (
              <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Oggetto Suggerito
                  </label>
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 select-all">
                    {emailSubject}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Testo del Messaggio
                  </label>
                  <textarea
                    readOnly
                    rows={6}
                    value={emailBody}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed font-sans resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Info size={14} className="text-blue-500 shrink-0" />
                    <span>Trascina il PDF scaricato dentro la mail prima di inviare.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(emailBody, 'email')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedType === 'email' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {copiedType === 'email' ? 'Copiato!' : 'Copia Testo'}
                    </button>
                    <button
                      onClick={handleOpenMailto}
                      className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Mail size={14} /> Apri Outlook / Mail
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: WHATSAPP */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Messaggio WhatsApp Formattato
                  </label>
                  <textarea
                    readOnly
                    rows={6}
                    value={waMessage}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-lg text-xs text-slate-800 leading-relaxed font-sans resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Info size={14} className="text-emerald-600 shrink-0" />
                    <span>Apri WhatsApp Web e trascina il file PDF direttamente nella chat.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(waMessage, 'wa')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedType === 'wa' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {copiedType === 'wa' ? 'Copiato!' : 'Copia Messaggio'}
                    </button>
                    <button
                      onClick={handleOpenWhatsApp}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <MessageSquare size={14} /> Apri WhatsApp Web
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SMS */}
            {activeTab === 'sms' && (
              <div className="space-y-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
                <div>
                  <label className="block text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
                    Testo Sintetico per SMS
                  </label>
                  <textarea
                    readOnly
                    rows={3}
                    value={smsMessage}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs text-slate-800 leading-relaxed font-sans resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => copyToClipboard(smsMessage, 'sms')}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    {copiedType === 'sms' ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                    {copiedType === 'sms' ? 'Copiato negli Appunti!' : 'Copia Testo SMS'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: LINK DIRETTO SMARTPHONE */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Link Consultazione Mobile:</span>
              <span className="text-xs text-slate-500 underline truncate max-w-[280px] sm:max-w-none">
                {mobileLink}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(mobileLink, 'link')}
              className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-white text-xs font-semibold text-slate-700 flex items-center gap-1 transition cursor-pointer shrink-0"
            >
              {copiedType === 'link' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copiedType === 'link' ? 'Copiato!' : 'Copia Link'}
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};
