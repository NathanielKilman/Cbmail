import { Resend } from 'resend';

const ALLOWED_SENDERS = ['business@cybearbots.org', 'mechanical@cybearbots.org', 'code@cybearbots.org'];

async function handleWebhook(request, env) {
  const resend = new Resend(env.RESEND_API_KEY);
  const payload = await request.text();

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id'),
        timestamp: request.headers.get('svix-timestamp'),
        signature: request.headers.get('svix-signature'),
      },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });
  } catch (err) {
    return new Response('Invalid signature: ' + (err?.message || String(err)), { status: 400 });
  }

  if (event.type === 'email.received') {
    const to = event.data.to[0];
    const from = event.data.from;
    const subject = event.data.subject;

    const { data: email } = await resend.emails.receiving.get(event.data.email_id);

    const toLower = to.toLowerCase();
    let inbox = 'general';
    if (toLower.includes('business')) inbox = 'business';
    else if (toLower.includes('mechanical')) inbox = 'mechanical';
    else if (toLower.includes('code')) inbox = 'code';

    await env.DB.prepare(
      `INSERT INTO emails (inbox, from_address, to_address, subject, body, html_body, message_id, raw_headers, received_at, is_read, direction)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'inbound')`
    ).bind(
      inbox,
      from,
      to,
      subject,
      email?.text ?? '',
      email?.html ?? null,
      event.data.message_id ?? null,
      JSON.stringify(email?.headers ?? {}),
      new Date().toISOString()
    ).run();
  }

  return new Response('OK', { status: 200 });
}

async function handleGetEmails(request, env) {
  const url = new URL(request.url);
  const inbox = url.searchParams.get('inbox');
  const id = url.searchParams.get('id');

  if (id) {
    const email = await env.DB.prepare(`SELECT * FROM emails WHERE id = ?`).bind(id).first();
    if (!email) return new Response('Not found', { status: 404 });
    return Response.json(email);
  }

  const validInboxes = ['business', 'mechanical', 'code', 'general', 'sent', 'trash'];
  if (!inbox || !validInboxes.includes(inbox)) {
    return new Response('inbox query param required (business|mechanical|code|general|sent|trash)', { status: 400 });
  }

  if (inbox === 'trash') {
    const { results } = await env.DB.prepare(
      `SELECT id, from_address, to_address, subject, received_at, is_read, deleted_at, direction
       FROM emails WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 100`
    ).all();
    return Response.json(results);
  }

  if (inbox === 'sent') {
    const { results } = await env.DB.prepare(
      `SELECT id, from_address, to_address, subject, received_at, is_read
       FROM emails WHERE direction = 'outbound' AND deleted_at IS NULL ORDER BY received_at DESC LIMIT 100`
    ).all();
    return Response.json(results);
  }

  if (inbox === 'general') {
    const { results } = await env.DB.prepare(
      `SELECT id, from_address, to_address, subject, received_at, is_read
       FROM emails WHERE direction = 'inbound' AND deleted_at IS NULL ORDER BY received_at DESC LIMIT 100`
    ).all();
    return Response.json(results);
  }

  const { results } = await env.DB.prepare(
    `SELECT id, from_address, to_address, subject, received_at, is_read
     FROM emails WHERE inbox = ? AND direction = 'inbound' AND deleted_at IS NULL ORDER BY received_at DESC LIMIT 100`
  ).bind(inbox).all();

  return Response.json(results);
}

async function handlePatchEmails(request, env) {
  const { id, is_read, deleted } = await request.json();
  if (!id) return new Response('id required', { status: 400 });

  if (typeof deleted === 'boolean') {
    await env.DB.prepare(`UPDATE emails SET deleted_at = ? WHERE id = ?`)
      .bind(deleted ? new Date().toISOString() : null, id)
      .run();
    return new Response('OK', { status: 200 });
  }

  await env.DB.prepare(`UPDATE emails SET is_read = ? WHERE id = ?`)
    .bind(is_read ? 1 : 0, id)
    .run();

  return new Response('OK', { status: 200 });
}

async function handleDeleteEmail(request, env) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response('id required', { status: 400 });

  await env.DB.prepare(`DELETE FROM emails WHERE id = ?`).bind(id).run();
  return new Response('OK', { status: 200 });
}

async function purgeOldTrash(env) {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `DELETE FROM emails WHERE deleted_at IS NOT NULL AND deleted_at < ?`
  ).bind(cutoff).run();
}

async function handleSend(request, env) {
  const resend = new Resend(env.RESEND_API_KEY);
  const { from, to, subject, body, replyToEmailId } = await request.json();

  if (!ALLOWED_SENDERS.includes(from)) {
    return new Response('from must be one of: ' + ALLOWED_SENDERS.join(', '), { status: 400 });
  }
  if (!to || !subject || !body) {
    return new Response('to, subject, and body are required', { status: 400 });
  }

  const sendParams = { from, to, subject, text: body };

  if (replyToEmailId) {
    const original = await env.DB.prepare(
      `SELECT message_id FROM emails WHERE id = ?`
    ).bind(replyToEmailId).first();

    if (original?.message_id) {
      sendParams.headers = {
        'In-Reply-To': original.message_id,
        'References': original.message_id,
      };
    }
  }

  const { data, error } = await resend.emails.send(sendParams);
  if (error) {
    return new Response(JSON.stringify(error), { status: 502 });
  }

  const inbox = from.split('@')[0]; // business/mechanical/code

  // The send response only gives us Resend's internal id, not the RFC
  // Message-ID header needed for future threading. Fetch it separately.
  let realMessageId = null;
  try {
    const { data: sent } = await resend.emails.get(data.id);
    realMessageId = sent?.message_id ?? null;
  } catch (err) {
    // Non-fatal — the email already sent successfully either way.
  }

  await env.DB.prepare(
    `INSERT INTO emails (inbox, from_address, to_address, subject, body, html_body, message_id, raw_headers, received_at, is_read, direction)
     VALUES (?, ?, ?, ?, ?, NULL, ?, NULL, ?, 1, 'outbound')`
  ).bind(
    inbox,
    from,
    to,
    subject,
    body,
    realMessageId,
    new Date().toISOString()
  ).run();

  return Response.json(data);
}

const AUTH_COOKIE = 'cbmail_auth';
const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

function isTrustedReferrer(request) {
  const referer = request.headers.get('Referer');
  if (!referer) return false;
  try {
    const host = new URL(referer).hostname;
    return host === 'cybearbots.org' || host.endsWith('.cybearbots.org') && host !== 'cbmail.cybearbots.org';
  } catch {
    return false;
  }
}

function loginPage(error) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>CBMail | Sign In</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0a0a0a; color: #f5f5f0; font-family: 'Inter', system-ui, sans-serif;
  }
  .card { background: #161616; border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; padding: 2rem; width: 100%; max-width: 340px; }
  .logo { font-family: 'Poppins', sans-serif; font-weight: 900; font-size: 1.5rem; margin-bottom: 1.5rem; }
  .logo span { color: #52c98a; }
  input {
    width: 100%; padding: 0.6rem 0.75rem; margin-top: 0.35rem; margin-bottom: 1rem;
    background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 0.5rem;
    color: #f5f5f0; font-size: 0.95rem;
  }
  label { font-size: 0.8rem; color: #a3a3a0; }
  button {
    width: 100%; padding: 0.65rem; background: #3ba271; color: #08130e; border: none;
    border-radius: 0.5rem; font-weight: 600; font-size: 0.95rem; cursor: pointer;
  }
  button:hover { background: #52c98a; }
  .error { color: #f87171; font-size: 0.85rem; margin-bottom: 1rem; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo"><span>CB</span>MAIL</div>
    <form id="loginForm">
      ${error ? '<div class="error">Incorrect password.</div>' : ''}
      <label for="password">Password</label>
      <input type="password" id="password" name="password" autofocus />
      <button type="submit">Sign In</button>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        window.location.href = '/?error=1';
      }
    });
  </script>
</body>
</html>`;
}

async function handleLogin(request, env) {
  const { password } = await request.json();
  if (password !== env.SITE_PASSWORD) {
    return new Response('Incorrect password', { status: 401 });
  }
  const cookieValue = await sha256Hex(env.SITE_PASSWORD + ':cbmail');
  return new Response('OK', {
    status: 200,
    headers: {
      'Set-Cookie': `${AUTH_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${AUTH_MAX_AGE}`,
    },
  });
}

async function isAuthenticated(request, env) {
  const cookie = getCookie(request, AUTH_COOKIE);
  if (!cookie) return false;
  const expected = await sha256Hex(env.SITE_PASSWORD + ':cbmail');
  return cookie === expected;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Resend calls this server-to-server — must stay open, no cookie involved.
    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }

    if (url.pathname === '/api/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }

    const authed = await isAuthenticated(request, env);
    if (!authed) {
      if (isTrustedReferrer(request)) {
        const cookieValue = await sha256Hex(env.SITE_PASSWORD + ':cbmail');
        let response;
        if (url.pathname.startsWith('/api/')) {
          response = new Response('Unauthorized', { status: 401 });
        } else {
          const assetResp = await env.ASSETS.fetch(new Request(new URL('/', request.url)));
          response = new Response(await assetResp.text(), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        response.headers.append(
          'Set-Cookie',
          `${AUTH_COOKIE}=${cookieValue}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${AUTH_MAX_AGE}`
        );
        return response;
      }

      if (url.pathname.startsWith('/api/')) {
        return new Response('Unauthorized', { status: 401 });
      }

      const showError = url.searchParams.get('error') === '1';
      return new Response(loginPage(showError), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    if (url.pathname === '/api/emails' && request.method === 'GET') {
      return handleGetEmails(request, env);
    }
    if (url.pathname === '/api/emails' && request.method === 'PATCH') {
      return handlePatchEmails(request, env);
    }
    if (url.pathname === '/api/emails' && request.method === 'DELETE') {
      return handleDeleteEmail(request, env);
    }
    if (url.pathname === '/api/send' && request.method === 'POST') {
      return handleSend(request, env);
    }

    // Anything else falls through to the static frontend build.
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(purgeOldTrash(env));
  },
};
