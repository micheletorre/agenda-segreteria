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

type GeminiParseOutcome =
  | { kind: 'order'; result: ParsedOrderResult }
  | { kind: 'ignore'; reason: string }
  | null;

function getPreFilterIgnoreReason(from: string, subject: string, body: string): string | null {
  const fromLow = from.toLowerCase();
  const subjLow = subject.toLowerCase();
  const sysCheck = `${fromLow} ${subjLow}`;
  const fullLow = `${fromLow}\n${subjLow}\n${body.slice(0, 4000).toLowerCase()}`;

  // 1. Notifiche di sistema Google / Apps Script / bounce email
  if (
    sysCheck.includes('accounts.google.com') ||
    sysCheck.includes('forwarding-noreply@google.com') ||
    sysCheck.includes('noreply-apps-scripts-notifications@google.com') ||
    sysCheck.includes('summary of failures for google apps script') ||
    sysCheck.includes('avviso di sicurezza') ||
    sysCheck.includes('security alert') ||
    sysCheck.includes('conferma inoltro gmail') ||
    sysCheck.includes('gmail forwarding confirmation') ||
    sysCheck.includes('mailer-daemon') ||
    sysCheck.includes('postmaster@')
  ) {
    return 'System/Google/Apps Script notification email';
  }

  // 2. Richieste da moduli contatti / sito web
  if (
    subjLow.includes('nuova richiesta da sito web') ||
    subjLow.includes('nuovo messaggio dal sito') ||
    subjLow.includes('richiesta informazioni') ||
    subjLow.includes('modulo di contatto')
  ) {
    return 'Website contact form notification';
  }

  const hasPhysicalParcelSignal =
    /\b(tracking|corriere|lettera di vettura|ldv|ritiro pacco|pacco in arrivo|in consegna oggi|consegna prevista|brt|bartolini|gls|dhl|sda|ups|fedex)\b/i.test(
      fullLow
    );

  // 3. Scontrini o acquisti già ritirati di persona in negozio (senza spedizione)
  if (
    (fullLow.includes('acquisto effettuato nel negozio') ||
      fullLow.includes('scontrino digitale') ||
      fullLow.includes('ricevuta di acquisto in negozio')) &&
    !hasPhysicalParcelSignal
  ) {
    return 'In-store purchase receipt without delivery';
  }

  // 4. Viaggi, hotel, newsletter promo senza spedizione fisica
  if (
    (fromLow.includes('booking.com') ||
      fromLow.includes('airbnb') ||
      fromLow.includes('expedia') ||
      fromLow.includes('trivago') ||
      fromLow.includes('ryanair') ||
      fromLow.includes('trenitalia') ||
      fromLow.includes('italo') ||
      subjLow.includes('risparmiare fino al')) &&
    !hasPhysicalParcelSignal
  ) {
    return 'Travel/promo newsletter without physical shipment';
  }

  // 5. Gestori telefonici, energia, utenze, banche, assicurazioni (bollette/fatture/avvisi senza spedizione pacco)
  const isUtilityOrBankSender =
    /\b(tim|vodafone|windtre|wind|fastweb|iliad|postemobile|tiscali|enel|eni\s*plenitude|plenitude|a2a|acea|iren|hera|edison|sorgenia|engie|e\.on|intesa\s*sanpaolo|unicredit|fineco|banca|american\s*express|nexi|agenzia\s*delle\s*entrate|inps|telepass|unipol|generali|allianz)\b/i.test(
      `${fromLow} ${subjLow}`
    );
  const hasUtilityOrBillingTerm =
    /\b(bolletta|fattura|estratto conto|domiciliazione|sepa|rid\b|utenza|fornitura|offerta|tariffa|piano tariffario|credito residuo|ricarica|scadenza|pagamento|addebito|rinnovo|polizza|sinistro)\b/i.test(
      fullLow
    );

  if (isUtilityOrBankSender && hasUtilityOrBillingTerm && !hasPhysicalParcelSignal) {
    return 'Utility/telecom/bank billing or service email without physical package';
  }

  return null;
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

function heuristicParseEmail(subject: string, body: string, from: string = ''): ParsedOrderResult | null {
  const fullRaw = `${subject}\n${body}`;
  const text = fullRaw.toLowerCase();
  const hasOrderOrShippingSignal =
    /\b(ordine|order|spedizione|spedito|in consegna|consegna prevista|pacco|corriere|tracking|lettera di vettura|ritiro|brt|bartolini|gls|dhl|sda|ups|fedex|amazon|buffetti|maury|leroy merlin)\b/i.test(
      `${from} ${fullRaw}`
    );
  if (!hasOrderOrShippingSignal) {
    return null;
  }

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

  // Estrae gli articoli dal corpo pulendo URL, [image:...], tracking, header di inoltro e firme
  const cleanBodyLines = body
    .replace(/\r/g, '')
    .split('\n')
    .map((l) =>
      l
        .replace(/\[image:[^\]]*\]/gi, '')
        .replace(/^[>\s*•]+/, '')
        .replace(/https?:\/\/\S+/gi, '')
        .trim()
    )
    .filter((l) => {
      if (!l || l.length < 3) return false;
      const low = l.toLowerCase();
      if (low.startsWith('---------- forwarded') || low.startsWith('da:') || low.startsWith('from:')) return false;
      if (low.startsWith('date:') || low.startsWith('subject:') || low.startsWith('oggetto:') || low.startsWith('to:') || low.startsWith('a:')) return false;
      if (low.startsWith('inviato da') || low.startsWith('sent from') || low.startsWith('--')) return false;
      if (low.startsWith('visualizza') || low.startsWith('segui il tuo pacco') || low.startsWith('hai bisogno di aiuto')) return false;
      if (low.startsWith('i tuoi ordini') || low.includes('offerte fantastiche') || low.includes('black friday')) return false;
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

async function parseWithGemini(
  subject: string,
  body: string,
  from: string = ''
): Promise<GeminiParseOutcome> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const prompt = `Sei un filtro e parser per le email in arrivo alla portineria di un palazzo aziendale (consegna pacchi e ordini merce).
Prima classifica se questa email riguarda davvero un ORDINE DI MERCE FISICA, una SPEDIZIONE o un PACCO IN ARRIVO tramite corriere/fornitore.

Imposta "isOrderOrPackage": false se l'email è invece:
- una bolletta, fattura utenze, avviso o comunicazione da gestori telefonici, luce, gas, acqua, internet, banche, assicurazioni (es. TIM, Vodafone, WindTre, Fastweb, Enel, Eni, Acea, A2A, banche) che NON riguarda la spedizione fisica di un pacco;
- una newsletter, email promozionale/pubblicitaria, offerta sconti (es. Booking.com, Black Friday, pubblicità);
- una notifica di sistema, avviso Google, report errori Apps Script;
- una richiesta informazioni da sito web / modulo contatti;
- una ricevuta/scontrino di acquisto già ritirato di persona in negozio senza consegna prevista;
- qualsiasi altra email che NON comporta la consegna o l'arrivo di un pacco in portineria.

Restituisci SOLO un JSON valido con questi campi:
- isOrderOrPackage: boolean
- ignoreReason: stringa breve se isOrderOrPackage è false, altrimenti null
- supplier: nome fornitore (es. "Amazon", "Maury's", "Buffetti", "Leroy Merlin", "BRT", ecc.)
- orderNumber: numero ordine se presente (stringa o null)
- trackingNumber: codice tracking se presente (stringa o null)
- itemsSummary: elenco completo, sintetico e chiaro di TUTTI gli articoli ordinati con il nome intero del prodotto (non usare la riga di anteprima troncata con "..." se il nome completo è nel corpo dell'email).
- expectedDate: data prevista consegna in formato YYYY-MM-DD (oggi è ${todayIso}; se dice "oggi" usa ${todayIso}; se non indicata usa null)
- status: uno tra "ORDINATO", "IN_TRANSITO", "IN_CONSEGNA_OGGI", "ARRIVATO_PORTINERIA"
- suggestedDepartment: proponi solo se molto chiaro uno tra "Amministrazione", "Direzione / AU", "Manutenzione / Veggis", "Pulizie", "Portineria", altrimenti null

Mittente: ${from}
Oggetto: ${subject}
Testo email (estratto):
${body.slice(0, 9000)}`;

  const models = ['gemini-3.8-flash', 'gemini-3-flash-preview'];
  for (const model of models) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

      if (!resp.ok) continue;
      const json = await resp.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;
      const parsed = JSON.parse(rawText);
      if (parsed.isOrderOrPackage === false) {
        return {
          kind: 'ignore',
          reason: parsed.ignoreReason || 'Not an order or physical package email (AI)',
        };
      }
      return {
        kind: 'order',
        result: {
          supplier: parsed.supplier || 'Altro',
          orderNumber: parsed.orderNumber || undefined,
          trackingNumber: parsed.trackingNumber || undefined,
          itemsSummary: parsed.itemsSummary || subject,
          expectedDate: parsed.expectedDate || undefined,
          status: parsed.status || 'ORDINATO',
          suggestedDepartment: parsed.suggestedDepartment || undefined,
        },
      };
    } catch {
      continue;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(200).json({ ok: true, hasGeminiKey: false });
    }
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Rispondi solo OK' }] }] }),
        }
      );
      const data = await r.json().catch(() => null);
      return res.status(200).json({
        ok: true,
        hasGeminiKey: true,
        geminiStatus: r.status,
        geminiError: r.ok ? null : data?.error?.message || 'Error',
      });
    } catch (e: any) {
      return res.status(200).json({ ok: true, hasGeminiKey: true, geminiError: e?.message || 'Fetch error' });
    }
  }

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

  const stripInvisible = (s: string) =>
    String(s || '')
      .replace(/[\u034f\u200b-\u200f\u00ad\ufeff\u2060\u180e]/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

  const cleanSubject = stripInvisible(subject);
  const cleanBody = stripInvisible(body);

  // Ignora email di sistema, gestori telefonici/energia/utenze, newsletter promo, richieste sito web o scontrini in negozio
  const preFilterReason = getPreFilterIgnoreReason(from, cleanSubject, cleanBody);
  if (preFilterReason) {
    return res.status(200).json({ ok: true, ignored: true, reason: preFilterReason });
  }

  const company = detectCompanyFromEmail(to, cleanSubject, cleanBody, labels);
  const aiOutcome = await parseWithGemini(cleanSubject, cleanBody, from);
  if (aiOutcome?.kind === 'ignore') {
    return res.status(200).json({ ok: true, ignored: true, reason: aiOutcome.reason });
  }

  const parsed = aiOutcome?.kind === 'order'
    ? aiOutcome.result
    : heuristicParseEmail(cleanSubject, cleanBody, from);

  if (!parsed) {
    return res.status(200).json({ ok: true, ignored: true, reason: 'No order or shipping signal detected' });
  }

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
