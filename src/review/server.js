import http from 'node:http';
import { URL } from 'node:url';
import { ApplicationStore } from '../core/applicationStore.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function page(records) {
  const cards = records.map((record) => {
    const job = record.job ?? {};
    const title = record.title || job.title || 'Untitled role';
    const company = record.company || job.company || '';
    const location = record.location || job.location || '';
    const url = record.url || job.url || '#';

    return `
    <article class="card">
      <div class="top"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(company)}${location ? ` · ${escapeHtml(location)}` : ''}</p></div><strong>${escapeHtml(record.matchScore ?? 0)}%</strong></div>
      <p><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open job</a></p>
      <p>${escapeHtml(record.matchReason || 'Prepared from the collected job and profile.')}</p>
      <div class="actions">
        <form method="post" action="/applications/${encodeURIComponent(record.id)}/approve"><button class="approve">Approve</button></form>
        <form method="post" action="/applications/${encodeURIComponent(record.id)}/reject"><button class="reject">Skip</button></form>
      </div>
    </article>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Job Application Agent</title><style>body{font-family:system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 20px;background:#f6f7f9;color:#17202a}.card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:20px;margin:16px 0}.top{display:flex;justify-content:space-between;gap:20px}.top strong{font-size:24px}.actions{display:flex;gap:10px}.actions form{display:inline}button{padding:9px 18px;border:0;border-radius:8px;cursor:pointer}.approve{background:#176b3a;color:#fff}.reject{background:#eee}a{color:#0969da}p{line-height:1.5}</style></head><body><h1>Application Review</h1><p>Nothing is submitted from this screen. Approve only applications you have reviewed.</p>${cards || '<p>No prepared applications.</p>'}</body></html>`;
}

export function startReviewServer({ port = 4173, applicationsPath = './data/applications.json' } = {}) {
  const store = new ApplicationStore(applicationsPath);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (req.method === 'GET' && url.pathname === '/') {
        const records = (await store.list()).filter((record) => record.status === 'prepared');
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(page(records));
        return;
      }
      const match = url.pathname.match(/^\/applications\/([^/]+)\/(approve|reject)$/);
      if (req.method === 'POST' && match) {
        const id = decodeURIComponent(match[1]);
        const status = match[2] === 'approve' ? 'approved' : 'skipped';
        await store.updateStatus(id, status, { reviewedAt: new Date().toISOString() });
        res.writeHead(303, { location: '/' });
        res.end();
        return;
      }
      res.writeHead(404); res.end('Not found');
    } catch (error) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(error.message);
    }
  });
  server.listen(port, '127.0.0.1', () => console.log(`Review UI: http://127.0.0.1:${port}`));
  return server;
}
