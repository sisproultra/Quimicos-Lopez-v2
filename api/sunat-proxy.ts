import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extraer url del query string de forma segura
  let targetUrl: string | undefined;

  if (req.query?.url) {
    targetUrl = Array.isArray(req.query.url) 
      ? req.query.url[0] 
      : String(req.query.url);
  } else if (req.url) {
    const match = req.url.match(/[?&]url=([^&]+)/);
    if (match) targetUrl = decodeURIComponent(match[1]);
  }

  if (!targetUrl || !targetUrl.startsWith('https://')) {
    return res.status(400).json({ 
      error: 'URL destino inválida o faltante',
      received: targetUrl ?? 'undefined',
      query: req.query,
      reqUrl: req.url
    });
  }

  const allowedHosts = ['visioner7-api.com', 'visioner7.com'];
  if (!allowedHosts.some(host => targetUrl!.includes(host))) {
    return res.status(403).json({ error: 'Dominio no autorizado' });
  }

  const token = process.env.VISIONER7_API_TOKEN;
  if (!token?.trim()) {
    return res.status(500).json({ error: 'VISIONER7_API_TOKEN no configurado en Vercel' });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token.trim()}`,
      },
      body: JSON.stringify(req.body),
    });

    const contentType = response.headers.get('content-type') || 'application/json';
    const data = await response.text();
    console.log(`[Proxy] Visioner7 HTTP ${response.status} → ${targetUrl}`);
    res.status(response.status).setHeader('Content-Type', contentType).send(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Error conectando con Visioner7', details: error.message });
  }
}