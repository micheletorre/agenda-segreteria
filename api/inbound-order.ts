import { createClient } from '@supabase/supabase-js';

const PORTINERIA_SUPABASE_URL = 'https://wijtpuytlgrwcvbsocsf.supabase.co';
const PORTINERIA_SUPABASE_KEY = 'sb_publishable_IphdlkA75YZxr__nHwX1eQ_HFGQluyu';
const CLOUD_KEY_ORDINI = '__ordini_in_arrivo__';
const CLOUD_KEY_REGOLE = '__regole_reparti_ordini__';

interface ParsedOrderResult {
  supplier: string;
  orderNumber?: string;
  trackingNumber?: string;
  itemsSummary: string;
  expectedDate?: string;
  status: 'ORDINATO' | 'IN_TRANSITO' | 'IN_CONSEGNA_OGGI' | 'ARRIVATO_PORTINERIA';
  suggestedDepartment?: string;
}

function detectCompanyFromEmail(
  toHeader: string = '',
  subject: string = '',
  body: string = '',
  labels: string[] = []
): string {
  const labelsLower = (Array.isArray(labels) ? labels : []).map((l) => String(l).toLowerCase());
  if (labelsLower.some((l) => l.includes('plutarco'))) {
    return 'Plutarco';
  }
  if (labelsLower.some((l) => l.includes('edilizia veggis monte citorio'))) {
    return 'Edilizia Veggis Monte Citorio';
  }

  const combined = `${toHeader} ${subject}`.toLowerCase();
  if (combined.includes('+plutarco') || combined.includes('plutarco')) {
    return 'Plutarco';
  }
  if (combined.includes('+veggis') && combined.includes('montecitorio')) {
    return 'Edilizia Veggis Monte Citorio';
  }
  if (combined.includes('+veggis') || combined.includes('edilizia veggis')) {
    return 'Edilizia Veggis';
  }
  if (combined.includes('+montecitorio') || combined.includes('monte citorio')) {
    return 'Monte Citorio';
  }
  if (combined.includes('+proprieta') || combined.includes('proprietà')) {
    return 'Proprietà';
  }
  if (body.toLowerCase().includes('plutarco')) {
    return 'Plutarco';
  }
  if (body.toLowerCase().includes('edilizia veggis')) {
    return 'Edilizia Veggis Monte Citorio';
  }
  return 'Edilizia Veggis Monte Citorio';
}

function heuristicParseEmail(subject: string, body: string): ParsedOrderResult {
  const fullRaw = `${subject}\n${body}`;
  const text = fullRaw.toLowerCase();

  let supplier = 'Altro';
  if (text.includes('amazon')) supplier = 'Amazon';
  else if (text.includes('maury')) supplier = "Maury's";
  else if (text.includes('buffetti')) supplier = 'Buffetti';
  else if (text.includes('leroy merlin')) supplier = 'Leroy Merlin';
  else if (text.includes('brt') || text.includes('bartolini')) supplier = 'BRT';
  else if (text.includes('gls')) supplier = 'GLS';
  else if (text.includes('dhl')) supplier = 'DHL';

  // Numero ordine: formato Amazon 123-1234567-1234567 oppure #codice con almeno una cifra
  const amazonOrderMatch = fullRaw.match(/\b(\d{3}-\d{7}-\d{7})\b/);
  const genericOrderMatch = fullRaw.match(/(?:#|(?:ordine|order)\s*(?:n\.?|nr\.?|num\.?|#)\s*:?\s*)([A-Z0-9-]{5,24})/i);
  let orderNumber = amazonOrderMatch ? amazonOrderMatch[1] : genericOrderMatch ? genericOrderMatch[1] : undefined;
  if (orderNumber && !/\d/.test(orderNumber)) orderNumber = undefined;

  // Tracking: esplicito "Tracking: ...", "Lettera di vettura: ...", oppure codici corriere IT... / BRT... / GLS...
  const explicitTrackingMatch = fullRaw.match(/(?:tracking(?:\s*(?:id|number|codice))?|lettera\s+di\s+vettura|codice\s+spedizione|ldv)\s*:?\s*#?\s*([A-Z0-9-]{6,32})/i);
  const carrierTrackingMatch = fullRaw.match(/\b(IT\d{8,}[A-Z0-9]*|BRT[A-Z0-9]{6,}|GLS[A-Z0-9]{6,})\b/i);
  let trackingNumber = explicitTrackingMatch
    ? explicitTrackingMatch[1]
    : carrierTrackingMatch
    ? carrierTrackingMatch[1]
    : undefined;
  if (trackingNumber && !/\d/.test(trackingNumber)) trackingNumber = undefined;

  let status: ParsedOrderResult['status'] = 'ORDINATO';
  if (text.includes('consegnato')) status = 'ARRIVATO_PORTINERIA';
  else if (text.includes('in consegna oggi') || text.includes('arriverà oggi') || text.includes('prevista oggi')) {
    status = 'IN_CONSEGNA_OGGI';
  } else if (text.includes('spedito') || text.includes('in transito')) {
    status = 'IN_TRANSITO';
  }

  let suggestedDepartment: string | undefined;
  if (text.includes('toner') || text.includes('carta a4') || text.includes('raccoglitor')) {
    suggestedDepartment = 'Amministrazione';
  } else if (text.includes('detergente') || text.includes('panni') || text.includes('candeggina') || text.includes('sapone')) {
    suggestedDepartment = 'Pulizie';
  } else if (text.includes('trapano') || text.includes('viti') || text.includes('silicone') || text.includes('lampadin') || text.includes('presa')) {
    suggestedDepartment = 'Manutenzione / Veggis';
  }

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  let expectedDate: string | undefined = status === 'IN_CONSEGNA_OGGI' ? todayIso : undefined;
  if (!expectedDate && text.includes('domani')) {
    const tom = new Date(now);
    tom.setDate(tom.getDate() + 1);
    expectedDate = tom.toISOString().slice(0, 10);
  }

  // Estrae gli articoli dal corpo pulendo URL, tracking, header di inoltro e firme
  const cleanBodyLines = body
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/^[>\s*•]+/, '').replace(/https?:\/\/\S+/gi, '').trim())
    .filter((l) => {
      if (!l || l.length < 3) return false;
      const low = l.toLowerCase();
      if (low.startsWith('---------- forwarded') || low.startsWith('da:') || low.startsWith('from:')) return false;
      if (low.startsWith('date:') || low.startsWith('subject:') || low.startsWith('oggetto:') || low.startsWith('to:') || low.startsWith('a:')) return false;
      if (low.startsWith('inviato da') || low.startsWith('sent from') || low.startsWith('--')) return false;
      if (low.startsWith('visualizza') || low.startsWith('segui il tuo pacco') || low.startsWith('hai bisogno di aiuto')) return false;
      return true;
    })
    .map((l) =>
      l
        .replace(/(?:tracking(?:\s*(?:id|number|codice))?|lettera\s+di\s+vettura)\s*:?\s*#?\s*[A-Z0-9-]{6,32}/gi, '')
        .replace(/in consegna oggi\s*:?/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[.,:;-]+|[.,:;-]+$/g, '')
        .trim()
    )
    .filter((l) => l.length >= 3);

  const cleanSubject = subject.replace(/^(fwd:|i:|re:)\s*/gi, '').trim();
  const itemsSummary =
    cleanBodyLines.slice(0, 4).join(' · ').slice(0, 320) ||
    cleanSubject.slice(0, 180) ||
    'Articoli da email ordine';

  return {
    supplier,
    orderNumber,
    trackingNumber,
    itemsSummary,
    expectedDate,
    status,
    suggestedDepartment,
  };
}

async function parseWithGemini(subject: string, body: string): Promise<ParsedOrderResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const prompt = `Analizza questa email di conferma ordine o spedizione e restituisci SOLO un JSON valido con questi campi:
- supplier: nome fornitore (es. "Amazon", "Maury's", "Buffetti", "Leroy Merlin", "BRT", ecc.)
- orderNumber: numero ordine se presente (stringa o null)
- trackingNumber: codice tracking se presente (stringa o null)
- itemsSummary: elenco sintetico e chiaro degli articoli ordinati (es. "2x Toner HP, 3x Risme A4"). Non scrivere testi generici se gli articoli sono nel testo.
- expectedDate: data prevista consegna in formato YYYY-MM-DD (oggi è ${todayIso}; se dice "oggi" usa ${todayIso}; se non indicata usa null)
- status: uno tra "ORDINATO", "IN_TRANSITO", "IN_CONSEGNA_OGGI", "ARRIVATO_PORTINERIA"
- suggestedDepartment: proponi solo se molto chiaro uno tra "Amministrazione", "Direzione / AU", "Manutenzione / Veggis", "Pulizie", "Portineria", altrimenti null

Oggetto: ${subject}
Testo email (estratto):
${body.slice(0, 4500)}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    );

    if (!resp.ok) return null;
    const json = await resp.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;
    const parsed = JSON.parse(rawText);
    return {
      supplier: parsed.supplier || 'Altro',
      orderNumber: parsed.orderNumber || undefined,
      trackingNumber: parsed.trackingNumber || undefined,
      itemsSummary: parsed.itemsSummary || subject,
      expectedDate: parsed.expectedDate || undefined,
      status: parsed.status || 'ORDINATO',
      suggestedDepartment: parsed.suggestedDepartment || undefined,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configuredSecret = process.env.INBOUND_ORDER_SECRET;
  const providedSecret = req.headers['x-inbound-secret'] || req.body?.secret;
  if (configuredSecret && providedSecret !== configuredSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { to = '', from = '', subject = '', body = '', labels = [] } = req.body || {};
  if (!subject && !body) {
    return res.status(400).json({ error: 'Missing email subject/body' });
  }

  // Ignora email di sistema Google (avvisi di sicurezza, conferme inoltro Gmail, ecc.)
  const sysCheck = `${from} ${subject}`.toLowerCase();
  if (
    sysCheck.includes('accounts.google.com') ||
    sysCheck.includes('forwarding-noreply@google.com') ||
    sysCheck.includes('avviso di sicurezza') ||
    sysCheck.includes('security alert') ||
    sysCheck.includes('conferma inoltro gmail') ||
    sysCheck.includes('gmail forwarding confirmation')
  ) {
    return res.status(200).json({ ok: true, ignored: true, reason: 'System/Google notification email' });
  }

  const company = detectCompanyFromEmail(to, subject, body, labels);
  const aiParsed = await parseWithGemini(subject, body);
  const parsed = aiParsed || heuristicParseEmail(subject, body);

  const supabase = createClient(PORTINERIA_SUPABASE_URL, PORTINERIA_SUPABASE_KEY);

  // 1. Carica ordini esistenti e regole reparti apprese
  const [{ data: ordersRow }, { data: rulesRow }] = await Promise.all([
    supabase.from('registro_segnalazioni').select('segnalazioni').eq('data_str', CLOUD_KEY_ORDINI).maybeSingle(),
    supabase.from('registro_segnalazioni').select('segnalazioni').eq('data_str', CLOUD_KEY_REGOLE).maybeSingle(),
  ]);

  const existingOrders: any[] = Array.isArray(ordersRow?.segnalazioni) ? ordersRow.segnalazioni : [];
  const rules: { keyword: string; department: string }[] = Array.isArray(rulesRow?.segnalazioni)
    ? rulesRow.segnalazioni
    : [];

  // 2. Controlla se una regola appresa corrisponde agli articoli
  const lowerSummary = (parsed.itemsSummary || '').toLowerCase();
  const matchedRule = rules.find((r) => r.keyword && lowerSummary.includes(r.keyword.toLowerCase()));
  const finalDepartment = matchedRule?.department || parsed.suggestedDepartment;

  const nowIso = new Date().toISOString();

  // 3. Deduplica per numero ordine o tracking
  const existingIdx = existingOrders.findIndex(
    (o) =>
      (parsed.orderNumber && o.orderNumber === parsed.orderNumber) ||
      (parsed.trackingNumber && o.trackingNumber === parsed.trackingNumber)
  );

  let updatedOrders: any[];
  if (existingIdx >= 0) {
    const prev = existingOrders[existingIdx];
    const preserveFinalState = prev.status === 'ARRIVATO_PORTINERIA' || prev.status === 'CONSEGNATO';
    const merged = {
      ...prev,
      supplier: parsed.supplier || prev.supplier,
      trackingNumber: parsed.trackingNumber || prev.trackingNumber,
      itemsSummary: parsed.itemsSummary.length > (prev.itemsSummary?.length || 0) ? parsed.itemsSummary : prev.itemsSummary,
      expectedDate: parsed.expectedDate || prev.expectedDate,
      status: preserveFinalState ? prev.status : parsed.status,
      department: prev.department || finalDepartment,
      sourceEmailFrom: from || prev.sourceEmailFrom,
      sourceEmailSubject: subject || prev.sourceEmailSubject,
      updatedAt: nowIso,
    };
    updatedOrders = existingOrders.map((o, i) => (i === existingIdx ? merged : o));
  } else {
    const newOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderNumber: parsed.orderNumber,
      trackingNumber: parsed.trackingNumber,
      company,
      supplier: parsed.supplier,
      itemsSummary: parsed.itemsSummary,
      expectedDate: parsed.expectedDate,
      status: parsed.status,
      department: finalDepartment,
      sourceEmailFrom: from,
      sourceEmailSubject: subject,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    updatedOrders = [newOrder, ...existingOrders];
  }

  const { error: upsertErr } = await supabase.from('registro_segnalazioni').upsert(
    {
      data_str: CLOUD_KEY_ORDINI,
      segnalazioni: updatedOrders,
      note_generali: 'Ordini e pacchi aziendali in arrivo a Palazzo Macchi di Cellere',
      ultimo_aggiornamento: nowIso,
    },
    { onConflict: 'data_str' }
  );

  if (upsertErr) {
    return res.status(500).json({ error: upsertErr.message });
  }

  return res.status(200).json({
    ok: true,
    company,
    supplier: parsed.supplier,
    orderNumber: parsed.orderNumber,
    department: finalDepartment || 'Da assegnare',
    status: parsed.status,
  });
}
