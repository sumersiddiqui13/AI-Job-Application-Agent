import http from 'node:http';
import { URL } from 'node:url';
import { ApplicationStore } from '../core/applicationStore.js';

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function page(applications, message = '') {
  const cards = applications.map((app) => {
    const job = app.job ?? {};
    const answers = app.answers ?? app.preparedAnswers ?? {};
    const answerEntries = Array.isArray(answers)
      ? answers
      : Object.entries(answers).map(([question, answer]) => ({ question, answer }));
    const unresolved = app.unresolvedQuestions ?? [];
    const status = app.status ?? 'unknown';
    const approved = status === 'approved';

    return `<article class="card">
      <div class="head"><div><h2>${htmlEscape(job.title || 'Untitled job')}</h2><p>${htmlEscape(job.company || 'Unknown company')} · ${htmlEscape(job.location || 'Location unknown')}</p></div><span class="score">${htmlEscape(job.matchScore ?? app.matchScore ?? '—')}%</span></div>
      <p><a href="${htmlEscape(job.url || '#')}" target="_blank" rel="noreferrer">View job</a> · Status: <strong>${htmlEscape(status)}</strong></p>
      <p>Resume: <strong>${htmlEscape(app.resumePath || app.resume?.path || 'Not selected')}</strong></p>
      <h3>Prepared answers</h3>
      ${answerEntries.length ? `<dl>${answerEntries.map((item) => `<div><dt>${htmlEscape(item.question || item.key || 'Question')}</dt><dd>${htmlEscape(item.answer || item.value || '—')}</dd></div>`).join('')}</dl>` : '<p class="muted">No prepared answers.</p>'}
      ${unresolved.length ? `<div class="warning"><strong>Needs review:</strong><ul>${unresolved.map((q) => `<li>${htmlEscape(q.question || q.label || q)}</li>`).join('')}</ul></div>` : ''}
      <form method="post" action="/review/${encodeURIComponent(app.id)}">
        <input type="hidden" name="action" value="approve" />
        <button ${approved || unresolved.length ? 'disabled' : ''}>Approve for submission</button>
      </form>
      <form method="post" action="/review/${encodeURIComponent(app.id)}">
        <input type="hidden" name="action" value="skip" />
        <button class="secondary">Skip</button>
      </form>
    </article>`;
  }).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Final Application Review</title><style>
  body{font-family:system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 20px;background:#f6f7f9;color:#202124}.card{background:#fff;border:1px solid #ddd;border-radius:12px;padding:20px;margin:18px 0}.head{display:flex;justify-content:space-between;gap:20px}.score{font-size:24px;font-weight:700}.warning{border:1px solid #d99b00;padding:12px;border-radius:8px;background:#fff8df}.muted{color:#666}dt{font-weight:700;margin-top:12px}dd{margin:4px 0 0;white-space:pre-wrap}button{padding:10px 14px;border:0;border-radius:7px;margin:8px 8px 0 0;cursor:pointer}button.secondary{background:#eee}button:disabled{opacity:.5;cursor:not-allowed}a{color:#1769aa}
</style></head><body><h1>Final Application Review</h1><p>Nothing is submitted from this screen. Approval only marks an application as ready for the final executor.</p>${message ? `<p><strong>${htmlEscape(message)}</strong></p>` : ''}${cards || '<p>No applications are waiting for review.</p>'}</body></html>`;
}

export function startFinalReviewServer({ config, host = '127.0.0.1', port = 4180 }) {
  const store = new ApplicationStore(config.applicationsPath);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${host}:${port}`);
      if (req.method === 'GET' && url.pathname === '/') {
        const applications = (await store.list()).filter((a) => ['needs_review', 'approved', 'prepared'].includes(a.status));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(page(applications));
        return;
      }
      if (req.method === 'POST' && url.pathname.startsWith('/review/')) {
        const id = decodeURIComponent(url.pathname.slice('/review/'.length));
        let body = '';
        for await (const chunk of req) body += chunk;
        const params = new URLSearchParams(body);
        const action = params.get('action');
        if (action === 'approve') await store.updateStatus(id, 'approved', { finalReviewApprovedAt: new Date().toISOString(), submitBlocked: true });
        else if (action === 'skip') await store.updateStatus(id, 'skipped', { finalReviewSkippedAt: new Date().toISOString() });
        else throw new Error('Unsupported review action.');
        res.writeHead(303, { location: '/' });
        res.end();
        return;
      }
      res.writeHead(404); res.end('Not found');
    } catch (error) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(error.message);
    }
  });
  server.listen(port, host);
  return server;
}
