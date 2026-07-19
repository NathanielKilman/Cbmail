export async function fetchEmails(inbox) {
  const res = await fetch(`/api/emails?inbox=${inbox}`);
  if (!res.ok) throw new Error('Failed to load inbox');
  return res.json();
}

export async function fetchEmail(id) {
  const res = await fetch(`/api/emails?id=${id}`);
  if (!res.ok) throw new Error('Failed to load email');
  return res.json();
}

export async function markRead(id, isRead) {
  await fetch('/api/emails', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, is_read: isRead }),
  });
}

export async function sendEmail({ from, to, subject, body, replyToEmailId }) {
  const res = await fetch('/api/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, body, replyToEmailId }),
  });
  if (!res.ok) throw new Error('Failed to send');
  return res.json();
}
