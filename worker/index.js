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
    return new Response('Invalid signature', { status: 400 });
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

  const validInboxes = ['business', 'mechanical', 'code', 'general', 'sent'];
  if (!inbox || !validInboxes.includes(inbox)) {
    return new Response('inbox query param required (business|mechanical|code|general|sent)', { status: 400 });
  }

  if (inbox === 'sent') {
    const { results } = await env.DB.prepare(
      `SELECT id, from_address, to_address, subject, received_at, is_read
       FROM emails WHERE direction = 'outbound' ORDER BY received_at DESC LIMIT 100`
    ).all();
    return Response.json(results);
  }

  const { results } = await env.DB.prepare(
    `SELECT id, from_address, to_address, subject, received_at, is_read
     FROM emails WHERE inbox = ? AND direction = 'inbound' ORDER BY received_at DESC LIMIT 100`
  ).bind(inbox).all();

  return Response.json(results);
}

async function handlePatchEmails(request, env) {
  const { id, is_read } = await request.json();
  if (!id) return new Response('id required', { status: 400 });

  await env.DB.prepare(`UPDATE emails SET is_read = ? WHERE id = ?`)
    .bind(is_read ? 1 : 0, id)
    .run();

  return new Response('OK', { status: 200 });
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      return handleWebhook(request, env);
    }
    if (url.pathname === '/api/emails' && request.method === 'GET') {
      return handleGetEmails(request, env);
    }
    if (url.pathname === '/api/emails' && request.method === 'PATCH') {
      return handlePatchEmails(request, env);
    }
    if (url.pathname === '/api/send' && request.method === 'POST') {
      return handleSend(request, env);
    }

    // Anything else falls through to the static frontend build.
    return env.ASSETS.fetch(request);
  },
};
