import { Resend } from 'resend';

const ALLOWED_SENDERS = ['business@cybearbots.org', 'mechanical@cybearbots.org', 'code@cybearbots.org'];

export async function onRequestPost({ request, env }) {
  const resend = new Resend(env.RESEND_API_KEY);
  const { from, to, subject, body, replyToEmailId } = await request.json();

  if (!ALLOWED_SENDERS.includes(from)) {
    return new Response('from must be one of: ' + ALLOWED_SENDERS.join(', '), { status: 400 });
  }
  if (!to || !subject || !body) {
    return new Response('to, subject, and body are required', { status: 400 });
  }

  const sendParams = { from, to, subject, text: body };

  // If replying, thread it using the original email's Resend message ID.
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

  return Response.json(data);
}
