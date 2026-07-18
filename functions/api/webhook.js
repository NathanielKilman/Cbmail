import { Resend } from 'resend';

export async function onRequestPost({ request, env }) {
  const resend = new Resend(env.RESEND_API_KEY);
  const payload = await request.text();

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        'svix-id': request.headers.get('svix-id'),
        'svix-timestamp': request.headers.get('svix-timestamp'),
        'svix-signature': request.headers.get('svix-signature'),
      },
      secret: env.RESEND_WEBHOOK_SECRET,
    });
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'email.received') {
    const to = event.data.to[0];
    const from = event.data.from;
    const subject = event.data.subject;

    // The webhook payload is metadata only — fetch the real body separately.
    const { data: email } = await resend.emails.receiving.get(event.data.email_id);

    const toLower = to.toLowerCase();
    let inbox = 'general';
    if (toLower.includes('business')) inbox = 'business';
    else if (toLower.includes('mechanical')) inbox = 'mechanical';
    else if (toLower.includes('code')) inbox = 'code';

    await env.DB.prepare(
      `INSERT INTO emails (inbox, from_address, to_address, subject, body, html_body, message_id, raw_headers, received_at, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
    ).bind(
      inbox,
      from,
      to,
      subject,
      email?.text ?? '',
      email?.html ?? null,
      event.data.email_id,
      JSON.stringify(email?.headers ?? {}),
      new Date().toISOString()
    ).run();
  }

  return new Response('OK', { status: 200 });
}
