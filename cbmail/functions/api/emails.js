export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const inbox = url.searchParams.get('inbox');
  const id = url.searchParams.get('id');

  if (id) {
    const email = await env.DB.prepare(`SELECT * FROM emails WHERE id = ?`).bind(id).first();
    if (!email) return new Response('Not found', { status: 404 });
    return Response.json(email);
  }

  const validInboxes = ['business', 'mechanical', 'code', 'general'];
  if (!inbox || !validInboxes.includes(inbox)) {
    return new Response('inbox query param required (business|mechanical|code|general)', { status: 400 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, from_address, to_address, subject, received_at, is_read
     FROM emails WHERE inbox = ? ORDER BY received_at DESC LIMIT 100`
  ).bind(inbox).all();

  return Response.json(results);
}

export async function onRequestPatch({ request, env }) {
  const { id, is_read } = await request.json();
  if (!id) return new Response('id required', { status: 400 });

  await env.DB.prepare(`UPDATE emails SET is_read = ? WHERE id = ?`)
    .bind(is_read ? 1 : 0, id)
    .run();

  return new Response('OK', { status: 200 });
}
