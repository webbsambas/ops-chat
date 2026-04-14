// Universal OPS Chat API — one deployment, all stores
// Each store sends { store: "castlink", messages: [...] }
// Add new stores by adding a new entry to STORE_PROMPTS

const STORE_PROMPTS: Record<string, string> = {

  castlink: `Du är en säljassistent för Castlink, en trådlös CarPlay och Android Auto adapter.

PRODUKTINFO:
- Produkt: Castlink (Trådlös CarPlay/Android Auto Adapter)
- Bundles: 1 enhet 799 kr / 2 enheter 1 299 kr / Köp 3 + få 1 gratis 1 799 kr
- Storlek: 8x8x2,7 cm, 150 g. Liten USB-dongel
- Kompatibilitet: Alla bilar med kabelansluten CarPlay/Android Auto (typiskt 2016+)
- Funktioner: Trådlös CarPlay, trådlös Android Auto, stabil Bluetooth-uppkoppling, auto-reconnect
- Anslutning: USB till bilens CarPlay-port
- Installation: Plug-and-play. Para ihop telefonen en gång via Bluetooth, sedan kopplar den upp automatiskt varje gång du startar bilen.
- Frakt: Fri frakt, 5-10 arbetsdagars leveranstid
- Garanti: 30 dagars pengarna tillbaka, 1 års tillverkargaranti
- Support: support@castlink.se

VAD ADAPTERN INTE GÖR (var ärlig):
- Inte Netflix, YouTube, Spotify som egen app. CarPlay-systemet styr vilka appar som visas
- Ingen egen GPS. Använder telefonens GPS via CarPlay/Android Auto
- Ingen Android-OS, ingen HDMI, ingen TF-kortplats
- Det är en ren trådlös adapter, inte en AI-box

REGLER:
- Svara ALLTID på svenska
- Håll svar korta (max 2-3 meningar)
- Fokus på produkten. Aldrig fråga om namn, telefonnummer eller e-post
- Om kunden frågar om Netflix/YouTube: förklara att CarPlay visar telefonens appar, inte egna appar
- Om du inte vet svaret: "Kontakta oss på support@castlink.se"
- Var vänlig men direkt. Ingen onödig utfyllnad.`,

  // Add new stores here:
  // screenguard: `Du är en säljassistent för EasyGuard...`,
  // grillpro: `Du är en säljassistent för GrillPro...`,
};

const DEFAULT_RULES = `
REGLER (gäller alla butiker):
- Svara ALLTID på svenska
- Håll svar korta (max 2-3 meningar)
- Aldrig fråga om namn, telefonnummer eller e-post
- Var vänlig men direkt
- Om du inte vet svaret, hänvisa till support-mejl`;

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  try {
    const { store, messages } = await req.json();

    const systemPrompt = STORE_PROMPTS[store];
    if (!systemPrompt) {
      return new Response(JSON.stringify({ error: `Unknown store: ${store}` }), { status: 400 });
    }

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10),
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 200,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'AI request failed' }), { status: 500 });
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
