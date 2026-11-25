import { portineriaSupabase } from './portineriaSync';
import { toISODate } from './dateUtils';

export type OrderStatus =
  | 'ORDINATO'
  | 'IN_TRANSITO'
  | 'IN_CONSEGNA_OGGI'
  | 'ARRIVATO_PORTINERIA'
  | 'CONSEGNATO';

export interface IncomingOrder {
  id: string;
  orderNumber?: string;
  trackingNumber?: string;
  company: string; // "Monte Citorio" | "Edilizia Veggis" | "Altra Azienda"
  supplier: string; // "Amazon" | "Maury's" | "Buffetti" | "Altro"
  itemsSummary: string;
  expectedDate?: string; // YYYY-MM-DD
  status: OrderStatus;
  department?: string; // "Amministrazione" | "Direzione / AU" | ...
  recipientName?: string;
  notes?: string;
  sourceEmailFrom?: string;
  sourceEmailSubject?: string;
  arrivedAt?: string;
  arrivedDate?: string;
  arrivedBy?: string;
  deliveredAt?: string;
  deliveredTo?: string;
  isUnannounced?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRule {
  id: string;
  keyword: string;
  department: string;
  company?: string;
  updatedAt: string;
}

export const CLOUD_KEY_ORDINI_IN_ARRIVO = '__ordini_in_arrivo__';
export const CLOUD_KEY_REGOLE_REPARTI = '__regole_reparti_ordini__';

export const QUICK_COMPANIES = ['Monte Citorio', 'Edilizia Veggis', 'Plutarco', 'Proprietà'] as const;

export const QUICK_SUPPLIERS = ['Amazon', "Maury's", 'Buffetti', 'Leroy Merlin', 'Altro'] as const;

export const QUICK_DEPARTMENTS = [
  'Amministrazione',
  'Direzione / AU',
  'Manutenzione / Veggis',
  'Pulizie',
  'Portineria',
  'Bonazzi',
  'Paolini',
  'Torre',
] as const;

function addDaysIso(baseDate: Date, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * Acquisti demo realistici per testare subito il flusso completo
 * (In arrivo oggi, Arrivato in portineria, Da assegnare, Prossimi giorni).
 */
export function generateDemoOrders(now: Date = new Date()): IncomingOrder[] {
  const today = toISODate(now);
  const tomorrow = addDaysIso(now, 1);
  const inTwoDays = addDaysIso(now, 2);
  const isoNow = now.toISOString();

  return [
    {
      id: 'demo-ord-1',
      orderNumber: '405-8823411-9021104',
      company: 'Monte Citorio',
      supplier: 'Amazon',
      itemsSummary: '2x Toner Brother TN-2420 nero originale + 5 risme carta A4 Navigator 80g',
      expectedDate: today,
      status: 'ARRIVATO_PORTINERIA',
      department: 'Amministrazione',
      arrivedAt: '10:45',
      arrivedDate: today,
      arrivedBy: 'De Cillia',
      notes: 'Pacco lasciato in Portineria Scala A',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo-ord-2',
      orderNumber: '408-1920441-3301982',
      company: 'Edilizia Veggis',
      supplier: 'Amazon',
      itemsSummary: 'Trapano avvitatore Bosch Professional 18V + set 15 punte muro SDS',
      expectedDate: today,
      status: 'IN_CONSEGNA_OGGI',
      department: 'Manutenzione / Veggis',
      notes: 'Corriere Amazon previsto tra le 14:00 e le 17:00',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo-ord-3',
      orderNumber: 'MRY-2026-4419',
      company: 'Monte Citorio',
      supplier: "Maury's",
      itemsSummary: '4x Taniche detergente pavimenti igienizzante 5L + 20 panni microfibra',
      expectedDate: today,
      status: 'IN_CONSEGNA_OGGI',
      department: 'Pulizie',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo-ord-4',
      orderNumber: '402-7741290-1129044',
      company: 'Monte Citorio',
      supplier: 'Amazon',
      itemsSummary: 'Cavo HDMI 4K 3 metri + Multipresa APC 6 prese protetta da sovratensioni',
      expectedDate: tomorrow,
      status: 'IN_TRANSITO',
      department: undefined, // Da assegnare per testare l'assegnazione a 1 clic!
      notes: 'Ordine inoltrato da email aziendale — reparto da confermare',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'demo-ord-5',
      orderNumber: 'BUF-99102',
      company: 'Edilizia Veggis',
      supplier: 'Buffetti',
      itemsSummary: '10x Raccoglitori dorso 8cm blu + 12 blocchi A4 quadretti con foro',
      expectedDate: inTwoDays,
      status: 'ORDINATO',
      department: 'Paolini',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];
}

export async function fetchIncomingOrders(): Promise<IncomingOrder[]> {
  try {
    const { data, error } = await portineriaSupabase
      .from('registro_segnalazioni')
      .select('segnalazioni')
      .eq('data_str', CLOUD_KEY_ORDINI_IN_ARRIVO)
      .maybeSingle();

    if (!error && data && Array.isArray(data.segnalazioni)) {
      return data.segnalazioni as IncomingOrder[];
    }
  } catch (err) {
    console.warn('Errore lettura ordini in arrivo:', err);
  }
  return [];
}

export async function saveIncomingOrders(orders: IncomingOrder[]): Promise<boolean> {
  try {
    const payload = {
      data_str: CLOUD_KEY_ORDINI_IN_ARRIVO,
      segnalazioni: orders,
      note_generali: 'Ordini e pacchi aziendali in arrivo a Palazzo Macchi di Cellere',
      ultimo_aggiornamento: new Date().toISOString(),
    };
    const { error } = await portineriaSupabase
      .from('registro_segnalazioni')
      .upsert(payload, { onConflict: 'data_str' });

    if (error) {
      console.warn('Errore salvataggio ordini in arrivo:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Errore inatteso salvataggio ordini:', err);
    return false;
  }
}

export async function fetchDepartmentRules(): Promise<DepartmentRule[]> {
  try {
    const { data, error } = await portineriaSupabase
      .from('registro_segnalazioni')
      .select('segnalazioni')
      .eq('data_str', CLOUD_KEY_REGOLE_REPARTI)
      .maybeSingle();

    if (!error && data && Array.isArray(data.segnalazioni)) {
      return data.segnalazioni as DepartmentRule[];
    }
  } catch (err) {
    console.warn('Errore lettura regole reparti:', err);
  }
  return [];
}

export async function saveDepartmentRule(itemsSummary: string, department: string, company?: string): Promise<void> {
  if (!itemsSummary.trim() || !department.trim()) return;
  // Estrae la parola chiave principale significativa (>= 4 caratteri, escludendo numeri puri)
  const stopWords = new Set(['con', 'per', 'del', 'della', 'delle', 'degli', 'nero', 'bianco', 'blu', 'set', 'pezzi', 'risme', 'cm', 'litri']);
  const words = itemsSummary
    .toLowerCase()
    .replace(/[^a-zàèéìòù0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !/^\d+$/.test(w) && !stopWords.has(w));

  const keyword = words[0];
  if (!keyword) return;

  const current = await fetchDepartmentRules();
  const filtered = current.filter((r) => r.keyword !== keyword);
  const next: DepartmentRule[] = [
    {
      id: `rule-${Date.now()}`,
      keyword,
      department,
      company,
      updatedAt: new Date().toISOString(),
    },
    ...filtered,
  ].slice(0, 100);

  try {
    await portineriaSupabase.from('registro_segnalazioni').upsert(
      {
        data_str: CLOUD_KEY_REGOLE_REPARTI,
        segnalazioni: next,
        note_generali: 'Regole apprese di assegnazione automatica reparti per ordini',
        ultimo_aggiornamento: new Date().toISOString(),
      },
      { onConflict: 'data_str' }
    );
  } catch (err) {
    console.warn('Errore salvataggio regola reparto:', err);
  }
}

/**
 * Inizializza gli ordini demo se la tabella cloud è ancora vuota.
 */
export async function ensureDemoOrdersSeeded(): Promise<IncomingOrder[]> {
  const existing = await fetchIncomingOrders();
  if (existing.length > 0) return existing;
  const demo = generateDemoOrders();
  await saveIncomingOrders(demo);
  return demo;
}
