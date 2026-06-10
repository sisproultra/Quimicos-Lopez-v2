import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extraer url del query string de múltiples formas por seguridad
  const targetUrl = (
    req.query?.url ||
    (req.url && new URL(req.url, 'http://localhost').searchParams.get('url'))
  ) as string | undefined;

  console.log('[Proxy] targetUrl recibida:', targetUrl);
  console.log('[Proxy] req.query:', req.query);
  console.log('[Proxy] req.url:', req.url);

  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('https://')) {
    return res.status(400).json({ 
      error: 'URL destino inválida o faltante',
      received: targetUrl,
      query: req.query
    });
  }

  const allowedHosts = ['visioner7-api.com', 'visioner7.com'];
  if (!allowedHosts.some(host => targetUrl.includes(host))) {
    return res.status(403).json({ error: 'Dominio no autorizado', url: targetUrl });
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
    console.log(`[Proxy] Visioner7 respondió HTTP ${response.status}`);
    
    res.status(response.status)
       .setHeader('Content-Type', contentType)
       .send(data);
  } catch (error: any) {
    console.error('[Proxy] Error:', error.message);
    res.status(500).json({ 
      error: 'Error conectando con Visioner7', 
      details: error.message 
    });
  }
}
