import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  ShieldCheck,
  Printer,
  Copy,
  Check,
  Building2,
  ArrowRight,
  Phone,
  Share2,
  Smartphone,
  Coins,
  CheckCircle2,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { LOGO_MACCHI_DATA_URL } from '../assets/logoMacchi';

interface ProjectManualViewProps {
  onBackToAgenda: () => void;
}

export const ProjectManualView: React.FC<ProjectManualViewProps> = ({ onBackToAgenda }) => {
  const [copiato, setCopiato] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopiaTesto = async () => {
    try {
      const resp = await fetch('/MANUALE_AGENDA_SEGRETERIA.md');
      let text = '';
      if (resp.ok) {
        text = await resp.text();
      } else {
        text = 'Dossier Funzionale Agenda di Direzione — Palazzo Macchi di Cellere';
      }
      await navigator.clipboard.writeText(text);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    } catch {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 p-3 sm:p-6 lg:p-8 font-sans print:bg-white print:p-0">
      {/* REGOLE DI STAMPA A4 VERTICALE (PORTRAIT) CON CARD A BLOCCO PROTETTO */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 10mm 12mm !important;
          }
          html, body, #root, .min-h-screen {
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Montserrat', system-ui, -apple-system, sans-serif !important;
          }
          .project-manual-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 14px !important;
            box-shadow: none !important;
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-5">
        
        {/* BARRA SUPERIORE AZIONI (NON STAMPABILE) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
              Dossier Direzionale • Palazzo Macchi di Cellere
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToAgenda}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              Torna all'Agenda
            </button>
            <button
              type="button"
              onClick={handleCopiaTesto}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              {copiato ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiato ? 'Copiato!' : 'Copia Testo'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs whitespace-nowrap"
              title="Esporta in PDF o Stampa in formato A4 Verticale"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Salva PDF / Stampa A4</span>
            </button>
          </div>
        </div>

        {/* INTESTAZIONE UFFICIALE CON STEMMA DEL PALAZZO */}
        <div className="project-manual-card bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 border-b border-slate-200 pb-6 text-center sm:text-left">
            <img
              src={LOGO_MACCHI_DATA_URL}
              alt="Stemma Palazzo Macchi di Cellere"
              className="w-18 h-18 sm:w-20 sm:h-20 object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-black uppercase tracking-widest text-amber-700 mb-0.5">
                Palazzo Macchi di Cellere — Roma
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                Sistema Digitale per l'Agenda di Direzione &amp; Coordinamento Presidio
              </h1>
              <div className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                Dossier di Presentazione Funzionale &amp; Sostenibilità Economica per la Proprietà e l'Amministrazione
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-[11px]">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Progettazione:</span>
              <span className="font-bold text-slate-800">Michele Torre</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Ambito:</span>
              <span className="font-bold text-slate-800">Direzione &amp; Segreteria</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Integrazione:</span>
              <span className="font-bold text-slate-800">Portineria 24/7</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Costo Aggiuntivo:</span>
              <span className="font-bold text-emerald-700">€ 0,00 / mese</span>
            </div>
          </div>
        </div>

        {/* 1. SINTESI ESECUTIVA (PER LA PROPRIETÀ) */}
        <div className="project-manual-card bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>1. Sintesi Esecutiva per la Proprietà</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Precisione, Riservatezza e Sincronizzazione in Tempo Reale
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            La gestione degli impegni di Direzione di uno stabile storico di alto rango richiede che ogni informazione sia 
            sempre allineata e priva di fraintendimenti. Il nuovo sistema digitale supera l'uso di agende cartacee e fogli volanti, 
            garantendo tre pilastri operativi:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Allineamento Immediato</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Ogni appuntamento inserito dalla segreteria si aggiorna all'istante sullo smartphone dell'Amministratore e sulle altre postazioni.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Foglio Portineria con Firme</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Genera il modulo giornaliero per i varchi, ordinato per orario e con i custodi in servizio già precompilati per la firma.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Riservatezza &amp; Discrezione</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-normal">
                Tecnici e fornitori vanno sul foglio custodi senza sporcare l'agenda personale dell'Amministrazione (*Solo Portineria*).
              </p>
            </div>
          </div>
        </div>

        {/* 2. INDICE RAPIDO DELLE FUNZIONALITÀ */}
        <div className="project-manual-card bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-slate-600" />
            <span>2. I Moduli Chiave in Sintesi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">1. Agenda Perpetua &amp; Drag &amp; Drop</strong>
                Spostamento rapido degli impegni tra i giorni trascinandoli col mouse.
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <Building2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">2. Simbologia Sede vs Uscite</strong>
                Palazzo (🏢) per incontri interni; Palazzo con freccia (🏢➔) per uscite.
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">3. Foglio Presidio Portineria A4</strong>
                Ordinamento orario matematico e custodi di turno pronti per la firma.
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <EyeOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">4. Filtro "Solo Portineria"</strong>
                Passaggi ditte visibili ai custodi ma nascosti dall'agenda direzionale.
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">5. Archivio Conclusi</strong>
                Pulizia visiva con 1 tocco e conservazione dello storico Cloud.
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">6. Rubrica Anagrafica Centralizzata</strong>
                Rubrica condivisa con autocompilazione rapida dei contatti.
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <Share2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">7. Condividi Sera &amp; Calendari</strong>
                Email e WhatsApp formali a fine giornata in un clic, più file iCal / Google.
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 block font-bold">8. Consultazione Mobile &amp; PIN</strong>
                Sola lettura protetta da smartphone con sblocco a PIN riservato (1967).
              </div>
            </div>
          </div>
        </div>

        {/* 3. DESCRIZIONE FUNZIONALE ESSENZIALE */}
        <div className="project-manual-card bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-slate-700" />
            <span>3. Dettaglio Operativo dei Moduli</span>
          </div>

          {/* Dettaglio 1: Simbologia */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Simbologia Istituzionale Sede vs Uscite</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              La Direzione riconosce il tipo di impegno a colpo d'occhio senza dover leggere la scheda:
            </p>
            <div className="flex flex-wrap gap-2 text-xs pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">
                <Building2 className="w-3.5 h-3.5 text-red-600" />
                <span>In Sede (AU Riceve nel Palazzo)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 font-bold border border-amber-300">
                <Building2 className="w-3.5 h-3.5 text-amber-900" />
                <ArrowRight className="w-3 h-3 text-amber-900 stroke-[3]" />
                <span>Uscita (Visita / Sopralluogo Esterno)</span>
              </span>
            </div>
          </div>

          {/* Dettaglio 2: Foglio Portineria */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>Foglio Portineria A4 &amp; Riservatezza "Solo Portineria"</span>
              <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Sincronizzato 24/7
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Il sistema interroga in tempo reale l'app dei turni portineria. Quando la segreteria stampa il foglio accessi A4:
            </p>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>Tutti gli arrivi del giorno vengono <strong>ordinati in sequenza oraria automatica</strong>.</li>
              <li>A fondo pagina compaiono i <strong>nomi dei portieri in servizio già stampati</strong> di fianco alla riga per la firma per visione.</li>
              <li>Le voci contrassegnate come <em>"Solo Portineria"</em> vengono stampate per i custodi ma <strong>restano nascoste dall'agenda della Direzione</strong>.</li>
            </ul>
          </div>

          {/* Dettaglio 3: Mobile & Notifiche */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-900">
              Consultazione da Smartphone &amp; Condivisione Serale
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Su smartphone l'agenda è concepita in <strong>sola lettura nativa</strong> per azzerare il rischio di cancellazioni accidentali. 
              In caso di urgenza fuori ufficio, digitando il PIN <strong>1967</strong> l'Amministratore sblocca le modifiche. 
              La funzione <em>"Condividi Sera"</em> prepara in automatico i testi ufficiali per Email o WhatsApp per comunicare alla Direzione il programma dell'indomani.
            </p>
          </div>
        </div>

        {/* 4. SOSTENIBILITÀ ECONOMICA & VALORE PER LA PROPRIETÀ */}
        <div className="project-manual-card bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider">
            <Coins className="w-4 h-4" />
            <span>4. Sostenibilità Economica &amp; Valore per la Proprietà</span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5">
            <div className="text-sm font-black text-emerald-950 flex items-center justify-between">
              <span>Costo Aggiuntivo di Esercizio per la Proprietà:</span>
              <span className="text-base text-emerald-700 font-black">€ 0,00</span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              L'Agenda opera sulle <strong>stesse postazioni personal computer già in uso</strong> dalla segreteria e condivide la 
              <strong>medesima infrastruttura Cloud a canone zero (€ 0/mese)</strong> già attivata per la Portineria. Anche il profilo AI 
              per lo sviluppo e l'aggiornamento del codice (modulabile senza vincoli a € 21,99/mese) è unificato per entrambi gli applicativi.
            </p>
          </div>

          {/* Tabella di Confronto */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <tr>
                  <th className="p-2.5">Parametro</th>
                  <th className="p-2.5 text-slate-500">Software Commerciale Esterno</th>
                  <th className="p-2.5 text-emerald-800 bg-emerald-50/60 font-black">Soluzione Palazzo Macchi di Cellere</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-2.5 font-semibold text-slate-800">Costo di Sviluppo Iniziale</td>
                  <td className="p-2.5">€ 3.500 – € 5.500 una tantum</td>
                  <td className="p-2.5 font-bold text-emerald-700 bg-emerald-50/30">€ 0,00 (Sviluppato internamente)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-800">Canone di Licenza Annuo</td>
                  <td className="p-2.5">€ 400 – € 900 / anno</td>
                  <td className="p-2.5 font-bold text-emerald-700 bg-emerald-50/30">€ 0,00 / anno</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-800">Integrazione Turni Portineria</td>
                  <td className="p-2.5">Non disponibile</td>
                  <td className="p-2.5 font-bold text-slate-900 bg-emerald-50/30">Nativa in tempo reale</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-800">Filtro Riservatezza "Solo Portineria"</td>
                  <td className="p-2.5">Non previsto</td>
                  <td className="p-2.5 font-bold text-slate-900 bg-emerald-50/30">Incluso nativamente</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-800">Stampa A4 Istituzionale Montserrat</td>
                  <td className="p-2.5">Layout grezzi standard</td>
                  <td className="p-2.5 font-bold text-slate-900 bg-emerald-50/30">Impaginazione tipografica ufficiale</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Risparmi Reali */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-900 block">Risparmio Cancelleria</span>
              <p className="text-slate-600 text-[11px]">
                Eliminazione di agende rilegate e blocchetti: circa <strong>€ 250 – € 350 / anno</strong> risparmiati.
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-900 block">Tempo di Segreteria</span>
              <p className="text-slate-600 text-[11px]">
                Oltre <strong>100 ore lavorative/anno</strong> liberate per altre mansioni amministrative dello stabile.
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-900 block">Prestigio dell'Immobile</span>
              <p className="text-slate-600 text-[11px]">
                Modulistica ufficiale impeccabile per ospiti, studi legali, banche e visitatori del Palazzo.
              </p>
            </div>
          </div>
        </div>

        {/* PIÈ DI PAGINA FORMALE */}
        <div className="text-center text-[10px] sm:text-xs text-slate-600 font-medium pb-8 border-t border-slate-200 pt-4">
          Palazzo Macchi di Cellere — Roma • Dossier Ufficiale di Progetto • Novembre 2026 • Progettazione: Michele Torre
        </div>

      </div>
    </div>
  );
};
